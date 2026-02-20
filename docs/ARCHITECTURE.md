# Time Shine - 技术架构文档

> 系统架构、数据流与核心算法

---

## 📋 文档说明

- **文档版本**：v1.0
- **最后更新**：2026-02-15
- **关联文档**：PROJECT_OVERVIEW.md、REQUIREMENTS.md、AI_DESIGN.md

---

## 🏗️ 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Time Shine                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Chat Page  │  │   Todo Page  │  │ Gallery Page │  │ Report Page │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                 │                  │                 │        │
│  ┌──────┴─────────────────┴──────────────────┴─────────────────┘        │
│  │                         Store Layer                                   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  │ChatStore │ │TodoStore │ │Fragment  │ │Annotation│ │ Gallery  │   │
│  │  │          │ │          │ │  Store   │ │  Store   │ │  Store   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│  └───────┼────────────┼────────────┼────────────┼────────────┘         │
│          │            │            │            │                       │
│  ┌───────┴────────────┴────────────┴────────────┴──────────────────┐   │
│  │                      Service Layer                               │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │   │
│  │  │  AI        │ │  Fragment  │ │  Glass     │ │  Shadow    │   │   │
│  │  │  Annotator │ │  Generator │ │  Generator │ │  Diary     │   │   │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │   │
│  └────────┼──────────────┼──────────────┼──────────────┼──────────┘   │
│           │              │              │              │              │
│  ┌────────┴──────────────┴──────────────┴──────────────┴──────────┐   │
│  │                           API Layer                            │   │
│  │              ┌─────────────────────────────────┐               │   │
│  │              │      AI Service (User API)      │               │   │
│  │              └─────────────────────────────────┘               │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 核心数据流

### 1. 活动记录 → 碎片生成

```
用户在 ChatPage 记录活动
        │
        ▼
┌──────────────────┐
│   ChatStore.     │
│   sendMessage()  │  (Record Mode)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Message Created │  duration calculated
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ FragmentStore.   │
│ addPending()     │  Queue for AI processing
└────────┬─────────┘
         │
         ├──────────────────────┐
         │ (Real-time)          │ (Batch)
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  Immediate      │    │  Scheduled Job  │
│  AI Call        │    │  (End of Day)   │
└────────┬────────┘    └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  Single Fragment│    │  Batch Generate │
│  Generated      │    │  All Fragments  │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  AI Returns:         │
         │  shape, color,       │
         │  texture, temp       │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  FragmentStore.      │
         │  updateFragment()    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Trigger:            │
         │  Fragment Animation  │
         │  in Gallery          │
         └──────────────────────┘
```

### 2. 事件触发 → AI 批注

```
用户行为
    │
    ├─► 完成活动
    ├─► 删除待办
    ├─► 3小时无操作
    └─► ...
    │
    ▼
┌──────────────────┐
│  Event Emitter   │  Central event bus
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AIAnnotator.    │
│  onEvent()       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     No      ┌──────────┐
│  Check Cooldown? │────────────►│   Skip   │
│  Check Limit?    │             └──────────┘
└────────┬─────────┘     Yes
         │
         ▼
┌──────────────────┐
│  Calculate       │
│  Probability     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     No      ┌──────────┐
│  Random < Prob?  │────────────►│   Skip   │
└────────┬─────────┘     Yes     └──────────┘
         │
         ▼
┌──────────────────┐
│  Call AI API     │
│  Generate Text   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AnnotationStore │
│  addAnnotation() │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  UI: Show Bubble │
│  8s animation    │
└──────────────────┘
```

### 3. 日终流程 → 彩窗生成

```
Trigger: 23:59 or User Open Gallery
    │
    ▼
┌──────────────────┐
│  GalleryStore.   │
│  generateDaily() │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Fetch Today's   │
│  Fragments       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Call AI API:    │
│  "Generate Theme │
│   & Layout"      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AI Returns:     │
│  - themeDesc     │
│  - fragmentPositions[]
│  - summary       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Create          │
│  StainedGlass    │
│  Object          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate Shadow │
│  Diary (Async)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Save to Store   │
│  & LocalStorage  │
└──────────────────┘
```

---

## 📊 数据模型详解

### 1. Fragment Store Schema

