# 安全修复说明

## ⚠️ 重要：已移除的硬编码 API Keys

以下 API Keys 已从代码中移除，请立即在对应平台吊销并重新生成：

### 1. Gemini API Key
**位置**: `src/api/gemini.ts`
**已移除 Key**: `AIzaSyDmQkH6BqZMT1Z1ZsERhA9oYJ5XTIuuVeM`

**操作**: 
1. 访问 https://ai.google.dev/
2. 进入 API Keys 管理页面
3. 删除旧 Key 并生成新 Key

### 2. Chutes API Key
**位置**: `src/services/aiService.ts`
**已移除 Key**: `cpk_38f7d5fd384e4b22a1dfbfcda753b36b.222def67407b56dea6d82490041412aa.pndwFrTxPgF323q5yxLABuCYEZgr2EpV`

**操作**:
1. 访问 https://chutes.ai/
2. 进入 Settings → API Keys
3. 删除旧 Key 并生成新 Key

### 3. Qwen (通义千问) API Key
**位置**: `src/api/qwen.ts`
**已移除 Key**: `sk-6fb1648dfc80491dab239eee034c15cf`

**操作**:
1. 访问 https://dashscope.aliyun.com/
2. 进入 API Key 管理
3. 删除旧 Key 并生成新 Key

## ✅ 新架构

```
用户浏览器 (前端 Vite)
       ↓ (无 API Keys)
/api/* (Vercel Serverless Functions)
       ↓ (API Keys 存储在服务端环境变量)
AI 服务 (Chutes / Qwen / Gemini)
```

## 部署步骤

1. **配置环境变量**
   ```bash
   cp .env.example .env
   # 填入新的 API Keys
   ```

2. **在 Vercel 部署**
   ```bash
   npx vercel --prod
   ```

3. **在 Vercel Dashboard 设置环境变量**
   - `CHUTES_API_KEY`
   - `QWEN_API_KEY`
   - `GEMINI_API_KEY` (可选)

## 验证安全

部署完成后，在浏览器控制台执行：

```javascript
// 应该返回空或 undefined，说明 API Keys 不在前端
console.log(window.CHUTES_API_KEY); // undefined
console.log(window.QWEN_API_KEY);   // undefined
```

## 额外建议

- 启用 API Key 使用限制（如 IP 白名单、请求频率限制）
- 定期检查 API 调用日志，发现异常立即轮换 Key
- 考虑使用 Vercel 的 Edge Config 或 Vault 进一步加强安全
