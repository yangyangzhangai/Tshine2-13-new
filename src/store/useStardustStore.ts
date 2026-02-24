import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../api/supabase';
import { useChatStore } from './useChatStore';
import type {
  StardustMemory,
  CreateStardustRequest,
  SyncStatus
} from '../types/stardust';

interface StardustStore {
  // State
  memories: StardustMemory[];
  isGenerating: boolean;
  generationError: string | null;

  // Actions
  createStardust: (request: CreateStardustRequest) => Promise<StardustMemory | null>;
  updateEmoji: (id: string, emojiChar: string) => Promise<void>;
  deleteStardust: (id: string) => Promise<void>;
  getStardustByMessageId: (messageId: string) => StardustMemory | undefined;
  hasStardust: (messageId: string) => boolean;

  // Sync
  fetchStardustMemories: () => Promise<void>;
  syncPendingStardusts: () => Promise<void>;
  getPendingSyncCount: () => number;

  // Generation state
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
}

/**
 * 创建默认Emoji（兜底方案）
 */
const DEFAULT_EMOJI = '✨';

/**
 * 生成AI Prompt用于选择Emoji
 */
function generateEmojiPrompt(userRawContent: string, message: string): string {
  return `基于以下用户活动和AI批注，选择一个最能代表这个情感瞬间的Unicode Emoji字符。

用户活动/心情：${userRawContent}
AI批注：${message}

要求：
1. 选择一个有具体意象的Emoji（如🌙🌟🫧🕊️），避免通用符号（如❤️😊）
2. 只输出一个Emoji字符，不要任何解释
3. 选择能唤起诗意和画面感的符号

输出：只返回一个Emoji字符`;
}

/**
 * 从AI响应中提取Emoji字符
 * 处理各种可能的格式：带解释、带引号、多空格等
 */
function extractEmojiFromResponse(content: string | null | undefined): string | null {
  // 处理 null/undefined/空字符串
  if (!content || typeof content !== 'string') {
    console.warn('[Stardust] extractEmojiFromResponse: 内容为空或非字符串');
    return null;
  }

  // 去除空白字符
  const trimmed = content.trim();

  if (!trimmed) {
    console.warn('[Stardust] extractEmojiFromResponse: trim后内容为空');
    return null;
  }

  // Emoji Unicode 范围正则 (常用Emoji范围)
  // 匹配单个Emoji或Emoji组合
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;

  // 尝试提取第一个Emoji
  const matches = trimmed.match(emojiRegex);
  if (matches && matches.length > 0) {
    return matches[0];
  }

  // 如果没有匹配到标准Emoji范围，检查是否整个内容就是一个字符
  // 去除引号、括号等常见包装字符
  const cleaned = trimmed.replace(/^["'`（(「【『]+|["'`）)」】』]+$/g, '');

  // 如果清理后是一个或两个字符（考虑组合Emoji），尝试返回
  if (cleaned.length > 0 && cleaned.length <= 8) {
    // 进一步检查是否包含可见字符（非控制字符）
    const hasVisibleChar = [...cleaned].some(char => {
      const code = char.codePointAt(0);
      return code && code > 0x1F && code !== 0x20 && code !== 0xA0;
    });

    if (hasVisibleChar) {
      return cleaned;
    }
  }

  console.warn('[Stardust] extractEmojiFromResponse: 无法从内容中提取Emoji:', trimmed.substring(0, 50));
  return null;
}

/**
 * 调用AI生成Emoji
 */
async function generateEmojiWithAI(userRawContent: string, message: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[Stardust] 无用户会话，使用默认Emoji');
      return DEFAULT_EMOJI;
    }

    console.log('[Stardust] 开始调用AI生成Emoji...');

    // 调用AI服务生成Emoji（使用与 aiService 相同的模型）
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer cpk_38f7d5fd384e4b22a1dfbfcda753b36b.222def67407b56dea6d82490041412aa.pndwFrTxPgF323q5yxLABuCYEZgr2EpV',
      },
      body: JSON.stringify({
        model: 'NousResearch/Hermes-4-405B-FP8-TEE', // 使用与 aiService 相同的模型
        messages: [
          { role: 'system', content: '你是一个Emoji选择助手，根据情感内容选择最合适的Unicode Emoji。只输出Emoji字符，不要解释。' },
          { role: 'user', content: generateEmojiPrompt(userRawContent, message) },
        ],
        temperature: 0.7,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Stardust] AI生成Emoji API错误:', response.status, errorText);
      return DEFAULT_EMOJI;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    console.log('[Stardust] AI完整响应:', JSON.stringify(data, null, 2));
    console.log('[Stardust] AI原始内容:', rawContent);

    // 检查响应是否有效
    if (!rawContent) {
      console.warn('[Stardust] API返回空响应，使用默认Emoji');
      return DEFAULT_EMOJI;
    }

    // 使用改进的提取函数
    const emoji = extractEmojiFromResponse(rawContent);

    if (emoji) {
      console.log('[Stardust] 提取到Emoji:', emoji);
      return emoji;
    }

    console.warn('[Stardust] 无法从响应中提取Emoji，使用默认值');
    return DEFAULT_EMOJI;
  } catch (error) {
    console.error('[Stardust] AI生成Emoji失败:', error);
    return DEFAULT_EMOJI;
  }
}

