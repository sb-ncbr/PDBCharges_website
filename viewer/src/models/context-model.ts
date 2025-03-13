import merge from "lodash.merge";
import { MembraneOrientation3D } from "molstar/lib/extensions/anvil/behavior";
import { MAQualityAssessment } from "molstar/lib/extensions/model-archive/quality-assessment/behavior";
import { PLDDTConfidenceColorThemeProvider } from "molstar/lib/extensions/model-archive/quality-assessment/color/plddt";
import { MmcifFormat } from "molstar/lib/mol-model-formats/structure/mmcif";
import {
  QueryContext,
  StructureSelection,
} from "molstar/lib/mol-model/structure";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import {
  DefaultPluginUISpec,
  PluginUISpec,
} from "molstar/lib/mol-plugin-ui/spec";
import { StructureFocusRepresentation } from "molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation";
import { setSubtreeVisibility } from "molstar/lib/mol-plugin/behavior/static/state";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import { BallAndStickRepresentationProvider } from "molstar/lib/mol-repr/structure/representation/ball-and-stick";
import { GaussianSurfaceRepresentationProvider } from "molstar/lib/mol-repr/structure/representation/gaussian-surface";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { compile } from "molstar/lib/mol-script/runtime/query/base";
import { ElementSymbolColorThemeProvider } from "molstar/lib/mol-theme/color/element-symbol";
import { PhysicalSizeThemeProvider } from "molstar/lib/mol-theme/size/physical";
import { Color as MolstarColor } from "molstar/lib/mol-util/color";
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  Observable,
  Subscription
} from "rxjs";
import {
  SbNcbrPartialCharges,
  SbNcbrPartialChargesColorThemeProvider,
  SbNcbrPartialChargesPreset,
  SbNcbrPartialChargesPropertyProvider,
} from "../charges-extension";
import {
  AsyncResult,
  Color,
  Representation3D,
  ResidualWarning,
  Size,
  Type,
} from "./types";

type ColorId =
  | "colors_structure_chain_id"
  | "colors_structure_uniform"
  | "colors_relative"
  | "colors_absolute";
type ViewId = "view_cartoon" | "view_surface" | "view_bas";

export class ContextModel {
  private _plugin: PluginUIContext;
  private _subscriptions: Subscription[] = [];

  public state = {
    isInitialized: new BehaviorSubject<boolean>(false),
    loadingStatus: new BehaviorSubject<AsyncResult>({ kind: "idle" }),
    showControls: new BehaviorSubject<boolean>(false),
    isExpanded: new BehaviorSubject<boolean>(false),

    warnings: new BehaviorSubject<Map<string, Set<number>> | undefined>(
      undefined
    ),

    coloring: new BehaviorSubject<ColorId>("colors_relative"),
    type: new BehaviorSubject<ViewId>("view_cartoon"),
    range: new BehaviorSubject<number>(0),
    showWater: new BehaviorSubject<boolean>(true),
    hasWater: new BehaviorSubject<boolean>(true),
    showMembrane: new BehaviorSubject<boolean>(true),
    useSmoothing: new BehaviorSubject<boolean>(false),
  };

  get plugin(): PluginUIContext {
    return this._plugin;
  }

  constructor() {
    const defaultSpec = DefaultPluginUISpec();
    const spec: PluginUISpec = {
      ...defaultSpec,
      behaviors: [
        ...defaultSpec.behaviors,
        PluginSpec.Behavior(MAQualityAssessment),
        PluginSpec.Behavior(SbNcbrPartialCharges),
      ],
      layout: {
        ...defaultSpec.layout,
        initial: {
          isExpanded: this.state.isExpanded.value,
          showControls: this.state.showControls.value,
        },
      },
      canvas3d: {
        ...defaultSpec.canvas3d,
        renderer: {
          backgroundColor: MolstarColor(0xffffff),
        },
      },
      components: {
        ...defaultSpec.components,
        remoteState: "none",
      },
      config: [
        ...(defaultSpec.config ?? []),
        [PluginConfig.Viewport.ShowAnimation, false],
        [
          PluginConfig.Structure.DefaultRepresentationPreset,
          SbNcbrPartialChargesPreset.id,
        ],
      ],
    };

    this._plugin = new PluginUIContext(spec);
  }

