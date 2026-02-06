const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#graph").append("svg")
  .attr("width", width)
  .attr("height", height);

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2));

let graphData = { nodes: [], links: [] };

// Color scheme by node type
const colorScale = d3.scaleOrdinal()
  .domain(["Type", "Fonds", "Series", "Context", "HIMO"])
  .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

// Load your JSON graph
d3.json("graph.json").then(data => {
  graphData = data;
  update(graphData);
});

function update(data) {
  svg.selectAll("*").remove();

  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(data.edges)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.5);

  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation));

  node.append("circle")
    .attr("r", 20)
    .attr("fill", d => colorScale(d.labels[0]))
    .on("click", expandNode);

  node.append("text")
    .attr("dx", 25)
    .attr("dy", ".35em")
    .text(d => d.attributes.name);

  simulation
    .nodes(data.nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(data.edges);

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

// Dragging behavior
function drag(sim) {
  function dragstarted(event, d) {
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

// Neo4j-style node expansion
function expandNode(event, node) {
  // Example dynamic behavior: add a dummy child node
  const newNodeId = node.id + "_child";

  if (!graphData.nodes.find(n => n.id === newNodeId)) {
    const newNode = {
      id: newNodeId,
      labels: ["Series"],
      attributes: { name: "New Series Node" }
    };
    graphData.nodes.push(newNode);
    graphData.edges.push({ source: node.id, target: newNodeId, label: "HAS_SERIES", attributes: {} });
    update(graphData);
  }
}
