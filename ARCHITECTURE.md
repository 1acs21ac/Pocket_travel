# 口袋旅行搭子 - 技术文档

> 情绪疗愈型周末微旅行规划助手

---

## 一、项目概览

**口袋旅行搭子**是面向 18~35 岁年轻人的微信小程序，核心通过**情绪画像构建 → AI 路线生成 → 现场打卡 → 赚取豆子**的正向闭环，帮助用户快速生成高情绪匹配度的周末旅行路线，解决传统旅行 App 攻略繁琐、情绪与场景匹配度低的核心痛点。

- **小程序名称**：口袋旅行搭子
- **核心定位**：情绪疗愈 + 轻量规划 + NFC 实体联动
- **目标用户**：想出门散心但厌烦复杂攻略的年轻人

---

## 二、技术架构总览

```
口袋旅行搭子
├── 前端（微信小程序端）
│   ├── uni-app 跨端框架（Vue 3 + TypeScript）
│   ├── Pinia 状态管理
│   ├── SCSS 样式
│   └── 微信原生能力（NFC / 定位 / Canvas）
├── 后端（Node.js 服务层）
│   ├── Koa.js Web 框架
│   ├── JWT 无状态认证
│   ├── MySQL 数据持久化
│   └── node-cron 定时任务
└── 第三方服务
    └── 微信登录 / 地图 API / 天气 API
```

---

## 三、前端技术栈

### 3.1 框架选型

| 维度 | 选型 | 说明 |
|------|------|------|
| 跨端框架 | **uni-app** `v3.0.0-alpha` | Vue 3 Composition API，支持编译为微信小程序、H5 等多端 |
| 构建工具 | **Vite** `v5.2` | 基于 ESM 的极速构建，集成于 uni-app 插件体系 |
| 编译目标 | **mp-weixin** | 通过 `@dcloudio/uni-mp-weixin` 插件输出原生 WXML/WXSS |
| 语言 | **TypeScript** `v5.7` | 静态类型检查，提升代码健壮性 |
| 样式 | **SCSS** `v1.99` | 支持嵌套、变量、混合宏，提升样式复用 |
| 状态管理 | **Pinia** `v2.1.7` | 轻量级 Store，管理用户、豆子、路线等全局状态 |
| UI 框架 | 原生 WXML + SCSS | 不依赖第三方 UI 库，保持包体积可控 |

### 3.2 核心模块

```
src/
├── pages/                    # 页面目录（10+ 个页面）
│   ├── explore/              # 探索页：情绪引导 + 场景化推荐瀑布流
│   ├── path/                 # 路径页：NFC 唤起 + 行程管理 + 链接导入
│   ├── profile/              # 我的页：资产管理 + 情绪设置 + 足迹
│   ├── mood-qa/              # 情绪问答页：7 维度构建用户画像
│   ├── route-preview/        # 路线预览页：只读模式，支持采纳生成
│   ├── route-detail/         # 路线详情页：地图 + 途径点卡片
│   ├── spot-detail/          # 景点详情页：打卡 + 评论互动
│   ├── checkin-photo/        # 打卡拍照页
│   ├── share-generate/       # 分享图生成页（Canvas 绘制）
│   └── ...
├── static/                   # 静态资源
│   └── ui-assets/global/icons/  # TabBar 图标（PNG）
├── store/                    # Pinia Store
│   ├── user.ts               # 用户信息 + 情绪标签
│   ├── bean.ts               # 豆子余额
│   └── route.ts              # 路线数据 + 推荐卡片
├── utils/
│   ├── request.ts            # 封装 uni.request，统一错误处理 + JWT 注入
│   ├── auth.ts               # Token 校验 / 登录状态判断
│   └── ...
├── pages.json                # 页面路由配置 + TabBar
├── manifest.json             # 小程序全局配置
└── App.vue                   # 应用入口
```

### 3.3 前端关键技术点

**NFC 唤起**：小程序通过 `uni.onAppShow` 监听启动参数，解析 NFC URL Scheme 中的场景值，跳转到对应页面。

