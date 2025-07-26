const neo4j = require('neo4j-driver');
const axios = require('axios');
const objectService = require('./object.service');
const vectorizeService = require('./vectorize.service');

class ActionService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || '20071028'
      )
    );
    this.rollUrl = 'http://localhost:8000/roll_user_action';
  }

  // 获取用户相关的对象和关系（最大深度3）
  async getUserRelatedObjects(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH path = (u:User {id: $userId})-[r*1..3]-(o:Object)
         WHERE ALL(rel in r WHERE type(rel) <> 'ENTRY_TO')
         WITH o, relationships(path) as rels,
         length(path) as pathLength
         RETURN DISTINCT {
           object: o.name,
           relation: CASE 
             WHEN pathLength = 1 THEN rels[0].relation
             ELSE '相关'
           END
         } as related_objects`,
        { userId }
      );

      return result.records.map(record => record.get('related_objects'));
    } finally {
      await session.close();
    }
  }

  // 获取用户信息
  async getUserInfo(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $userId}) RETURN u.introduction as persona',
        { userId }
      );

      if (result.records.length === 0) {
        throw new Error('User not found');
      }

      return result.records[0].get('persona');
    } finally {
      await session.close();
    }
  }

  // 格式化节点属性（从 node.service.js 复制）
  formatNodeProperties(properties) {
    if (!properties) return null;
    
    const formattedProperties = { ...properties };
    
    // 转换 Neo4j 的 DateTime 对象为 ISO 字符串
    if (properties.createdAt && properties.createdAt.toString().includes('DateTime')) {
      formattedProperties.createdAt = properties.createdAt.toString();
    }
    
    // 重组极坐标
    if (properties.radius !== undefined && properties.angle !== undefined) {
      formattedProperties.polarPosition = {
        radius: properties.radius,
        angle: properties.angle
      };
      delete formattedProperties.radius;
      delete formattedProperties.angle;
    }
    
    return formattedProperties;
  }

  // 获取用户当前场景
  async getCurrentScene(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[:LOCATED_AT]->(s:Scene)
         RETURN s`, 
        { userId }
      );
      
      if (result.records.length === 0) {
        throw new Error(`未找到用户 ${userId} 所在的场景`);
      }
      
      return this.formatNodeProperties(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  // 扫描 outcome 中的物体并加入场景
  async scanOutcomeObjects(sceneId, outcome) {
    try {
      // 调用物体扫描服务
      const scannedObjects = await objectService.scanObjectsFromDescription(outcome);
      
      const session = this.driver.session();
      try {
        // 为每个扫描到的物体创建节点并建立关系
        for (const obj of scannedObjects) {
          // 向量化物体描述
          const objVector = await vectorizeService.vectorizeDescription(obj.object);
          
          // 创建物体节点并与场景建立关系
          await session.run(
            `MATCH (s:Scene {id: $sceneId})
             CREATE (o:Object {
               id: randomUUID(),
               name: $name,
               description: $description,
               vector: $vector,
               refinable: $refinable,
               interactable: $interactable,
               createdAt: datetime()
             })
             CREATE (s)-[:CONTAINS]->(o)
             CREATE (o)-[:ENTRY_TO {relation: '来自行动'}]->(s)`,
            {
              sceneId,
              name: obj.object,
              description: obj.object,
              vector: objVector,
              refinable: obj.refinable || false,
              interactable: obj.interactable || false
            }
          );
        }
      } finally {
        await session.close();
      }

      return scannedObjects;
    } catch (error) {
      console.error('Error scanning outcome objects:', error);
      return []; // 即使扫描失败也不中断主流程
    }
  }

  // 记录行动结果
  async recordActionTrace(sceneId, outcome, action) {
    const session = this.driver.session();
    try {
      // 扫描 outcome 中的物体
      const scannedObjects = await this.scanOutcomeObjects(sceneId, outcome);

      // 创建 Trace 节点
      const result = await session.run(
        `MATCH (s:Scene {id: $sceneId})
         CREATE (t:Trace {
           id: randomUUID(),
           content: $outcome,
           action: $action,
           objects: $objects,
           createdAt: datetime()
         })
         CREATE (s)-[r:TRACE {relation: '发生'}]->(t)
         RETURN t`,
        { 
          sceneId,
          outcome,
          action,
          objects: scannedObjects.map(obj => obj.object)
        }
      );

      return result.records[0].get('t').properties;
    } finally {
      await session.close();
    }
  }

  // 执行自我行动
  async performSelfAction(userId, action) {
    try {
      // 获取用户信息
      const persona = await this.getUserInfo(userId);
      if (!persona) {
        throw new Error('User persona not found');
      }
      
      // 获取相关对象和关系
      const related_objects = await this.getUserRelatedObjects(userId);

      // 获取当前场景
      const currentScene = await this.getCurrentScene(userId);

      // 处理 action 对象
      const actionText = typeof action === 'object' 
        ? (action.text || JSON.stringify(action)) 
        : String(action);

      // 构建请求数据
      const requestData = {
        persona,
        action: actionText,
        related_objects
      };

      console.log('Request to microservice:', JSON.stringify(requestData, null, 2));

      // 调用行动判定服务
      const response = await axios.post(this.rollUrl, requestData);

      // 记录行动结果
      if (response.data.outcome) {
        await this.recordActionTrace(currentScene.id, response.data.outcome, actionText);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('Error response from microservice:', error.response.data);
        throw new Error(`Action service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from action service');
      } else {
        throw new Error(`Failed to perform action: ${error.message}`);
      }
    }
  }
}

module.exports = new ActionService(); 