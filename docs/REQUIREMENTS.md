# Time Shine - 需求文档

> 功能需求、技术规格与开发路线图

---

## 📋 文档说明

- **文档版本**：v1.0
- **最后更新**：2026-02-15
- **适用范围**：前端开发、AI 集成、UI/UX 设计
- **关联文档**：PROJECT_OVERVIEW.md（产品概述）、ARCHITECTURE.md（技术架构）

---

## 🎯 功能需求总览

### 核心功能模块

```
┌─────────────────────────────────────────────────────────────┐
│                      Time Shine                              │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   记录系统    │   碎片系统    │   AI 批注    │   画廊系统     │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ • 对话模式    │ • 碎片生成    │ • 事件监听   │ • 日彩窗       │
│ • 记录模式    │ • 属性计算    │ • 决策引擎   │ • 周/月拼图    │
│ • 心情记录    │ • AI 视觉决策 │ • 批注展示   │ • 历史浏览     │
│ • 活动计时    │              │              │ • 影子日记     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 1️⃣ 记录系统 (Recording System)

### 1.1 对话/记录双模式

**现有功能**（已验证）：
- ✅ Chat 模式：自由对话，AI 回复
- ✅ Record 模式：活动记录，自动计算时长
- ✅ 心情模式：粉色主题，记录情绪

**需求变更**：
- ❌ Chat 模式的 AI 回复功能**移除**
- ✅ AI 仅通过批注系统与用户交互

### 1.2 活动记录流程

```
用户进入 Record 模式
    ↓
输入活动名称（如"写代码"）
    ↓
系统自动计时
    ↓
用户输入下一个活动或切换模式
    ↓
自动计算上一活动时长
    ↓
生成活动记录
    ↓
触发碎片生成流程
```

**数据模型**（已有，需扩展）：
```typescript
interface Message {
  id: string;
  content: string;        // 活动内容
  timestamp: number;      // 开始时间
  duration?: number;      // 时长（分钟）
  type: 'text' | 'ai' | 'system';
  mode: 'chat' | 'record';
  isMood?: boolean;       // 是否为心情记录
  
  // 新增：关联碎片
  fragmentId?: string;    // 关联的碎片 ID
}
```

### 1.3 待办快捷入口

**需求**：在首页/待办页面顶部添加置顶建议卡片

```typescript
interface QuickAction {
  id: string;
  icon: string;           // emoji 图标
  text: string;           // 操作文字
  target: '/todo' | '/chat' | '/gallery';
  priority: 'high' | 'normal';
}

// 默认显示
{
  icon: '🎯',
  text: '开始完成今日待办',
  target: '/todo',
  priority: 'high'
}
```

---

## 2️⃣ 碎片系统 (Fragment System)

### 2.1 碎片生成时机

**触发条件**：
- 记录模式下，活动完成时（duration 被计算后）
- 心情模式下，心情记录提交时

**非触发条件**：
- 待办事项完成（不直接生成碎片）
- 手动编辑的活动记录（可选生成）

### 2.2 碎片数据模型

```typescript
interface TimeFragment {
  id: string;
  
  // 关联信息
  messageId: string;      // 关联的活动记录 ID
  userId: string;
  
  // 时间信息
  createdAt: number;      // 碎片生成时间
  activityDate: string;   // 所属日期 YYYY-MM-DD
  
  // AI 决定的视觉属性（核心）
  shape: 'spiral' | 'arrow' | 'spark' | 'wave' | 'crystal';
  colorStart: string;     // 渐变色起点，如 '#FF6B35'
  colorEnd: string;       // 渐变色终点，如 '#F7931E'
  texture: 'heavy' | 'light' | 'flowing' | 'explosive' | 'solid';
  temperature: 'cool' | 'warm' | 'hot' | 'electric';
  
