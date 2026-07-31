# 部署指南（Vercel Serverless）

## 架构

```text
Browser (Vite/React)
  -> /api/* (Vercel Serverless)
  -> DeepSeek / OpenAI / Gemini
```

## 必要环境变量

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
GEMINI_API_KEY=...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
APPLE_SIGN_IN_TEAM_ID=...
APPLE_SIGN_IN_KEY_ID=...
APPLE_SIGN_IN_PRIVATE_KEY=...
APPLE_SIGN_IN_CLIENT_ID=com.seeday.app
```

说明：
- `DEEPSEEK_API_KEY` 用于中文批注、输入分类、中文待办拆解和魔法笔。
- `OPENAI_API_KEY` 用于英/意批注、完整日记、短洞察、画像提取和植物观察日记。
- `GEMINI_API_KEY` 用于英/意待办拆解。
- Qwen、智谱与 Chutes 不再有运行时调用。
- 功能级模型覆盖包括 `CLASSIFY_MODEL`、`TODO_DECOMPOSE_MODEL_ZH`、`TODO_DECOMPOSE_MODEL`、`PROFILE_EXTRACT_MODEL`、`MAGIC_PEN_MODEL`。
- 完整供应商与数据范围口径只在 `docs/AI_USAGE_INVENTORY.md` 维护。
- `APPLE_SIGN_IN_*` 是账号删除时 Apple token revoke 使用的独立凭据，不能用 App Store Connect IAP issuer/key 替代。

## iOS 发布 bundle

```bash
npm run build:ios
```

此命令读取 `.env.ios` 的 `VITE_API_BASE`，构建后自动执行 `cap copy ios`。提审前应在 `ios/App/App/public/assets/*.js` 中确认生产 API base 已编入，再从 Xcode Archive。

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

说明：当前 `npm run dev` / `npm run dev:vite` 都只启动 Vite 前端；本仓库没有额外封装本地 serverless 调试脚本。

## 部署到 Vercel

### 方式 A：Vercel CLI

```bash
npx vercel login
npx vercel --prod
```

### 方式 B：Git 集成

1. 推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel 导入仓库
3. 配置环境变量
4. 自动部署

## API 端点（当前实现）

- `POST /api/annotation`
- `POST /api/classify`
- `POST /api/diary`
- `POST /api/magic-pen-parse`
- `POST /api/plant-generate`
- `GET /api/plant-history`
- `POST /api/live-input-telemetry`
- `GET /api/live-input-dashboard`

## Live Input Telemetry

To enable the new live input telemetry dashboard in production:

- Run `scripts/live_input_telemetry_schema.sql` in Supabase SQL Editor.
- Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- Set `LIVE_INPUT_ADMIN_EMAILS` to the comma-separated admin email list that can open `/telemetry/live-input`.
- Optionally set `LIVE_INPUT_TELEMETRY_STORE_RAW_TEXT=true` if you explicitly want to store raw user input for debugging.

## 运行时模型（当前实现）

- `/api/annotation`: 中文 DeepSeek `deepseek-chat`；英/意 OpenAI `gpt-4.1-mini`。
- `/api/classify`: DeepSeek `deepseek-chat`。
- `/api/todo-decompose`: 中文 DeepSeek `deepseek-chat`；英/意 Gemini `gemini-2.5-flash`。
- `/api/diary`: OpenAI `gpt-4o`；短洞察使用 `gpt-4o-mini`。
- `/api/extract-profile`: OpenAI `gpt-4o-mini`。
- `/api/magic-pen-parse`: DeepSeek `deepseek-chat`。
- `/api/plant-generate` 内部植物观察日记：OpenAI `gpt-4.1-mini`。
- `/api/report` 已删除；报告 AI 文本统一由 `/api/diary` 承担。
- 端点级模型覆盖与发送数据范围见 `docs/AI_USAGE_INVENTORY.md`。

## 安全注意事项

- 永远不要提交 `.env`
- 密钥只放在 Vercel 环境变量
- 前端只保留公开配置（`VITE_*`）