export const useStardustStore = create<StardustStore>()(
  persist(
    (set, get) => ({
      memories: [],
      isGenerating: false,
      generationError: null,

      /**
       * 创建星尘珍藏
       * Local-First策略：先写入本地，再异步同步到云端
       */
      createStardust: async (request: CreateStardustRequest) => {
        const { messageId, message, userRawContent, emojiChar } = request;

        // 检查是否已存在
        if (get().hasStardust(messageId)) {
          console.log('[Stardust] 该消息已有珍藏，跳过');
          return null;
        }

        set({ isGenerating: true, generationError: null });

        try {
          // 如果没有提供emoji，调用AI生成
          let finalEmoji = emojiChar;
          if (!finalEmoji) {
            finalEmoji = await generateEmojiWithAI(userRawContent, message);
          }

          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id || 'anonymous';

          // 创建珍藏对象
          const stardust: StardustMemory = {
            id: uuidv4(),
            messageId,
            userId,
            message,
            emojiChar: finalEmoji,
            userRawContent,
            createdAt: Date.now(),
            alienName: 'T.S',
            syncStatus: 'pending_sync',
          };

          // 1. 先写入本地状态（立即响应UI）
          set((state) => ({
            memories: [...state.memories, stardust],
            isGenerating: false,
          }));

          // 1.5 更新ChatStore中的消息，添加stardust关联
          try {
            const chatStore = useChatStore.getState();
            const updatedMessages = chatStore.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, stardustId: stardust.id, stardustEmoji: stardust.emojiChar }
                : msg
            );
            useChatStore.setState({ messages: updatedMessages });
          } catch (e) {
            console.error('[Stardust] 更新ChatStore失败:', e);
          }

          // 2. 异步提交到服务器
          if (session) {
            try {
              const { error } = await supabase.from('stardust_memories').insert([{
                id: stardust.id,
                message_id: stardust.messageId,
                user_id: stardust.userId,
                message: stardust.message,
                emoji_char: stardust.emojiChar,
                user_raw_content: stardust.userRawContent,
                created_at: new Date(stardust.createdAt).toISOString(),
                alien_name: stardust.alienName,
              }]);

              if (error) {
                throw error;
              }

              // 同步成功，更新状态
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === stardust.id ? { ...m, syncStatus: 'synced' as SyncStatus } : m
                ),
              }));
            } catch (syncError) {
              console.error('[Stardust] 同步到服务器失败:', syncError);
              // 保持pending_sync状态，下次自动重试
            }
          }

          return stardust;
        } catch (error) {
          console.error('[Stardust] 创建珍藏失败:', error);
          set({
            isGenerating: false,
            generationError: error instanceof Error ? error.message : '创建失败'
          });
          return null;
        }
      },

      /**
       * 更新Emoji（用于竞态场景兜底或重试）
       */
      updateEmoji: async (id: string, emojiChar: string) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, emojiChar, syncStatus: 'pending_sync' as SyncStatus } : m
          ),
        }));

        // 同步到服务器
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            await supabase
              .from('stardust_memories')
              .update({ emoji_char: emojiChar })
              .eq('id', id)
              .eq('user_id', session.user.id);

            set((state) => ({
              memories: state.memories.map((m) =>
                m.id === id ? { ...m, syncStatus: 'synced' as SyncStatus } : m
              ),
            }));
          } catch (error) {
            console.error('[Stardust] 更新Emoji失败:', error);
          }
        }
      },

      /**
       * 删除珍藏
       */
      deleteStardust: async (id: string) => {
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));

        // 同步删除到服务器
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            await supabase
              .from('stardust_memories')
              .delete()
              .eq('id', id)
              .eq('user_id', session.user.id);
          } catch (error) {
            console.error('[Stardust] 删除同步失败:', error);
          }
        }
      },

      /**
       * 根据消息ID获取珍藏
       */
      getStardustByMessageId: (messageId: string) => {
        return get().memories.find((m) => m.messageId === messageId);
      },

      /**
       * 检查消息是否已有珍藏
       */
      hasStardust: (messageId: string) => {
        return get().memories.some((m) => m.messageId === messageId);
      },

      /**
       * 从云端获取珍藏数据
       * 在用户登录后调用，实现跨设备同步
       */
      fetchStardustMemories: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[Stardust] 无用户会话，跳过云端获取');
          return;
        }

        try {
          const { data, error } = await supabase.from('stardust_memories')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[Stardust] 获取云端数据失败:', error);
            return;
          }

          if (!data || data.length === 0) {
            console.log('[Stardust] 云端无珍藏数据');
            return;
          }

          const memories = data.map((m: any) => ({
            id: m.id,
            messageId: m.message_id,
            userId: m.user_id,
            message: m.message,
            emojiChar: m.emoji_char,
            userRawContent: m.user_raw_content,
            createdAt: new Date(m.created_at).getTime(),
            alienName: m.alien_name,
            syncStatus: 'synced' as SyncStatus,
          }));

          set({ memories });
          console.log(`[Stardust] 从云端获取了 ${memories.length} 条珍藏`);
        } catch (error) {
          console.error('[Stardust] 获取云端数据异常:', error);
        }
      },

      /**
       * 同步所有待同步的珍藏
       * 在网络恢复或应用启动时调用
       */
      syncPendingStardusts: async () => {
        const pending = get().memories.filter((m) => m.syncStatus === 'pending_sync');
        if (pending.length === 0) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        for (const stardust of pending) {
          try {
            const { error } = await supabase.from('stardust_memories').upsert([{
              id: stardust.id,
              message_id: stardust.messageId,
              user_id: stardust.userId,
              message: stardust.message,
              emoji_char: stardust.emojiChar,
              user_raw_content: stardust.userRawContent,
              created_at: new Date(stardust.createdAt).toISOString(),
              alien_name: stardust.alienName,
            }]);

            if (!error) {
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === stardust.id ? { ...m, syncStatus: 'synced' as SyncStatus } : m
                ),
              }));
            }
          } catch (error) {
            console.error(`[Stardust] 同步失败 ${stardust.id}:`, error);
          }
        }
      },

      /**
       * 获取待同步数量
       */
      getPendingSyncCount: () => {
        return get().memories.filter((m) => m.syncStatus === 'pending_sync').length;
      },

      /**
       * 设置生成状态
       */
      setGenerating: (isGenerating: boolean) => {
        set({ isGenerating });
      },

      /**
       * 设置生成错误
       */
      setGenerationError: (error: string | null) => {
        set({ generationError: error });
      },
    }),
    {
      name: 'stardust-storage',
      partialize: (state) => ({
        memories: state.memories,
      }),
    }
  )
);

// 导出辅助函数
export { generateEmojiWithAI, DEFAULT_EMOJI };
