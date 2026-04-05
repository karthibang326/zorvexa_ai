import { topologicalLayers } from "./topological-sort";

describe("topologicalLayers", () => {
  it("builds layered order for DAG", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
      { source: "c", target: "d" },
    ];
    const layers = topologicalLayers(nodes, edges);
    expect(layers[0]).toEqual(["a"]);
    expect(new Set(layers[1])).toEqual(new Set(["b", "c"]));
    expect(layers[2]).toEqual(["d"]);
  });

  it("throws on cycle", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ];
    expect(() => topologicalLayers(nodes, edges)).toThrow("cycle");
  });
});

