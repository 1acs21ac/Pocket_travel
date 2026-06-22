# backend-api

## 启动步骤

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 安装依赖：

```bash
npm install
```

3. 启动 PostgreSQL（本地）：

- 地址：`localhost:5432`
- 数据库：`pocket_travel`（服务启动时会自动创建）
- 用户：`postgres`
- 密码：安装 PostgreSQL 时设置的管理员密码（填写到 `.env` 的 `DB_PASSWORD`）

4. 启动服务：

```bash
npm run dev
```

## 说明

- 已切换为 PostgreSQL，并在启动时自动执行 `src/models/schema.sql` 建表
- 已实现微信登录、情绪问答、路线生成/导入、景点详情、打卡、评论、豆子账户、分享图接口
- RAG 与地图服务为占位实现，后续可替换真实服务
