# DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> docs/AI_USAGE_INVENTORY.md -> docs/APP_REVIEW_ASR_NR_AUDIT_TRACKER.md

# App Store Connect 提审填写模板（基于当前代码）

Last Updated: 2026-07-31
Source: current codebase plus the Supabase/OpenAI/Gemini control-panel screenshots captured on 2026-07-31. App Store Connect fields themselves are still not visible from the repository.

## 1) 应用信息（可直接对照填写）

- App 类型：iOS（Capacitor 套壳）
- 核心能力：聊天记录、活动/心情/待办提取、日报与 AI 日记、成长瓶子、提醒与专注、订阅会员
- 登录方式：邮箱密码、Google 登录、Apple 登录
- 账号删除：App 内可达并可执行硬删除

代码证据：
- `src/features/auth/AuthPage.tsx`
- `src/store/authStoreAccountActions.ts`
- `src/features/profile/components/DeleteAccountModal.tsx`
- `api/delete-account.ts`

## 2) 第三方服务与供应商（隐私标签/审核备注需覆盖）

### 2.1 AI 相关供应商

- DeepSeek（中文批注、输入分类、中文待办拆解、魔法笔）
- OpenAI（英/意批注、完整日记、短洞察、画像提取、植物观察日记）
- Google Gemini（英/意待办拆解）
- Qwen、智谱与 Chutes 已退出运行时；当前没有跨供应商自动兜底
- 现行模型、调用入口、发送数据范围与留存证据边界统一见 `docs/AI_USAGE_INVENTORY.md`

代码证据：
- `docs/AI_USAGE_INVENTORY.md`
- `src/server/deepseek-runtime.ts`
- `src/server/annotation-provider-runtime.ts`
- `api/diary.ts`
- `api/extract-profile.ts`
- `src/server/plant-diary-service.ts`
- `src/server/annotation-handler.ts`
- `api/classify.ts`
- `src/server/todo-decompose-service.ts`
- `api/magic-pen-parse.ts`

### 2.2 非 AI 第三方服务（iOS 提审口径）

- Supabase Free（身份认证 + 数据库 + Storage）
- Apple App Store Server API（IAP 验证）
- Open-Meteo（天气/空气质量上下文）

代码证据：
- `src/server/supabase-request-auth.ts`
- `api/subscription.ts`
- `src/server/weather-provider.ts`
- `src/server/air-quality-provider.ts`

## 3) 隐私政策与隐私标签建议填写口径（按代码事实）

### 3.1 收集的数据类型

- 账号数据：email、display name、avatar
- 用户内容：messages、moods、todos、reports、annotations、stardust、plant records
- 使用与诊断：功能事件、性能与遥测事件
- 设备与上下文：设备类型、系统版本、时区、可选天气上下文
- 支付相关：订阅状态、交易校验所需字段

代码证据：
- `api/delete-account.ts`（可见用户域数据表清单）
- `api/live-input-telemetry.ts`
- `src/features/profile/components/PrivacyPolicyPanel.tsx`

### 3.2 数据用途

- 提供账号登录、会话管理与数据同步
- 生成 AI 回应、智能批注、日报与日记内容
- 会员订阅开通、恢复、取消与状态验证
- 提醒、运营分析与故障诊断

### 3.3 是否用于追踪（Tracking）

- 代码未见广告 SDK / 跨 App 跟踪 SDK
- 建议 ASC 中按实际运营策略填写；若无跨 App 跟踪，通常为 "No Tracking"

### 3.4 是否用于模型训练

- OpenAI：控制台截图确认 model feedback、evaluation/fine-tuning、inputs/outputs 三类自愿数据共享均关闭；所有现行 OpenAI Chat Completions / Responses 请求还显式设置 `store: false`。该结论不等于 ZDR，默认滥用监测日志仍可能按 OpenAI 当前政策保留最多 30 天。
- Google Gemini：`Tshine` 为 Tier 1 Postpay；截图确认 GenerateContent 日志存储关闭。Interactions API 的日志设置为开启、默认 55 天，但 Seeday 当前不调用 Interactions API。截图显示 0 条日志，但未展开 Dataset 下拉框，因此不能把“无 Dataset”写成已证明事实。
- DeepSeek：尚无 Open Platform 书面留存/训练/DPA 证据；隐私政策只能保留“以适用条款和实际账号设置为准”的限定口径，不能承诺零留存或绝不训练。
- 因此 ASC 中如被问及“开发者是否使用用户内容训练自己的模型”，当前代码事实为“不用于训练 Seeday 自有模型”；如问题覆盖第三方服务商处理，必须按上述逐家证据回答，不能用一个笼统的“No”代替。

代码证据：
- `src/i18n/locales/en.ts`
- `src/i18n/locales/zh.ts`
- `src/i18n/locales/it.ts`

## 4) 审核员常看能力（提审备注可引用）