  private _subscribe<T>(observable: Observable<T>, sub: (v: T) => void) {
    this._subscriptions.push(observable.subscribe(sub));
  }

  sub() {
    // sync UI layout controls
    this._subscribe(this.plugin!.layout.events.updated, () => {
      this.state.showControls.next(this.plugin.layout.state.showControls);
      this.state.isExpanded.next(this.plugin.layout.state.isExpanded);
    });
  }

  subAfterLoad() {
    this._subscribe(
      combineLatest([
        this.state.coloring.pipe(distinctUntilChanged()),
        this.state.range.pipe(debounceTime(300), distinctUntilChanged()),
        this.state.useSmoothing.pipe(distinctUntilChanged()),
      ]),
      async ([coloring, range, useSmoothing]) => {
        if (!coloring) return;

        if (!range) range = 0;

        if (coloring === "colors_structure_chain_id") {
          await this.updateColor("default", {
            carbonColor: {
              name: "chain-id",
              params: {
                value: MolstarColor.fromRgb(27, 158, 119),
              },
            },
          });
        }
        if (coloring === "colors_structure_uniform") {
          await this.updateColor("default", {
            carbonColor: {
              name: "uniform",
              params: {
                value: MolstarColor.fromRgb(27, 158, 119),
              },
            },
          });
        }
        if (coloring === "colors_absolute") {
          await this.updateColor(this.partialChargesColorProps.name, {
            maxAbsoluteCharge: range,
            smoothing: useSmoothing,
            absolute: true,
          });
        }
        if (coloring === "colors_relative") {
          await this.updateColor(this.partialChargesColorProps.name, {
            maxAbsoluteCharge: range,
            smoothing: useSmoothing,
            absolute: false,
          });
        }
      }
    );

    this._subscribe(
      this.state.type.pipe(distinctUntilChanged()),
      async (type) => {
        if (!type) return;

        if (type === "view_cartoon") {
          await this.updateType("default");
        }
        if (type === "view_surface") {
          await this.updateType(this.surfaceTypeProps.type.name);
        }
        if (type === "view_bas") {
          await this.updateType(this.ballAndStickTypeProps.type.name);
        }
      }
    );

    this._subscribe(
      this.state.showWater.pipe(distinctUntilChanged()),
      (visible) => {
        this.showWater(visible);
      }
    );

    this._subscribe(
      this.state.showMembrane.pipe(distinctUntilChanged()),
      async (visible) => {
        await this.showMembraneOrientation(visible);
      }
    );
  }

  unsub() {
    for (const sub of this._subscriptions) {
      sub.unsubscribe();
    }
    this._subscriptions = [];
  }

  async init() {
    if (this.state.isInitialized.value) return;

    await this._plugin.init();

    this._plugin.managers.interactivity.setProps({
      granularity: "element",
    });
    this._plugin.behaviors.layout.leftPanelTabName.next("data");

    this.state.isInitialized.next(true);
  }

  async load(url: string) {
    this.state.loadingStatus.next({ kind: "loading", what: "structure" });

    await this.plugin.clear();

    const data = await this.plugin.builders.data.download(
      { url },
      { state: { isGhost: true } }
    );
    const trajectory = await this.plugin.builders.structure.parseTrajectory(
      data,
      "mmcif"
    );
    await this.plugin.builders.structure.hierarchy.applyPreset(
      trajectory,
      "default"
    );

    await this.setInitialRepresentationState();

    this.sanityCheck();

    this.state.loadingStatus.next({ kind: "idle" });
    this.color.resetRange();
    this.state.hasWater.next(this.hasWater());
  }

  charges = {
    getMaxCharge: () => {
      const model = this.getModel();
      if (!model) throw new Error("No model loaded.");
      const maxCharge =
        SbNcbrPartialChargesPropertyProvider.get(model).value
          ?.maxAbsoluteAtomChargeAll;
      if (maxCharge === undefined)
        throw new Error("No max charge found for all charge sets.");
      return maxCharge;
    },
  };

