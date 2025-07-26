const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const neo4j = require("neo4j-driver");
require("dotenv").config();

const nodeRoutes = require("./routes/node.routes");
const motiveRoutes = require("./routes/motive.routes");
const movementRoutes = require("./routes/movement.routes");
const accountRoutes = require("./routes/account.routes");
const actionRoutes = require("./routes/action.routes");
const relationRoutes = require("./routes/relation.routes");
const graphRoutes = require("./routes/graph.routes");

const app = express();

// 中间件
app.use(cors());

// 自定义 JSON 解析中间件
const customJsonParser = (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    try {
      // 更彻底的 JSON 清理
      const cleanData = data
        .replace(/\r\n/g, '\n')           // 统一换行符
        .replace(/\n\s+/g, '\n')          // 移除行内多余空白
        .replace(/\s*{\s*/g, '{')         // 移除对象开括号周围的空白
        .replace(/\s*}\s*/g, '}')         // 移除对象闭括号周围的空白
        .replace(/\s*:\s*/g, ':')         // 移除冒号周围的空白
        .replace(/,\s*/g, ',')            // 移除逗号后的空白
        .replace(/{\s*}/g, '{}')          // 处理空对象
        .replace(/:\s*""/g, ':null')      // 将空字符串转换为 null
        .replace(/\s*,\s*}/g, '}')        // 移除对象末尾的逗号
        .trim();

      // 解析 JSON
      const payload = JSON.parse(cleanData);

      // 确保 payload 是对象
      if (typeof payload !== 'object' || payload === null) {
        throw new Error('JSON 载荷必须是对象');
      }

      // 处理 action 字段
      if (typeof payload.action === 'string') {
        // 如果 action 是字符串，转换为对象
        payload.action = {
          text: payload.action,
          target_relation: {
            subject: '',
            predicate: '',
            object: ''
          }
        };
      } else if (typeof payload.action !== 'object' || payload.action === null) {
        // 如果 action 不是对象，设置为带有空 target_relation 的对象
        payload.action = {
          target_relation: {
            subject: '',
            predicate: '',
            object: ''
          }
        };
      } else {
        // 确保 target_relation 存在且规范
        if (!payload.action.target_relation || typeof payload.action.target_relation !== 'object') {
          payload.action.target_relation = {
            subject: '',
            predicate: '',
            object: ''
          };
        } else {
          // 确保每个字段都有默认值
          payload.action.target_relation = {
            subject: payload.action.target_relation.subject || '',
            predicate: payload.action.target_relation.predicate || '',
            object: payload.action.target_relation.object || ''
          };
        }
      }

      // 将规范化的 payload 附加到 request 对象
      req.body = payload;
      next();
    } catch (error) {
      console.error('JSON 解析错误:', error);
      console.error('原始数据:', data);
      res.status(400).json({ 
        error: 'JSON 解析失败', 
        details: error.message 
      });
    }
  });
};

// 替换默认的 JSON 解析中间件
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    customJsonParser(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('捕获到未处理的错误:', err);
  
  // JSON 解析相关的错误处理
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: '无效的 JSON 载荷',
      details: err.message
    });
  }
  
  // 其他类型的错误
  res.status(500).json({ 
    error: '服务器内部错误',
    details: err.message 
  });
});

app.use(morgan('dev'));

// Neo4j Connection
const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "20071028"
  )
);

// Test database connection
const testConnection = async () => {
  const session = driver.session();
  try {
    await session.run("RETURN 1");
    console.log("Successfully connected to Neo4j database");
  } catch (error) {
    console.error("Neo4j connection error:", error);
  } finally {
    await session.close();
  }
};

testConnection();

// Routes
app.use("/api", nodeRoutes);
app.use("/api/motives", motiveRoutes);
app.use("/api/actions/movement", movementRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/actions", actionRoutes);
app.use("/api/actions", relationRoutes);
app.use("/api/graph", graphRoutes);
// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Express Neo4j API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON payload",
      details: err.message,
      payload: req.body,
    });
  }

  res.status(500).json({
    error: "Something went wrong!",
    details: err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
