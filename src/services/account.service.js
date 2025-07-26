const neo4j = require("neo4j-driver");
const bcrypt = require("bcrypt");

class AccountService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "20071028"
      )
    );
  }

  async createAccount(clerkId, email, username) {
    const session = this.driver.session();
    try {
      // 检查邮箱是否已存在
      const existingAccount = await session.run(
        "MATCH (a:Account {clerkId: $clerkId}) RETURN a",
        { clerkId }
      );

      if (existingAccount.records.length > 0) {
        return this.formatNodeProperties(
          existingAccount.records[0].get("a").properties
        );
      }

      const result = await session.run(
        `CREATE (a:Account {
          id: randomUUID(),
          clerkId: $clerkId,
          email: $email,
          username: $username,
          createdAt: datetime()
        })
        CREATE (u:User {
          id: randomUUID(),
          introduction: $username,
          createdAt: datetime()
        })
        CREATE (u)-[:BELONGS_TO]->(a)
        RETURN a, u`,
        {
          clerkId,
          email,
          username,
        }
      );

      const record = result.records[0];
      const account = this.formatNodeProperties(record.get("a").properties);
      const user = this.formatNodeProperties(record.get("u").properties);

      return {
        account,
        user,
      };
    } finally {
      await session.close();
    }
  }

  async addUserToAccount(accountId, introduction) {
    const session = this.driver.session();
    try {
      // 检查账户是否存在
      const accountExists = await session.run(
        "MATCH (a:Account {id: $accountId}) RETURN a",
        { accountId }
      );

      if (accountExists.records.length === 0) {
        throw new Error("Account not found");
      }

      // 创建新用户并关联到账户
      const result = await session.run(
        `MATCH (a:Account {id: $accountId})
         CREATE (u:User {
           id: randomUUID(),
           introduction: $introduction,
           createdAt: datetime()
         })
         CREATE (u)-[r:BELONGS_TO]->(a)
         RETURN u`,
        {
          accountId,
          introduction,
        }
      );

      return this.formatNodeProperties(result.records[0].get("u").properties);
    } finally {
      await session.close();
    }
  }

  async getAccountUsers(accountId) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User)-[:BELONGS_TO]->(a:Account {id: $accountId})
         RETURN u`,
        { accountId }
      );

      return result.records.map((record) =>
        this.formatNodeProperties(record.get("u").properties)
      );
    } finally {
      await session.close();
    }
  }

  async verifyAccount(email, password) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        "MATCH (a:Account {email: $email}) RETURN a",
        { email }
      );

      if (result.records.length === 0) {
        return null;
      }

      const account = this.formatNodeProperties(
        result.records[0].get("a").properties
      );
      const isValid = await bcrypt.compare(password, account.password);

      if (!isValid) {
        return null;
      }

      // 不返回密码
      delete account.password;
      return account;
    } finally {
      await session.close();
    }
  }

  formatNodeProperties(properties) {
    if (!properties) return null;
    const formatted = { ...properties };

    if (formatted.createdAt) {
      formatted.createdAt = new Date(
        formatted.createdAt.year.low,
        formatted.createdAt.month.low - 1,
        formatted.createdAt.day.low,
        formatted.createdAt.hour.low,
        formatted.createdAt.minute.low,
        formatted.createdAt.second.low,
        formatted.createdAt.nanosecond.low / 1000000
      ).toISOString();
    }

    return formatted;
  }
}

module.exports = new AccountService();
