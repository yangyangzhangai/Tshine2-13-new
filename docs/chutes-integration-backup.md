# Chutes 接入备份说明

这个文档保存了 Chutes 的接入方式，后续你恢复 Chutes 可直接按此切回。

## 1. 环境变量

在 `.env` 或 Vercel 环境变量中增加：

```env
CHUTES_API_KEY=your_chutes_api_key
CHUTES_BASE_URL=https://llm.chutes.ai/v1
CHUTES_MODEL=qwen-plus
```

说明：
- `CHUTES_BASE_URL` 也可用 `https://api.chutes.ai/v1`（以你的账号文档为准）。
- `CHUTES_MODEL` 请填你账号可用模型，如 `NousResearch/Hermes-4-405B-FP8-TEE`。

## 2. 服务端请求模板（Node/Vercel）

```ts
const apiKey = process.env.CHUTES_API_KEY;
const baseUrl = process.env.CHUTES_BASE_URL || 'https://llm.chutes.ai/v1';
const model = process.env.CHUTES_MODEL || 'qwen-plus';

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model,
    messages,
    temperature: 0.8,
    max_tokens: 1024,
    stream: false,
  }),
});
```

## 3. 从当前阿里方案切回 Chutes（最小改动）

当前项目已统一走 DashScope（`QWEN_API_KEY + DASHSCOPE_BASE_URL`）。  
如果要切回 Chutes，可做两种方式：

1. 直接替换 API 路由里的 `baseUrl` 与 `apiKey` 来源：
- `api/chat.ts`
- `api/annotation.ts`
- `api/diary.ts`
- `api/report.ts`

2. 做双路由（推荐）：
- 先请求 Chutes。
- 失败时（超时/429/5xx/网络错误）回退到 DashScope。

## 4. 常见故障排查

- 401/403：API Key 错误或无权限。
- 404：`baseUrl` 或模型名不正确。
- 429：达到速率限制，需限流/重试。
- 5xx：服务端波动，建议熔断并回退备用通道。

