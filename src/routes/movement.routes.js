const express = require('express');
const router = express.Router();
const nodeService = require('../services/node.service');
const movementService = require('../services/movement.service');
const sceneGeneratorService = require('../services/scene-generator.service');
const objectService = require('../services/object.service');

// 从错误消息中提取目的地
function extractDestination(errorMessage) {
  const match = errorMessage.match(/找不到目的地: (.+)$/);
  return match ? match[1] : null;
}

// 处理移动命令
router.post('/', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!userId || !text) {
      return res.status(400).json({ error: 'User ID and text are required' });
    }

    // 调用移动服务处理文本
    const movementResult = await movementService.processMovement(userId, text);

    // 如果移动成功
    if (movementResult.success) {
      // 如果有新场景，查找或创建场景节点
      if (movementResult.nearby_scenes && movementResult.nearby_scenes.length > 0) {
        const targetScene = movementResult.nearby_scenes[0];
        const scene = await nodeService.findOrCreateScene(targetScene.description);
        
        // 更新用户位置
        const result = await nodeService.updateUserLocation(userId, scene.id);
        
        return res.json({
          success: true,
          message: movementResult.message,
          ...result
        });
      }
      return res.json(movementResult);
    }

    // 如果是找不到目的地的错误
    const destination = extractDestination(movementResult.error || movementResult.message);
    if (destination) {
      // 生成新场景
      const sceneDescription = await sceneGeneratorService.generateScene(destination);
      
      // 创建新场景（不再传入向量）
      const scene = await nodeService.createScene({
        description: sceneDescription,
        polarPosition: { radius: 0, angle: 0 }  // 默认位置，后续可以优化
      });

      // 更新用户位置到新场景
      const result = await nodeService.updateUserLocation(userId, scene.scene.id);

      // 返回完整的场景信息，不包含向量
      return res.json({
        success: true,
        message: `已生成并到达新场景: ${sceneDescription}`,
        ...result,
        objects: scene.objects  // 包含扫描到的物体信息
      });
    }

    // 其他错误情况
    res.status(400).json({ error: movementResult.error || movementResult.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 