**GPS 打卡校验**：使用 Haversine 公式计算用户坐标与景点坐标的球面距离，距离超过 500 米禁止打卡。

**Canvas 分享图**：离线绘制包含行程信息、景点卡片和小程序码的图片，保存至本地相册。

**本地缓存**：情绪标签、豆子余额等高频访问数据缓存至本地，减少接口请求。

---

## 四、后端技术栈

### 4.1 框架选型

| 维度 | 选型 | 说明 |
|------|------|------|
| 运行时 | **Node.js** | 事件驱动非阻塞 I/O，适合高并发轻量服务 |
| Web 框架 | **Koa.js** `v2.15` | 洋葱模型中间件，简洁可扩展 |
| 路由 | **koa-router** `v12` | RESTful 路由管理，模块化路由文件 |
| 认证 | **JWT** `v9` | 无状态 Token（userId / openid，7 天过期） |
| 数据库 | **MySQL** `v8` + **mysql2** `v3.22` | InnoDB 引擎，支持连接池与事务 |
| 定时任务 | **node-cron** `v4` | 每周一 00:00 自动发放豆子奖励 |
| 安全 | **@koa/cors** + **koa-helmet** | 跨域资源共享、安全头防护 |
| 测试 | **Vitest** `v4` + **Supertest** | 单元测试与接口测试 |
| 环境变量 | **dotenv** | 配置管理与环境隔离 |

### 4.2 后端目录结构

```
backend-api/
├── src/
│   ├── app.js                    # Koa 应用入口，聚合中间件
│   ├── models/
│   │   ├── db.js                 # mysql2 连接池管理
│   │   ├── schema.sql            # MySQL 建表脚本（14 张表）
│   │   ├── userModel.js          # 用户 CRUD
│   │   ├── beanModel.js          # 豆子账户 + 流水 + 奖励发放
│   │   ├── routeModel.js         # 路线 + 途经点 + 路段 CRUD
│   │   ├── spotModel.js          # 景点 CRUD
│   │   ├── checkinModel.js       # 打卡记录
│   │   └── commentModel.js       # 评论 + 点赞
│   ├── controllers/
│   │   ├── authController.js      # 微信登录 / Token 签发
│   │   ├── userController.js      # 用户信息 / 情绪标签
│   │   ├── beanController.js     # 豆子余额 / 流水明细
│   │   ├── routeController.js    # 路线生成 / 导入 / 详情 / 列表
│   │   ├── spotController.js      # 景点列表 / 收藏
│   │   ├── checkinController.js   # GPS 打卡
│   │   ├── commentController.js   # 评论 / 点赞
│   │   └── notificationController.js  # 消息通知
│   ├── routes/
│   │   ├── index.js              # 路由聚合
│   │   ├── authRoutes.js         # /api/v1/auth/*
│   │   ├── userRoutes.js         # /api/v1/users/*
│   │   ├── beanRoutes.js         # /api/v1/beans/*
│   │   ├── routeRoutes.js        # /api/v1/routes/*
│   │   ├── spotRoutes.js         # /api/v1/spots/*
│   │   ├── checkinRoutes.js      # /api/v1/checkins/*
│   │   └── commentRoutes.js      # /api/v1/comments/*
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT 鉴权中间件
│   ├── utils/
│   │   ├── authMiddleware.js     # Bearer Token 校验
│   │   ├── errorMiddleware.js    # 统一错误处理（BizError → JSON）
│   │   ├── jwt.js                # Token 签发与校验
│   │   ├── errors.js             # 自定义业务错误类 BizError
│   │   ├── beanRule.js           # 豆子规则常量（成本、上限等）
│   │   ├── validate.js           # 参数校验工具
│   │   ├── response.js           # 统一响应格式 { code, message, data }
│   │   ├── routePlanningService.js  # 路线规划 + 链接解析
│   │   └── logger.js             # 日志工具
│   └── cron/
│       └── weeklyBeanGrant.js    # 每周一豆子发放定时任务
├── package.json
└── .env.example
```

### 4.3 接口设计（RESTful）

