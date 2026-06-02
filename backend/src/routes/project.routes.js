const express = require("express");
const { requireAuth, requireProjectAccess } = require("../auth/middleware");
const {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
  handleUpdateProject,
  handleDeleteProject,
  handleGetSnapshot,
  handleSaveSnapshot,
  handleGetHistory,
} = require("../controllers/project.controller");

const router = express.Router();

// All projects routes require authentication
router.use(requireAuth);

// Nest members and diagram routes under projects
router.use("/:id/members", require("./member.routes"));
router.use("/:id/diagram", require("./diagram.routes"));

// List and Create do not require specific project access
router.get("/", handleListProjects);
router.post("/", handleCreateProject);

// Specific project routes require project access with different minimum roles
router.get("/:id", requireProjectAccess("viewer"), handleGetProject);
router.patch("/:id", requireProjectAccess("editor"), handleUpdateProject);
router.delete("/:id", requireProjectAccess("owner"), handleDeleteProject);

router.get("/:id/snapshot", requireProjectAccess("viewer"), handleGetSnapshot);
router.post("/:id/snapshot", requireProjectAccess("editor"), handleSaveSnapshot);
router.get("/:id/history", requireProjectAccess("viewer"), handleGetHistory);

module.exports = router;
