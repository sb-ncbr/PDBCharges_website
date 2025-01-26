import { ViewerLayout } from "./ViewerLayout";
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { ContextModel } from "../models/context-model";
import { useBehavior } from "../hooks/use-behavior";

export function MolstarViewer({ context }: { context: ContextModel }) {
  const isInitialized = useBehavior(context.state.isInitialized);
  const loadingStatus = useBehavior(context.state.loadingStatus);

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
      }}
    >
      {loadingStatus.kind === "loading" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "spin 1s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}
      {loadingStatus.kind === "error" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <span>{loadingStatus.error}</span>
        </div>
      )}
      {isInitialized && <ViewerLayout context={context} />}
    </div>
  );
}
