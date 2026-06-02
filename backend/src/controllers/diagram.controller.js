const diagramService = require("../services/diagram.service");

async function handleGetNodes(req, res) {
  try {
    const nodes = await diagramService.getNodes(req.params.id);
    res.status(200).json(nodes);
  } catch (err) {
    console.error("Get nodes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGetEdges(req, res) {
  try {
    const edges = await diagramService.getEdges(req.params.id);
    res.status(200).json(edges);
  } catch (err) {
    console.error("Get edges error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGetNode(req, res) {
  try {
    const node = await diagramService.getNode(req.params.nid);
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }
    res.status(200).json(node);
  } catch (err) {
    console.error("Get node error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  handleGetNodes,
  handleGetEdges,
  handleGetNode,
};
