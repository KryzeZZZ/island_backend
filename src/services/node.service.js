const neo4j = require('neo4j-driver');
const objectService = require('./object.service');
const vectorizeService = require('./vectorize.service');

class NodeService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || '20071028'
      )
    );
  }

  // 辅助函数：格式化 Neo4j 日期时间
  formatDateTime(dateTime) {
    if (!dateTime) return null;
    return new Date(
      dateTime.year.low,
      dateTime.month.low - 1,  // JavaScript months are 0-based
      dateTime.day.low,
      dateTime.hour.low,
      dateTime.minute.low,
      dateTime.second.low,
      dateTime.nanosecond.low / 1000000  // Convert nanoseconds to milliseconds
    ).toISOString();
  }

  // 辅助函数：格式化节点属性
  formatNodeProperties(properties) {
    if (!properties) return null;
    const formatted = { ...properties };
    
    // 格式化日期
    if (formatted.createdAt) {
      formatted.createdAt = this.formatDateTime(formatted.createdAt);
    }

    // 构建 polarPosition
    if ('radius' in formatted && 'angle' in formatted) {
      formatted.polarPosition = {
        radius: formatted.radius,
        angle: formatted.angle
      };
    }
    return formatted;
  }

  // Scene 节点操作
  async createScene(properties) {
    const session = this.driver.session();
    try {
      // 1. 创建场景节点
      const sceneResult = await session.run(
        `CREATE (s:Scene {
          id: randomUUID(),
          radius: $radius,
          angle: $angle,
          description: $description,
          vector: $vector,
          createdAt: datetime()
        }) RETURN s`,
        { 
          radius: properties.polarPosition.radius,
          angle: properties.polarPosition.angle,
          description: properties.description,
          vector: properties.vector
        }
      );
      
      const scene = this.formatNodeProperties(sceneResult.records[0].get('s').properties);

      // 2. 扫描描述中的物体
      const scannedObjects = await objectService.scanObjectsFromDescription(properties.description);
      
      // 3. 为每个扫描到的物体创建节点和关系
      for (const obj of scannedObjects) {
        // 向量化物体描述
        const objVector = await vectorizeService.vectorizeDescription(obj.object);
        
        // 创建物体节点并建立关系
        await session.run(
          `MATCH (s:Scene {id: $sceneId})
           CREATE (o:Object {
             id: randomUUID(),
             name: $name,
             description: $description,
             refinable: $refinable,
             interactable: $interactable,
             vector: $vector,
             createdAt: datetime()
           })
           CREATE (s)-[r:CONTAINS]->(o)
           ${obj.is_entry ? 'CREATE (o)-[e:ENTRY_TO]->(s)' : ''}
           RETURN o`,
          {
            sceneId: scene.id,
            name: obj.object,
            description: obj.object,  // 使用对象名称作为基础描述
            refinable: obj.refinable,
            interactable: obj.interactable,
            vector: objVector
          }
        );
      }

      // 4. 返回完整的场景信息
      const result = await session.run(
        `MATCH (s:Scene {id: $sceneId})
         OPTIONAL MATCH (s)-[:CONTAINS]->(o:Object)
         OPTIONAL MATCH (o)-[e:ENTRY_TO]->(s)
         WITH s, o, e
         RETURN s, 
                collect({
                  object: o,
                  is_entry: e IS NOT NULL
                }) as objects`,
        { sceneId: scene.id }
      );

      const finalScene = this.formatNodeProperties(result.records[0].get('s').properties);
      const objects = result.records[0].get('objects').map(item => ({
        ...this.formatNodeProperties(item.object.properties),
        is_entry: item.is_entry
      }));

      return {
        scene: finalScene,
        objects: objects
      };

    } finally {
      await session.close();
    }
  }

  async getScene(sceneId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (s:Scene {id: $id}) RETURN s',
        { id: sceneId }
      );
      if (result.records.length === 0) return null;
      return this.formatNodeProperties(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  // Object 节点操作
  async createObject(properties) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `CREATE (o:Object {
          id: randomUUID(),
          description: $description,
          createdAt: datetime()
        }) RETURN o`,
        { description: properties.description }
      );
      return this.formatNodeProperties(result.records[0].get('o').properties);
    } finally {
      await session.close();
    }
  }

  async getObject(objectId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (o:Object {id: $id}) RETURN o',
        { id: objectId }
      );
      if (result.records.length === 0) return null;
      return this.formatNodeProperties(result.records[0].get('o').properties);
    } finally {
      await session.close();
    }
  }

  // User 节点操作
  async createUser(properties) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `CREATE (u:User {
          id: randomUUID(),
          radius: $radius,
          angle: $angle,
          introduction: $introduction,
          vector: $vector,
          createdAt: datetime()
        }) RETURN u`,
        { 
          radius: properties.polarPosition.radius,
          angle: properties.polarPosition.angle,
          introduction: properties.introduction,
          vector: properties.vector
        }
      );
      return this.formatNodeProperties(result.records[0].get('u').properties);
    } finally {
      await session.close();
    }
  }

  async getUser(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $id}) RETURN u',
        { id: userId }
      );
      if (result.records.length === 0) return null;
      return this.formatNodeProperties(result.records[0].get('u').properties);
    } finally {
      await session.close();
    }
  }

  // Entry 关系操作
  async createEntry(fromId, toId, fromType, toType) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (from:${fromType} {id: $fromId})
         MATCH (to:${toType} {id: $toId})
         CREATE (from)-[r:ENTRY_TO]->(to)
         RETURN from, r, to`,
        { fromId, toId }
      );
      const record = result.records[0];
      return {
        from: this.formatNodeProperties(record.get('from').properties),
        to: this.formatNodeProperties(record.get('to').properties)
      };
    } finally {
      await session.close();
    }
  }

  // 获取节点的所有入口（支持Object和Scene）
  async getEntries(nodeId, nodeType) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n:${nodeType} {id: $nodeId})<-[r:ENTRY_TO]-(entry)
         RETURN entry, labels(entry) as entryLabels`,
        { nodeId }
      );
      return result.records.map(record => ({
        node: this.formatNodeProperties(record.get('entry').properties),
        type: record.get('entryLabels')[0]
      }));
    } finally {
      await session.close();
    }
  }

  // 更新节点位置
  async updatePosition(nodeId, nodeType, polarPosition) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n:${nodeType} {id: $nodeId})
         SET n.radius = $radius, n.angle = $angle
         RETURN n`,
        { 
          nodeId, 
          radius: polarPosition.radius,
          angle: polarPosition.angle
        }
      );
      return this.formatNodeProperties(result.records[0].get('n').properties);
    } finally {
      await session.close();
    }
  }

  // 更新用户介绍
  async updateUserIntroduction(userId, introduction) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})
         SET u.introduction = $introduction
         RETURN u`,
        { userId, introduction }
      );
      return this.formatNodeProperties(result.records[0].get('u').properties);
    } finally {
      await session.close();
    }
  }

  // 创建Object间的关系
  async createObjectRelationship(fromId, toId, relationType) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (from:Object {id: $fromId})
         MATCH (to:Object {id: $toId})
         CREATE (from)-[r:${relationType}]->(to)
         RETURN from, r, to`,
        { fromId, toId }
      );
      return result.records[0];
    } finally {
      await session.close();
    }
  }

  // 获取Object的所有关系
  async getObjectRelationships(objectId, relationType = null) {
    const session = this.driver.session();
    try {
      const query = relationType 
        ? `MATCH (o:Object {id: $objectId})-[r:${relationType}]->(related)` 
        : `MATCH (o:Object {id: $objectId})-[r]->(related)`;
      
      const result = await session.run(
        `${query} RETURN related, type(r) as relationType`,
        { objectId }
      );
      return result.records.map(record => ({
        node: record.get('related').properties,
        relationType: record.get('relationType')
      }));
    } finally {
      await session.close();
    }
  }

  // 更新用户位置并连接到最近的场景（使用向量相似度）
  async updateUserPositionAndLinkScene(userId, polarPosition, vector) {
    const session = this.driver.session();
    try {
      // 首先更新用户位置和向量
      await session.run(
        `MATCH (u:User {id: $userId})
         SET u.radius = $radius, 
             u.angle = $angle,
             u.vector = $vector`,
        { 
          userId,
          radius: polarPosition.radius,
          angle: polarPosition.angle,
          vector
        }
      );

      // 使用向量相似度和位置信息综合查找最匹配的场景
      // 这里使用点积（dot product）计算向量相似度，并结合位置距离
      const result = await session.run(
        `MATCH (u:User {id: $userId}), (s:Scene)
         WITH u, s,
         reduce(dot = 0.0, i IN range(0, size(u.vector)-1) | 
           dot + u.vector[i] * s.vector[i]
         ) as vectorSimilarity,
         sqrt(
           (u.radius * u.radius) + 
           (s.radius * s.radius) - 
           2 * u.radius * s.radius * cos(abs(u.angle - s.angle))
         ) as distance
         WITH u, s, 
         // 综合评分：向量相似度越高越好，距离越近越好
         vectorSimilarity / (distance + 0.1) as score
         ORDER BY score DESC
         LIMIT 1
         OPTIONAL MATCH (u)-[r:LOCATED_AT]->(:Scene)
         DELETE r
         WITH u, s, score
         CREATE (u)-[r:LOCATED_AT {
           score: score,
           vector: u.vector,
           createdAt: datetime()
         }]->(s)
         RETURN u, s, r`,
        { userId }
      );

      const record = result.records[0];
      return {
        user: this.formatNodeProperties(record.get('u').properties),
        scene: this.formatNodeProperties(record.get('s').properties),
        relationship: record.get('r').properties
      };
    } finally {
      await session.close();
    }
  }

  // 获取用户当前所在场景
  async getUserCurrentScene(userId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[r:LOCATED_AT]->(s:Scene)
         RETURN s`,
        { userId }
      );
      
      if (result.records.length === 0) return null;
      return this.formatNodeProperties(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  // 根据向量相似度查找场景
  async findSimilarScenes(vector, limit = 5) {
    const session = this.driver.session();
    try {
      // 打印输入向量的基本信息
      console.log('Input Vector:', {
        length: vector.length,
        firstFewValues: vector.slice(0, 5),
        vectorType: typeof vector,
        isArray: Array.isArray(vector)
      });

      const result = await session.run(
        `MATCH (s:Scene)
         WITH s,
         // 检查向量是否存在和有效
         CASE 
           WHEN s.vector IS NOT NULL AND size(s.vector) > 0 THEN true 
           ELSE false 
         END as hasValidVector,
         // 计算余弦相似度
         CASE 
           WHEN s.vector IS NOT NULL AND size(s.vector) > 0 THEN 
             reduce(dot = 0.0, i IN range(0, size($vector)-1) | 
               dot + $vector[i] * s.vector[i]
             ) / (
               sqrt(reduce(lenA = 0.0, i IN range(0, size($vector)-1) | 
                 lenA + $vector[i] * $vector[i]
               )) * 
               sqrt(reduce(lenB = 0.0, i IN range(0, size(s.vector)-1) | 
                 lenB + s.vector[i] * s.vector[i]
               ))
             )
           ELSE 0.0 
         END as cosineSimilarity
         WHERE hasValidVector
         ORDER BY cosineSimilarity DESC
         LIMIT $limit
         RETURN s, cosineSimilarity, hasValidVector`,
        { vector, limit: neo4j.int(limit) }
      );

      // 打印查询结果的详细信息
      console.log('Similar Scenes Query Results:', {
        totalRecords: result.records.length,
        recordDetails: result.records.map((record, index) => ({
          index,
          sceneId: record.get('s').properties.id,
          similarity: record.get('cosineSimilarity'),
          hasValidVector: record.get('hasValidVector')
        }))
      });

      return result.records.map(record => {
        const similarityValue = record.get('cosineSimilarity');
        const sceneProperties = record.get('s').properties;

        // 打印每个场景的向量信息
        console.log(`Scene ${sceneProperties.id} Vector Details:`, {
          vectorLength: sceneProperties.vector ? sceneProperties.vector.length : 'No Vector',
          firstFewValues: sceneProperties.vector ? sceneProperties.vector.slice(0, 5) : 'N/A'
        });

        return {
          scene: this.formatNodeProperties(sceneProperties),
          similarity: typeof similarityValue === 'object' && similarityValue.toNumber 
            ? similarityValue.toNumber() 
            : (typeof similarityValue === 'number' 
              ? similarityValue 
              : parseFloat(similarityValue))
        };
      });
    } catch (error) {
      console.error('Error in findSimilarScenes:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 根据向量相似度查找用户
  async findSimilarUsers(vector, limit = 5) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User)
         WITH u,
         reduce(dot = 0.0, i IN range(0, size($vector)-1) | 
           dot + $vector[i] * u.vector[i]
         ) as similarity
         ORDER BY similarity DESC
         LIMIT $limit
         RETURN u, similarity`,
        { vector, limit: neo4j.int(limit) }
      );

      return result.records.map(record => ({
        user: this.formatNodeProperties(record.get('u').properties),
        similarity: record.get('similarity').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  // 更新用户所在场景
  async updateUserLocation(userId, sceneId) {
    const session = this.driver.session();
    try {
      // 删除旧的 LOCATED_AT 关系并创建新的
      const result = await session.run(
        `MATCH (u:User {id: $userId})
         OPTIONAL MATCH (u)-[old:LOCATED_AT]->(:Scene)
         DELETE old
         WITH u
         MATCH (s:Scene {id: $sceneId})
         CREATE (u)-[r:LOCATED_AT {
           createdAt: datetime()
         }]->(s)
         RETURN u, s`,
        { userId, sceneId }
      );

      if (result.records.length === 0) {
        throw new Error('User or Scene not found');
      }

      const record = result.records[0];
      return {
        user: this.formatNodeProperties(record.get('u').properties),
        scene: this.formatNodeProperties(record.get('s').properties)
      };
    } finally {
      await session.close();
    }
  }

  // 根据场景描述查找或创建场景
  async findOrCreateScene(description) {
    const session = this.driver.session();
    try {
      // 先尝试找到完全匹配的场景
      let result = await session.run(
        `MATCH (s:Scene {description: $description})
         RETURN s`,
        { description }
      );

      if (result.records.length > 0) {
        return this.formatNodeProperties(result.records[0].get('s').properties);
      }

      // 如果没有找到，创建新场景
      result = await session.run(
        `CREATE (s:Scene {
          id: randomUUID(),
          description: $description,
          createdAt: datetime()
        }) RETURN s`,
        { description }
      );

      return this.formatNodeProperties(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

module.exports = new NodeService(); 