```typescript
// store/useFragmentStore.ts

interface FragmentState {
  // 数据存储
  fragments: TimeFragment[];
  pendingFragments: string[];  // 等待 AI 处理的 messageIds
  
  // 当日统计（用于 AI 决策）
  todayStats: {
    date: string;
    totalActivities: number;
    totalDuration: number;
    moodKeywords: string[];
    hourDistribution: number[];  // 24小时分布
  };
  
  // Actions
  addPending: (messageId: string) => void;
  generateFragment: (messageId: string) => Promise<void>;
  batchGenerate: (date: string) => Promise<void>;
  getFragmentsByDate: (date: string) => TimeFragment[];
  getFragmentById: (id: string) => TimeFragment | undefined;
}

// 持久化配置
const persistConfig = {
  name: 'fragment-storage',
  partialize: (state) => ({
    fragments: state.fragments,
    todayStats: state.todayStats
  })
};
```

### 2. Annotation Store Schema

```typescript
// store/useAnnotationStore.ts

interface AnnotationState {
  // 当前显示的批注
  currentAnnotation: AIAnnotation | null;
  
  // 今日状态
  todayStats: {
    date: string;
    speakCount: number;
    lastSpeakTime: number;
    events: AnnotationEvent[];  // 今日事件日志
  };
  
  // 配置
  config: {
    dailyLimit: number;      // 默认 5
    cooldownMs: number;      // 默认 7200000 (2小时)
    enabled: boolean;        // 总开关
  };
  
  // Actions
  triggerAnnotation: (event: AnnotationEvent) => Promise<void>;
  dismissAnnotation: () => void;
  resetDailyStats: () => void;
  updateConfig: (config: Partial<AnnotationConfig>) => void;
}

interface AIAnnotation {
  id: string;
  content: string;
  tone: 'playful' | 'concerned' | 'celebrating';
  timestamp: number;
  relatedEvent: AnnotationEvent;
  displayDuration: number;
}
```

### 3. Gallery Store Schema

```typescript
// store/useGalleryStore.ts

interface GalleryState {
  // 彩窗集合
  dailyGlasses: StainedGlass[];
  weeklyGlasses: StainedGlass[];
  monthlyGlasses: StainedGlass[];
  
  // 当前视图
  currentView: {
    period: 'daily' | 'weekly' | 'monthly';
    date: string;
  };
  
  // 影子日记
  diaries: ShadowDiary[];
  unreadDiaryCount: number;
  
  // 生成状态
  isGenerating: boolean;
  generationProgress: number;
  
  // Actions
  generateDailyGlass: (date: string) => Promise<void>;
  generateWeeklyGlass: (week: string) => Promise<void>;
  generateMonthlyGlass: (month: string) => Promise<void>;
  generateShadowDiary: (date: string) => Promise<void>;
  markDiaryAsRead: (diaryId: string) => void;
  navigateTo: (period: string, date: string) => void;
}
```

---

## 🧮 核心算法

### 1. 碎片布局算法 (Daily)

```typescript
// services/glassGenerator.ts

interface LayoutAlgorithm {
  // 输入
  fragments: TimeFragment[];
  canvasSize: { width: number; height: number };
  
  // 输出
  layouts: FragmentLayout[];
}

function generateDailyLayout(
  fragments: TimeFragment[],
  themeDescription: string  // AI 提供的主题描述
): FragmentLayout[] {
  const layouts: FragmentLayout[] = [];
  const center = { x: 0.5, y: 0.5 };
  
  // 按时间段分组
  const groups = groupByTimeOfDay(fragments);
  
  // 大碎片（长时间）放中心
  const largeFragments = fragments
    .filter(f => f.metadata.duration > 60)
    .sort((a, b) => b.metadata.duration - a.metadata.duration);
  
  largeFragments.forEach((fragment, index) => {
    const angle = (index / largeFragments.length) * Math.PI * 2;
    const radius = 0.1 + Math.random() * 0.1;  // 靠近中心
    
    layouts.push({
      fragmentId: fragment.id,
      position: {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      },
      scale: 1.2 + fragment.metadata.duration / 120,  // 时长越大越大
      rotation: Math.random() * 30 - 15,
      layer: 1
    });
  });
  
  // 小碎片螺旋向外分布
  const smallFragments = fragments.filter(f => f.metadata.duration <= 60);
  smallFragments.forEach((fragment, index) => {
    const spiralAngle = index * 0.5;  // 黄金角
    const spiralRadius = 0.2 + index * 0.05;
    
    layouts.push({
      fragmentId: fragment.id,
      position: {
        x: center.x + Math.cos(spiralAngle) * spiralRadius,
        y: center.y + Math.sin(spiralAngle) * spiralRadius
      },
      scale: 0.6 + Math.random() * 0.4,
      rotation: Math.random() * 360,
      layer: 0
    });
  });
  
  return layouts;
}
```

