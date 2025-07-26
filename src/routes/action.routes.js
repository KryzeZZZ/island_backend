const express = require('express');
const router = express.Router();
const actionService = require('../services/action.service');

// 执行自我行动
router.post('/self-action', async (req, res) => {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'User ID and action are required' });
    }

    const result = await actionService.performSelfAction(userId, action);
    res.json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 获取用户相关对象（用于调试）
router.get('/objects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const objects = await actionService.getUserRelatedObjects(userId);
    res.json(objects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 