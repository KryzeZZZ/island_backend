# Express Neo4j Backend

这是一个使用Express.js和Neo4j数据库的后端API项目。

## 项目设置

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
创建一个`.env`文件，包含以下配置：
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
PORT=3000
```

3. 确保Neo4j数据库已运行并可访问。

## 运行项目

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API端点

### 用户API

- 创建用户：
  ```
  POST /api/users
  Body: { "name": "John Doe", "email": "john@example.com" }
  ```

- 获取所有用户：
  ```
  GET /api/users
  ```

- 获取特定用户：
  ```
  GET /api/users/:id
  ```

- 创建好友关系：
  ```
  POST /api/users/:userId/friends/:friendId
  ```

## 项目结构

```
src/
  ├── app.js              # 应用入口文件
  ├── services/
  │   └── neo4j.service.js # Neo4j数据库服务
  └── routes/
      └── user.routes.js   # 用户相关路由
```

## 注意事项

- 确保Neo4j数据库已经安装并运行
- 正确配置.env文件中的数据库连接信息
- 在生产环境中使用安全的密码和配置 