### 2. 周/月拼图算法

```typescript
function generateWeeklyLayout(
  dailyGlasses: StainedGlass[]
): FragmentLayout[] {
  // 将每日彩窗视为"超级碎片"
  const superFragments = dailyGlasses.map((glass, index) => ({
    id: glass.id,
    preview: generateThumbnail(glass),  // 生成缩略图
    dayOfWeek: index
  }));
  
  // 蜂巢式布局
  return superFragments.map((sf, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const offset = row % 2 === 0 ? 0 : 0.5;  // 蜂巢偏移
    
    return {
      fragmentId: sf.id,
      position: {
        x: (col + offset) * 0.25,
        y: row * 0.3
      },
      scale: 0.9,
      rotation: (Math.random() - 0.5) * 10,  // 轻微随机旋转
      layer: 0
    };
  });
}
```

### 3. 概率计算算法

```typescript
// services/aiAnnotator.ts

interface EventWeight {
  base: number;           // 基础概率 0-100
  max: number;            // 最大概率上限
  bonuses: BonusCondition[];
}

interface BonusCondition {
  check: (event: AnnotationEvent, context: UserContext) => boolean;
  bonus: number;          // 加成值
  description: string;    // 用于调试
}

const EVENT_WEIGHTS: Record<string, EventWeight> = {
  activity_completed: {
    base: 30,
    max: 60,
    bonuses: [
      {
        check: (e, c) => e.data.duration > 120,
        bonus: 15,
        description: '深度工作 (>2h)'
      },
      {
        check: (e, c) => {
          const hour = new Date(e.timestamp).getHours();
          return hour >= 0 && hour <= 5;
        },
        bonus: 20,
        description: '深夜工作'
      },
      {
        check: (e, c) => c.todayStats.completedCount >= 5,
        bonus: 10,
        description: '连续完成多个任务'
      }
    ]
  },
  
  task_deleted: {
    base: 25,
    max: 50,
    bonuses: [
      {
        check: (e, c) => {
          const recentDeletes = c.todayStats.events
            .filter(ev => ev.type === 'task_deleted')
            .filter(ev => e.timestamp - ev.timestamp < 300000);  // 5分钟内
          return recentDeletes.length >= 2;
        },
        bonus: 20,
        description: '连续删除多个任务'
      }
    ]
  },
  
  // ... 其他事件类型
};

function calculateProbability(
  event: AnnotationEvent,
  userContext: UserContext
): number {
  const weight = EVENT_WEIGHTS[event.type];
  if (!weight) return 0;
  
  let probability = weight.base;
  
  // 应用所有满足的加成
  weight.bonuses.forEach(bonus => {
    if (bonus.check(event, userContext)) {
      probability += bonus.bonus;
    }
  });
  
  // 限制最大概率
  return Math.min(probability, weight.max);
}
```

---

## 🎨 渲染架构

### SVG 彩窗渲染流程

```
StainedGlass Component
    │
    ├─► 1. 创建 SVG 画布
    │     <svg viewBox="0 0 100 100">
    │
    ├─► 2. 定义滤镜和渐变 (defs)
    │     <defs>
    │       <linearGradient id="grad1">...</linearGradient>
    │       <filter id="glass">...</filter>
    │     </defs>
    │
    ├─► 3. 渲染背景主题
    │     <image href={themeImage} opacity="0.3" />
    │
    ├─► 4. 按 layer 排序渲染碎片
    │     fragments.sort((a, b) => a.layer - b.layer)
    │       .map(fragment => <FragmentShape />)
    │
    ├─► 5. 添加玻璃效果层
    │     <rect filter="url(#glass)" opacity="0.1" />
    │
    └─► 6. 添加边框和装饰
          <rect stroke="rgba(255,255,255,0.3)" rx="12" />
```

### 碎片形状定义

