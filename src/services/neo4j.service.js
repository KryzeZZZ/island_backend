const neo4j = require('neo4j-driver');

class Neo4jService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
  }

  async createNode(label, properties) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `CREATE (n:${label} $props) RETURN n`,
        { props: properties }
      );
      return result.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  }

  async findNodes(label, properties = {}) {
    const session = this.driver.session();
    try {
      const props = Object.entries(properties)
        .map(([key, value]) => `n.${key} = $${key}`)
        .join(' AND ');
      const query = `MATCH (n:${label}) ${props ? 'WHERE ' + props : ''} RETURN n`;
      const result = await session.run(query, properties);
      return result.records.map(record => record.get('n').properties);
    } finally {
      await session.close();
    }
  }

  async createRelationship(fromLabel, fromProps, toLabel, toProps, relType, relProps = {}) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (from:${fromLabel}), (to:${toLabel})
        WHERE from.id = $fromId AND to.id = $toId
        CREATE (from)-[r:${relType} $relProps]->(to)
        RETURN from, r, to
      `;
      const result = await session.run(query, {
        fromId: fromProps.id,
        toId: toProps.id,
        relProps
      });
      return result.records[0];
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

module.exports = new Neo4jService(); 