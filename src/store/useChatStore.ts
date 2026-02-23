import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';
import { supabase } from '../api/supabase';
import { callChatAPI } from '../api/client';
import { useAnnotationStore } from './useAnnotationStore';
import type { AnnotationEvent } from '../types/annotation';

export type MessageType = 'text' | 'system' | 'ai';

export interface Message {
  id: string;
  content: string;
  timestamp: number;
  type: MessageType;
  duration?: number; // Duration in minutes since THIS activity started until the next one
  activityType?: string; // AI classified type
  mode?: 'chat' | 'record'; // Distinguish between chat and record modes
  isMood?: boolean; // Whether this is a mood record
  // 星尘珍藏关联字段
  stardustId?: string; // 关联的珍藏ID
  stardustEmoji?: string; // 珍藏的Emoji字符（本地展示用，避免频繁查询store）
}

interface YesterdaySummary {
  count: number;
  lastContent: string;
}

interface ChatState {
  messages: Message[];
  mode: 'chat' | 'record';
  isMoodMode: boolean;
  lastActivityTime: number | null;
  isLoading: boolean;
  hasInitialized: boolean;
  // Day-based loading state
  oldestLoadedDate: string | null; // YYYY-MM-DD of the earliest loaded day
  hasMoreHistory: boolean;
  isLoadingMore: boolean;
  yesterdaySummary: YesterdaySummary | null;
  currentDateStr: string | null; // YYYY-MM-DD of "today" when messages were loaded
  fetchMessages: () => Promise<void>;
  fetchOlderMessages: () => Promise<void>;
  checkAndRefreshForNewDay: () => void;
  sendMessage: (content: string, customTimestamp?: number, forcedMode?: 'chat' | 'record') => Promise<void>;
  sendMood: (content: string) => Promise<void>;
  insertActivity: (prevId: string | null, nextId: string | null, content: string, startTime: number, endTime: number) => Promise<void>;
  updateActivity: (id: string, content: string, startTime: number, endTime: number) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  updateMessageDuration: (content: string, timestamp: number, duration: number) => Promise<void>;
  setMode: (mode: 'chat' | 'record') => void;
  setIsMoodMode: (isMoodMode: boolean) => void;
  setHasInitialized: (value: boolean) => void;
  clearHistory: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      mode: 'record',
      isMoodMode: false,
      lastActivityTime: null,
      isLoading: false,
      hasInitialized: false,
      // Day-based loading state
      oldestLoadedDate: null,
      hasMoreHistory: true,
      isLoadingMore: false,
      yesterdaySummary: null,
      currentDateStr: null,

