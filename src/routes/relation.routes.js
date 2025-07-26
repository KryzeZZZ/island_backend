const express = require('express');
const router = express.Router();
const relationService = require('../services/relation.service');
const actionService = require('../services/action.service');

// 提取文本关系
router.post('/extract', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: '缺少文本参数' });
    }
    const relations = await relationService.extractRelations(text);
    res.json(relations);
  } catch (error) {
    console.error('关系提取错误:', error);
    res.status(500).json({ error: '关系提取失败', details: error.message });
  }
});

// 执行动作（包括关系提取、掷骰子和记录）
router.post('/action', async (req, res) => {
  try {
    const { userId, text, action } = req.body;
    
    // 验证必要参数
    if (!userId || !text || !action) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 提取关系
    const relations = await relationService.extractRelations(text);

    // 掷骰子判断动作结果
    const rollResult = await relationService.rollDiceForAction(userId, action);

    // 获取用户当前场景
    const actionService = require('../services/action.service');
    const currentScene = await actionService.getCurrentScene(userId);

    // 记录行动结果
    const trace = await actionService.recordActionTrace(
      currentScene.id, 
      rollResult.outcome, 
      text
    );

    res.json({
      relations,
      rollResult,
      trace
    });
  } catch (error) {
    console.error('动作执行错误:', error);
    res.status(500).json({ error: '动作执行失败', details: error.message });
  }
});

module.exports = router; 