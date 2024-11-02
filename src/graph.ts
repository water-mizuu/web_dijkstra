import { DefaultMap } from "./default_map";
import { ShortestPathStep } from "./simulation";

export type GraphNode = Readonly<{
  id: number;
  label?: string;
}>;

export type Edge = [GraphNode, GraphNode, number];

export class WeightedGraph {
  constructor(
    public edges: [GraphNode, GraphNode, number][],
    public vertices: GraphNode[]
  ) { }

  public dot(): string {
    const buffer: string[] = [
      "graph G {\n",
      `  graph[nodesep=2 mode="sgd" bgcolor=none];\n`,
      `  edge[len=2.0];\n`,
      `  node[shape="circle" style="filled" fillcolor="white"];\n`,
    ];

    for (const vertex of this.vertices) {
      buffer.push(`  ${vertex.id}`);

      const name = vertex.label ?? vertex.id.toString();
      buffer.push(`[label="${name}" xlabel=" "];\n`);
    }

    const seenMap: DefaultMap<GraphNode, Set<GraphNode>> = new DefaultMap((_) => new Set());
    for (const [left, right, weight] of this.edges) {
      if (seenMap.get(left).has(right) || seenMap.get(right).has(left)) continue;

      buffer.push(`  ${left.id} -- ${right.id} [xlabel="${weight}"];\n`);

      seenMap.get(left).add(right);
      seenMap.get(right).add(left);
    }

    buffer.push("};");

    return buffer.join("");
  }

  public shortestPath(start: GraphNode) {
    const notVisited = new Set<GraphNode>();
    const predecessors = new Map<GraphNode, GraphNode>();
    const distances = new Map<GraphNode, number>();

    for (const node of this.vertices) {
      notVisited.add(node);
      distances.set(node, Infinity);
    }
    distances.set(start, 0);

    /// Cycle:
    /**
     * 1. We get the minimum distance not in [visited].
     * 2. Update the neighbors.
     * 3. Again.
     */
    while (notVisited.size > 0) {
      const nv = [...notVisited];
      nv.sort((a, b) => distances.get(a)! - distances.get(b)!);
      const shortest = nv[0];
      for (const [left, right, weight] of this.edges) {
        if (left !== shortest && right !== shortest) continue;

        const [source, target] = left == shortest ? [left, right] : [right, left];
        const computedNewDistance = distances.get(source)! + weight;

        if (distances.get(target)! > computedNewDistance) {
          distances.set(target, computedNewDistance);
          predecessors.set(target, source);
        }
      }

      notVisited.delete(shortest);
    }
  }

  public shortestPathDetailed(start: GraphNode): ShortestPathStep[] {
    const output: ShortestPathStep[] = [];

    const notVisited = new Set<GraphNode>();
    const predecessors = new Map<GraphNode, GraphNode>();
    const distances = new Map<GraphNode, number>();

    const visitedNodes = () => new Set(this.vertices.filter((s) => !notVisited.has(s)));

    output.push({
      visitedNodes: new Set(), //
      predecessors: new Map(),
      distances: new Map(),
      node: start,
      identifier: "indicate-start",
    });

    for (const node of this.vertices) {
      notVisited.add(node);
      distances.set(node, Infinity);
    }
    output.push({
      nodes: this.vertices,
      visitedNodes: visitedNodes(), //
      predecessors: new Map(predecessors),
      distances: new Map(distances),
      identifier: "set-infinity",
    });

    distances.set(start, 0);
    output.push({
      node: start,
      visitedNodes: visitedNodes(), //
      predecessors: new Map(predecessors),
      distances: new Map(distances),
      identifier: "set-start-zero",
    });

    /// Cycle:
    /**
     * 1. We get the minimum distance not in [visited].
     * 2. Update the neighbors.
     * 3. Again.
     */
    while (notVisited.size > 0) {
      const nv = [...notVisited];
      nv.sort((a, b) => distances.get(a)! - distances.get(b)!);
      const shortest = nv[0];

      output.push({
        node: shortest, //
        visitedNodes: visitedNodes(), //
        predecessors: new Map(predecessors),
        distances: new Map(distances),
        identifier: "visit-node",
      });

      for (const [left, right, weight] of this.edges) {
        if (left !== shortest && right !== shortest) continue;

        const [source, target] = left == shortest ? [left, right] : [right, left];
        if (!notVisited.has(target)) continue;

        output.push({
          node: source,
          neighbor: target,
          visitedNodes: visitedNodes(), //
          predecessors: new Map(predecessors),
          distances: new Map(distances),
          identifier: "check-neighbor",
        });

        const existingDistance = distances.get(target)!;
        const computedDistance = distances.get(source)! + weight;
        output.push({
          node: source,
          neighbor: target,
          computedDistance: computedDistance,
          existingDistance: existingDistance,
          visitedNodes: visitedNodes(), //
          predecessors: new Map(predecessors),
          distances: new Map(distances),
          identifier: "compare-neighbor",
        });

        if (existingDistance > computedDistance) {
          distances.set(target, computedDistance);
          output.push({
            node: source,
            neighbor: target,
            computedDistance: computedDistance,
            existingDistance: existingDistance,
            visitedNodes: visitedNodes(), //
            predecessors: new Map(predecessors),
            distances: new Map(distances),
            identifier: "update-neighbor-weight",
          });

          predecessors.set(target, source);
        } else {
          output.push({
            node: source,
            neighbor: target,
            computedDistance: computedDistance,
            existingDistance: existingDistance,
            visitedNodes: visitedNodes(), //
            predecessors: new Map(predecessors),
            distances: new Map(distances),
            identifier: "not-update-neighbor-weight",
          });
        }
      }

      output.push({
        node: shortest,
        edge: predecessors.get(shortest) == null ? null : [predecessors.get(shortest)!, shortest],
        visitedNodes: visitedNodes(), //
        predecessors: new Map(predecessors),
        distances: new Map(distances),
        identifier: "mark-as-visited",
      });
      notVisited.delete(shortest);
    }

    const unusedEdges: [GraphNode, GraphNode][] = [];
    for (const [left, right,] of this.edges) {
      if (predecessors.get(right) == left || predecessors.get(left) == right) {
        continue;
      }

      unusedEdges.push([left, right]);
    }

    output.push({
      startNode: start,
      unusedEdges: unusedEdges,
      visitedNodes: visitedNodes(),
      predecessors: new Map(predecessors),
      distances: new Map(distances),
      identifier: "complete",
    });

    return output;
  }
}