      fetchMessages: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          set({ hasInitialized: true });
          return;
        }

        set({ isLoading: true });
        try {
          // Calculate today's 00:00 in local timezone
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayStartMs = todayStart.getTime();
          const todayStr = todayStart.toISOString().slice(0, 10);

          // Calculate yesterday's 00:00
          const yesterdayStart = new Date(todayStart);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          const yesterdayStartMs = yesterdayStart.getTime();

          // Fetch today's messages
          const { data: todayData, error: todayError } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('timestamp', todayStartMs)
            .order('timestamp', { ascending: true });

          if (todayError) throw todayError;

          // Fetch yesterday's messages (for summary)
          const { data: yesterdayData, error: yesterdayError } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('timestamp', yesterdayStartMs)
            .lt('timestamp', todayStartMs)
            .order('timestamp', { ascending: true });

          if (yesterdayError) throw yesterdayError;

          const messages = (todayData || []).map((m: any) => ({
            id: m.id,
            content: m.content,
            timestamp: Number(m.timestamp),
            type: m.type as MessageType,
            duration: m.duration,
            activityType: m.activity_type,
            mode: (m.activity_type === 'chat' ? 'chat' : 'record') as 'chat' | 'record',
            isMood: m.is_mood || false
          }));

          // Build yesterday summary
          let yesterdaySummary: YesterdaySummary | null = null;
          if (yesterdayData && yesterdayData.length > 0) {
            const lastYesterday = yesterdayData[yesterdayData.length - 1];
            yesterdaySummary = {
              count: yesterdayData.length,
              lastContent: lastYesterday.content,
            };
          }

          set({
            messages,
            oldestLoadedDate: todayStr,
            hasMoreHistory: true,
            yesterdaySummary,
            currentDateStr: todayStr,
          });
        } catch (error) {
          console.error('Error fetching messages:', error);
        } finally {
          set({ isLoading: false, hasInitialized: true });
        }
      },

      fetchOlderMessages: async () => {
        const state = get();
        if (state.isLoadingMore || !state.hasMoreHistory || !state.oldestLoadedDate) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        set({ isLoadingMore: true });
        try {
          // Calculate the day before oldestLoadedDate
          const oldestDate = new Date(state.oldestLoadedDate + 'T00:00:00');
          const prevDayStart = new Date(oldestDate);
          prevDayStart.setDate(prevDayStart.getDate() - 1);
          prevDayStart.setHours(0, 0, 0, 0);
          const prevDayStartMs = prevDayStart.getTime();
          const oldestDateMs = oldestDate.getTime();
          const prevDayStr = prevDayStart.toISOString().slice(0, 10);

          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('timestamp', prevDayStartMs)
            .lt('timestamp', oldestDateMs)
            .order('timestamp', { ascending: true });

          if (error) throw error;

          const olderMessages = (data || []).map((m: any) => ({
            id: m.id,
            content: m.content,
            timestamp: Number(m.timestamp),
            type: m.type as MessageType,
            duration: m.duration,
            activityType: m.activity_type,
            mode: (m.activity_type === 'chat' ? 'chat' : 'record') as 'chat' | 'record',
            isMood: m.is_mood || false
          }));

          set(state => ({
            messages: [...olderMessages, ...state.messages],
            oldestLoadedDate: prevDayStr,
            hasMoreHistory: olderMessages.length > 0,
          }));
        } catch (error) {
          console.error('Error fetching older messages:', error);
        } finally {
          set({ isLoadingMore: false });
        }
      },

      checkAndRefreshForNewDay: () => {
        const state = get();
        const todayStr = new Date().toISOString().slice(0, 10);
        // If the stored date differs from actual today, we crossed midnight
        if (state.currentDateStr && state.currentDateStr !== todayStr) {
          console.log('[DayRefresh] Midnight crossed, refreshing messages...');
          state.fetchMessages();
        }
      },

      sendMessage: async (content: string, customTimestamp?: number, forcedMode?: 'chat' | 'record') => {
        const now = customTimestamp ?? Date.now();
        const state = get();
        // 使用强制指定的 mode，如果没有则使用当前 state 的 mode
        const effectiveMode = forcedMode ?? state.mode;
        let updatedMessages = [...state.messages];

        // If in record mode, find the last activity to update its duration
        if (effectiveMode === 'record') {
          // Find the last activity message with mode='record' (skip mood records)
          let lastRecordIndex = -1;
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].mode === 'record' && !updatedMessages[i].isMood) {
              lastRecordIndex = i;
              break;
            }
          }

          if (lastRecordIndex !== -1) {
            const lastMsg = updatedMessages[lastRecordIndex];
            // Calculate duration based on current time
            const duration = Math.max(0, Math.round((now - lastMsg.timestamp) / (1000 * 60)));

            updatedMessages[lastRecordIndex] = {
              ...lastMsg,
              duration
            };

            // Update previous message in Supabase if logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await supabase.from('messages').update({ duration }).eq('id', lastMsg.id).eq('user_id', session.user.id);
            }
          }
        }

        const newMessage: Message = {
          id: uuidv4(),
          content,
          timestamp: now,
          type: 'text',
          mode: effectiveMode,
          activityType: effectiveMode === 'record' ? '待分类' : 'chat'
        };

        updatedMessages.push(newMessage);

        // Update state immediately (Optimistic)
        set({
          messages: updatedMessages,
          lastActivityTime: effectiveMode === 'record' ? now : state.lastActivityTime
        });

        // Persist to Supabase if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.from('messages').insert([{
            id: newMessage.id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            type: newMessage.type,
            activity_type: newMessage.activityType,
            user_id: session.user.id
          }]);
          if (error) console.error('Error sending message:', error);
        }

        // 触发 AI 批注（记录模式下）
        if (effectiveMode === 'record') {
          const annotationStore = useAnnotationStore.getState();

          // 检查上一个活动是否完成（有 duration）
          let lastRecordIndex = -1;
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            const m = updatedMessages[i];
            if (m.mode === 'record' && !m.isMood && m.duration !== undefined) {
              lastRecordIndex = i;
              break;
            }
          }

          // 触发新活动记录批注
          const recordEvent: AnnotationEvent = {
            type: 'activity_recorded',
            timestamp: Date.now(),
            data: {
              content: newMessage.content,
            },
          };
          annotationStore.triggerAnnotation(recordEvent).catch(console.error);
        }

        // AI Response Logic
        if (state.mode === 'chat') {
          try {
            // --- 修改开始：构建符合 API 标准的对话历史 ---

            // 1. 定义 AI 人设 (System Prompt)
            // API 规定 role 必须是 "system", "user", "assistant" 其中之一
            const systemMessage = {
              role: 'system',
              content: '你是 Time Shine，一个来自外星球的小王子，性格傲娇但是很善良，内心温暖如火，你要帮助你的地球同行者（物种是人类）进行时间、精力和目标管理，成就ta，托举ta，让ta成为更好的自己。你不了解人类，但是你对ta们感兴趣并且抱有善意，你认为你的同行者是一种智慧而奇怪的物种，在你心中ta是独一无二的，你相信ta能完成任何事情。'
            };

            // 2. 整理历史消息：过滤掉系统报错和非聊天记录，转换角色名
            const historyMessages = updatedMessages
              .filter(m => m.mode === 'chat' && m.type !== 'system')
              .map(m => ({
                role: m.type === 'ai' ? 'assistant' : 'user', // 把 'ai' 转为 'assistant'
                content: m.content
              }));

            // 3. 组合发送：[人设] + [历史记录]
            const apiMessages = [systemMessage, ...historyMessages];

            // 4. 发送给 AI (通过 Serverless Function)
            const aiResponse = await callChatAPI({
              messages: apiMessages,
              temperature: 0.9,
              max_tokens: 512,
            });
            // --- 修改结束 ---

            const aiMessage: Message = {
              id: uuidv4(),
              content: aiResponse,
              timestamp: Date.now(),
              type: 'ai',
              mode: 'chat',
              activityType: 'chat'
            };

            set(state => ({ messages: [...state.messages, aiMessage] }));

            if (session) {
              await supabase.from('messages').insert([{
                id: aiMessage.id,
                content: aiMessage.content,
                timestamp: aiMessage.timestamp,
                type: aiMessage.type,
                activity_type: 'chat',
                user_id: session.user.id
              }]);
            }
          } catch (error) {
            console.error('AI Error:', error);
            const errorMessage: Message = {
              id: uuidv4(),
              content: '抱歉，AI暂时无法响应，请稍后再试。',
              timestamp: Date.now(),
              type: 'system',
              mode: 'chat',
              activityType: 'chat'
            };
            set(state => ({ messages: [...state.messages, errorMessage] }));
          }
        } else {
          // Record mode AI analysis
          // ... (existing logic for record mode analysis)
        }
      },

      insertActivity: async (prevId, nextId, content, startTime, endTime) => {
        const newMessage: Message = {
          id: uuidv4(),
          content,
          timestamp: startTime,
          type: 'text',
          duration: Math.round((endTime - startTime) / (1000 * 60)),
          activityType: '待分类',
          mode: 'record'
        };

        const state = get();

        const messagesToInsert: Message[] = [newMessage];
        const messagesToUpdate: Message[] = [];

        let currentMessages = state.messages.map(m => {
          if (m.mode !== 'record') return m;

          const mStart = m.timestamp;
          const mDuration = m.duration || 0;
          const mEnd = mStart + mDuration * 60 * 1000;

          if (mStart < endTime && mEnd > startTime) {

            // Case 1: Split (New inside Old)
            if (mStart < startTime && mEnd > endTime) {
              const tailDuration = Math.round((mEnd - endTime) / (1000 * 60));
              const tailMessage: Message = {
                ...m,
                id: uuidv4(),
                timestamp: endTime,
                duration: tailDuration
              };
              messagesToInsert.push(tailMessage);

              const headDuration = Math.round((startTime - mStart) / (1000 * 60));
              const updatedHead = { ...m, duration: headDuration };

              messagesToUpdate.push(updatedHead);
              return updatedHead;
            }

            // Case 2: Start Collision (Push Back)
            if (Math.abs(mStart - startTime) < 1000) {
              const updatedStart = endTime;
              const updatedDuration = Math.max(0, Math.round((mEnd - updatedStart) / (1000 * 60)));
              const updatedMsg = { ...m, timestamp: updatedStart, duration: updatedDuration };
              messagesToUpdate.push(updatedMsg);
              return updatedMsg;
            }

            // Case 3: End Collision (Truncate)
            if (mStart < startTime) {
              const updatedDuration = Math.max(0, Math.round((startTime - mStart) / (1000 * 60)));
              if (updatedDuration !== mDuration) {
                const updatedMsg = { ...m, duration: updatedDuration };
                messagesToUpdate.push(updatedMsg);
                return updatedMsg;
              }
            }
          }
          return m;
        });

        const finalMessages = [...currentMessages, ...messagesToInsert].sort((a, b) => a.timestamp - b.timestamp);

        set({ messages: finalMessages });

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const insertPayload = messagesToInsert.map(msg => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.timestamp,
            type: msg.type,
            duration: msg.duration,
            activity_type: msg.activityType,
            user_id: session.user.id
          }));

          if (insertPayload.length > 0) {
            await supabase.from('messages').insert(insertPayload);
          }

          for (const msg of messagesToUpdate) {
            await supabase.from('messages').update({
              timestamp: msg.timestamp,
              duration: msg.duration
            }).eq('id', msg.id).eq('user_id', session.user.id);
          }
        }
      },

      updateActivity: async (id, content, startTime, endTime) => {
        const duration = Math.round((endTime - startTime) / (1000 * 60));

        set(state => ({
          messages: state.messages.map(m =>
            m.id === id
              ? { ...m, content, timestamp: startTime, duration }
              : m
          ).sort((a, b) => a.timestamp - b.timestamp)
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('messages').update({
            content,
            timestamp: startTime,
            duration
          }).eq('id', id).eq('user_id', session.user.id);
        }
      },

      deleteActivity: async (id) => {
        set(state => ({
          messages: state.messages.filter(m => m.id !== id)
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('messages').delete().eq('id', id).eq('user_id', session.user.id);
        }
      },

      // 更新特定消息的 duration（用于待办完成后同步耗时）
      updateMessageDuration: async (content: string, timestamp: number, duration: number) => {
        const state = get();

        // 查找匹配的消息（相同内容、相同时间戳、记录模式）
        const messageIndex = state.messages.findIndex(m =>
          m.mode === 'record' &&
          m.content === content &&
          Math.abs(m.timestamp - timestamp) < 1000 // 时间戳相差小于1秒视为同一条
        );

        if (messageIndex === -1) {
          console.log('[DEBUG] 未找到匹配的消息:', content, timestamp);
          return;
        }

        const targetMessage = state.messages[messageIndex];

        // 更新本地状态
        set(state => ({
          messages: state.messages.map((m, idx) =>
            idx === messageIndex ? { ...m, duration } : m
          )
        }));

        // 同步到 Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('messages').update({ duration }).eq('id', targetMessage.id).eq('user_id', session.user.id);
        }

        console.log('[DEBUG] 消息 duration 已更新:', content, duration, '分钟');
      },

      sendMood: async (content: string) => {
        const now = Date.now();
        const state = get();

        const newMessage: Message = {
          id: uuidv4(),
          content,
          timestamp: now,
          type: 'text',
          mode: 'record',
          activityType: 'mood',
          isMood: true
        };

        set(state => ({
          messages: [...state.messages, newMessage]
        }));

        // 触发心情记录批注
        const annotationStore = useAnnotationStore.getState();
        const moodEvent: AnnotationEvent = {
          type: 'mood_recorded',
          timestamp: Date.now(),
          data: {
            mood: content,
          },
        };
        annotationStore.triggerAnnotation(moodEvent).catch(console.error);

        // Persist to Supabase if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.from('messages').insert([{
            id: newMessage.id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            type: newMessage.type,
            activity_type: newMessage.activityType,
            user_id: session.user.id,
            is_mood: true
          }]);
          if (error) console.error('Error sending mood:', error);
        }
      },

      setMode: (mode) => set({ mode }),
      setIsMoodMode: (isMoodMode) => set({ isMoodMode }),
      setHasInitialized: (value) => set({ hasInitialized: value }),

      clearHistory: async () => {
        set({ messages: [], lastActivityTime: null });
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        messages: state.messages,
        mode: state.mode,
        isMoodMode: state.isMoodMode,
        lastActivityTime: state.lastActivityTime,
        currentDateStr: state.currentDateStr,
      }),
    }
  )
);
