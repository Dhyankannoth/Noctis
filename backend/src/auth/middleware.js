const { verifyAccessToken } = require("./jwt");
const pool = require("../db");

const requireAuth = (req, res, next) => {
  // Read from httpOnly cookie first, then fallback to Authorization header
  let token = req.cookies ? req.cookies["access_token"] : null;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // decoded contains: sub (userId), email, role
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

const roleRank = (role) => {
  if (role === "owner") return 3;
  if (role === "editor") return 2;
  if (role === "viewer") return 1;
  return 0;
};

const requireProjectAccess = (minRole = "viewer") => {
  return async (req, res, next) => {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    const userId = req.user.sub;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required for access check" });
    }

    try {
      // 1. Check if the project is public (if requiring only 'viewer')
      if (minRole === "viewer") {
        const projRes = await pool.query("SELECT is_public FROM projects WHERE id = $1", [projectId]);
        if (projRes.rows.length > 0 && projRes.rows[0].is_public) {
          req.membership = { role: "viewer", project_id: projectId, user_id: userId };
          return next();
        }
      }

      // 2. Query project_members table
      const memberRes = await pool.query(
        "SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, userId]
      );
      const membership = memberRes.rows[0];

      if (!membership || roleRank(membership.role) < roleRank(minRole)) {
        return res.status(403).json({ error: "Forbidden: Insufficient project permissions" });
      }

      req.membership = membership;
      next();
    } catch (err) {
      console.error("Error checking project membership:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports = {
  requireAuth,
  requireProjectAccess,
};
