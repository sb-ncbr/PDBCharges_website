import { LeftPanelControls } from "molstar/lib/mol-plugin-ui/left-panel";
import {
  ControlsWrapper,
  DefaultViewport,
  PluginContextContainer,
} from "molstar/lib/mol-plugin-ui/plugin";
import { SequenceView } from "./SequenceView";
import { useBehavior } from "../hooks/use-behavior";
import { useEffect } from "react";
import { ContextModel } from "../models/context-model";

export function ViewerLayout({ context }: { context: ContextModel }) {
  const showControls = useBehavior(context.state.showControls);
  const isExpanded = useBehavior(context.state.isExpanded);

  useEffect(() => {
    if (!context) return;
    context.sub();
    return () => context.unsub();
  }, [context]);

  return (
    <div
      style={{
        position: isExpanded ? "fixed" : "relative",
        inset: isExpanded ? 0 : "auto",
        width: "100%",
        height: "100%",
        zIndex: isExpanded ? 9999 : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "100%",
          width: "100%",
        }}
      >
        {showControls && (
          <div
            style={{
              position: "relative",
              maxWidth: "330px",
              height: "100%",
              flex: 1,
            }}
          >
            <MolstarLeftPanelControlsView context={context} />
          </div>
        )}

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            height: "100%",
            width: "100%",
          }}
        >
          <div
            style={{
              position: "relative",
              height: isExpanded ? "120px" : "100px",
              width: "100%",
            }}
          >
            <MolstarSequence context={context} />
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <MolstarViewport context={context} />
          </div>
        </div>

        {showControls && (
          <div
            style={{
              position: "relative",
              maxWidth: "300px",
              height: "100%",
              flex: 1,
            }}
          >
            <MolstarControlsView context={context} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MolstarViewport({ context }: { context: ContextModel }) {
  const ViewportViewer =
    context.plugin.spec.components?.viewport?.view || DefaultViewport;

  return (
    <PluginContextContainer plugin={context.plugin}>
      <ViewportViewer />
    </PluginContextContainer>
  );
}

export function MolstarSequence({ context }: { context: ContextModel }) {
  const warnings = useBehavior(context.state.warnings);

  return (
    <PluginContextContainer plugin={context.plugin}>
      <SequenceView warnings={warnings ?? new Map()} />
    </PluginContextContainer>
  );
}

export function MolstarLeftPanelControlsView({
  context,
}: {
  context: ContextModel;
}) {
  return (
    <PluginContextContainer plugin={context.plugin}>
      <LeftPanelControls />
    </PluginContextContainer>
  );
}

export function MolstarControlsView({ context }: { context: ContextModel }) {
  return (
    <PluginContextContainer plugin={context.plugin}>
      <ControlsWrapper />
    </PluginContextContainer>
  );
}
