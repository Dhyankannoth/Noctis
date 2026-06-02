const express = require("express");
const { requireAuth, requireProjectAccess } = require("../auth/middleware");
const {
  handleGetNodes,
  handleGetEdges,
  handleGetNode,
} = require("../controllers/diagram.controller");

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectAccess("viewer"));

router.get("/nodes", handleGetNodes);
router.get("/edges", handleGetEdges);
router.get("/nodes/:nid", handleGetNode);

module.exports = router;