- 登录可用：邮箱/Google/Apple 三种登录
- 删除账号可用：设置页可触达，确认后删除用户业务数据与 auth 用户
- Apple 登录账号删除：删除确认后重新调起原生 Apple 授权，服务端核对 identity 并 revoke Apple token 后才继续删除
- 隐私入口可用：设置页可打开隐私政策与联系邮箱
- 路由形态：HashRouter（Capacitor 场景）
- 发布安全：`WKWebView.isInspectable` 仅 DEBUG 开启
- Privacy Manifest：已存在 `PrivacyInfo.xcprivacy`
- 第三方 AI 明示同意：登录并完成 onboarding 后、首次发送任何 AI 数据前出现独立弹窗；弹窗列出 DeepSeek/OpenAI/Gemini、发送的数据类别和用途，必须主动勾选后才能启用 AI，也可选择继续使用非 AI 功能
- 同意记录与撤回：`user_account_state` 保存状态、版本、同意/更新时间及撤回时间；设置页“AI 数据与同意”可随时撤回。前端统一门控和服务端再次核验共同阻止未同意/已撤回/旧版本同意的第三方 AI 请求
- 非 AI 降级：用户不同意时不发送第三方 AI 请求；例如植物生成仍可使用本地模板，不把内容交给 AI 服务商

代码证据：
- `src/App.tsx`
- `ios/App/App/AppDelegate.swift`
- `ios/App/App/PrivacyInfo.xcprivacy`
- `src/features/profile/components/AIConsentGate.tsx`
- `src/features/profile/components/AIConsentSettingsPanel.tsx`
- `src/lib/aiConsent.ts`
- `src/server/ai-consent.ts`

### 4.1 可粘贴到 Review Notes 的英文说明

> Before Seeday sends any user content to DeepSeek, OpenAI, or Google Gemini, the app presents a separate AI Data & Consent dialog describing the recipients, data categories, and purposes. The user must actively select the consent checkbox and tap “Agree and Enable AI.” The user may instead tap “Decline and Use Non-AI Features,” and the app remains usable without sending new third-party AI requests. Consent is versioned and recorded to the signed-in account. It can be withdrawn at any time under Profile → AI Data & Consent. Both the client and server block AI requests unless the current consent version is granted.

审核路径：登录测试账号 → 完成 Welcome/onboarding → 查看 AI 同意弹窗；之后进入 `Profile → AI Data & Consent` 查看状态或撤回。

### 4.2 2026-07-31 后台证据摘要

- Supabase：Free Plan；Database Backups 页面显示无计划备份，Free 不含 PITR；Log Drains 页面显示需 Pro，当前未配置。按 Supabase 当前定价页，Free 平台日志保留为 1 天。以上不能外推为 Supabase 内部灾备副本“绝对不存在”。
- Gemini：`Tshine` Tier 1 Postpay；GenerateContent storage disabled；Interactions storage enabled / 55 days，但运行时代码不调用 Interactions；API Keys 页面显示两个 Tshine key 为红色 Unrestricted，需要确认生产实际使用哪一个并迁移到受限制/新 Auth key。
- OpenAI：三类数据共享关闭；Data retention 页显示 API call logging 为 Enabled per call，没有看到 ZDR/MAM 开关或批准证据。代码已对每个现行 OpenAI 请求设置 `store: false`。
- 截图原始档案：`C:\Users\yangy\Desktop\app数据合规截图supabase+gpt+gemini（ai供应商）`（本地合规证据目录，不随 App 包提交）。

## 5) 需要在 ASC 后台人工确认（代码仓库无法证明）

- App 分类（Category）与当前功能是否一致
- 年龄分级问卷是否与真实内容一致
- 隐私标签是否覆盖全部第三方供应商与用途
- App Privacy URL / Support URL 是否可访问且内容一致
- 审核备注是否包含测试账号与关键路径说明
- Vercel Production 是否已配置独立的 Sign in with Apple Key ID / `.p8` 私钥（不能复用 App Store Connect IAP API key）
- Supabase 生产库是否已执行最新 `scripts/user_account_state_schema.sql`，确保 AI consent 字段存在；未迁移时服务端按失败关闭原则拒绝 AI 请求
- 最新服务端删除链、Apple revoke、OpenAI `store:false` 与 AI consent 校验是否已经部署到 Production；仅存在于本地代码不等于线上已生效
- Gemini Production `GEMINI_API_KEY` 实际对应哪个控制台 key；若对应截图中红色 Unrestricted key，必须先创建/配置受限制的新 key 并回归英/意待办拆解

## 6) 给提审同事的最小执行清单

1. 先按第 2 节补齐 ASC 的第三方供应商列表
2. 再按第 3 节填写数据类型/用途/是否追踪/是否训练
3. 用第 4 节能力点写 Review Notes（登录、删除账号、隐私入口）
4. 先执行 consent schema、部署服务端与新 iOS build，再按第 5 节逐项人工核对并截图留档
