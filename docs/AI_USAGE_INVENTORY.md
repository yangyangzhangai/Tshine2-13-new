<!-- DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> api/README.md -> src/api/README.md -->

# AI 服务商与调用清单（唯一事实源）

Last verified: 2026-07-29

本文是 Seeday **当前 AI 服务商、模型、调用入口和发送数据范围的唯一事实源（SSOT）**。`api/README.md` 负责端点契约，功能 README 负责业务行为；其他文档只引用本清单，不再维护平行的供应商映射。

## 1. 当前结论

- 生产运行时保留三家 AI 服务商：**DeepSeek、OpenAI、Gemini**。
- 原 Qwen、智谱（Zhipu）调用已迁移到 DeepSeek；旧 Chutes `/api/report` 端点已删除，不再存在运行时调用。
- GPT/OpenAI 与 Gemini 的既有业务路径保持不变，没有迁移到 DeepSeek。
- 所有 AI 请求均从前端 `src/api/client.ts` 进入 Vercel `api/*`，再由服务端调用对应服务商；前端不持有 AI 密钥。
- `openai` npm 包既用于 OpenAI 官方接口，也作为部分 DeepSeek OpenAI-compatible 接口的协议客户端；是否调用 OpenAI 以本表的具体路径为准。
- 当前没有跨服务商自动兜底；本地解析或静态文案兜底不属于第二 AI 服务商。

## 2. AI 调用矩阵

| 功能 | API / 服务端实现 | 服务商与默认模型 | 发送给服务商的主要数据 | 失败处理 |
| --- | --- | --- | --- | --- |
| AI 批注与建议 | `/api/annotation` → `src/server/annotation-handler.ts` | 中文：DeepSeek `deepseek-chat`；英/意：OpenAI `gpt-4.1-mini` | 用户事件文本、当天活动摘要、近期情绪/批注、待办摘要、所选 AI 人格；启用长期画像时包含画像摘要 | 返回本地默认批注或不展示无效建议 |
| 会员输入分类 | `/api/classify` | DeepSeek `deepseek-chat` | 当前输入文本、语言、可选习惯/目标候选 | API 返回结构化错误；前端保留本地分类路径 |
| 待办拆解 | `/api/todo-decompose` → `/api/classify?module=todo_decompose` | 中文：DeepSeek `deepseek-chat`；英/意：Gemini `gemini-2.5-flash` | 待办标题、语言 | 返回结构化错误，不跨服务商切换 |
| 完整日记 | `/api/diary` (`mode=full`) | OpenAI `gpt-4o` | 当日日报结构、历史上下文、语言、AI 人格 | 不完整时重试一次；仍失败则不持久化草稿 |
| 报告短洞察 | `/api/diary` (`action=insight`) | OpenAI `gpt-4o-mini` | 报告卡片所需的简短上下文、语言 | 返回错误，不保存不完整结果 |
| 用户画像提取 | `/api/extract-profile` | OpenAI `gpt-4o-mini`（可由 `PROFILE_EXTRACT_MODEL` 覆盖） | 最近消息、语言、现有画像相关上下文 | 跳过更新或返回错误 |
| 魔法笔解析 | `/api/magic-pen-parse` | DeepSeek `deepseek-chat` | 完整原文、语言、本地日期时间和时区偏移 | 保留完整原文到 `unparsed`，前端运行本地保守解析 |
| 植物观察日记 | `/api/plant-generate` → `src/server/plant-diary-service.ts` | OpenAI `gpt-4.1-mini` | 当天统计、候选植物信息、语言、AI 人格 | 使用既有本地化静态观察文案 |

`/api/diary` 的 Free teaser 模式使用本地确定性模板，不调用 AI。

## 3. 服务端配置

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek 服务端密钥 | 无，相关生产路径必填 |
| `DEEPSEEK_BASE_URL` | DeepSeek OpenAI-compatible base URL | `https://api.deepseek.com/v1` |
| `OPENAI_API_KEY` | OpenAI 服务端密钥 | 无，相关生产路径必填 |
| `OPENAI_BASE_URL` | OpenAI base URL（可选覆盖） | OpenAI SDK 默认值 |
| `GEMINI_API_KEY` | Gemini 服务端密钥 | 无，英/意待办拆解必填 |
| `GEMINI_BASE_URL` | Gemini native API base URL | `https://generativelanguage.googleapis.com/v1beta` |

功能级覆盖：

- `CLASSIFY_MODEL`：默认 `deepseek-chat`
- `TODO_DECOMPOSE_MODEL_ZH`：默认 `deepseek-chat`
- `TODO_DECOMPOSE_MODEL`：默认 `gemini-2.5-flash`
- `TODO_DECOMPOSE_GEMINI_BASE_URL`
- `TODO_DECOMPOSE_GEMINI_FALLBACK_MODEL`
- `PROFILE_EXTRACT_MODEL`：默认 `gpt-4o-mini`
- `MAGIC_PEN_MODEL`：默认 `deepseek-chat`
- `ANNOTATION_DEEPSEEK_BASE_URL`
- `MAGIC_PEN_DEEPSEEK_API_KEY`
- `MAGIC_PEN_DEEPSEEK_BASE_URL`

DeepSeek 共用解析逻辑位于 `src/server/deepseek-runtime.ts`。新增或修改 AI 能力时，应先更新本清单，再复用对应服务商的现有服务端入口，禁止把密钥放入浏览器端。

## 4. 数据留存与日志边界

- 代码没有在请求中配置 DeepSeek、OpenAI 或 Gemini 的供应商侧留存期限。
- 仓库无法证明三家服务商控制台、合同或组织账号当前采用的训练/留存设置；App Store 材料中不得仅凭代码写“零留存”“仅会话期间保存”或“绝不训练”。这些结论必须由各账号后台截图或合同条款佐证。
- Vercel 函数日志与 AI 服务商侧留存是两件不同的事，真实期限应在独立的数据留存文档中分别记录。
- `ANNOTATION_VERBOSE_LOGS=true` 会记录事件上下文、完整 prompt、原始模型输出和最终响应，可能包含用户日记信息；生产环境应保持关闭。
- `ANNOTATION_PROMPT_DEBUG` 和 `MAGIC_PEN_DEBUG` 只应用于受控调试，不能作为生产常开设置。
- 当前三语隐私政策仍含迁移前的供应商列表和未经账号证据确认的留存表述，不能作为现行技术事实；提审前必须按 `AGENTS.md` 的用户可见文案确认流程更新。

## 5. 变更规则

任何 AI 服务商、模型、base URL、发送数据范围或日志策略变更，必须同步更新：

1. 本文；
2. `.env.example`；
3. `api/README.md` 与 `src/api/README.md` 的相关端点契约；
4. `docs/CURRENT_TASK.md` 与 `docs/CHANGELOG.md`；
5. App 隐私政策与 App Store Connect 材料（涉及用户可见三语文案时，先按 `AGENTS.md` 完成文案来源确认）。