  // 元数据（AI 参考用）
  metadata: {
    activityContent: string;    // 活动内容
    duration: number;           // 时长（分钟）
    hourOfDay: number;          // 发生时段 0-23
    isMood: boolean;            // 是否为心情
    moodContent?: string;       // 心情内容（如果是心情）
  }
}
```

### 2.3 AI 碎片生成 API

**请求格式**：
```typescript
interface FragmentGenerationRequest {
  date: string;              // YYYY-MM-DD
  activities: Array<{
    id: string;
    content: string;
    duration: number;
    timestamp: number;
    isMood: boolean;
    moodContent?: string;
  }>;
  dayContext: {
    totalActivities: number;
    totalDuration: number;     // 总活动时间（分钟）
    activeHours: number[];     // 活跃时段
    moodDistribution: string[]; // 心情关键词
  };
}
```

**响应格式**：
```typescript
interface FragmentGenerationResponse {
  themeDescription: string;  // 日主题描述，如"在星空下打盹的猫"
  fragments: Array<{
    activityId: string;
    shape: TimeFragment['shape'];
    colorStart: string;
    colorEnd: string;
    texture: TimeFragment['texture'];
    temperature: TimeFragment['temperature'];
    aiReasoning: string;       // AI 决策理由（调试用）
  }>;
}
```

**API 调用时机**：
- 策略 A：实时生成（每个活动完成后立即调用 AI）
- 策略 B：批量生成（日终统一生成，推荐）✅

---

## 3️⃣ AI 批注系统 (AI Annotation System)

### 3.1 核心原则

- **事件驱动**：用户行为触发，而非定时轮询
- **AI 决策**：是否批注、批注内容由 AI 决定，非规则引擎
- **限制机制**：冷却时间 + 每日限额，避免过度打扰

### 3.2 事件触发点

| 事件类型 | 触发时机 | 基础概率 | 加成条件 |
|---------|---------|---------|---------|
| activity_completed | 活动完成时 | 30% | 深夜(+20%)、连续完成(+10%) |
| activity_recorded | 记录新活动时 | 15% | 名字有趣(+15%) |
| mood_recorded | 记录心情时 | 20% | - |
| task_deleted | 删除待办时 | 25% | 连续删除(+20%) |
| idle_detected | 3小时无操作 | 30% | 深夜(+15%) |
| overwork_detected | 工作超3h无休息 | 50% | - |
| day_complete | 完成当天最后任务 | 60% | - |

### 3.3 批注状态管理

```typescript
interface AIAnnotationState {
  lastSpeakTime: number;        // 上次批注时间戳
  todaySpeakCount: number;      // 今日批注次数
  dailyLimit: number;           // 每日限额，默认 5
  cooldownMs: number;           // 冷却时间，默认 2小时 = 7200000ms
  
