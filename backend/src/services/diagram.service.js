const pool = require("../db");

async function getNodes(projectId) {
  const result = await pool.query(
    "SELECT * FROM diagram_nodes WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC",
    [projectId]
  );
  return result.rows;
}

async function getEdges(projectId) {
  const result = await pool.query(
    "SELECT * FROM diagram_edges WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC",
    [projectId]
  );
  return result.rows;
}

async function getNode(nodeId) {
  const result = await pool.query(
    "SELECT * FROM diagram_nodes WHERE id = $1 AND deleted_at IS NULL",
    [nodeId]
  );
  return result.rows[0];
}

module.exports = {
  getNodes,
  getEdges,
  getNode,
};
