"use strict";

let molstar = ContextModel;

function init_results(structure_url, warnings) {
  (async () => {
    await ContextModel.init();
    await load(structure_url, warnings);
  })().then(
    () => { },
    (error) => {
      console.error("Mol* initialization ❌", error);
    }
  );
}

async function load(structure_url, warnings) {
  await molstar.load(structure_url);
  await molstar.subAfterLoad();

  molstar.behavior.setWarnings(warnings);

  mountTypeControls();
  mountColorControls();
}

function mountTypeControls() {
  const cartoon = document.getElementById("view_cartoon");
  const surface = document.getElementById("view_surface");
  const bas = document.getElementById("view_bas");
  const showWater = document.getElementById("show_water");
  const showMembrane = document.getElementById("show_membrane_orientation");

  if (
    !cartoon ||
    !surface ||
    !bas ||
    !showWater ||
    !showMembrane
  ) {
    console.error("View type controls not found");
    return;
  };

  cartoon.onclick = () => molstar.type.default();
  surface.onclick = () => molstar.type.surface();
  bas.onclick = () => molstar.type.ballAndStick();
  showWater.onclick = (e) => molstar.type.setWaterVisibility(e.target.checked);
  showMembrane.onclick = (e) => molstar.type.showMembraneVisibility(e.target.checked);

  molstar.state.type.subscribe((view) => {
    cartoon.checked = view === 'view_cartoon'
    surface.checked = view === 'view_surface'
    bas.checked = view === 'view_bas'
  })
  molstar.state.showWater.subscribe((show) => {
    showWater.checked = show
  })
  molstar.state.showMembrane.subscribe((show) => {
    showMembrane.checked = show
  })
  molstar.state.hasWater.subscribe((hasWater) => {
    showWater.parentElement.style.visibility = hasWater ? 'visible' : 'hidden'
  })
  // molstar.state.loadingStatus.subscribe((loadingStatus) => {
  //   const disabled = loadingStatus.kind === 'loading'
  //   cartoon.disabled = disabled
  //   surface.disabled = disabled
  //   bas.disabled = disabled
  //   showWater.disabled = disabled
  //   showMembrane.disabled = disabled
  // })
}

function mountColorControls() {
  const structureChain = document.getElementById("colors_structure_chain_id");
  const structureUniform = document.getElementById("colors_structure_uniform");
  const relative = document.getElementById("colors_relative");
  const absolute = document.getElementById("colors_absolute");
  const chargesSmoothing = document.getElementById("charges_smoothing");
  const maxRange = document.getElementById("max_value");
  const reset = document.getElementById("reset_max_charge");

  if (
    !structureChain ||
    !structureUniform ||
    !relative ||
    !absolute ||
    !chargesSmoothing ||
    !maxRange ||
    !reset
  ) {
    console.error("Color controls not found");
    return;
  }

  structureChain.onclick = () => molstar.color.default('chain-id');
  structureUniform.onclick = () => molstar.color.default('uniform');
  relative.onclick = () => molstar.color.relative();
  absolute.onclick = () => molstar.color.absolute();
  chargesSmoothing.onclick = (e) => molstar.color.setChargesSmoothing(e.target.checked);
  maxRange.oninput = (e) => molstar.color.setRange(e.target.value);
  reset.onclick = () => molstar.color.resetRange();

  molstar.state.coloring.subscribe((coloring) => {
    structureChain.checked = coloring === 'colors_structure_chain_id'
    structureUniform.checked = coloring === 'colors_structure_uniform'
    relative.checked = coloring === 'colors_relative'
    absolute.checked = coloring === 'colors_absolute'

    if (coloring === 'colors_relative' || coloring === 'colors_absolute') {
      chargesSmoothing.disabled = false
    } else {
      chargesSmoothing.disabled = true
    }

    if (coloring === 'colors_absolute') {
      maxRange.disabled = false
    } else {
      maxRange.disabled = true
    }
  })
  molstar.state.useSmoothing.subscribe((useSmoothing) => {
    chargesSmoothing.checked = useSmoothing
  })
  molstar.state.range.subscribe((range) => {
    maxRange.value = Math.round(range * 100) / 100;
  })
  // molstar.state.loadingStatus.subscribe((loadingStatus) => {
  //   const disabled = loadingStatus.kind === 'loading'
  //   structureChain.disabled = disabled
  //   structureUniform.disabled = disabled
  //   relative.disabled = disabled
  //   absolute.disabled = disabled
  //   chargesSmoothing.disabled = disabled
  //   maxRange.disabled = disabled
  //   reset.disabled = disabled
  // })
}