  // 今日统计（用于 AI 决策参考）
  todayStats: {
    totalActivities: number;
    totalDuration: number;
    deletedTasks: number;
    lastDeletedAt: number;
  };
}
```

### 3.4 批注决策流程

```typescript
async function shouldGenerateAnnotation(
  eventType: string,
  eventData: any
): Promise<boolean> {
  const state = getAnnotationState();
  
  // 1. 检查冷却
  const now = Date.now();
  if (now - state.lastSpeakTime < state.cooldownMs) {
    return false;
  }
  
  // 2. 检查限额
  if (state.todaySpeakCount >= state.dailyLimit) {
    return false;
  }
  
  // 3. 获取事件权重
  const weight = EVENT_WEIGHTS[eventType];
  let probability = weight.base;
  
  // 4. 应用加成
  if (weight.bonusConditions) {
    probability += calculateBonus(eventData, weight.bonusConditions);
  }
  
  // 5. 限制最大概率
  probability = Math.min(probability, weight.max);
  
  // 6. 随机决策
  return Math.random() * 100 < probability;
}
```

### 3.5 批注生成 API

**请求格式**：
```typescript
interface AnnotationRequest {
  eventType: string;           // 触发事件类型
  eventData: any;              // 事件数据
  userContext: {
    todayActivities: number;   // 今日活动数
    todayDuration: number;     // 今日总时长
    currentTime: string;       // 当前时间 HH:mm
    recentFragments: Array<{   // 最近生成的碎片
      shape: string;
      color: string;
      activity: string;
    }>;
  };
  aiPersonality: {
    tone: 'playful' | 'concerned' | 'celebrating';
    reference: string[];       // 可引用的意象
  };
}
```

**响应格式**：
```typescript
interface AnnotationResponse {
  content: string;             // 批注内容，如"🌙 凌晨1点还在写代码，你是在和月球通讯吗"
  tone: string;                // 语气标签
  displayDuration: number;     // 显示时长（毫秒），默认 8000
}
```

### 3.6 批注 UI 展示

**设计要求**：
- 位置：屏幕右侧边缘，距顶部 20%
- 动画：从右侧滑入，停留 8 秒后滑出
- 样式：毛玻璃背景，圆角，小外星人头像
- 交互：点击可提前关闭，悬停暂停计时

```typescript
interface AnnotationUIProps {
  content: string;
  avatar?: string;             // 默认 👽
  duration?: number;           // 默认 8000ms
  onClose?: () => void;
}
```

---

## 4️⃣ 画廊系统 (Gallery System)

### 4.1 玻璃彩窗数据模型

```typescript
interface StainedGlass {
  id: string;
  userId: string;
  
  // 时间维度
  period: 'daily' | 'weekly' | 'monthly';
  date: string;                // YYYY-MM-DD 或 YYYY-WXX 或 YYYY-MM
  startDate: string;
  endDate: string;
  
  // 主题
  themeDescription: string;    // AI 生成的主题描述
  themeName: string;           // 主题名称，如"星空下的猫"
  
  // 碎片布局
  fragmentLayouts: Array<{
    fragmentId: string;
    position: {
      x: number;               // 0-1 相对坐标
      y: number;
    };
    scale: number;             // 0.5-2.0 大小倍数
    rotation: number;          // 0-360 旋转角度
    layer: number;             // 层级，0 最底层
  }>;
  
  // 元数据
  summary: string;             // AI 生成的一句话总结
  createdAt: number;
}
```

### 4.2 彩窗生成流程

**日彩窗**：
```
日终（或用户点击查看时）
    ↓
收集当日所有碎片
    ↓
调用 AI 生成主题描述
    ↓
AI 返回主题（如"在暴风雨中跳舞的猫"）
    ↓
根据主题计算碎片布局
    ↓
渲染 SVG 彩窗
```

**周/月彩窗**：
```
选择查看周/月视图
    ↓
获取该时段所有日彩窗
    ↓
调用 AI 生成新的主题
    ↓
AI 返回周/月主题
    ↓
将日彩窗作为"超级碎片"重新布局
    ↓
渲染新的彩窗
```

### 4.3 彩窗渲染技术规格

**视觉要求**：
- 画布尺寸：响应式，最小 320px，最大 800px
- 碎片形状：SVG path，5 种基础形状
- 颜色渲染：SVG linearGradient
- 质感效果：CSS filter（glassmorphism）
  - backdrop-filter: blur(10px)
  - box-shadow: 0 8px 32px rgba(0,0,0,0.1)
  - border: 1px solid rgba(255,255,255,0.2)
- 动画：Framer Motion，碎片收集时飞入效果

**交互要求**：
- 点击碎片：显示活动详情弹窗
- 捏合手势：周/月视图下可放大查看
- 左右滑动：切换日/周/月视图

### 4.4 影子日记集成

**数据模型**：
```typescript
interface ShadowDiary {
  id: string;
  userId: string;
  date: string;                // 所属日期
  
  // 信件内容
  letter: {
    greeting: string;          // 称呼
    body: string;              // 正文
    highlights: string[];      // 今日亮点列表
    advice: string;            // 明日建议
    signature: string;         // 署名，默认"来自时间星球的观察员"
  };
  
