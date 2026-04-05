interface NodeShape {
  id: string;
}
interface EdgeShape {
  source: string;
  target: string;
}

export function topologicalLayers(nodes: NodeShape[], edges: EdgeShape[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id));
  const indeg = new Map<string, number>();
  const graph = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    graph.set(id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      throw new Error("Invalid DAG: edge references missing node");
    }
    graph.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const layers: string[][] = [];
  let frontier = [...Array.from(indeg.entries()).filter(([, d]) => d === 0).map(([id]) => id)];
  let visited = 0;
  while (frontier.length > 0) {
    layers.push(frontier);
    const next: string[] = [];
    for (const curr of frontier) {
      visited += 1;
      for (const to of graph.get(curr) ?? []) {
        const d = (indeg.get(to) ?? 0) - 1;
        indeg.set(to, d);
        if (d === 0) next.push(to);
      }
    }
    frontier = next;
  }
  if (visited !== nodes.length) throw new Error("Invalid DAG: cycle detected");
  return layers;
}

