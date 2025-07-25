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

### 创建场景（带物体扫描）
```http
POST /api/scenes

请求体：
{
  "polarPosition": {
    "radius": 10,    // 场景在极坐标系中的半径
    "angle": 45      // 场景在极坐标系中的角度（度）
  },
  "description": "在一片空旷的空间内，只有一个小小的柜子"  // 场景描述
}

响应：
{
  "scene": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "polarPosition": {
      "radius": 10,
      "angle": 45
    },
    "description": "在一片空旷的空间内，只有一个小小的柜子",
    "vector": [0.1, 0.2, ...],  // 768维向量
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "objects": [
    {
      "id": "663e8400-e29b-41d4-a716-446655440111",
      "name": "柜子",
      "description": "柜子",
      "refinable": true,        // 是否可以被细化描述
      "interactable": true,     // 是否可以交互
      "is_entry": false,        // 是否可以作为进入场景的入口
      "vector": [0.3, 0.4, ...],  // 768维向量
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 功能说明

1. 场景创建：
   - 自动为场景描述生成向量表示
   - 在极坐标系中定位场景

2. 物体扫描：
   - 自动分析场景描述中的物体
   - 为每个物体创建节点
   - 记录物体的属性（可交互、可细化等）

3. 关系建立：
   - 创建场景与物体的 `CONTAINS` 关系
   - 如果物体是入口（`is_entry: true`），创建 `ENTRY_TO` 关系

### 数据库关系

1. Scene -> Object:
   ```cypher
   (Scene)-[:CONTAINS]->(Object)
   ```

2. Object -> Scene (仅当物体是入口时):
   ```cypher
   (Object)-[:ENTRY_TO]->(Scene)
   ```

3. User -> Scene:
   ```cypher
   (User)-[:LOCATED_AT { 
     score: 0.85,           // 匹配分数（语义相似度和距离的综合评分）
     createdAt: datetime()  // 关系创建时间
   }]->(Scene)
   ```

### 用户位置更新

```http
PUT /api/users/:userId/position-with-scene

请求体：
{
  "polarPosition": {
    "radius": 5,
    "angle": 90
  },
  "description": "我想去一个空旷的地方"  // 用户想去的地方的描述
}

响应：
{
  "user": {
    "id": "user-uuid",
    "polarPosition": {
      "radius": 5,
      "angle": 90
    },
    "introduction": "用户介绍",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "scene": {
    "id": "scene-uuid",
    "polarPosition": {
      "radius": 5.5,
      "angle": 92
    },
    "description": "在一片空旷的空间内，只有一个小小的柜子",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "score": 0.85  // 匹配分数
}
```

### 获取用户当前场景

```http
GET /api/users/:userId/current-scene

响应：
{
  "id": "scene-uuid",
  "polarPosition": {
    "radius": 5.5,
    "angle": 92
  },
  "description": "在一片空旷的空间内，只有一个小小的柜子",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 场景匹配逻辑

1. 用户移动时的场景匹配：
   - 将用户的目标描述向量化
   - 计算与所有场景的语义相似度（使用余弦相似度）
   - 计算与所有场景的物理距离
   - 综合评分 = 语义相似度 * 0.7 + (1 / (距离 + 1)) * 0.3
   - 选择评分最高的场景作为目标场景

2. 通过物体进入场景：
   - 当用户提到某个物体时，查找该物体
   - 如果该物体有 `ENTRY_TO` 关系，可以通过该物体进入对应场景
   - 自动更新用户位置到目标场景的位置

3. `LOCATED_AT` 关系：
   - 用户同一时间只能位于一个场景中
   - 移动时会自动删除旧的 `LOCATED_AT` 关系
   - 创建新的 `LOCATED_AT` 关系，包含匹配分数和时间戳

### 错误响应

```json
{
  "error": "错误信息"
}
```

常见错误：
- 400: 请求参数错误（缺少必要字段或格式错误）
- 500: 服务器错误（向量化服务或物体扫描服务异常）

### 注意事项

1. 描述文本：
   - 应该清晰描述场景中的物体
   - 建议包含物体的位置信息
   - 可以包含多个物体

2. 物体属性：
   - `refinable`: 表示该物体可以被进一步描述或细化
   - `interactable`: 表示用户可以与该物体进行交互
   - `is_entry`: 表示该物体可以作为进入该场景的入口点

3. 向量表示：
   - 场景和物体都会自动生成 768 维的向量表示
   - 这些向量用于后续的语义相似度匹配

### 示例用法

1. 创建简单场景：
```json
{
  "polarPosition": { "radius": 5, "angle": 90 },
  "description": "一个小房间，中间放着一张桌子，桌子上有一本书"
}
```

2. 创建带入口的场景：
```json
{
  "polarPosition": { "radius": 8, "angle": 180 },
  "description": "一条长廊，尽头有一扇门通向花园"
}
```

在第二个例子中，"门"可能会被识别为入口（`is_entry: true`），允许通过门进入该场景。

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