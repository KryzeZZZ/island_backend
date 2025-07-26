const express = require('express');
const router = express.Router();
const nodeService = require('../services/node.service');
const movementService = require('../services/movement.service');
const sceneGeneratorService = require('../services/scene-generator.service');
const objectService = require('../services/object.service');
const vectorizeService = require('../services/vectorize.service');
const neo4j = require('neo4j-driver');

// 从错误消息中提取目的地
function extractDestination(errorMessage) {
  // 如果错误消息为 undefined 或 null，返回 null
  if (!errorMessage) return null;

  // 确保错误消息是字符串
  const message = String(errorMessage);

  // 尝试匹配不同格式的目的地提取
  const patterns = [
    /找不到目的地[:：]?\s*(.+)$/,
    /目的地是[:：]?\s*(.+)$/,
    /去(.+)$/
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

// 创建 Neo4j 驱动实例
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j', 
    process.env.NEO4J_PASSWORD || '20071028'
  )
);

// 处理移动命令
router.post('/', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!userId || !text) {
      return res.status(400).json({ error: 'User ID and text are required' });
    }

    // 调用移动服务处理文本
    const movementResult = await movementService.processMovement(userId, text);

    // 如果 movementResult 不是对象，将其转换为对象
    const result = typeof movementResult === 'object' 
      ? movementResult 
      : { success: false, error: '移动服务返回了无效的结果' };

    // 如果移动成功
    if (result.success) {
      // 如果有新场景，查找或创建场景节点
      if (result.nearby_scenes && result.nearby_scenes.length > 0) {
        const targetScene = result.nearby_scenes[0];
        const scene = await nodeService.findOrCreateScene(targetScene.description);
        
        // 更新用户位置
        const locationResult = await nodeService.updateUserLocation(userId, scene.id);
        
        return res.json({
          success: true,
          message: result.message,
          ...locationResult
        });
      }
      return res.json(result);
    }

    // 如果是找不到目的地的错误
    const destination = extractDestination(result.error || result.message);
    const searchText = destination || text;

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (s:Scene) 
         WHERE s.description CONTAINS $searchText 
         RETURN s 
         LIMIT 1`,
        { searchText }
      );

      let scene;
      let locationResult;
      if (result.records.length > 0) {
        // 找到包含关键词的场景
        scene = nodeService.formatNodeProperties(result.records[0].get('s').properties);
        
        // 直接更新用户的 LOCATED_AT 关系
        locationResult = await nodeService.updateUserLocation(userId, scene.id);

        return res.json({
          success: true,
          message: scene.description,  // 直接返回场景描述
          ...locationResult
        });
      } 
      
      // 如果没有找到现有场景，生成新场景
      const sceneDescription = await sceneGeneratorService.generateScene(searchText);
      
      // 向量化场景描述
      const sceneVector = await vectorizeService.vectorizeDescription(sceneDescription);
      
      // 创建新场景
      scene = await nodeService.createScene({
        description: sceneDescription,
        polarPosition: { radius: 0, angle: 0 },  // 默认位置，后续可以优化
        vector: sceneVector
      }).then(result => result.scene);

      // 更新用户位置到场景
      locationResult = await nodeService.updateUserLocation(userId, scene.id);

      // 返回完整的场景信息
      return res.json({
        success: true,
        message: scene.description,  // 直接返回场景描述
        ...locationResult
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('总体错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 