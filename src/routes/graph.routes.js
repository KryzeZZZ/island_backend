const express = require("express");
const router = express.Router();
const graphService = require("../services/graph.service");

router.get("/", async (req, res) => {
  try {
    const data = await graphService.getGraphData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
