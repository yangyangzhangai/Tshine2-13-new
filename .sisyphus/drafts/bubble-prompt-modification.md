# Draft: 气泡 Prompt 修改

## 当前情况

### 核心文件位置
- **主Prompt文件**: `src/services/aiService.ts` (第89-145行)
- **UI组件**: `src/components/AIAnnotationBubble.tsx`
- **模型配置**: 使用 Chutes API + MiniMax-M2.5-TEE 模型

### 当前Prompt结构

#### 系统提示词 (System Prompt)
定义了一个**住在「Timeshine」时间棱镜中的高维意识体**的人设：
- 身份：来自以时光为物质的星球的高维意识
- 性格：天真哲学家 + 幽默傲娇小王子 + 异常思维 + 神秘陪伴者 + 敏感共情者
- 风格：15-40字，空灵、有趣、调皮

#### 用户提示词 (User Prompt)
包含：
- 事件类型 + 事件数据
- 用户今日完整时间线
- 统计概览（活动总数、总时长、当前时间、最近批注）
- 生成要求：15-50中文字符

### 当前默认批注 (Fallback)
API失败时使用的默认回复：
- `activity_completed`: ✨ 又一颗碎片落入你的时间海洋
- `mood_recorded`: 💫 捕捉到你的情绪波动，像流星划过
- `task_deleted`: 🌊 删除任务，是在给时间减负吗？
- `overwork_detected`: 🐱 工作超过3小时了，要不要学学猫？
- `idle_detected`: 🤔 3小时没有动静，是进入冥想了吗？
- `day_complete`: 🌙 今天收集的碎片已生成彩窗，去画廊看看吧

## 用户意图
> 用户想要修改气泡生成的prompt，具体修改方向待确认

## 待确认问题
1. 想修改哪部分？人设/风格/输出格式/默认批注？
2. 期望的新风格是什么？
3. 有没有参考的文案风格？
