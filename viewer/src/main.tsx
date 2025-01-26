import { createRoot } from "react-dom/client";
import { ContextModel } from "./models/context-model.ts";
import "./index.css";
import { MolstarViewer } from "./components/MolstarViewer.tsx";

declare global {
  interface Window {
    ContextModel: ContextModel;
  }
}

const context = new ContextModel();
window.ContextModel = context;

createRoot(document.getElementById("root")!).render(
  <MolstarViewer context={context} />
);
