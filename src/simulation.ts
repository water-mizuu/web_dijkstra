import { GraphNode, WeightedGraph } from "./graph";

type StepCommons = {
  visitedNodes: Set<GraphNode>;
  predecessors: Map<GraphNode, GraphNode>;
  distances: Map<GraphNode, number>;
}
type StepSpecific =
  | {
    /// Signifies the setting of all vertices to infinity.
    nodes: GraphNode[]
    identifier: "set-infinity";
  }
  | {
    /// Signifies the start node being set to zero.
    node: GraphNode
    identifier: "set-start-zero";
  }
  | {
    /// Signifies the visiting of a node.
    node: GraphNode
    identifier: "visit-node";
  }
  | {
    /// Signifies checking the neighbor of a node.
    node: GraphNode;
    neighbor: GraphNode
    identifier: "check-neighbor";
  }
  | {
    node: GraphNode;
    neighbor: GraphNode;
    computedDistance: number;
    existingDistance: number
    identifier: "compare-neighbor";
  }
  | {
    /// Signifies updating the weight of a node.
    node: GraphNode;
    neighbor: GraphNode;
    computedDistance: number;
    existingDistance: number
    identifier: "update-neighbor-weight";
  }
  | {
    /// Signifies updating the weight of a node.
    node: GraphNode;
    neighbor: GraphNode;
    computedDistance: number;
    existingDistance: number
    identifier: "not-update-neighbor-weight";
  }
  | {
    node: GraphNode;
    edge: [GraphNode, GraphNode] | null
    identifier: "mark-as-visited";
  }
  | {
    identifier: "complete"
  };

export type ShortestPathStep = StepCommons & StepSpecific;

export class Simulation {
  /// Simulation variables.
  public step: number;
  public sequence: ShortestPathStep[];

  //// HTML variables.
  public previous: HTMLButtonElement;
  public next: HTMLButtonElement;

  public constructor(
    public graph: WeightedGraph,
    public svg: SVGSVGElement,
    buttons: { buttons: { previous: HTMLButtonElement; next: HTMLButtonElement } }
  ) {
    this.step = -Infinity;
    this.sequence = [];

    this.previous = buttons.buttons.previous;
    this.next = buttons.buttons.next;

    this.previous.addEventListener("click", this.#stepBackward);
    this.next.addEventListener("click", this.#stepForward);
  }

  public init(start: GraphNode): void {
    this.step = -1;
    this.sequence = this.graph.shortestPathDetailed(start);

    this.#draw();
  }

  public dispose(): void {
    this.previous.removeEventListener("click", this.#stepBackward);
    this.next.removeEventListener("click", this.#stepForward);
  }

  #stepForward = this.stepForward.bind(this);
  public stepForward() {
    this.step = Math.min(this.sequence.length - 1, this.step + 1);

    this.#draw();
    this.#lockIfNecessary();
  }

  #stepBackward = this.stepBackward.bind(this);
  public stepBackward() {
    this.step = Math.max(-1, this.step - 1);

    this.#draw();
    this.#lockIfNecessary();
  }

  #nodeSvgElements(
    node: GraphNode
  ): [ellipse: SVGEllipseElement, label: SVGTextElement, externalLabel: SVGTextElement] | null {
    const targets = this.svg.querySelectorAll(".node:has(title)");
    for (const trg of targets) {
      const target = trg as HTMLElement;
      const title = target.querySelector("title") as HTMLTitleElement;
      const ellipse = target.querySelector("ellipse") as SVGEllipseElement;
      const [label, xLabel] = [...target.querySelectorAll("text")];

      if (title.textContent === node.id.toString()) {
        return [ellipse, label, xLabel];
      }
    }

    return null;
  }

  #edgeSvgElements(edge: [GraphNode, GraphNode]): [SVGPathElement, SVGTextElement] | null {
    const targets = this.svg.querySelectorAll(".edge:has(title)");
    for (const trg of targets) {
      const target = trg as HTMLElement;
      const title = target.querySelector("title") as HTMLTitleElement;
      const path = target.querySelector("path") as SVGPathElement;
      const text = target.querySelector("text") as SVGTextElement;

      if (title.textContent === `${edge[0].id}--${edge[1].id}` ||
        title.textContent === `${edge[1].id}--${edge[0].id}`) {
        return [path, text];
      }
    }

    return null;
  }

  #highlightEdge(edge: [GraphNode, GraphNode], color: string) {
    const elements = this.#edgeSvgElements(edge);
    if (elements == null) return;

    const [path, text] = elements;
    const previousAttr = path.getAttribute("stroke");
    path.setAttribute("stroke-modified", previousAttr ?? "null");
    path.setAttribute("stroke", color);
  }

  #highlightVertex(node: GraphNode, color: string) {
    const elements = this.#nodeSvgElements(node);
    if (elements == null) return;
    const [ellipse, text, xLabel] = elements;

    const previousAttr = ellipse.getAttribute("stroke");
    ellipse.setAttribute("stroke-modified", previousAttr ?? "null");
    ellipse.setAttribute("stroke", color);

    const previousStrokeWidth = ellipse.getAttribute("stroke-width");
    ellipse.setAttribute("stroke-width-modified", previousStrokeWidth ?? "null");
    ellipse.setAttribute("stroke-width", "2");
  }

