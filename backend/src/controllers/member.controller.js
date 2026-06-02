const memberService = require("../services/member.service");

async function handleListMembers(req, res) {
  try {
    const members = await memberService.listMembers(req.params.id);
    res.status(200).json(members);
  } catch (err) {
    console.error("List members error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleInviteMember(req, res) {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const result = await memberService.inviteMember(req.params.id, email, role, req.user.sub);
    res.status(201).json(result);
  } catch (err) {
    console.error("Invite member error:", err);
    if (err.message === "User with this email does not exist") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleChangeRole(req, res) {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    const result = await memberService.changeRole(req.params.id, req.params.uid, role);
    if (!result) {
      return res.status(404).json({ error: "Member membership not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Change role error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleRemoveMember(req, res) {
  try {
    const result = await memberService.removeMember(req.params.id, req.params.uid);
    if (!result) {
      return res.status(404).json({ error: "Member membership not found" });
    }
    res.status(200).json({ message: "Member removed successfully", result });
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleLeaveProject(req, res) {
  try {
    const result = await memberService.leaveProject(req.params.id, req.user.sub);
    res.status(200).json({ message: "Left project successfully", result });
  } catch (err) {
    console.error("Leave project error:", err);
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  handleListMembers,
  handleInviteMember,
  handleChangeRole,
  handleRemoveMember,
  handleLeaveProject,
};
