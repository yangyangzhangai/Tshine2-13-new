import type { 
  AnnotationEvent, 
  AnnotationEventType,
  EventWeight,
  BonusCondition 
} from '../types/annotation';

interface TodayStats {
  date: string;
  speakCount: number;
  lastSpeakTime: number;
  events: AnnotationEvent[];
}

interface Config {
  dailyLimit: number;
  enabled: boolean;
}

/**
 * 事件权重配置
 */
const EVENT_WEIGHTS: Record<string, EventWeight> = {
  activity_completed: {
    base: 30,
    max: 60,
    bonuses: [
      {
        check: (e) => (e.data?.duration || 0) > 120,
        bonus: 15,
        description: '深度工作 (>2h)',
      },
      {
        check: (e) => {
          const hour = new Date(e.timestamp).getHours();
          return hour >= 0 && hour <= 5;
        },
        bonus: 20,
        description: '深夜工作',
      },
      {
        check: (e, events) => {
          const completedCount = events.filter(ev => 
            ev.type === 'activity_completed'
          ).length;
          return completedCount >= 5;
        },
        bonus: 10,
        description: '连续完成多个任务',
      },
    ],
  },
  
  activity_recorded: {
    base: 15,
    max: 45,
    bonuses: [
      {
        check: (e) => {
          const content = e.data?.content || '';
          // 如果活动名字很有趣（长度>10或有特殊字符）
          return content.length > 10 || /[!?！？]/.test(content);
        },
        bonus: 15,
        description: '活动名字有趣',
      },
    ],
  },
  
  mood_recorded: {
    base: 20,
    max: 40,
    bonuses: [
      {
        check: (e) => {
          const mood = e.data?.mood || '';
          return ['激动', '兴奋', '开心', '难过', '疲惫'].includes(mood);
        },
        bonus: 15,
        description: '强烈情绪',
      },
    ],
  },
  
  task_deleted: {
    base: 25,
    max: 50,
    bonuses: [
      {
        check: (e, events) => {
          const recentDeletes = events.filter(ev => 
            ev.type === 'task_deleted' && 
            e.timestamp - ev.timestamp < 5 * 60 * 1000 // 5分钟内
          );
          return recentDeletes.length >= 2;
        },
        bonus: 20,
        description: '连续删除多个任务',
      },
    ],
  },
  
  idle_detected: {
    base: 30,
    max: 45,
    bonuses: [
      {
        check: (e) => {
          const hour = new Date(e.timestamp).getHours();
          return hour >= 0 && hour <= 5;
        },
        bonus: 15,
        description: '深夜闲置',
      },
    ],
  },
  
  overwork_detected: {
    base: 50,
    max: 70,
    bonuses: [],
  },
  
  day_complete: {
    base: 80,
    max: 100,
    bonuses: [],
  },
};

/**
 * 检查是否应该生成批注
 * 
 * 测试模式：触发概率 100%
 */
export function shouldGenerateAnnotation(
  event: AnnotationEvent,
  todayStats: TodayStats,
  config: Config
): boolean {
  // 测试模式：始终触发（100% 概率）
  console.log(`[AI Annotator] 测试模式：${event.type} 触发概率 100%`);
  return true;

  /*
  // 生产环境代码（恢复时使用）：
  const now = Date.now();
  
  // 1. 检查全局冷却
  if (now - todayStats.lastSpeakTime < config.cooldownMs) {
    console.log('[AI Annotator] 全局冷却中');
    return false;
  }
  
  // 2. 检查每日限额
  if (todayStats.speakCount >= config.dailyLimit) {
    console.log('[AI Annotator] 已达到每日限额');
    return false;
  }
  
  // 3. 获取事件权重
  const weight = EVENT_WEIGHTS[event.type];
  if (!weight) {
    console.log('[AI Annotator] 未知事件类型:', event.type);
    return false;
  }
  
  // 4. 检查同类事件冷却
  const sameTypeEvents = todayStats.events.filter(e => e.type === event.type);
  const lastSameTypeEvent = sameTypeEvents[sameTypeEvents.length - 1];
  if (lastSameTypeEvent && weight.cooldownMs > 0) {
    const timeSinceLast = now - lastSameTypeEvent.timestamp;
    if (timeSinceLast < weight.cooldownMs) {
      console.log(`[AI Annotator] ${event.type} 冷却中`);
      return false;
    }
  }
  
  // 5. 计算概率
  let probability = weight.base;
  
  // 应用加成
  weight.bonuses.forEach(bonus => {
    if (bonus.check(event, todayStats.events)) {
      probability += bonus.bonus;
      console.log(`[AI Annotator] 加成: ${bonus.description} (+${bonus.bonus}%)`);
    }
  });
  
  // 限制最大概率
  probability = Math.min(probability, weight.max);
  
  // 6. 随机决策
  const random = Math.random() * 100;
  const shouldTrigger = random < probability;
  
  console.log(`[AI Annotator] 概率计算: ${probability.toFixed(1)}% (随机值: ${random.toFixed(1)}) - ${shouldTrigger ? '触发' : '未触发'}`);
  
  return shouldTrigger;
  */
}

/**
 * 记录事件（供外部使用）
 */
export function recordEvent(
  events: AnnotationEvent[],
  newEvent: AnnotationEvent
): AnnotationEvent[] {
  return [...events, newEvent];
}