所有接口前缀 `/api/v1`，统一响应格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 微信授权登录，签发 JWT |
| GET | `/user/profile` | 获取用户信息 |
| PUT | `/user/profile` | 更新用户信息 |
| GET | `/beans/balance` | 查询豆子余额 |
| GET | `/beans/logs` | 查询豆子变动流水 |
| POST | `/mood-map/profile` | 保存情绪问答结果 |
| GET | `/mood-map/profile` | 获取情绪画像 |
| POST | `/routes/generate` | 偏好设置生成路线（-40 豆） |
| POST | `/routes/import-link` | 链接导入生成路线（-40 豆） |
| GET | `/routes` | 获取路线列表 |
| GET | `/routes/:id` | 获取路线详情（含途经点） |
| DELETE | `/routes/:id` | 删除路线 |
| GET | `/spots` | 获取景点列表 |
| GET | `/spots/:id` | 获取景点详情 |
| POST | `/spots/:id/favorite` | 收藏景点 |
| POST | `/checkins` | 提交打卡（GPS 校验） |
| GET | `/comments` | 获取评论列表 |
| POST | `/comments` | 发布评论 |
| POST | `/comments/:id/like` | 点赞评论 |
| GET | `/notifications` | 获取消息通知 |

---

## 五、数据库设计

### 5.1 ER 图概览

```
users ─────┬───── bean_accounts (1:1)
           ├───── mood_profiles (1:1)
           ├───── routes (1:N)
           ├───── checkins (1:N)
           ├───── comments (1:N)
           ├───── spot_favorites (N:N)
           └───── bean_logs (1:N)
                  └─ bean_reward_claims (防重复领取)

routes ───┬───── route_stops (1:N)
          └───── route_legs (1:N)

spots ────┬───── checkins (1:N)
          ├───── comments (1:N)
          └───── spot_favorites (N:N)
```

### 5.2 核心表说明

| 表名 | 说明 | 关键设计 |
|------|------|---------|
| `users` | 用户表 | openid 唯一索引 |
| `bean_accounts` | 豆子账户 | balance CHECK 约束 [0, 200] |
| `bean_logs` | 豆子流水 | idempotency_key 唯一，防重复 |
| `mood_profiles` | 情绪画像 | answers_json / mood_tags_json JSON 字段 |
| `routes` | 路线主表 | detail_json 存储完整路线结构 |
| `route_stops` | 路线途经点 | (route_id, stop_order) 唯一索引 |
| `route_legs` | 点间路段 | 存储距离、交通方式 |
| `spots` | 景点表 | lat/lng 带 CHECK 范围约束 |
| `checkins` | 打卡记录 | distance_meter GPS 校验距离 |
| `comments` | 景点评论 | rating [1,5] 约束，按心情标签排序 |
| `bean_reward_claims` | 奖励领取记录 | 唯一索引防重复，同一景点每天限 1 次 |
| `route_generation_runs` | 路线生成运行记录 | 记录生成状态，支持失败重试 |
| `share_records` | 分享记录 | share_code 唯一，支持扫码跳转 |
| `notifications` | 通知消息 | read_at 标记已读状态 |

### 5.3 索引策略

| 索引名 | 表 | 字段 | 用途 |
|--------|-----|------|------|
| `idx_routes_user_created_at` | routes | (user_id, created_at DESC) | 用户路线列表排序 |
| `idx_bean_logs_user_created_at` | bean_logs | (user_id, created_at DESC) | 豆子流水查询 |
| `idx_checkins_user_created_at` | checkins | (user_id, created_at DESC) | 用户打卡历史 |
| `idx_comments_spot_like_created_at` | comments | (spot_id, like_count DESC, created_at DESC) | 评论个性化排序 |
| `idx_route_stops_route_stop_order` | route_stops | (route_id, stop_order) | 路线途经点排序 |
| `uk_spot_favorites_user_spot` | spot_favorites | (user_id, spot_id) | 防重复收藏 |
| `uk_bean_reward_claims` | bean_reward_claims | (user_id, reward_type, target_type, target_id, reward_date) | 防重复领取 |

---

## 六、核心业务规则

### 6.1 豆子系统