  color = {
    default: (carbonColor: "chain-id" | "uniform") => {
      if (carbonColor === "chain-id") {
        this.state.coloring.next("colors_structure_chain_id");
      } else {
        this.state.coloring.next("colors_structure_uniform");
      }
    },
    absolute: () => {
      this.state.coloring.next("colors_absolute");
    },
    relative: () => {
      this.state.coloring.next("colors_relative");
    },
    resetRange: () => {
      const range = this.charges.getMaxCharge();
      this.state.range.next(range);
    },
    setRange: (max: number | undefined) => {
      if (!max) {
        this.state.range.next(0);
      } else {
        this.state.range.next(max);
      }
    },
    setChargesSmoothing: (useSmoothing: boolean) => {
      this.state.useSmoothing.next(useSmoothing);
    },
  };

  type = {
    default: () => {
      this.state.type.next("view_cartoon");
    },
    ballAndStick: () => {
      this.state.type.next("view_bas");
    },
    surface: () => {
      this.state.type.next("view_surface");
    },
    setWaterVisibility: (visible: boolean) => {
      this.state.showWater.next(visible);
    },
    showMembraneVisibility: (visible: boolean) => {
      this.state.showMembrane.next(visible);
    },
  };

  behavior = {
    setWarnings: (warnings: ResidualWarning[]) => {
      const warningSet = new Map<string, Set<number>>();

      warnings.sort((a, b) => {
        if (a.chain_id !== b.chain_id) {
          return a.chain_id.localeCompare(b.chain_id);
        }
        return a.residue_id - b.residue_id;
      });

      for (const warning of warnings) {
        if (!warningSet.has(warning.chain_id)) {
          warningSet.set(warning.chain_id, new Set());
        }
        const chainIdMap = warningSet.get(warning.chain_id);
        chainIdMap!.add(warning.residue_id);
      }

      this.state.warnings.next(warningSet);
    },
    focus: (warning: ResidualWarning) => {
      const data =
        this.plugin.managers.structure.hierarchy.current.structures[0]
          .components[0].cell.obj?.data;
      if (!data) return;

      const structure = this.getStructure();
      if (!structure) {
        PluginCommands.Toast.Show(this.plugin, {
          title: "Error",
          message: "Missing structure.",
          timeoutMs: 2000,
        });
        return;
      }

      const expression = MS.struct.generator.atomGroups({
        "atom-test": MS.core.logic.and([
          MS.core.rel.eq([
            MS.struct.atomProperty.macromolecular.auth_asym_id(),
            warning.chain_id,
          ]),
          MS.core.rel.eq([
            MS.struct.atomProperty.macromolecular.auth_comp_id(),
            warning.residue_name,
          ]),
          MS.core.rel.eq([
            MS.struct.atomProperty.macromolecular.auth_seq_id(),
            warning.residue_id,
          ]),
        ]),
      });

      const query = compile<StructureSelection>(expression);
      const structureSelection = query(new QueryContext(structure));
      const loci = StructureSelection.toLociWithSourceUnits(structureSelection);

      if (loci.elements.length === 0) {
        PluginCommands.Toast.Show(this.plugin, {
          title: "Error",
          message: "Couldn't focus residue.",
          timeoutMs: 2000,
        });
        return;
      }

      this.plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
      this.plugin.managers.camera.focusLoci(loci);
      this.plugin.managers.structure.focus.setFromLoci(loci);
    },
  };

  private readonly defaultProps: Map<string, Representation3D> = new Map();

  private readonly ballAndStickTypeProps: {
    type: Type;
    sizeTheme: Size;
  } = {
    type: {
      name: BallAndStickRepresentationProvider.name,
      params: {
        ...BallAndStickRepresentationProvider.defaultValues,
      },
    },
    sizeTheme: {
      name: PhysicalSizeThemeProvider.name,
      params: {
        ...PhysicalSizeThemeProvider.defaultValues,
      },
    },
  };
  private readonly surfaceTypeProps: {
    type: Type;
    sizeTheme: Size;
  } = {
    type: {
      name: GaussianSurfaceRepresentationProvider.name,
      params: {
        ...GaussianSurfaceRepresentationProvider.defaultValues,
        smoothColors: {
          name: "on",
          params: {
            resolutionFactor: 2,
            sampleStride: 3,
          },
        },
      },
    },
    sizeTheme: {
      name: PhysicalSizeThemeProvider.name,
      params: {
        ...PhysicalSizeThemeProvider.defaultValues,
        scale: 1,
      },
    },
  };
  private readonly partialChargesColorProps: Color = {
    name: SbNcbrPartialChargesColorThemeProvider.name,
    params: {
      // not using default values
    },
  };
  private readonly elementSymbolColorProps: Color = {
    name: ElementSymbolColorThemeProvider.name,
    params: {
      ...ElementSymbolColorThemeProvider.defaultValues,
    },
  };
  private readonly plddtColorProps: Color = {
    name: PLDDTConfidenceColorThemeProvider.name,
    params: {
      ...PLDDTConfidenceColorThemeProvider.defaultValues,
    },
  };
  private readonly physicalSizeProps: Size = {
    name: PhysicalSizeThemeProvider.name,
    params: {
      ...PhysicalSizeThemeProvider.defaultValues,
    },
  };

