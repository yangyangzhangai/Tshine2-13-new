import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AIAnnotation, 
  AnnotationEvent, 
  AnnotationEventType,
  AnnotationState,
  TodayActivity 
} from '../types/annotation';
import { callAnnotationAPI } from '../api/client';
import { shouldGenerateAnnotation, recordEvent } from './annotationHelpers';

interface AnnotationStore extends AnnotationState {
  // 内部状态（不持久化）
  lastAnnotationTime: number;
  
  // Actions
  triggerAnnotation: (event: AnnotationEvent) => Promise<void>;
  dismissAnnotation: () => void;
  resetDailyStats: () => void;
  updateConfig: (config: Partial<AnnotationState['config']>) => void;
  getTodayStats: () => { activities: number; duration: number; events: AnnotationEvent[] };
}

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 检查是否需要重置每日统计
 */
function shouldResetStats(lastDate: string): boolean {
  return lastDate !== getTodayString();
}

export const useAnnotationStore = create<AnnotationStore>()(
  persist(
    (set, get) => ({
      currentAnnotation: null,
      
      todayStats: {
        date: getTodayString(),
        speakCount: 0,
        lastSpeakTime: 0,
        events: [],
      },
      
      config: {
        dailyLimit: 5,
        enabled: true,
      },

      // 跟踪最后一次批注生成时间（防止重复触发）
      lastAnnotationTime: 0,

      /**
       * 触发批注检查
       * 根据事件类型和当前状态决定是否生成批注
       */
      triggerAnnotation: async (event: AnnotationEvent) => {
        const state = get();
        const { config, todayStats } = state;

        // 检查是否启用
        if (!config.enabled) return;

        const now = Date.now();

        // 检查是否需要重置每日统计
        if (shouldResetStats(todayStats.date)) {
          set({
            todayStats: {
              date: getTodayString(),
              speakCount: 0,
              lastSpeakTime: 0,
              events: [event],
            },
          });
        } else {
          // 记录事件
          set({
            todayStats: {
              ...todayStats,
              events: [...todayStats.events, event],
            },
          });
        }

        // 检查是否应该生成批注
        const shouldGenerate = shouldGenerateAnnotation(
          event,
          get().todayStats,
          config
        );

        if (!shouldGenerate) {
          console.log('[AI Annotator] 批注未触发:', event.type, '- 条件不满足');
          return;
        }

        console.log('[AI Annotator] 批注触发:', event.type);

        try {
          // 准备用户上下文
          const todayEvents = get().todayStats.events;
          const activities = todayEvents.filter(e => 
            e.type === 'activity_completed' || e.type === 'activity_recorded'
          );
          const totalDuration = activities.reduce((sum, e) => 
            sum + (e.data?.duration || 0), 0
          );
          
          // 获取最近批注内容（避免重复）
          const recentAnnotations = todayEvents
            .filter(e => e.type === 'annotation_generated')
            .slice(-3)
            .map(e => e.data?.content || '');

          // 构建今日活动详细列表
          const todayActivitiesList = activities.map(e => ({
            content: e.data?.content || '未命名活动',
            duration: e.data?.duration || 0,
            activityType: e.data?.activityType || '未分类',
            timestamp: e.timestamp,
            completed: e.type === 'activity_completed'
          }));

          // 调用 AI 生成批注 (通过 Serverless Function)
          const response = await callAnnotationAPI({
            eventType: event.type,
            eventData: event.data,
            userContext: {
              todayActivities: activities.length,
              todayDuration: totalDuration,
              currentHour: new Date().getHours(),
              recentAnnotations,
              todayActivitiesList,
            },
          });

          // 创建批注对象
          const annotation: AIAnnotation = {
            id: uuidv4(),
            content: response.content,
            tone: response.tone,
            timestamp: Date.now(),
            relatedEvent: event,
            displayDuration: response.displayDuration,
          };

          // 更新状态
          set({
            currentAnnotation: annotation,
            todayStats: {
              ...get().todayStats,
              speakCount: get().todayStats.speakCount + 1,
              lastSpeakTime: Date.now(),
              events: [
                ...get().todayStats.events,
                {
                  type: 'annotation_generated' as AnnotationEventType,
                  timestamp: Date.now(),
                  data: { content: response.content },
                },
              ],
            },
          });

          console.log('[AI Annotator] 批注已生成:', response.content);
        } catch (error) {
          console.error('[AI Annotator] 生成批注失败:', error);
        }
      },

      /**
       * 关闭当前批注
       */
      dismissAnnotation: () => {
        set({ currentAnnotation: null });
      },

      /**
       * 重置每日统计（手动）
       */
      resetDailyStats: () => {
        set({
          todayStats: {
            date: getTodayString(),
            speakCount: 0,
            lastSpeakTime: 0,
            events: [],
          },
        });
      },

      /**
       * 更新配置
       */
      updateConfig: (configUpdate) => {
        set({
          config: {
            ...get().config,
            ...configUpdate,
          },
        });
      },

      /**
       * 获取今日统计（供外部使用）
       */
      getTodayStats: () => {
        const { todayStats } = get();
        const activities = todayStats.events.filter(e => 
          e.type === 'activity_completed' || e.type === 'activity_recorded'
        );
        const totalDuration = activities.reduce((sum, e) => 
          sum + (e.data?.duration || 0), 0
        );
        return {
          activities: activities.length,
          duration: totalDuration,
          events: todayStats.events,
        };
      },
    }),
    {
      name: 'annotation-storage',
      partialize: (state) => ({
        todayStats: state.todayStats,
        config: state.config,
      }),
    }
  )
);

// 导出辅助函数供外部使用
export { shouldGenerateAnnotation, recordEvent };