```typescript
// components/fragments/shapeDefinitions.ts

export const SHAPE_PATHS = {
  spiral: (size: number) => `
    M ${size/2} ${size/10}
    Q ${size*0.9} ${size/2} ${size/2} ${size*0.9}
    Q ${size*0.1} ${size/2} ${size/2} ${size*0.3}
    Q ${size*0.7} ${size/2} ${size/2} ${size*0.7}
  `,
  
  arrow: (size: number) => `
    M ${size*0.2} ${size*0.4}
    L ${size*0.6} ${size*0.4}
    L ${size*0.6} ${size*0.2}
    L ${size*0.9} ${size*0.5}
    L ${size*0.6} ${size*0.8}
    L ${size*0.6} ${size*0.6}
    L ${size*0.2} ${size*0.6}
    Z
  `,
  
  spark: (size: number) => `
    M ${size/2} 0
    L ${size*0.6} ${size*0.35}
    L ${size} ${size/2}
    L ${size*0.6} ${size*0.65}
    L ${size/2} ${size}
    L ${size*0.4} ${size*0.65}
    L 0 ${size/2}
    L ${size*0.4} ${size*0.35}
    Z
  `,
  
  wave: (size: number) => `
    M 0 ${size*0.3}
    Q ${size*0.25} 0 ${size*0.5} ${size*0.3}
    Q ${size*0.75} ${size*0.6} ${size} ${size*0.3}
    L ${size} ${size*0.7}
    Q ${size*0.75} ${size} ${size*0.5} ${size*0.7}
    Q ${size*0.25} ${size*0.4} 0 ${size*0.7}
    Z
  `,
  
  crystal: (size: number) => `
    M ${size/2} 0
    L ${size*0.85} ${size*0.15}
    L ${size} ${size/2}
    L ${size*0.85} ${size*0.85}
    L ${size/2} ${size}
    L ${size*0.15} ${size*0.85}
    L 0 ${size/2}
    L ${size*0.15} ${size*0.15}
    Z
  `
};
```

---

## 📡 API 接口规范

### 1. AI 碎片生成接口

```typescript
// api/ai.ts

/**
 * POST /api/ai/generate-fragments
 * 
 * 请求体：
 */
interface GenerateFragmentsRequest {
  date: string;                    // YYYY-MM-DD
  activities: Array<{
    id: string;
    content: string;
    duration: number;              // 分钟
    timestamp: number;
    isMood: boolean;
    moodContent?: string;
  }>;
  context: {
    totalActivities: number;
    totalDuration: number;
    activeHours: number[];
    moodKeywords: string[];
  };
}

/**
 * 响应体：
 */
interface GenerateFragmentsResponse {
  themeDescription: string;        // 如"在星空下打盹的猫"
  themeName: string;               // 如"星空猫"
  fragments: Array<{
    activityId: string;
    shape: 'spiral' | 'arrow' | 'spark' | 'wave' | 'crystal';
    colorStart: string;            // HEX 颜色
    colorEnd: string;
    texture: 'heavy' | 'light' | 'flowing' | 'explosive' | 'solid';
    temperature: 'cool' | 'warm' | 'hot' | 'electric';
    reasoning: string;             // AI 决策理由
  }>;
}
```

### 2. AI 批注生成接口

```typescript
/**
 * POST /api/ai/generate-annotation
 * 
 * 请求体：
 */
interface GenerateAnnotationRequest {
  eventType: string;
  eventData: {
    activityContent?: string;
    duration?: number;
    timestamp: number;
    // ... 其他事件相关数据
  };
  userContext: {
    todayActivities: number;
    todayDuration: number;
    currentHour: number;
    recentAnnotations: string[];    // 今日已显示的批注内容
  };
  personality: {
    name: string;                   // "时间星球观察员"
    traits: string[];               // ["傲娇", "温暖", "诗意"]
  };
}

/**
 * 响应体：
 */
interface GenerateAnnotationResponse {
  content: string;                 // 批注文本
  tone: 'playful' | 'concerned' | 'celebrating' | 'curious';
  displayDuration: number;         // 建议显示时长（毫秒）
  emoji?: string;                  // 可选的表情前缀
}
```

### 3. AI 影子日记接口

```typescript
/**
 * POST /api/ai/generate-diary
 * 
 * 请求体：
 */
interface GenerateDiaryRequest {
  date: string;
  fragments: Array<{
    shape: string;
    color: string;
    texture: string;
    activityContent: string;
    duration: number;
  }>;
  dayStats: {
    totalActivities: number;
    totalDuration: number;
    startHour: number;
    endHour: number;
    moodKeywords: string[];
  };
}

/**
 * 响应体：
 */
interface GenerateDiaryResponse {
  greeting: string;                // 称呼
  body: string;                    // 信件正文
  highlights: string[];            // 今日亮点（3-5条）
  advice: string;                  // 明日建议
  signature: string;               // 署名
  themeDescription: string;        // 彩窗主题（同步生成）
  themeName: string;
}
```

---

## 🔄 状态同步策略

### 1. LocalStorage 持久化

