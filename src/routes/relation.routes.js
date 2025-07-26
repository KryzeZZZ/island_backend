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
router.post('/interaction', async (req, res) => {
  try {
    const { userId, text, action } = req.body;
    
    // 验证必要参数
    if (!userId || !text || !action) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证 target_relation 结构
    if (!action.target_relation) {
      return res.status(400).json({ 
        error: '无效的动作关系结构', 
        details: '目标关系必须是一个对象' 
      });
    }

    // 提取关系
    const relations = await relationService.extractRelations(text);

    // 准备 roll_dice 请求的 target_relation
    const targetRelation = relations.length > 0 ? {
      subject: relations[0].subject || '',
      predicate: relations[0].predicate || '',
      object: relations[0].object || ''
    } : {
      subject: action.target_relation.subject || '',
      predicate: action.target_relation.predicate || '',
      object: action.target_relation.object || ''
    };

    // 更新 action 的 target_relation
    action.target_relation = targetRelation;

    // 掷骰子判断动作结果
    const rollResult = await relationService.rollDiceForAction(userId, action);

    // 获取用户当前场景
    const currentScene = await actionService.getCurrentScene(userId);

    // 记录行动结果
    const trace = await actionService.recordActionTrace(
      currentScene.id, 
      rollResult.outcome, 
      text
    );

    res.json({
      relations,  // 返回提取的所有关系
      targetRelation,  // 返回用于 roll_dice 的目标关系
      rollResult,
      trace
    });
  } catch (error) {
    console.error('动作执行错误:', error);
    res.status(500).json({ 
      error: '动作执行失败', 
      details: error.message 
    });
  }
});

module.exports = router; 