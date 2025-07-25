const neo4j = require('neo4j-driver');

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
      const result = await session.run(
        `CREATE (s:Scene {
          id: randomUUID(),
          radius: $radius,
          angle: $angle,
          description: $description,
          createdAt: datetime()
        }) RETURN s`,
        { 
          radius: properties.polarPosition.radius,
          angle: properties.polarPosition.angle,
          description: properties.description
        }
      );
      return this.formatNodeProperties(result.records[0].get('s').properties);
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
          createdAt: datetime()
        }) RETURN u`,
        { 
          radius: properties.polarPosition.radius,
          angle: properties.polarPosition.angle,
          introduction: properties.introduction
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

  // 更新用户位置并连接到最近的场景
  async updateUserPositionAndLinkScene(userId, polarPosition) {
    const session = this.driver.session();
    try {
      // 首先更新用户位置
      await session.run(
        `MATCH (u:User {id: $userId})
         SET u.radius = $radius, u.angle = $angle`,
        { 
          userId,
          radius: polarPosition.radius,
          angle: polarPosition.angle
        }
      );
      // 先尝试找到完全匹配的场景
      let result = await session.run(
        `MATCH (u:User {id: $userId}), (s:Scene)
         WHERE u.radius = s.radius AND u.angle = s.angle
         WITH u, s, 0 as distance
         LIMIT 1
         OPTIONAL MATCH (u)-[r:LOCATED_AT]->(:Scene)
         DELETE r
         WITH u, s, distance
         CREATE (u)-[r:LOCATED_AT]->(s)
         RETURN u, s, distance`,
        { userId }
      );

      // 如果没有完全匹配的场景，则寻找最近的场景
      if (result.records.length === 0) {
        result = await session.run(
          `MATCH (u:User {id: $userId}), (s:Scene)
           WITH u, s,
           sqrt(
             (u.radius * u.radius) + 
             (s.radius * s.radius) - 
             2 * u.radius * s.radius * cos(abs(u.angle - s.angle))
           ) as distance
           ORDER BY distance ASC
           LIMIT 1
           OPTIONAL MATCH (u)-[r:LOCATED_AT]->(:Scene)
           DELETE r
           WITH u, s, distance
           CREATE (u)-[r:LOCATED_AT]->(s)
           RETURN u, s, distance`,
          { userId }
        );
      }

      const record = result.records[0];
      return {
        user: this.formatNodeProperties(record.get('u').properties),
        scene: this.formatNodeProperties(record.get('s').properties),
        distance: record.get('distance').toNumber()
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

  async close() {
    await this.driver.close();
  }
}

module.exports = new NodeService(); 