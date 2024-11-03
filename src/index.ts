import "../styles.css";
//
import { instance } from "@viz-js/viz";
import { debounce } from "./debounce";
import { DefaultMap } from "./default_map";
import { Edge, GraphNode, WeightedGraph } from "./graph";
import { Simulation } from "./simulation";

console.log("Hello World!");

const viz = await instance();

type RenderGraph = (graph: WeightedGraph) => SVGSVGElement;
const renderGraph: RenderGraph = (graph) => {
  console.log(graph.dot());
  const svg = viz.renderSVGElement(graph.dot(), { engine: "neato" });

  return svg;
};

const previous = document.querySelector(".simulation-button.previous") as HTMLButtonElement;
const next = document.querySelector(".simulation-button.next") as HTMLButtonElement;

let vertices: GraphNode[];
let simulation: Simulation;
const holder = document.querySelector(".graph-svg-holder");
const textArea = document.getElementById("input-textarea") as HTMLTextAreaElement | null
const generateGraph = function (this: HTMLTextAreaElement) {
  const map = new DefaultMap<string, GraphNode>((key, map) => ({ id: map.size, label: key }));

  vertices = [];
  const edges: Edge[] = [];

  const lines = this.value.split("\n").map(s => s.trim());
  const regex = /(\w+)\s+(\w+)\s+(\d+)/;
  for (const line of lines) {
    const match = regex.exec(line);
    if (match == null) continue;

    const [_, rawLeft, rawRight, rawWeight] = match;
    const left = map.get(rawLeft);
    const right = map.get(rawRight);
    const weight = parseFloat(rawWeight);

    if (!vertices.includes(left)) {
      vertices.push(left);
    }
    if (!vertices.includes(right)) {
      vertices.push(right);
    }

    edges.push([left, right, weight]);
  }

  const graph = new WeightedGraph(edges, vertices);
  const svg = viz.renderSVGElement(graph.dot(), { engine: "neato" });
  simulation = new Simulation(graph, svg, { buttons: { previous, next } });

  if (holder != null) {
    holder.innerHTML = "";
    holder.appendChild(svg);
  }

  simulation.init(vertices[0]);
};

if (textArea != null) {
  textArea.addEventListener("input", debounce(generateGraph.bind(textArea), 1000));
  const initial = `
A B 9
A C 2
A D 4
B D 4
B E 4
B F 6
C D 1
C E 3
D E 3
E F 6`;
  textArea.value = initial.trim();

  generateGraph.call(textArea);
}

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