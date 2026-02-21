import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useTodoStore } from './useTodoStore';
import { useChatStore } from './useChatStore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { callReportAPI, callClassifierAPI, callDiaryAPI } from '../api/client';
import { computeAll, formatForDiaryAI, type ComputedResult, type ClassifiedData, type MoodRecord } from '../utils/reportCalculator';

export interface ReportStats {
  completedTodos: number;
  totalTodos: number;
  completionRate: number;
  recurringStats?: {
    name: string;
    completed: boolean; // For daily
    count?: number; // For weekly/monthly
    total?: number; // For weekly/monthly
    rate?: number;
  }[];
  priorityStats?: {
    priority: string;
    count: number;
    completed: number;
  }[];
  dailyCompletion?: {
    date: string;
    completed: number;
    total: number;
    rate: number;
  }[];
}

export interface Report {
  id: string;
  title: string;
  date: number;
  startDate?: number;
  endDate?: number;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  content: string; // JSON string or markdown
  aiAnalysis?: string;
  stats?: ReportStats;
}

interface ReportState {
  reports: Report[];
  generateReport: (type: 'daily' | 'weekly' | 'monthly' | 'custom', date: number, endDate?: number) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  // 三步走新流程
  generateTimeshineDiary: (reportId: string) => Promise<void>;
  // 存储计算结果供历史对比
  computedHistory: ComputedResult[];
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  computedHistory: [],

