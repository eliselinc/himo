const width = window.innerWidth;
const height = window.innerHeight;

/* ---------------- SVG + ZOOM ---------------- */

const svg = d3.select("#graph").append("svg")
  .attr("width", width)
  .attr("height", height)
  .call(
    d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      })
  );

svg.on("dblclick.zoom", null);

// Background rect to catch pan
svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "transparent")
  .style("pointer-events", "all");

const container = svg.append("g");

/* ---------------- FORCE SIMULATION ---------------- */

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2));

/* ---------------- DATA ---------------- */

let fullGraph = { nodes: [], edges: [] };
let visibleGraph = { nodes: [], edges: [] };

// Color scheme
const colorScale = d3.scaleOrdinal()
  .domain(["HIMO", "Fonds", "Subfonds", "Series", "Context", "PendingFonds"])
  .range(["#020048", "#88bfe7", "#c2def2", "#ebebf8", "#bc98df", "#56beb9"]);

/* ---------------- HELPERS ---------------- */

// Detect expandable nodes
function isExpandable(node) {
  return fullGraph.edges.some(e => e.source === node.id);
}

// Multiline text
function wrapText(text, width) {
  return function(d) {
    const words = d.attributes.name.split(/\s+/);
    let line = [];
    let lines = [];
    let lineWidth = 0;
    const context = document.createElement("canvas").getContext("2d");
    context.font = "12px sans-serif"; // correspond à la taille du texte dans le SVG

    words.forEach(word => {
      const testLine = [...line, word].join(" ");
      const metrics = context.measureText(testLine);
      if (metrics.width > width && line.length > 0) {
        lines.push(line.join(" "));
        line = [word];
      } else {
        line.push(word);
      }
    });
    lines.push(line.join(" "));
    return lines;
  };
}

/* ---------------- INITIALIZE GRAPH ---------------- */

d3.json("graph.json").then(data => {
  fullGraph = data;

  // Find root node (HIMO)
  const root = fullGraph.nodes.find(
    d => d.labels[0] === "HIMO"
  );

  // Initialize visible graph with root only
  visibleGraph.nodes = [root];
  visibleGraph.edges = [];

  update();
});

/* ---------------- UPDATE ---------------- */

function update() {
  container.selectAll("*").remove();

  /* -------- LINKS -------- */
  const link = container.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(visibleGraph.edges, d => `${d.source.id}-${d.target.id}`)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.5);

  /* -------- NODES -------- */
  const node = container.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(visibleGraph.nodes, d => d.id)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation));

  /* -------- MAIN CIRCLE -------- */
  node.append("circle")
    .attr("r", 48)
    .on("click", expandNode)
    .attr("fill", d => {
      // Couleurs spécifiques pour les fonds extra. Cherche le parent dans les edges visibles
      const parentEdge = visibleGraph.edges.find(e => e.target.id === d.id);
      if (parentEdge) {
        const parentName = parentEdge.source.attributes.name;
        if (parentName === "Possible extra-archives") return "#56beb9";
        if (parentName === "Archives of Contextualization") return "#bc98df";
      }
      // Sinon couleur par label selon les constantes définies plus haut
      return colorScale(d.labels[0]);
    });
  
  /* -------- OUTER RING (EXPANDABLE NODES) -------- */
  node.filter(d => isExpandable(d) && !d._expanded)
    .append("circle")
    .attr("r", 54)
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 4")
    .style("pointer-events", "none");

  /* -------- NODE NAME -------- */
  const defaultMaxWidth = 91; // largeur max avant retour à la ligne
  node.each(function(d) {
    // Exception for specific long node names
    const nodeMaxWidth = d.attributes.name === "Literature Review : History of Management and Administrative Management in the US (1920-1950)"
      ? 104
      : defaultMaxWidth; // default max width
    const lines = wrapText(d, nodeMaxWidth)(d);
    const cssClass = d.labels[0] ? d.labels[0].toLowerCase() : null;


    const textElem = d3.select(this).append("text")
      .attr("x", 0)
      .attr("y", - (lines.length - 1) * 7) // centrer verticalement
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("pointer-events", "none")
      .attr("class", cssClass);

    lines.forEach((line, i) => {
      textElem.append("tspan")
        .text(line)
        .attr("x", 0)
        .attr("dy", i === 0 ? 0 : 14); // espacement entre lignes
    });
  });

  /* -------- URL ICON -------- */
  node.filter(d => d.attributes.url)  // uniquement pour les nœuds avec URL
    .append("text")
    .text("🔗")
    .attr("x", 40)
    .attr("y", 35)
    .attr("text-anchor", "start") // commencer à l'endroit x défini
    .attr("dominant-baseline", "middle")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .on("click", (event, d) => {
      event.stopPropagation();       // empêche d'activer expandNode
      window.open(d.attributes.url, "_blank");
    });

  /* -------- SIMULATION -------- */
  simulation.nodes(visibleGraph.nodes).on("tick", ticked);
  simulation.force("link").links(visibleGraph.edges);
  simulation.alpha(0.6).restart();

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

/* ---------------- DRAG ---------------- */

function drag(sim) {
  function dragstarted(event, d) {
    event.sourceEvent.stopPropagation();
    if (!event.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) sim.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

/* ---------------- EXPAND NODE ---------------- */

function expandNode(event, node) {
  event.stopPropagation();
  node._expanded = true; // mark node as expanded

  // 🔒 Lock clicked node in place
  node.fx = node.x;
  node.fy = node.y;

  // Find outgoing edges from this node
  const newEdges = fullGraph.edges.filter(
    e => e.source === node.id
  );

  newEdges.forEach(edge => {
    const targetNode = fullGraph.nodes.find(n => n.id === edge.target);

    if (!visibleGraph.nodes.find(n => n.id === targetNode.id)) {
      // Start new nodes near the clicked node
      targetNode.x = node.x + (Math.random() - 0.5) * 100;
      targetNode.y = node.y + (Math.random() - 0.5) * 100;
      visibleGraph.nodes.push(targetNode);
    }

    if (!visibleGraph.edges.find(
      e =>
        e.source.id === node.id &&
        e.target.id === targetNode.id
    )) {
      visibleGraph.edges.push({
        source: node,
        target: targetNode,
        label: edge.label
      });
    }
  });

  update();

  // Release node after layout stabilizes
  setTimeout(() => {
    node.fx = null;
    node.fy = null;
  }, 300);
}

