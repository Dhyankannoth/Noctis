const pool = require("../db");

async function createProject(name, description, ownerId) {
  return await pool.transaction(async (client) => {
    // 1. Insert project
    const projRes = await client.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, ownerId]
    );
    const project = projRes.rows[0];

    // 2. Add owner as member
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [project.id, ownerId]
    );

    return project;
  });
}

async function listProjects(userId) {
  const result = await pool.query(
    `SELECT p.*, pm.role FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE pm.user_id = $1
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getProject(projectId) {
  const result = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
  return result.rows[0];
}

async function updateProject(projectId, name, description) {
  const result = await pool.query(
    `UPDATE projects
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [name, description, projectId]
  );
  return result.rows[0];
}

async function deleteProject(projectId) {
  // Let the database cascade deletes (project_members, diagram_nodes, etc. have ON DELETE CASCADE)
  const result = await pool.query("DELETE FROM projects WHERE id = $1 RETURNING *", [projectId]);
  return result.rows[0];
}

async function getSnapshot(projectId) {
  const project = await getProject(projectId);
  if (!project) return null;

  // Hydrate snapshot from nodes & edges where deleted_at IS NULL
  const nodesRes = await pool.query(
    "SELECT * FROM diagram_nodes WHERE project_id = $1 AND deleted_at IS NULL",
    [projectId]
  );
  const edgesRes = await pool.query(
    "SELECT * FROM diagram_edges WHERE project_id = $1 AND deleted_at IS NULL",
    [projectId]
  );

  return {
    project,
    nodes: nodesRes.rows,
    edges: edgesRes.rows,
  };
}

async function saveSnapshot(projectId, nodes, edges) {
  return await pool.transaction(async (client) => {
    // 1. Get current version of project
    const versionRes = await client.query("SELECT version FROM projects WHERE id = $1 FOR UPDATE", [projectId]);
    const currentVersion = parseInt(versionRes.rows[0].version, 10);
    const newVersion = currentVersion + 1;

    // 2. Soft delete existing nodes and edges
    await client.query("UPDATE diagram_nodes SET deleted_at = NOW() WHERE project_id = $1 AND deleted_at IS NULL", [projectId]);
    await client.query("UPDATE diagram_edges SET deleted_at = NOW() WHERE project_id = $1 AND deleted_at IS NULL", [projectId]);

    // 3. Bulk insert new nodes
    const savedNodes = [];
    for (const node of nodes) {
      const nodeRes = await client.query(
        `INSERT INTO diagram_nodes (id, project_id, node_type, label, meta, position_x, position_y, width, height)
         VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [node.id, projectId, node.node_type || "service", node.label, JSON.stringify(node.meta || {}), node.position_x || 0, node.position_y || 0, node.width || 120, node.height || 60]
      );
      savedNodes.push(nodeRes.rows[0]);
    }

    // 4. Bulk insert new edges
    const savedEdges = [];
    for (const edge of edges) {
      await client.query(
        `INSERT INTO diagram_edges (id, project_id, source_id, target_id, edge_type, label, meta)
         VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [edge.id, projectId, edge.source_id, edge.target_id, edge.edge_type || "http", edge.label || "", JSON.stringify(edge.meta || {})]
      );
    }

    // 5. Update snapshot metadata in projects
    const fullSnapshot = { nodes: savedNodes, edges: savedEdges };
    await client.query(
      `UPDATE projects
       SET snapshot = $1, version = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(fullSnapshot), newVersion, projectId]
    );

    return {
      version: newVersion,
      snapshot: fullSnapshot,
    };
  });
}

async function getHistory(projectId, limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT ol.*, u.display_name, u.email FROM operations_log ol
     JOIN users u ON ol.user_id = u.id
     WHERE ol.project_id = $1
     ORDER BY ol.id DESC
     LIMIT $2 OFFSET $3`,
    [projectId, limit, offset]
  );
  return result.rows;
}

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  getSnapshot,
  saveSnapshot,
  getHistory,
};
