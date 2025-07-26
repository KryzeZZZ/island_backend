const neo4j = require("neo4j-driver");

class GraphService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "20071028"
      )
    );
  }

  async getGraphData() {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n)
         OPTIONAL MATCH (n)-[r]->(m)
         RETURN collect(distinct n) as nodes,
                collect(distinct {source: n.id, target: m.id, label: type(r)}) as links`
      );

      if (result.records.length === 0) return { nodes: [], links: [] };

      const record = result.records[0];
      const nodesRaw = record.get("nodes");
      const linksRaw = record.get("links");

      const nodes = nodesRaw.map((node) => ({
        id: node.properties.id || node.identity.toString(),
        label:
          node.properties.name ||
          node.properties.description ||
          node.labels[0] ||
          "Node",
        type: node.labels[0] || "Node",
      }));

      const links = linksRaw
        .filter((l) => l.source && l.target)
        .map((l) => ({
          source: l.source,
          target: l.target,
          label: l.label,
        }));

      return { nodes, links };
    } finally {
      await session.close();
    }
  }
}

module.exports = new GraphService();
