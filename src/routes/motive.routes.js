const express = require('express');
const router = express.Router();
const motiveService = require('../services/motive.service');

// 提取动机
router.post('/extract', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const motives = await motiveService.extractMotives(text);
    res.json(motives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 