const pool = require("../db");

class ConflictError extends Error {
  constructor(serverVersion) {
    super(`Conflict detected. Server version is ${serverVersion}`);
    this.name = "ConflictError";
    this.serverVersion = serverVersion;
  }
}

const OP_HANDLERS = {
  ADD_NODE: async (client, payload, projectId) => {
    const { id, node_type, label, meta, position_x, position_y, width, height } = payload;
    const res = await client.query(
      `INSERT INTO diagram_nodes (id, project_id, node_type, label, meta, position_x, position_y, width, height)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, projectId, node_type || "service", label || "New Node", JSON.stringify(meta || {}), position_x || 0, position_y || 0, width || 120, height || 60]
    );
    return res.rows[0];
  },

  UPDATE_NODE_POSITION: async (client, payload, projectId) => {
    const { id, position_x, position_y } = payload;
    const res = await client.query(
      `UPDATE diagram_nodes
       SET position_x = $1, position_y = $2, updated_at = NOW()
       WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [position_x, position_y, id, projectId]
    );
    return res.rows[0];
  },

  UPDATE_NODE_LABEL: async (client, payload, projectId) => {
    const { id, label } = payload;
    const res = await client.query(
      `UPDATE diagram_nodes
       SET label = $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [label, id, projectId]
    );
    return res.rows[0];
  },

  UPDATE_NODE_META: async (client, payload, projectId) => {
    const { id, meta } = payload;
    const res = await client.query(
      `UPDATE diagram_nodes
       SET meta = meta || $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [JSON.stringify(meta || {}), id, projectId]
    );
    return res.rows[0];
  },

  RESIZE_NODE: async (client, payload, projectId) => {
    const { id, width, height } = payload;
    const res = await client.query(
      `UPDATE diagram_nodes
       SET width = $1, height = $2, updated_at = NOW()
       WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [width, height, id, projectId]
    );
    return res.rows[0];
  },

  DELETE_NODE: async (client, payload, projectId) => {
    const { id } = payload;
    // Soft delete node
    const nodeRes = await client.query(
      `UPDATE diagram_nodes
       SET deleted_at = NOW()
       WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, projectId]
    );
    // Soft delete edges connected to node
    await client.query(
      `UPDATE diagram_edges
       SET deleted_at = NOW()
       WHERE (source_id = $1 OR target_id = $1) AND project_id = $2 AND deleted_at IS NULL`,
      [id, projectId]
    );
    return nodeRes.rows[0];
  },

  ADD_EDGE: async (client, payload, projectId) => {
    const { id, source_id, target_id, edge_type, label, meta } = payload;
    const res = await client.query(
      `INSERT INTO diagram_edges (id, project_id, source_id, target_id, edge_type, label, meta)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, projectId, source_id, target_id, edge_type || "http", label || "", JSON.stringify(meta || {})]
    );
    return res.rows[0];
  },

  UPDATE_EDGE_LABEL: async (client, payload, projectId) => {
    const { id, label } = payload;
    const res = await client.query(
      `UPDATE diagram_edges
       SET label = $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [label, id, projectId]
    );
    return res.rows[0];
  },

  UPDATE_EDGE_META: async (client, payload, projectId) => {
    const { id, meta } = payload;
    const res = await client.query(
      `UPDATE diagram_edges
       SET meta = meta || $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [JSON.stringify(meta || {}), id, projectId]
    );
    return res.rows[0];
  },

  DELETE_EDGE: async (client, payload, projectId) => {
    const { id } = payload;
    const res = await client.query(
      `UPDATE diagram_edges
       SET deleted_at = NOW()
       WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, projectId]
    );
    return res.rows[0];
  },

  MOVE_SELECTION: async (client, payload, projectId) => {
    const { nodes } = payload;
    const updated = [];
    for (const node of nodes) {
      const res = await client.query(
        `UPDATE diagram_nodes
         SET position_x = $1, position_y = $2, updated_at = NOW()
         WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [node.position_x, node.position_y, node.id, projectId]
      );
      if (res.rows[0]) updated.push(res.rows[0]);
    }
    return updated;
  },

  RENAME_PROJECT: async (client, payload, projectId) => {
    const { name } = payload;
    const res = await client.query(
      `UPDATE projects
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [name, projectId]
    );
    return res.rows[0];
  },
};

async function applyAtomicOp(op, userId) {
  return await pool.transaction(async (client) => {
    const projectRes = await client.query(
      "SELECT version FROM projects WHERE id = $1 FOR UPDATE",
      [op.projectId]
    );

    if (projectRes.rows.length === 0) {
      throw new Error(`Project with ID ${op.projectId} not found.`);
    }

    const currentVersion = parseInt(projectRes.rows[0].version, 10);

    // Optimistic concurrency check
    if (currentVersion !== parseInt(op.baseVersion, 10)) {
      throw new ConflictError(currentVersion);
    }

    const handler = OP_HANDLERS[op.type];
    if (!handler) {
      throw new Error(`Unhandled atomic operation type: ${op.type}`);
    }

    const delta = await handler(client, op.payload, op.projectId);

    //Increment project version atomically
    const newVersion = currentVersion + 1;
    await client.query(
      "UPDATE projects SET version = $1, updated_at = NOW() WHERE id = $2",
      [newVersion, op.projectId]
    );

    //Append to operations log
    await client.query(
      `INSERT INTO operations_log (project_id, user_id, op_type, op_payload, base_version, result_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [op.projectId, userId, op.type, JSON.stringify(op.payload), currentVersion, newVersion]
    );

    return { newVersion, delta };
  });
}

module.exports = {
  applyAtomicOp,
  ConflictError,
};
