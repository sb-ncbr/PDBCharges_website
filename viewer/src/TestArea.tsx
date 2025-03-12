import { useEffect } from "react";
import { MolstarViewer } from "./components/MolstarViewer";
import { ContextModel } from "./models/context-model";

export function TestArea({ context }: { context: ContextModel }) {
  useEffect(() => {
    const init = async () => {
      await context.init();
      await context.load("http://localhost:3000/data/2pws.cif");
      await context.type.default();
      await context.color.setChargesSmoothing(true);
      await context.color.relative();
    };
    init();
  }, [context]);

  return (
    <div style={{ width: "100vw", height: "100vh", padding: "50px" }}>
      {/* <div style={{ display: "flex", flexDirection: "column" }}> */}
      <MolstarViewer context={context} />
      {/* </div> */}
    </div>
  );
}
