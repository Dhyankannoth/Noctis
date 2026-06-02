const projectService = require("../services/project.service");

async function handleCreateProject(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }
    const project = await projectService.createProject(name, description, req.user.sub);
    res.status(201).json(project);
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleListProjects(req, res) {
  try {
    const projects = await projectService.listProjects(req.user.sub);
    res.status(200).json(projects);
  } catch (err) {
    console.error("List projects error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGetProject(req, res) {
  try {
    const project = await projectService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json(project);
  } catch (err) {
    console.error("Get project error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleUpdateProject(req, res) {
  try {
    const { name, description } = req.body;
    const project = await projectService.updateProject(req.params.id, name, description);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json(project);
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleDeleteProject(req, res) {
  try {
    const project = await projectService.deleteProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json({ message: "Project deleted successfully", project });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGetSnapshot(req, res) {
  try {
    const snapshot = await projectService.getSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json(snapshot);
  } catch (err) {
    console.error("Get snapshot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleSaveSnapshot(req, res) {
  try {
    const { nodes, edges } = req.body;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: "Invalid snapshot data: nodes and edges must be arrays" });
    }
    const result = await projectService.saveSnapshot(req.params.id, nodes, edges);
    res.status(200).json(result);
  } catch (err) {
    console.error("Save snapshot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGetHistory(req, res) {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);
    const history = await projectService.getHistory(req.params.id, limit, offset);
    res.status(200).json(history);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
  handleUpdateProject,
  handleDeleteProject,
  handleGetSnapshot,
  handleSaveSnapshot,
  handleGetHistory,
};
