# Island Backend API 文档

## 基础URL
```
http://localhost:3000/api
```

## 数据结构

### 极坐标位置 (PolarPosition)
```json
{
  "radius": 10,    // 半径
  "angle": 45      // 角度（度）
}
```

## Scene API

### 创建场景
```http
POST /scenes

请求体：
{
  "polarPosition": {
    "radius": 10,
    "angle": 45
  },
  "description": "场景描述"
}

响应：
{
  "id": "uuid",
  "polarPosition": {
    "radius": 10,
    "angle": 45
  },
  "description": "场景描述",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取场景
```http
GET /scenes/:id

响应：
{
  "id": "uuid",
  "polarPosition": {
    "radius": 10,
    "angle": 45
  },
  "description": "场景描述",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Object API

### 创建对象
```http
POST /objects

请求体：
{
  "description": "对象描述"
}

响应：
{
  "id": "uuid",
  "description": "对象描述",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取对象
```http
GET /objects/:id

响应：
{
  "id": "uuid",
  "description": "对象描述",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 创建对象间关系
```http
POST /objects/relationships

请求体：
{
  "fromId": "object1-id",
  "toId": "object2-id",
  "relationType": "CONNECTED_TO"  // 自定义关系类型
}

响应：
{
  "from": {
    "id": "object1-id",
    "description": "对象1描述"
  },
  "to": {
    "id": "object2-id",
    "description": "对象2描述"
  },
  "relationship": "CONNECTED_TO"
}
```

### 获取对象关系
```http
GET /objects/:objectId/relationships?relationType=CONNECTED_TO

参数：
- relationType: 可选，过滤特定类型的关系

响应：
[
  {
    "node": {
      "id": "related-object-id",
      "description": "相关对象描述"
    },
    "relationType": "CONNECTED_TO"
  }
]
```

## User API

### 创建用户
```http
POST /users

请求体：
{
  "polarPosition": {
    "radius": 5,
    "angle": 90
  },
  "introduction": "角色介绍"
}

响应：
{
  "id": "uuid",
  "polarPosition": {
    "radius": 5,
    "angle": 90
  },
  "introduction": "角色介绍",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取用户
```http
GET /users/:id

响应：
{
  "id": "uuid",
  "polarPosition": {
    "radius": 5,
    "angle": 90
  },
  "introduction": "角色介绍",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 更新用户介绍
```http
PUT /users/:userId/introduction

请求体：
{
  "introduction": "更新后的角色介绍"
}

响应：
{
  "id": "uuid",
  "introduction": "更新后的角色介绍",
  "polarPosition": {
    "radius": 5,
    "angle": 90
  }
}
```

## Entry（入口）API

### 创建入口关系
```http
POST /entries

请求体：
{
  "fromId": "source-id",
  "toId": "target-id",
  "fromType": "Object",    // 可以是 "Object" 或 "User"
  "toType": "Scene"        // 可以是 "Scene" 或 "Object"
}

响应：
{
  "from": {
    "id": "source-id",
    "type": "Object"
  },
  "to": {
    "id": "target-id",
    "type": "Scene"
  }
}
```

### 获取节点的入口
```http
GET /entries/:nodeId/:nodeType

参数：
- nodeId: 目标节点ID
- nodeType: 节点类型（"Scene"或"Object"）

响应：
[
  {
    "node": {
      "id": "entry-node-id",
      "description": "入口节点描述"
    },
    "type": "Object"  // 入口节点的类型
  }
]
```

## 位置更新 API

### 更新节点位置
```http
PUT /:nodeType/:nodeId/position

参数：
- nodeType: 节点类型（"Scene"、"Object"或"User"）
- nodeId: 节点ID

请求体：
{
  "polarPosition": {
    "radius": 15,
    "angle": 60
  }
}

响应：
{
  "id": "node-id",
  "polarPosition": {
    "radius": 15,
    "angle": 60
  }
}
```

## 错误响应

所有API在发生错误时都会返回以下格式：
```json
{
  "error": "错误信息描述"
}
```

常见HTTP状态码：
- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 404: 资源未找到
- 500: 服务器内部错误 