| 行为 | 豆子变动 | 限制 |
|------|----------|------|
| 每周一 00:00 自动发放 | +100 | 余额上限 200，超出不发 |
| 生成路线 / 导入链接 | -40 | 失败不扣 |
| 景点打卡 | +10 | 每景点每天 1 次 |
| 景点评论 | +10 | 每景点每天 1 次 |
| 更新情绪地图 | +5 | 每天 1 次 |

### 6.2 事务一致性保证

路线生成时的完整事务流程：

```
BEGIN TRANSACTION
  ① INSERT route_generation_runs (status=pending)
  ② SELECT balance FROM bean_accounts WHERE user_id=? FOR UPDATE（行锁）
  ③ 校验 balance >= 40
  ④ INSERT routes + route_stops + route_legs
  ⑤ UPDATE bean_accounts SET balance = balance - 40
  ⑥ INSERT bean_logs (idempotency_key)
  ⑦ UPDATE route_generation_runs (status=succeeded)
COMMIT
```

任一步骤失败 → `ROLLBACK`，余额不变。

### 6.3 情绪驱动推荐逻辑

```
用户情绪标签 (moodTags)
  + 景点偏好 (spotPreferences)
  + 行程天数 (dayMode)
  → 路线规划服务 (buildDeterministicRoutePlan)
  → 按标签匹配度对景点池打分排序
  → 生成 (title, subtitle, spots, connections, recommendedSpots)
```

---

## 七、部署与配置

### 7.1 环境变量

```bash
# 后端 .env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pocket_travel
DB_USER=root
DB_PASSWORD=your-password
```

### 7.2 数据库初始化

```bash
mysql -u root -p < backend-api/src/models/schema.sql
```

### 7.3 启动服务

```bash
# 后端开发
cd backend-api
npm install
npm run dev   # nodemon 监听 src 目录，修改自动重启

# 小程序开发
npm install
npm run dev:mp-weixin   # 编译输出到 dist/dev/mp-weixin
# 用微信开发者工具导入 dist/dev/mp-weixin 目录
```

### 7.4 接口联调配置

微信开发者工具中开启「不校验合法域名、web-view（业务域名）等」（开发阶段），生产环境需将 `http://127.0.0.1:3000` 配置为合法请求域名。

---

## 八、性能与安全

### 8.1 性能优化

- 探索页瀑布流图片**懒加载**，减少首屏耗时
- 豆子余额、情绪标签**本地缓存**，减少接口请求
- 分享图使用 **Canvas 离线绘制**，避免频繁调用后端
- MySQL **连接池**复用，避免频繁建立连接

### 8.2 安全措施

- 所有接口通过 **JWT 中间件**统一鉴权，无状态可水平扩展
- 豆子扣减前**余额校验** + 数据库 **CHECK 约束**双重保护
- `INSERT IGNORE` + **唯一索引** 防重复写入
- `@koa/cors` 限制跨域来源，`koa-helmet` 注入安全响应头
- SQL 参数化查询（mysql2 prepare statement），防注入

---

## 九、第三方集成

| 服务 | 用途 | 接入方式 |
|------|------|---------|
| 微信登录 | 获取 openid，签发 JWT | 微信接口获取 code 换 openid |
| 高德 / 腾讯地图 | POI 检索、距离计算、导航调起 | 微信小程序 map 组件 + URL Scheme |
| 天气 API | 实时天气，获取温度用于场景化推荐 | 后端聚合 |
| NFC 玩偶 | Android 端 NFC 触碰唤起小程序 | 芯片写入微信 URL Scheme |

---

## 十、技术亮点

1. **情绪驱动推荐**：7 维度情绪问答 → 路线生成强关联，非简单景点罗列
2. **事务级积分一致性**：MySQL 事务 + 行锁 + 幂等键，保证豆子扣费准确
3. **NFC 实体联动**：物理玩偶与数字产品打通，强化品牌体验
4. **防刷羊毛机制**：每日次数限制 + 余额上限 + 唯一索引多层防护
5. **uni-app 跨端架构**：一套代码支持微信小程序、H5 多端输出