  updateReport: (id, updates) => set(state => ({
    reports: state.reports.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  generateReport: (type, date, customEndDate) => {
    const todoStore = useTodoStore.getState();
    const chatStore = useChatStore.getState();
    const targetDate = new Date(date);

    let start: Date, end: Date;
    let title = '';

    if (type === 'daily') {
      start = startOfDay(targetDate);
      end = endOfDay(targetDate);
      title = `${format(targetDate, 'yyyy-MM-dd')} 日报`;
    } else if (type === 'weekly') {
      start = startOfWeek(targetDate, { weekStartsOn: 1 });
      end = endOfWeek(targetDate, { weekStartsOn: 1 });
      title = `${format(start, 'MM-dd')} 至 ${format(end, 'MM-dd')} 周报`;
    } else if (type === 'monthly') {
      start = startOfMonth(targetDate);
      end = endOfMonth(targetDate);
      title = `${format(targetDate, 'yyyy-MM')} 月报`;
    } else if (type === 'custom' && customEndDate) {
      start = startOfDay(targetDate);
      end = endOfDay(new Date(customEndDate));
      title = `${format(start, 'yyyy-MM-dd')} 至 ${format(end, 'yyyy-MM-dd')} 定制报告`;
    } else {
      start = startOfDay(targetDate);
      end = endOfDay(targetDate);
      title = '定制报告';
    }

    // Filter Todos in range
    const allTodos = todoStore.todos;
    const relevantTodos = allTodos.filter(t => {
      const inDateRange = t.dueDate >= start.getTime() && t.dueDate <= end.getTime();
      if (!inDateRange) return false;

      // Scope filtering: Exclude monthly scope from weekly report
      if (type === 'weekly' && t.scope === 'monthly') {
        return false;
      }

      return true;
    });

    // Calculate Stats
    const total = relevantTodos.length;
    const completed = relevantTodos.filter(t => t.completed).length;

    let stats: ReportStats = {
      completedTodos: completed,
      totalTodos: total,
      completionRate: total > 0 ? completed / total : 0,
      priorityStats: [],
      recurringStats: [],
      dailyCompletion: []
    };

    // Priority Stats
    const priorities = ['urgent-important', 'urgent-not-important', 'important-not-urgent', 'not-important-not-urgent'];
    stats.priorityStats = priorities.map(p => {
      const pTodos = relevantTodos.filter(t => t.priority === p);
      return {
        priority: p,
        count: pTodos.length,
        completed: pTodos.filter(t => t.completed).length
      };
    });

    if (type === 'daily') {
      // Daily Recurring Stats
      stats.recurringStats = relevantTodos
        .filter(t => t.recurrence && t.recurrence !== 'none')
        .map(t => ({
          name: t.content,
          completed: t.completed
        }));
    } else {
      // Weekly/Monthly Recurring Stats
      // Group by recurrenceId or content
      const recurringGroups: Record<string, typeof relevantTodos> = {};
      relevantTodos.filter(t => t.recurrence && t.recurrence !== 'none').forEach(t => {
        const key = t.recurrenceId || t.content;
        if (!recurringGroups[key]) recurringGroups[key] = [];
        recurringGroups[key].push(t);
      });

      stats.recurringStats = Object.values(recurringGroups).map(group => {
        const completedCount = group.filter(t => t.completed).length;
        return {
          name: group[0].content,
          completed: false, // Not used for weekly
          count: completedCount,
          total: group.length,
          rate: group.length > 0 ? completedCount / group.length : 0
        };
      });

      // Daily Completion Trend
      const days = eachDayOfInterval({ start, end });
      stats.dailyCompletion = days.map(day => {
        const dayTodos = relevantTodos.filter(t => isSameDay(t.dueDate, day));
        const dayCompleted = dayTodos.filter(t => t.completed).length;
        return {
          date: format(day, 'MM-dd'),
          completed: dayCompleted,
          total: dayTodos.length,
          rate: dayTodos.length > 0 ? dayCompleted / dayTodos.length : 0
        };
      });
    }

    const newReport: Report = {
      id: uuidv4(),
      title,
      date,
      startDate: start.getTime(),
      endDate: end.getTime(),
      type,
      content: 'Generated report',
      stats,
      aiAnalysis: undefined, // No auto-generation
    };

    // Remove existing report of same type and date (simple dedup)
    set((state) => ({
      reports: [
        ...state.reports.filter(r => !(r.type === type && isSameDay(r.date, date))),
        newReport
      ]
    }));
  },

  triggerAIAnalysis: async (reportId) => {
    const state = get();
    const report = state.reports.find(r => r.id === reportId);
    if (!report) return;

    // Set loading state
    get().updateReport(reportId, { aiAnalysis: '正在生成 AI 分析...' });

    const todoStore = useTodoStore.getState();
    const chatStore = useChatStore.getState();

    let start = report.startDate ? new Date(report.startDate) : startOfDay(new Date(report.date));
    let end = report.endDate ? new Date(report.endDate) : endOfDay(new Date(report.date));

    // Legacy support for reports without start/end
    if (!report.startDate) {
      if (report.type === 'weekly') {
        start = startOfWeek(new Date(report.date), { weekStartsOn: 1 });
        end = endOfWeek(new Date(report.date), { weekStartsOn: 1 });
      } else if (report.type === 'monthly') {
        start = startOfMonth(new Date(report.date));
        end = endOfMonth(new Date(report.date));
      }
    }

    // Filter Todos
    const allTodos = todoStore.todos;
    const relevantTodos = allTodos.filter(t => {
      return t.dueDate >= start.getTime() && t.dueDate <= end.getTime();
    });

    const activities = chatStore.messages.filter(m =>
      m.timestamp >= start.getTime() && m.timestamp <= end.getTime() && m.type !== 'system' && m.mode === 'record'
    ).map(m => ({
      time: format(m.timestamp, 'MM-dd HH:mm'),
      content: m.content,
      duration: m.duration || 0
    }));

    const analysisData = {
      date: format(start, 'yyyy-MM-dd') + (report.type !== 'daily' ? ` 至 ${format(end, 'yyyy-MM-dd')}` : ''),
      todos: relevantTodos,
      activities,
      stats: report.stats
    };

    const analysisContent = await callReportAPI({
      data: analysisData,
      type: report.type,
    });
    get().updateReport(reportId, { aiAnalysis: analysisContent });
  },

  /**
   * Timeshine 三步走流程 - 生成观察手记
   * Step 1: 调用分类器 API 将原始输入结构化
   * Step 2: 本地计算层处理数据
   * Step 3: 调用日记 API 生成诗意观察手记
   */
  generateTimeshineDiary: async (reportId) => {
    const state = get();
    const report = state.reports.find(r => r.id === reportId);
    if (!report) return;

    const chatStore = useChatStore.getState();
    const todoStore = useTodoStore.getState();

    // 设置加载状态
    get().updateReport(reportId, { aiAnalysis: '正在生成观察手记...' });

    try {
      // 准备时间范围
      let start = report.startDate ? new Date(report.startDate) : startOfDay(new Date(report.date));
      let end = report.endDate ? new Date(report.endDate) : endOfDay(new Date(report.date));

      if (!report.startDate) {
        if (report.type === 'weekly') {
          start = startOfWeek(new Date(report.date), { weekStartsOn: 1 });
          end = endOfWeek(new Date(report.date), { weekStartsOn: 1 });
        } else if (report.type === 'monthly') {
          start = startOfMonth(new Date(report.date));
          end = endOfMonth(new Date(report.date));
        }
      }

      // 获取活动记录
      const activities = chatStore.messages.filter(m =>
        m.timestamp >= start.getTime() &&
        m.timestamp <= end.getTime() &&
        m.type !== 'system' &&
        m.mode === 'record'
      );

      // 获取待办统计
      const relevantTodos = todoStore.todos.filter(t =>
        t.dueDate >= start.getTime() && t.dueDate <= end.getTime()
      );
      const completedTodos = relevantTodos.filter(t => t.completed).length;
      const totalTodos = relevantTodos.length;

      // 提取心情记录（isMood 消息是独立数据源，不经过分类器）
      const moodMessages = chatStore.messages.filter(m =>
        m.timestamp >= start.getTime() &&
        m.timestamp <= end.getTime() &&
        m.isMood === true
      );
      const moodRecords: MoodRecord[] = moodMessages.map(m => {
        const hour = new Date(m.timestamp).getHours();
        return {
          time: format(m.timestamp, 'HH:mm'),
          time_slot: hour < 12 ? 'morning' as const : hour < 18 ? 'afternoon' as const : 'evening' as const,
          content: m.content,
        };
      });

      // 构建原始输入文本
      const rawInputLines: string[] = [];
      rawInputLines.push('今天的时间记录：');
      activities.forEach(m => {
        const timeStr = format(m.timestamp, 'HH:mm');
        const durationStr = m.duration ? ` (${m.duration}分钟)` : '';
        rawInputLines.push(`- ${timeStr} ${m.content}${durationStr}`);
      });
      rawInputLines.push('');
      rawInputLines.push(`待办：完成${completedTodos}件，共${totalTodos}件`);

      const rawInput = rawInputLines.join('\n');

      // ═══════════════════════════════════════════════════════════════
      // Step 1: 调用分类器 API
      // ═══════════════════════════════════════════════════════════════
      console.log('[Timeshine] Step 1: 调用分类器...');
      const classifyResult = await callClassifierAPI({ rawInput });

      if (!classifyResult.success || !classifyResult.data) {
        throw new Error('分类器返回数据失败');
      }

      const classifiedData = classifyResult.data;

      // ═══════════════════════════════════════════════════════════════
      // Step 2: 本地计算层
      // ═══════════════════════════════════════════════════════════════
      console.log('[Timeshine] Step 2: 计算层处理...');
      const computed = computeAll(classifiedData, state.computedHistory);
      computed.mood_records = moodRecords; // 注入心情数据
      const structuredData = formatForDiaryAI(computed);

      // 手记编号（注意：基于本地 computedHistory 长度，清除缓存或换设备会重置）
      const reportNumber = state.computedHistory.length + 1;
      const structuredDataWithMeta = `手记编号：第 ${reportNumber} 号\n\n` + structuredData;

      // 保存计算结果到历史（用于未来趋势分析）
      set(state => ({
        computedHistory: [...state.computedHistory.slice(-6), computed]
      }));

      // 构建历史上下文（给 AI 提供近几日的叙述性背景）
      let historyContext: string | undefined;
      if (state.computedHistory.length > 0) {
        const recent = state.computedHistory.slice(-3);
        const ctxLines: string[] = [`过去${recent.length}天观察摘要：`];
        recent.forEach((h, i) => {
          const focusItem = h.spectrum.find(s => s.category === 'deep_focus');
          ctxLines.push(`  第${state.computedHistory.length - recent.length + i + 1}日：专注${focusItem?.duration_str || '0min'}，待办${h.light_quality.todo_str}`);
        });
        historyContext = ctxLines.join('\n');
      }

      // ═══════════════════════════════════════════════════════════════
      // Step 3: 调用日记 API
      // ═══════════════════════════════════════════════════════════════
      console.log('[Timeshine] Step 3: 生成观察手记...');
      const diaryResult = await callDiaryAPI({
        structuredData: structuredDataWithMeta,
        rawInput: rawInput.slice(0, 500),
        date: format(start, 'yyyy年MM月dd日 EEEE', { locale: zhCN }),
        historyContext,
      });

      if (!diaryResult.success || !diaryResult.content) {
        throw new Error('日记生成失败');
      }

      // 更新报告
      get().updateReport(reportId, { aiAnalysis: diaryResult.content });
      console.log('[Timeshine] 观察手记生成完成');

    } catch (error) {
      console.error('[Timeshine] 生成观察手记失败:', error);
      get().updateReport(reportId, {
        aiAnalysis: `生成观察手记时出错：${error instanceof Error ? error.message : '未知错误'}。请稍后重试。`
      });
    }
  }
}));
