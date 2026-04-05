export interface DagNode {
  id: string;
}
export interface DagEdge {
  source: string;
  target: string;
}

export function validateDag(nodes: DagNode[], edges: DagEdge[]) {
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      throw new Error(`Invalid DAG edge ${e.source} -> ${e.target}: node missing`);
    }
  }
  // cycle detection
  const indeg = new Map<string, number>();
  const graph = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    graph.set(id, []);
  }
  for (const e of edges) {
    graph.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const q: string[] = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);
  let visited = 0;
  while (q.length) {
    const curr = q.shift()!;
    visited += 1;
    for (const nxt of graph.get(curr) ?? []) {
      const d = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, d);
      if (d === 0) q.push(nxt);
    }
  }
  if (visited !== nodes.length) {
    throw new Error("DAG contains a cycle");
  }
}