  #highlightExternalLabel(node: GraphNode, color: string) {
    const elements = this.#nodeSvgElements(node);
    if (elements == null) return;
    const [ellipse, text, xLabel] = elements;

    const previousStroke = xLabel.getAttribute("stroke");
    xLabel.setAttribute("stroke-modified", previousStroke ?? "null");
    const previousStrokeWidth = xLabel.getAttribute("stroke-width");
    xLabel.setAttribute("stroke-width-modified", previousStrokeWidth ?? "null");

    xLabel.setAttribute("stroke", color);
    xLabel.setAttribute("stroke-width", "1.2");
  }

  #renameExternalLabel(node: GraphNode, value: string, permanent = false) {
    const elements = this.#nodeSvgElements(node);
    if (elements == null) return;
    const [ellipse, text, xLabel] = elements;

    const previousText = xLabel.textContent;
    if (!permanent) {
      xLabel.setAttribute("text-modified", previousText ?? "null");
    } else {
      xLabel.removeAttribute("text-modified");
    }
    xLabel.textContent = value;
  }

  #renameAction(value: string) {
    const text = document.querySelector(".action-text");
    if (text == null) return;

    text.textContent = value;
  }

  #lockIfNecessary() {
    this.previous.removeAttribute("disabled");
    this.next.removeAttribute("disabled");

    if (this.step <= -1) {
      this.previous.setAttribute("disabled", "true");
    }
    if (this.step >= this.sequence.length - 1) {
      this.next.setAttribute("disabled", "true");
    }
  }

  #draw() {
    const colors = {
      red: "red",
      green: "green",
      blue: "blue",
      highlight: "green",
    } as const;

    /// Undo all changes from previous [draw] call.
    this.#renameAction("");

    for (const strokeWidthModified of this.svg.querySelectorAll("[stroke-width-modified]")) {
      const attributeValue = strokeWidthModified.getAttribute("stroke-width-modified");

      if (attributeValue == null) {
        strokeWidthModified.removeAttribute("stroke-width");
      } else {
        strokeWidthModified.setAttribute("stroke-width", attributeValue);
      }
    }
    for (const strokeModified of this.svg.querySelectorAll("[stroke-modified]")) {
      const attributeValue = strokeModified.getAttribute("stroke-modified");

      if (attributeValue == null) {
        strokeModified.removeAttribute("stroke");
      } else {
        strokeModified.setAttribute("stroke", attributeValue);
      }
    }
    for (const strokeModified of this.svg.querySelectorAll("[text-modified]")) {
      const previousText = strokeModified.getAttribute("text-modified");

      strokeModified.textContent = previousText == "null" ? null : previousText;
    }

    for (const strokeModified of this.svg.querySelectorAll("[stroke-permanent]")) {
      const [rawNumber, value] = strokeModified.getAttribute("stroke-permanent")!.split(";");
      const number = parseInt(rawNumber);

      if (this.step >= number) {
        strokeModified.setAttribute("stroke", value);
      }
    }

    const current = this.sequence[this.step];
    if (current == null) return;

    for (const [left, right] of current.predecessors.entries()) {
      if (current.visitedNodes.has(left) && current.visitedNodes.has(right)) {
        this.#highlightEdge([left, right], "red");
      }
    }
    for (const node of current.visitedNodes) {
      this.#highlightVertex(node, colors.red);
    }
    for (const [node, distance] of current.distances.entries()) {
      this.#renameExternalLabel(node, distance == Infinity ? "∞" : distance.toString());
    }

    if (current.identifier == "set-infinity") {
      this.#renameAction("Set distances to all nodes as infinity.");
      for (const node of current.nodes) {
        this.#highlightExternalLabel(node, colors.highlight);
        this.#renameExternalLabel(node, "∞", true);
      }

      return;
    } else if (current.identifier == "set-start-zero") {
      this.#renameAction("Set the distance of the start node as 0.");
      const node = current.node;
      this.#highlightExternalLabel(node, colors.highlight);
      this.#renameExternalLabel(node, "0", true);

      return;
    } else if (current.identifier == "visit-node") {
      const node = current.node;

      this.#highlightVertex(node, colors.highlight);

      const name = node.label ?? node.id.toString();
      const message =
        `Visit node ${name}, ` +
        `as it is the unvisited node with the smallest distance.`;

      this.#renameAction(message);
      return;
    } else if (current.identifier == "check-neighbor") {
      const source = current.node;
      const target = current.neighbor;

      const sourceName = source.label ?? source.id.toString();
      const targetName = target.label ?? target.id.toString();
      const message = `From node ${sourceName}, check ${targetName}.`;

      this.#highlightVertex(source, colors.highlight);
      this.#highlightVertex(target, colors.blue);
      this.#highlightEdge([source, target], colors.blue);

      this.#renameAction(message);
      return;
    } else if (current.identifier == "compare-neighbor") {
      const source = current.node;
      const target = current.neighbor;

      const computedDistance = current.computedDistance;
      const existingDistance = current.existingDistance;

      const message = `Comparing the computed weight of '${computedDistance}' ` +
        `to the node's value, '${existingDistance}'`;

      this.#highlightVertex(source, colors.highlight);
      this.#highlightVertex(target, colors.blue);

      this.#renameAction(message);
      return;
    } else if (current.identifier == "update-neighbor-weight") {
      const source = current.node;
      const target = current.neighbor;

      const computedDistance = current.computedDistance;
      const existingDistance = current.existingDistance;

      const message = `Since '${computedDistance}' is less than ` +
        `'${existingDistance}', replace the distance.`;

      this.#highlightVertex(source, colors.highlight);
      this.#highlightVertex(target, colors.blue);

      this.#renameExternalLabel(target, `${computedDistance}`, true);
      this.#highlightExternalLabel(target, colors.highlight);

      this.#renameAction(message);
      return;
    } else if (current.identifier == "not-update-neighbor-weight") {
      const source = current.node;
      const target = current.neighbor;

      const computedDistance = current.computedDistance;
      const existingDistance = current.existingDistance;

      const message = `Since '${computedDistance}' is less than or equal to ` +
        `'${existingDistance}', do nothing.`;

      this.#highlightVertex(source, colors.highlight);
      this.#highlightVertex(target, colors.blue);

      this.#renameAction(message);
      return;
    } else if (current.identifier == "mark-as-visited") {
      const node = current.node;

      const name = node.label ?? node.id.toString();
      const message = `All neighbors of node ${name} has been visited, so mark it as visited.`;

      if (current.edge != null) {
        this.#highlightEdge(current.edge, colors.red);
      }
      this.#highlightVertex(node, colors.red);
      this.#renameAction(message);
      return;
    } else if (current.identifier == "complete") {
      const message = `All nodes have been resolved, so the algorithm is complete.`;
      this.#renameAction(message);
      return;
    }
  }
}