```typescript
// 所有 Store 统一使用 Zustand persist

const useFragmentStore = create<FragmentState>()(
  persist(
    (set, get) => ({
      // ... state
    }),
    {
      name: 'fragment-storage',
      partialize: (state) => ({
        fragments: state.fragments,
        todayStats: state.todayStats
      })
    }
  )
);
```

### 2. 跨 Store 通信

```typescript
// 使用 Zustand 的 subscribe 或事件总线

// 方式1：直接在 action 中调用其他 store
const useChatStore = create<ChatState>((set, get) => ({
  sendMessage: async (content) => {
    // ... 创建 message
    
    // 触发碎片生成
    const fragmentStore = useFragmentStore.getState();
    fragmentStore.addPending(newMessage.id);
    
    // 触发批注检查
    const annotationStore = useAnnotationStore.getState();
    annotationStore.triggerAnnotation({
      type: 'activity_recorded',
      data: { content, timestamp: Date.now() }
    });
  }
}));

// 方式2：事件总线（更解耦）
const eventBus = new EventEmitter();

// 发送事件
eventBus.emit('activity:recorded', { messageId, content });

// 监听事件
useEffect(() => {
  const handler = (data) => {
    // 处理事件
  };
  eventBus.on('activity:recorded', handler);
  return () => eventBus.off('activity:recorded', handler);
}, []);
```

---

## 📈 性能优化策略

### 1. 渲染优化

```typescript
// 彩窗虚拟滚动
const VirtualizedGallery = () => {
  const { dailyGlasses } = useGalleryStore();
  
  return (
    <Virtuoso
      data={dailyGlasses}
      itemContent={(index, glass) => (
        <StainedGlassPreview 
          key={glass.id} 
          glass={glass}
          // 离屏时暂停动画
          isVisible={isInViewport(index)}
        />
      )}
    />
  );
};

// 碎片动画优化
const FragmentShape = memo(({ fragment, layout }) => {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: layout.scale, opacity: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 100,
        damping: 15,
        // 使用 will-change 优化
        layoutId: fragment.id
      }}
      style={{ willChange: 'transform' }}
    >
      {/* SVG 内容 */}
    </motion.g>
  );
}, (prev, next) => {
  // 自定义比较函数，避免不必要的重渲染
  return prev.fragment.id === next.fragment.id;
});
```

### 2. AI 调用优化

```typescript
// 批注请求防抖
const debouncedAnnotation = debounce(
  (event) => aiAnnotator.generate(event),
  1000,  // 1秒内的事件合并
  { maxWait: 5000 }  // 最多等待5秒
);

// 碎片批量生成（而非实时）
const scheduleBatchGeneration = () => {
  // 延迟到空闲时执行
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      fragmentStore.batchGenerate(today);
    }, { timeout: 5000 });
  } else {
    setTimeout(() => {
      fragmentStore.batchGenerate(today);
    }, 1000);
  }
};
```

---

## 🧪 测试策略

### 单元测试重点

```typescript
// services/__tests__/aiAnnotator.test.ts
describe('AI Annotator', () => {
  it('should respect cooldown period', () => {
    const state = { lastSpeakTime: Date.now() - 1000 }; // 1秒前
    expect(shouldSpeak(state)).toBe(false);
  });
  
  it('should respect daily limit', () => {
    const state = { todaySpeakCount: 5, dailyLimit: 5 };
    expect(shouldSpeak(state)).toBe(false);
  });
  
  it('should calculate probability correctly', () => {
    const event = { type: 'activity_completed', data: { duration: 180 } };
    const context = { todayStats: { completedCount: 3 } };
    const prob = calculateProbability(event, context);
    expect(prob).toBeGreaterThan(30);  // 基础30% + 加成
  });
});

// services/__tests__/glassGenerator.test.ts
describe('Glass Layout', () => {
  it('should place large fragments near center', () => {
    const fragments = [
      { id: '1', metadata: { duration: 180 } },
      { id: '2', metadata: { duration: 10 } }
    ];
    const layouts = generateDailyLayout(fragments, 'test');
    
    const largeLayout = layouts.find(l => l.fragmentId === '1');
    const distanceFromCenter = Math.sqrt(
      Math.pow(largeLayout.position.x - 0.5, 2) +
      Math.pow(largeLayout.position.y - 0.5, 2)
    );
    
    expect(distanceFromCenter).toBeLessThan(0.3);
  });
});
```

---

## 📚 参考资源

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Framer Motion SVG](https://www.framer.com/motion/svg/)
- [SVG Path Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)
- [Glassmorphism CSS](https://css.glass/)

---

*文档结束*
