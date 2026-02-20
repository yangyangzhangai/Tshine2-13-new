# 部署指南 - Vercel Serverless 架构

## 架构说明

```
用户浏览器 (前端 Vite)
       ↓
/api/* (Vercel Serverless Functions)
       ↓
AI 服务 (Chutes / Qwen / Gemini)
```

所有 API Keys 都存储在服务端环境变量中，前端代码无法直接访问，保证安全性。

## 快速部署

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

填写必要的环境变量:

```bash
# 至少配置一个 AI API Key
CHUTES_API_KEY=your_chutes_api_key_here      # 用于聊天和AI批注
QWEN_API_KEY=your_qwen_api_key_here          # 用于生成报告

# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 本地测试

```bash
# 使用 Vercel CLI 本地开发 (推荐)
npx vercel dev

# 或直接启动 Vite 开发服务器
npm run dev
```

本地开发时，API 请求会通过 Vite proxy 自动转发到本地 Serverless Functions。

### 4. 部署到 Vercel

#### 方式 A: 使用 Vercel CLI

```bash
# 登录 Vercel
npx vercel login

# 部署
npx vercel --prod
```

#### 方式 B: Git 集成 (推荐)

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel Dashboard 导入项目
3. 配置环境变量
4. 自动部署

### 5. 配置 Vercel 环境变量

在 Vercel Dashboard → Project Settings → Environment Variables 中添加:

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `CHUTES_API_KEY` | Chutes AI API Key | 是 (聊天功能) |
| `QWEN_API_KEY` | 通义千问 API Key | 是 (报告功能) |
| `GEMINI_API_KEY` | Gemini API Key (备选) | 否 |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | 是 |

## API 端点

部署后可以通过以下端点访问:

- `POST /api/chat` - AI 聊天
- `POST /api/report` - 生成日报/周报/月报
- `POST /api/annotation` - AI 智能批注

## 获取 API Keys

### Chutes API Key
1. 访问 https://chutes.ai/
2. 注册并登录
3. 在 Dashboard 获取 API Key
4. 模型使用: `NousResearch/Hermes-4-405B-FP8-TEE`

### 通义千问 API Key
1. 访问 https://dashscope.aliyun.com/
2. 开通 DashScope 服务
3. 创建 API Key
4. 模型使用: `qwen-flash`

### Gemini API Key (备选)
1. 访问 https://ai.google.dev/
2. 创建项目并获取 API Key
3. 模型使用: `gemini-2.0-flash`

## 验证部署

部署完成后，访问以下 URL 测试:

```bash
# 测试 Chat API
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# 测试 Report API
curl -X POST https://your-project.vercel.app/api/report \
  -H "Content-Type: application/json" \
  -d '{"data":{"date":"2024-01-01","todos":[],"activities":[],"stats":{}},"type":"daily"}'
```

## 常见问题

### Q: 本地开发时 API 返回 404?
A: 确保使用 `npx vercel dev` 而不是 `npm run dev`，或者配置 Vite proxy。

### Q: 部署后 API 返回 500?
A: 检查 Vercel Dashboard 的 Function Logs，确认环境变量是否正确配置。

### Q: 如何更新 API Key?
A: 在 Vercel Dashboard → Environment Variables 中更新，然后重新部署。

### Q: 可以只用一个 AI 服务吗?
A: 可以。聊天功能需要 `CHUTES_API_KEY`，报告功能需要 `QWEN_API_KEY` 或 `GEMINI_API_KEY`。

## 安全注意事项

✅ **已保护**: API Keys 存储在服务端环境变量
✅ **已保护**: 前端无法直接访问 AI 服务
✅ **已保护**: 所有 API 调用都经过服务端验证

⚠️ **重要**: 永远不要将 `.env` 文件提交到 Git!
⚠️ **重要**: 定期轮换 API Keys

## 项目结构

```
.
├── api/                    # Vercel Serverless Functions
│   ├── chat.ts            # 聊天 API
│   ├── report.ts          # 报告 API
│   └── annotation.ts      # AI 批注 API
├── src/
│   ├── api/
│   │   ├── client.ts      # 前端 API Client (调用 /api/*)
│   │   ├── qwen.ts        # (废弃，保留参考)
│   │   └── gemini.ts      # (废弃，保留参考)
│   └── store/
│       ├── useChatStore.ts       # 已更新为使用 client.ts
│       ├── useReportStore.ts     # 已更新为使用 client.ts
│       └── useAnnotationStore.ts # 已更新为使用 client.ts
├── .env.example           # 环境变量模板
└── DEPLOY.md             # 本文件
```
