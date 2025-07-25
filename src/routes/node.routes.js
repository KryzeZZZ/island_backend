const express = require('express');
const router = express.Router();
const nodeService = require('../services/node.service');

// Scene 路由
router.post('/scenes', async (req, res) => {
  try {
    const scene = await nodeService.createScene(req.body);
    res.status(201).json(scene);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scenes/:id', async (req, res) => {
  try {
    const scene = await nodeService.getScene(req.params.id);
    if (!scene) {
      return res.status(404).json({ message: 'Scene not found' });
    }
    res.json(scene);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Object 路由
router.post('/objects', async (req, res) => {
  try {
    const object = await nodeService.createObject(req.body);
    res.status(201).json(object);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/objects/:id', async (req, res) => {
  try {
    const object = await nodeService.getObject(req.params.id);
    if (!object) {
      return res.status(404).json({ message: 'Object not found' });
    }
    res.json(object);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Object关系路由
router.post('/objects/relationships', async (req, res) => {
  try {
    const { fromId, toId, relationType } = req.body;
    const relationship = await nodeService.createObjectRelationship(fromId, toId, relationType);
    res.status(201).json(relationship);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/objects/:objectId/relationships', async (req, res) => {
  try {
    const { relationType } = req.query;
    const relationships = await nodeService.getObjectRelationships(
      req.params.objectId, 
      relationType
    );
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User 路由
router.post('/users', async (req, res) => {
  try {
    const user = await nodeService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await nodeService.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Entry 关系路由
router.post('/entries', async (req, res) => {
  try {
    const { fromId, toId, fromType, toType } = req.body;
    const entry = await nodeService.createEntry(fromId, toId, fromType, toType);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/entries/:nodeId/:nodeType', async (req, res) => {
  try {
    const entries = await nodeService.getEntries(req.params.nodeId, req.params.nodeType);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新位置
router.put('/:nodeType/:nodeId/position', async (req, res) => {
  try {
    const { nodeId, nodeType } = req.params;
    const { polarPosition } = req.body;
    const updated = await nodeService.updatePosition(nodeId, nodeType, polarPosition);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新用户介绍
router.put('/users/:userId/introduction', async (req, res) => {
  try {
    const { userId } = req.params;
    const { introduction } = req.body;
    const updated = await nodeService.updateUserIntroduction(userId, introduction);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新用户位置并连接到最近的场景
router.put('/users/:userId/position-with-scene', async (req, res) => {
  try {
    const { userId } = req.params;
    const { polarPosition } = req.body;
    const result = await nodeService.updateUserPositionAndLinkScene(userId, polarPosition);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户当前所在场景
router.get('/users/:userId/current-scene', async (req, res) => {
  try {
    const { userId } = req.params;
    const scene = await nodeService.getUserCurrentScene(userId);
    if (!scene) {
      return res.status(404).json({ message: 'User is not located at any scene' });
    }
    res.json(scene);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 