  private async setInitialRepresentationState() {
    this.defaultProps.clear();
    await this.plugin.dataTransaction(() => {
      for (const structure of this.plugin.managers.structure.hierarchy.current
        .structures) {
        for (const component of structure.components) {
          for (const representation of component.representations) {
            const params = representation.cell.transform.params;
            if (!params) continue;
            const { type } = params;
            this.defaultProps.set(representation.cell.transform.ref, {
              type: type as Type,
              colorTheme: this.elementSymbolColorProps,
              sizeTheme: this.physicalSizeProps,
            });
          }
        }
      }
    });
  }

  private async updateType(name: Type["name"]) {
    this.state.loadingStatus.next({ kind: "loading", what: "view" });

    await this.plugin.dataTransaction(async () => {
      for (const structure of this.plugin.managers.structure.hierarchy.current
        .structures) {
        const update = this.plugin.state.data.build();
        for (const component of structure.components) {
          for (const representation of component.representations) {
            let type, sizeTheme;

            if (!this.defaultProps.has(representation.cell.transform.ref))
              continue;

            if (name === this.ballAndStickTypeProps.type.name) {
              type = this.ballAndStickTypeProps.type;
              sizeTheme = this.ballAndStickTypeProps.sizeTheme;
            } else if (name === this.surfaceTypeProps.type.name) {
              type = this.surfaceTypeProps.type;
              sizeTheme = this.surfaceTypeProps.sizeTheme;
            } else if (name == "default") {
              type = this.defaultProps.get(
                representation.cell.transform.ref
              )?.type;
              sizeTheme = this.defaultProps.get(
                representation.cell.transform.ref
              )?.sizeTheme;
            } else {
              throw new Error("Invalid type theme");
            }

            const oldProps = representation.cell.transform.params;

            // switches to residue charge for certain representations
            const showResidueChargeFor = ["cartoon", "carbohydrate"];
            const typeName = type?.name;
            const showResidueCharge =
              typeName && showResidueChargeFor.includes(typeName);
            let colorTheme = oldProps?.colorTheme;
            colorTheme = merge({}, colorTheme, {
              params: { chargeType: showResidueCharge ? "residue" : "atom" },
            });

            const mergedProps = merge({}, oldProps, {
              type,
              sizeTheme,
              colorTheme,
            });
            update.to(representation.cell).update(mergedProps);
          }
        }
        await update.commit({ canUndo: "Update Theme" });
      }
      this.updateGranularity(name);
    });

    this.state.loadingStatus.next({ kind: "idle" });
  }

