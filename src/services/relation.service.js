const axios = require('axios');

class RelationService {
  constructor() {
    this.relationUrl = 'http://localhost:8000/relationship';
    this.rollDiceUrl = 'http://localhost:8000/roll_dice';
  }

  // 提取文本中的关系
  async extractRelations(text) {
    try {
      const response = await axios.post(this.relationUrl, { text });
      return response.data;
    } catch (error) {
      console.error('Error extracting relations:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // 掷骰子判断动作结果
  async rollDiceForAction(userId, action) {
    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j', 
        process.env.NEO4J_PASSWORD || '20071028'
      )
    );
    const session = driver.session();

    try {
      // 获取用户介绍（角色描述）
      const userResult = await session.run(
        'MATCH (u:User {id: $userId}) RETURN u.introduction as persona', 
        { userId }
      );
      const persona = userResult.records[0].get('persona');

      // 获取当前场景的深度为1的对象和关系
      const objectsResult = await session.run(
        `MATCH (u:User {id: $userId})-[:LOCATED_AT]->(s:Scene)
         MATCH (s)-[r1:CONTAINS]->(o:Object)
         OPTIONAL MATCH (o)-[r2]->(otherObj:Object)
         RETURN {
           object: o.name,
           relation: CASE 
             WHEN r2 IS NOT NULL THEN type(r2)
             ELSE 'CONTAINS'
           END,
           subject: 'Scene'
         } as relations`, 
        { userId }
      );

      const envRelations = objectsResult.records.map(record => {
        const relation = record.get('relations');
        return {
          subject: relation.subject,
          predicate: relation.relation,
          object: relation.object
        };
      });

      // 准备掷骰子的请求数据
      const rollDicePayload = {
        persona,
        target_relation: action.target_relation,
        env_relations: envRelations
      };

      // 调用掷骰子微服务
      const response = await axios.post(this.rollDiceUrl, rollDicePayload);
      
      return response.data;
    } catch (error) {
      console.error('Error in rollDiceForAction:', error.response ? error.response.data : error.message);
      throw error;
    } finally {
      await session.close();
      await driver.close();
    }
  }
}

module.exports = new RelationService(); 