  // 关联数据
  fragmentCount: number;       // 今日碎片数
  glassId: string;             // 关联的彩窗 ID
  
  // 状态
  isRead: boolean;             // 是否已读
  readAt?: number;
  createdAt: number;
}
```

**展示策略**：
- **首次展示**：次日首次打开 App 时，全屏展示日记卡片
- **历史查看**：Gallery 页面中，每个彩窗可点击展开对应日记
- **未读提示**：Gallery 图标上有红点提示未读日记数

**日记生成 API**：
```typescript
interface DiaryGenerationRequest {
  date: string;
  fragments: TimeFragment[];
  activities: Message[];
  dayStats: {
    totalDuration: number;
    activityCount: number;
    moodKeywords: string[];
  };
}

interface DiaryGenerationResponse {
  greeting: string;
  body: string;
  highlights: string[];
  advice: string;
  themeDescription: string;    // 同步生成彩窗主题
}
```

---

## 5️⃣ 用户界面 (User Interface)

### 5.1 页面结构

```
App
├── /chat                    # 对话/记录页面（已有，需改造）
│   ├── Mode Switcher        # 对话/记录模式切换
│   ├── Message List         # 消息/活动列表
│   ├── Input Area           # 输入框
│   └── AI Annotation Layer  # 批注浮层（新增）
│
├── /todo                    # 待办页面（已有，需微调）
│   ├── Quick Action Card    # 置顶快捷入口（新增）
│   ├── Filter Tabs          # 日/周/月筛选
│   ├── Todo List            # 待办列表
│   └── Add Button           # 添加按钮
│
├── /gallery                 # 时光画廊（新建）
│   ├── Daily View           # 日彩窗
│   ├── Weekly View          # 周彩窗
│   ├── Monthly View         # 月彩窗
│   ├── Shadow Diary Card    # 影子日记
│   └── Timeline Navigator   # 时间轴导航
│
└── /report                  # 报告页面（已有，整合）
    ├── Calendar View        # 日历视图
    ├── Report Detail        # 报告详情
    └── Glass Integration    # 点击日期查看彩窗（新增）
```

### 5.2 导航结构

**底部导航栏**（已有）：
- 对话记录（/chat）- 图标：MessageSquare
- 待办管理（/todo）- 图标：CheckSquare
- 时光画廊（/gallery）- 图标：Sparkles（新增）
- 时间报告（/report）- 图标：PieChart

---

## 6️⃣ 技术规格

### 6.1 技术栈（已有）

- **框架**：React 18 + TypeScript
- **构建**：Vite 7.0
- **样式**：Tailwind CSS 3.4
- **状态**：Zustand + persist
- **路由**：React Router 6
- **动画**：Framer Motion
- **后端**：Supabase（可选）
- **AI API**：用户自有 API

### 6.2 新增依赖建议

```json
{
  "dependencies": {
    "react-calendar": "^6.0.0",      // 已有，用于报告页
    "date-fns": "^4.1.0",            // 已有，日期处理
    "framer-motion": "^11.0.8"       // 已有，动画
  }
}
```

### 6.3 文件结构（新增）

```
src/
├── api/
│   └── ai.ts                      # AI API 封装
│
├── services/
│   ├── aiAnnotator.ts             # AI 批注服务
│   ├── fragmentGenerator.ts       # 碎片生成服务
│   ├── glassGenerator.ts          # 彩窗生成服务
│   └── shadowDiary.ts             # 影子日记服务
│
├── store/
│   ├── useFragmentStore.ts        # 碎片状态管理
│   ├── useAnnotationStore.ts      # 批注状态管理
│   └── useGalleryStore.ts         # 画廊状态管理
│
├── components/
│   ├── fragments/                 # 碎片组件
│   │   ├── SpiralFragment.tsx
│   │   ├── ArrowFragment.tsx
│   │   ├── SparkFragment.tsx
│   │   ├── WaveFragment.tsx
│   │   └── CrystalFragment.tsx
│   │
│   ├── AIAnnotationBubble.tsx     # 批注气泡
│   ├── QuickActionCard.tsx        # 快捷入口卡片
│   ├── StainedGlass.tsx           # 彩窗组件
│   ├── ShadowDiaryCard.tsx        # 日记卡片
│   └── FragmentDetailModal.tsx    # 碎片详情
│
├── features/
│   └── gallery/
│       ├── GalleryPage.tsx
│       ├── DailyView.tsx
│       ├── WeeklyView.tsx
│       └── MonthlyView.tsx
│
└── types/
    └── fragment.ts                # 类型定义