  private async updateColor(name: Color["name"], params: Color["params"] = {}) {
    this.state.loadingStatus.next({ kind: "loading", what: "coloring" });

    await this.plugin.dataTransaction(async () => {
      for (const structure of this.plugin.managers.structure.hierarchy.current
        .structures) {
        const update = this.plugin.state.data.build();
        for (const component of structure.components) {
          for (const representation of component.representations) {
            let colorTheme;

            if (!this.defaultProps.has(representation.cell.transform.ref)) {
              colorTheme = this.elementSymbolColorProps;
            } else if (name === this.partialChargesColorProps.name) {
              colorTheme = this.partialChargesColorProps;
            } else if (name === this.plddtColorProps.name) {
              colorTheme = this.plddtColorProps;
            } else if (name === "default") {
              colorTheme = this.defaultProps.get(
                representation.cell.transform.ref
              )?.colorTheme;
            } else {
              throw new Error("Invalid color theme");
            }

            // switches to residue charge for certain representations
            const showResidueChargeFor = ["cartoon", "carbohydrate"];
            const typeName = representation.cell.transform.params?.type?.name;
            const showResidueCharge =
              typeName && showResidueChargeFor.includes(typeName);
            params = merge({}, params, {
              chargeType: showResidueCharge ? "residue" : "atom",
            });

            const oldProps = representation.cell.transform.params;
            const mergedProps = merge(
              {},
              oldProps,
              { colorTheme },
              { colorTheme: { params } }
            );
            update.to(representation.cell).update(mergedProps);
          }
        }
        await update.commit({ canUndo: "Update Theme" });
      }
      await this.updateFocusColorTheme(name, params);
    });

    this.state.loadingStatus.next({ kind: "idle" });
  }

  private sanityCheck() {
    const model = this.getModel();
    if (!model) throw new Error("No model loaded.");
    const sourceData = model.sourceData as MmcifFormat;
    const atomCount = model.atomicHierarchy.atoms._rowCount;
    const chargesCount =
      sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges.rowCount;
    if (chargesCount > 0 && chargesCount % atomCount !== 0)
      throw new Error(
        `Atom count (${atomCount}) does not match charge count (${chargesCount}).`
      );
  }

  private updateGranularity(type: Type["name"]) {
    this.plugin.managers.interactivity.setProps({
      granularity: type === "default" ? "residue" : "element",
    });
  }

  private async updateFocusColorTheme(
    color: Color["name"],
    params: Color["params"] = {}
  ) {
    let props =
      color === SbNcbrPartialChargesColorThemeProvider.name
        ? this.partialChargesColorProps
        : this.elementSymbolColorProps;
    props = merge({}, props, { params: { ...params, chargeType: "atom" } });
    await this.plugin.state.updateBehavior(
      StructureFocusRepresentation,
      (p) => {
        p.targetParams.colorTheme = props;
        p.surroundingsParams.colorTheme = props;
      }
    );
  }

  private getModel() {
    return this.plugin.managers.structure.hierarchy.current.structures[0].model
      ?.cell?.obj?.data;
  }

  private getStructure() {
    return this.plugin.managers.structure.hierarchy.current.structures[0]?.cell
      .obj?.data;
  }

  async showMembraneOrientation(visible: boolean) {
    let cell = this.plugin.state.data.selectQ((q) =>
      q.root.withTag("membrane-orientation-3d")
    )[0];
    if (!cell) {
      const result = await this.loadMembraneOrientation(visible);
      if (!result) {
        PluginCommands.Toast.Show(this.plugin, {
          title: "Error",
          message: "Failed to create membrane orientation.",
          timeoutMs: 2000,
        });
        return;
      }
      cell = result;
    }

    setSubtreeVisibility(this.plugin.state.data, cell.transform.ref, !visible);
  }

  showWater(visible: boolean) {
    for (const structure of this.plugin.managers.structure.hierarchy.current
      .structures) {
      for (const component of structure.components) {
        for (const representation of component.representations) {
          const tags = representation.cell.transform.tags;
          if (tags?.includes("water")) {
            setSubtreeVisibility(
              this.plugin.state.data,
              representation.cell.transform.ref,
              !visible
            );
          }
        }
      }
    }
  }

  hasWater() {
    for (const structure of this.plugin.managers.structure.hierarchy.current
      .structures) {
      for (const component of structure.components) {
        for (const representation of component.representations) {
          const tags = representation.cell.transform.tags;
          if (tags?.includes("water")) {
            return true;
          }
        }
      }
    }
    return false;
  }

  async loadMembraneOrientation(visible: boolean = true) {
    const structure =
      this.plugin.managers.structure.hierarchy.current.structures[0]?.cell;

    if (!structure) {
      console.error("Missing structure");
      return;
    }
    const result = await this.plugin.state.data
      .build()
      .to(structure)
      .applyOrUpdateTagged(
        "membrane-orientation-3d",
        MembraneOrientation3D,
        {},
        { state: { isHidden: !visible } }
      )
      .commit({ revertOnError: true });

    return result.cell;
  }
}
