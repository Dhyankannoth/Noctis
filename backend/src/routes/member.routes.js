const express = require("express");
const { requireAuth, requireProjectAccess } = require("../auth/middleware");
const {
  handleListMembers,
  handleInviteMember,
  handleChangeRole,
  handleRemoveMember,
  handleLeaveProject,
} = require("../controllers/member.controller");

// MergeParams true lets us access the projectId parameter from parent routes
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

// Members lists require viewer+ access
router.get("/", requireProjectAccess("viewer"), handleListMembers);

// Owner-only operations
router.post("/", requireProjectAccess("owner"), handleInviteMember);
router.patch("/:uid", requireProjectAccess("owner"), handleChangeRole);
router.delete("/:uid", requireProjectAccess("owner"), handleRemoveMember);

// Leaving requires membership, checked in controller
router.delete("/me/leave", handleLeaveProject);

module.exports = router;
