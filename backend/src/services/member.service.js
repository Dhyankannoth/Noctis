const pool = require("../db");

async function getMembership(userId, projectId) {
  const result = await pool.query(
    "SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2",
    [projectId, userId]
  );
  return result.rows[0];
}

async function listMembers(projectId) {
  const result = await pool.query(
    `SELECT pm.*, u.display_name, u.email, u.avatar_url FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at ASC`,
    [projectId]
  );
  return result.rows;
}

async function inviteMember(projectId, email, role, invitedBy) {
  // 1. Look up user by email
  const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = userRes.rows[0];

  if (!user) {
    throw new Error("User with this email does not exist");
  }

  // 2. Insert into project_members
  const result = await pool.query(
    `INSERT INTO project_members (project_id, user_id, role, invited_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, user_id) DO UPDATE
     SET role = EXCLUDED.role
     RETURNING *`,
    [projectId, user.id, role || "viewer", invitedBy]
  );
  return {
    membership: result.rows[0],
    user,
  };
}

async function changeRole(projectId, userId, role) {
  const result = await pool.query(
    `UPDATE project_members
     SET role = $1
     WHERE project_id = $2 AND user_id = $3
     RETURNING *`,
    [role, projectId, userId]
  );
  return result.rows[0];
}

async function removeMember(projectId, userId) {
  const result = await pool.query(
    "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *",
    [projectId, userId]
  );
  return result.rows[0];
}

async function leaveProject(projectId, userId) {
  // Check if owner
  const membership = await getMembership(userId, projectId);
  if (!membership) {
    throw new Error("Not a member of this project");
  }

  if (membership.role === "owner") {
    // Check if there are other owners
    const ownersRes = await pool.query(
      "SELECT count(*) FROM project_members WHERE project_id = $1 AND role = 'owner'",
      [projectId]
    );
    const ownerCount = parseInt(ownersRes.rows[0].count, 10);
    if (ownerCount <= 1) {
      throw new Error("As the sole owner, you must transfer ownership before leaving");
    }
  }

  const result = await pool.query(
    "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *",
    [projectId, userId]
  );
  return result.rows[0];
}

module.exports = {
  getMembership,
  listMembers,
  inviteMember,
  changeRole,
  removeMember,
  leaveProject,
};
