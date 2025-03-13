import { createRoot } from "react-dom/client";
import { ContextModel } from "./models/context-model.ts";
import { MolstarViewer } from "./components/MolstarViewer.tsx";
import { TestArea } from "./TestArea.tsx";
import "./index.css";

declare global {
  interface Window {
    ContextModel: ContextModel;
  }
}

if (import.meta.env.PROD) {
  const context = new ContextModel();
  window.ContextModel = context;

  createRoot(document.getElementById("root")!).render(
    <MolstarViewer context={context} />
  );
}

if (import.meta.env.DEV) {
  const context = new ContextModel();

  createRoot(document.getElementById("root")!).render(
    <TestArea context={context} />
  );
}
