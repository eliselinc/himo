fetch('./graph.json')
  .then(res => res.json())
  .then(raw => {

    const elements = [
      ...raw.graph.nodes,
      ...raw.graph.edges
    ];

    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements,

      layout: { name: 'preset' },

      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(properties.name)',
            'text-wrap': 'wrap',
            'text-max-width': 140,
            'font-size': 12,
            'color': '#0f172a',
            'background-color': '#38bdf8',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },

        {
          selector: 'node[labels includes "HIMO"]',
          style: {
            'background-color': '#0ea5e9',
            'font-size': 16,
            'font-weight': 'bold'
          }
        },

        {
          selector: 'node[labels includes "Type"]',
          style: { 'background-color': '#22c55e' }
        },

        {
          selector: 'node[labels includes "Context"]',
          style: { 'background-color': '#a855f7' }
        },

        {
          selector: 'node[labels includes "Fonds"]',
          style: { 'background-color': '#f59e0b' }
        },

        {
          selector: 'node[labels includes "Series"]',
          style: { 'background-color': '#e11d48' }
        },

        {
          selector: 'edge',
          style: {
            'label': 'data(label)',
            'curve-style': 'bezier',
            'line-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#94a3b8',
            'font-size': 9
          }
        },

        {
          selector: '.hidden',
          style: { 'display': 'none' }
        }
      ]
    });

    // ---- INITIAL STATE ----
    const rootId = '6'; // HIMO
    const root = cy.getElementById(rootId);

    cy.elements().addClass('hidden');
    root.removeClass('hidden');

    cy.center(root);
    cy.zoom(1.3);

    // ---- INTERACTION ----
    cy.on('tap', 'node', evt => {
      const node = evt.target;

      // Leaf node → open URL (if present)
      const url = node.data('properties')?.url;
      if (url) {
        window.open(url, '_blank');
        return;
      }

      // Already expanded → do nothing
      if (node.data('expanded')) return;
      node.data('expanded', true);

      // Reveal children + edges
      node.outgoers().removeClass('hidden');

      cy.layout({
        name: 'cose',
        animate: true,
        fit: false,
        padding: 40
      }).run();
    });
  });
