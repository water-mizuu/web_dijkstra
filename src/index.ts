import "../styles.css";
//
import { instance } from "@viz-js/viz";
import { GraphNode, WeightedGraph } from "./graph";
import { Simulation } from "./simulation";

console.log("Hello World!");

const viz = await instance();

type RenderGraph = (graph: WeightedGraph) => SVGSVGElement;
const renderGraph: RenderGraph = (graph) => {
  console.log(graph.dot());
  const svg = viz.renderSVGElement(graph.dot(), { engine: "neato" });

  return svg;
};

const A = { id: 0, label: "A" };
const B = { id: 1, label: "B" };
const C = { id: 2, label: "C" };
const D = { id: 3, label: "D" };
const E = { id: 4, label: "E" };
const F = { id: 5, label: "F" };

const vertices = [A, B, C, D, E, F];
const edges: [GraphNode, GraphNode, number][] = [
  [A, B, 9],
  [A, C, 2],
  [A, D, 4],
  [C, D, 1],
  [C, E, 3],
  [E, D, 3],
  [E, B, 4],
  [B, D, 4],
  [B, F, 3],
  [E, F, 6],
];

const graph = new WeightedGraph(edges, vertices);
const svg = renderGraph(graph);
document.querySelector(".graph-svg-holder")?.appendChild(svg);

const previous = document.querySelector(".simulation-button.previous") as HTMLButtonElement;
const next = document.querySelector(".simulation-button.next") as HTMLButtonElement;
const simulation = new Simulation(graph, svg, { buttons: { previous, next } });
simulation.init(A);

const limit = 5;
document.addEventListener("click", function (event) {
  let node: Element | null = event.target as Element;
  let depth = 0;
  while (depth++ < limit && node != null && !node.classList.contains("node")) {
    node = node.parentElement;
  }

  if (node != null) {
    const parent = node;
    const id = parent.querySelector("title")?.textContent;
    if (id == null) return;

    const startGraphNode = vertices.filter(s => s.id == parseInt(id))[0];
    if (startGraphNode == null) return;

    simulation.init(startGraphNode);
  }
});