```

---

## 7️⃣ 开发路线图

### Phase 1：基础架构（Week 1-2）

**Week 1：数据层**
- [ ] 创建 Fragment 类型定义
- [ ] 创建 FragmentStore
- [ ] 修改 ChatStore，添加碎片生成触发
- [ ] 创建 AI 服务层封装

**Week 2：AI 批注**
- [ ] 创建 AIAnnotator 服务
- [ ] 实现事件监听机制
- [ ] 创建批注状态管理
- [ ] 创建 AnnotationBubble 组件

### Phase 2：视觉系统（Week 3-4）

**Week 3：碎片渲染**
- [ ] 创建 5 种 SVG 碎片形状
- [ ] 实现碎片样式系统（颜色/质感/温度）
- [ ] 创建碎片收集动画

**Week 4：彩窗引擎**
- [ ] 实现日彩窗布局算法
- [ ] 创建 StainedGlass 组件
- [ ] 实现 SVG 渲染引擎

### Phase 3：画廊系统（Week 5-6）

**Week 5：画廊页面**
- [ ] 创建 GalleryPage
- [ ] 实现日/周/月视图切换
- [ ] 实现时间轴导航

**Week 6：影子日记**
- [ ] 创建日记生成服务
- [ ] 创建 ShadowDiaryCard 组件
- [ ] 实现首次展示逻辑

### Phase 4：整合优化（Week 7-8）

**Week 7：功能整合**
- [ ] 整合 Report 页面与彩窗
- [ ] 添加彩窗分享功能
- [ ] 优化动画性能

**Week 8：测试优化**
- [ ] 全面测试
- [ ] 性能优化
- [ ] Bug 修复

---

## 8️⃣ 验收标准

### 功能验收

| 功能 | 验收标准 |
|------|---------|
| 活动记录 | 记录活动后自动生成碎片数据 |
| AI 批注 | 触发事件后，按概率正确显示批注气泡 |
| 冷却机制 | 2 小时内不重复触发，每日最多 5 次 |
| 日彩窗 | 正确渲染所有碎片，点击可查看详情 |
| 影子日记 | 次日首次打开正确展示，可回看历史 |

### 性能指标

- 首次加载 < 3 秒
- 碎片生成 < 1 秒（调用 AI API）
- 彩窗渲染 < 500ms
- 批注动画流畅，不卡顿

---

## 9️⃣ 附录

### 9.1 命名规范

- **组件**：PascalCase，如 `StainedGlass.tsx`
- **服务**：camelCase，如 `aiAnnotator.ts`
- **Store**：use + PascalCase，如 `useFragmentStore.ts`
- **类型**：PascalCase，如 `TimeFragment`

### 9.2 颜色参考

```css
/* 玻璃质感 */
--glass-bg: rgba(255, 255, 255, 0.25);
--glass-border: rgba(255, 255, 255, 0.3);
--glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);

/* 温度色板 */
--temp-cool: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--temp-warm: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
--temp-hot: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
--temp-electric: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
```

### 9.3 参考资源

- 玻璃拟态设计：https://glassmorphism.com/
- SVG 路径生成：https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
- Framer Motion：https://www.framer.com/motion/

---

*文档结束*
