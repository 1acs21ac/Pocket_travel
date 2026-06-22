# 口袋旅行搭子 API 文档 v1.0

## 基础信息

- 项目：口袋旅行搭子（微信小程序）
- Base URL（示例）：
  - 生产：`https://api.pocket-travel-companion.com`
  - 测试：`https://api-staging.pocket-travel-companion.com`
- 鉴权方式：`Bearer Token`
- 协议：`HTTPS`（强制）

## 通用请求头

```http
Content-Type: application/json
Authorization: Bearer <token>
X-Client-Platform: mp-weixin
X-App-Version: 1.0.0
X-Request-Id: <uuid>
```

## 通用响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 状态码

| code | 说明 |
|---|---|
| 0 | 成功 |
| 10001 | 参数错误 |
| 10002 | 未登录或鉴权失败 |
| 20001 | 豆子不足 |
| 40001 | 路线生成失败（不扣豆） |
| 40002 | 链接解析失败（不扣豆） |
| 50001 | GPS校验失败（>500m） |
| 90000 | 系统异常 |

---

## 1. 微信登录

### POST `/api/v1/auth/wechat/login`

功能：code 换取 openid，首次登录创建用户并返回 token。

请求参数：

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| code | 是 | string | `uni.login` 获取 |
| nickname | 否 | string | 昵称 |
| avatarUrl | 否 | string | 头像URL |

成功示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "jwt_xxx",
    "openid": "mock_openid_xxx",
    "userId": 1001,
    "isNewUser": true
  }
}
```

---

## 2. 情绪地图问答

### POST `/api/v1/mood-map/submit`

功能：提交 7 题问答，更新情绪画像；可触发 +5 豆奖励（每日一次）。

### GET `/api/v1/mood-map/profile`

功能：获取当前用户情绪画像。

### PATCH `/api/v1/mood-map/quick-adjust`

功能：快速调整情绪标签。

---

## 3. 路线生成（消耗40豆）

### POST `/api/v1/routes/generate`

功能：基于情绪/偏好生成路线，成功扣 40 豆；失败不扣豆。

请求参数（核心）：

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| city | 是 | string | 城市 |
| dayMode | 是 | string | `half_day/one_day/multi_day` |
| spotPreferences | 是 | string[] | 景点偏好 |
| moodTags | 否 | string[] | 情绪标签，权重优先 |

成功示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "routeId": 2001,
    "consumedBeans": 40,
    "remainingBeans": 60,
    "moodWeightApplied": true
  }
}
```

---

## 4. 自媒体链接导入（消耗40豆）

### POST `/api/v1/routes/import-link`

功能：解析小红书/抖音/公众号链接并生成路线；成功扣 40 豆，失败不扣。

请求参数：

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| url | 是 | string | 自媒体链接 |

---

## 5. 路线列表 / 历史 / 详情

### GET `/api/v1/routes`
功能：获取路线列表（可用于进行中/历史展示）。

### GET `/api/v1/routes/{routeId}`
功能：获取路线详情（地图/途径点等）。

---

## 6. 景点详情

### GET `/api/v1/spots/{spotId}`
功能：获取景点基础信息、天气、人流等。

---

## 7. 打卡（GPS <= 500米）

### POST `/api/v1/spots/{spotId}/checkins`

功能：校验 GPS 距离后打卡，符合规则奖励 +10 豆。

请求参数：

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| lat | 是 | number | 用户纬度 |
| lng | 是 | number | 用户经度 |
| photos | 是 | string[] | 最多3张 |
| dryTags | 是 | string[] | 干货标签 |
| content | 否 | string | 描述 |

失败示例（超出500米）：

```json
{
  "code": 50001,
  "message": "你离景点还有点远哦,到达后再打卡吧",
  "data": {
    "distanceMeter": 782
  }
}
```

---

## 8. 评论（+10豆）

### POST `/api/v1/spots/{spotId}/comments`
功能：发布评论，满足规则奖励 +10 豆（每日每景点一次）。

### GET `/api/v1/spots/{spotId}/comments`
功能：获取评论列表（按点赞+时间排序，支持同好排序扩展）。

### POST `/api/v1/spots/{spotId}/comments/{commentId}/like`
功能：评论点赞，返回最新点赞数。

---

## 9. 豆子余额与流水

### GET `/api/v1/beans/balance`
功能：获取当前豆子余额、上限、下次发放时间。

### GET `/api/v1/beans/logs`
功能：获取豆子流水（倒序）。

---

## 10. 分享图生成

### POST `/api/v1/share/route-poster`
功能：生成路线分享图，返回 `posterUrl`、`shareCode` 与小程序落点路径。

### POST `/api/v1/share/spot-poster`
功能：生成景点分享图，返回 `posterUrl`、`shareCode` 与小程序落点路径。

### POST `/api/v1/share/route`
功能：生成路线分享码。

### GET `/api/v1/share/{shareCode}`
功能：公开读取分享码对应的路线或景点目标。

---

## 业务规则对齐（.dev.rule 强约束）

1. 豆子上限 `200`，每周一 `00:00` 发放 `100`。
2. 生成路线/链接导入消耗 `40`，失败必须不扣豆。
3. 打卡 GPS 距离 `>500m` 禁止。
4. 情绪标签在路线生成中权重优先。

---

## 配套文档与导出

- Swagger/OpenAPI：`backend-api/docs/openapi.json`
- 在线文档入口：`GET /docs`（服务启动后）
- Postman Collection：`backend-api/docs/postman_collection.json`
