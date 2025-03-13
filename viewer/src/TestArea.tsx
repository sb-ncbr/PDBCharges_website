/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { MolstarViewer } from "./components/MolstarViewer";
import { ContextModel } from "./models/context-model";

export function TestArea({ context }: { context: ContextModel }) {
  const [smooth, setSmooth] = useState(true);
  const [water, setWater] = useState(false);
  const [membrane, setMembrane] = useState(false);
  const [coloring, setColoring] = useState<"absolute" | "relative">("relative");
  const [range, setRange] = useState(0);

  useEffect(() => {
    const init = async () => {
      await context.init();
      await context.load("http://localhost:3000/data/2pws.cif");
      context.subAfterLoad();
      context.color.setChargesSmoothing(true);
      setRange(context.state.range.value);
    };
    init();

    return () => {
      context.unsub();
    };
  }, []);

  useEffect(() => {
    context.color.setChargesSmoothing(smooth);
    context.type.setWaterVisibility(water);
    context.type.showMembraneVisibility(membrane);
    if (coloring === "relative") {
      context.color.relative();
    } else {
      context.color.absolute();
    }
    context.color.setRange(range);
  }, [coloring, membrane, range, smooth, water]);

  return (
    <div
      style={{
        width: "1000px",
        height: "800px",
        padding: "50px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <input
              id="smooth-color"
              type="checkbox"
              onChange={(e) => setSmooth(e.target.checked)}
              checked={smooth}
            />
            <label htmlFor="smooth-color">Smooth color</label>
          </div>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <input
              id="show-water"
              type="checkbox"
              onChange={(e) => setWater(e.target.checked)}
              checked={water}
            />
            <label htmlFor="show-water">Water</label>
          </div>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <input
              id="show-membrane"
              type="checkbox"
              onChange={(e) => setMembrane(e.target.checked)}
              checked={membrane}
            />
            <label htmlFor="show-membrane">Membrane</label>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <input
              id="relative"
              type="radio"
              onChange={() => setColoring("relative")}
              checked={coloring === "relative"}
            />
            <label htmlFor="relative">Relative</label>
          </div>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <input
              id="absolute"
              type="radio"
              onChange={() => setColoring("absolute")}
              checked={coloring === "absolute"}
            />
            <label htmlFor="absolute">Absolute</label>
          </div>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <label htmlFor="range">Range</label>
            <input
              id="range"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={range}
              onChange={(e) => setRange(+e.target.value)}
            />
          </div>
        </div>
      </div>
      <MolstarViewer context={context} />
    </div>
  );
}
