import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '../../store/useChatStore';
import { useTodoStore } from '../../store/useTodoStore';
import { useStardustStore } from '../../store/useStardustStore';
import { Send, Activity, Edit2, Plus, Trash2, X, Save, Heart, ChevronUp, Loader2 } from 'lucide-react';
import { cn, formatDuration } from '../../lib/utils';
import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { StardustEmoji } from '../../components/StardustEmoji';
import { StardustCard } from '../../components/StardustCard';
import type { StardustCardData } from '../../types/stardust';

export const ChatPage = () => {
  const {
    messages, sendMessage, fetchMessages, fetchOlderMessages, checkAndRefreshForNewDay,
    updateActivity, insertActivity, deleteActivity, isLoading, isLoadingMore,
    hasMoreHistory, yesterdaySummary, isMoodMode, setIsMoodMode, sendMood,
    hasInitialized, setHasInitialized, updateMessageDuration,
  } = useChatStore();
  const { addTodo, activeTodoId, completeActiveTodo, setActiveTodoId, todos } = useTodoStore();
  const stardustMemories = useStardustStore(state => state.memories);
  const getStardustByMessageId = useStardustStore(state => state.getStardustByMessageId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [currentDuration, setCurrentDuration] = useState(0);

  // Edit/Insert State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insertingAfterId, setInsertingAfterId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Stardust Card State
  const [selectedStardust, setSelectedStardust] = useState<{
    data: StardustCardData;
    position: { x: number; y: number };
  } | null>(null);

  // ── 初始化 ──────────────────────────────────────────────────
  useEffect(() => {
    setHasInitialized(false);
    fetchMessages();
  }, []);

  // ── URL 参数清理 ────────────────────────────────────────────
  useEffect(() => {
    const todoId = searchParams.get('todoId');
    if (todoId) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── 跨天自动刷新 ────────────────────────────────────────────
  useEffect(() => {
    // 每 30 秒检查一次是否跨过凌晨
    const interval = setInterval(() => {
      checkAndRefreshForNewDay();
    }, 30_000);

    // 从后台切回时也检查
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshForNewDay();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkAndRefreshForNewDay]);

  // ── 上滑加载更多 (IntersectionObserver) ─────────────────────
  const handleLoadMore = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container || !hasMoreHistory || isLoadingMore) return;

    // 记录加载前的滚动高度，加载后补偿位置
    const prevScrollHeight = container.scrollHeight;
    await fetchOlderMessages();

    // 使用 rAF 确保在 DOM 更新后调整滚动位置
    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop += newScrollHeight - prevScrollHeight;
    });
  }, [hasMoreHistory, isLoadingMore, fetchOlderMessages]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMoreHistory, isLoadingMore]);

  // ── 新消息滚动到底部 ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── 当前活动计时器 ──────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const duration = Math.floor((Date.now() - lastMsg.timestamp) / (1000 * 60));
        setCurrentDuration(duration);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [messages]);

  // ── 编辑 / 插入 handlers ────────────────────────────────────
  const handleEditClick = (msg: any) => {
    setEditingId(msg.id);
    setInsertingAfterId(null);
    setEditContent(msg.content);
    setEditStartTime(format(msg.timestamp, "yyyy-MM-dd'T'HH:mm"));
    const endTime = msg.timestamp + (msg.duration || 0) * 60 * 1000;
    setEditEndTime(format(endTime, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleInsertClick = (prevMsg: any) => {
    setInsertingAfterId(prevMsg.id);
    setEditingId(null);
    setEditContent('');
    setEditStartTime(format(prevMsg.timestamp, "yyyy-MM-dd'T'HH:mm"));

    const index = messages.findIndex(m => m.id === prevMsg.id);
    const nextMsg = messages[index + 1];
    if (nextMsg) {
      const nextEnd = nextMsg.timestamp + (nextMsg.duration || 0) * 60 * 1000;
      setEditEndTime(format(nextEnd, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setEditEndTime(format(Date.now(), "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handleSave = async () => {
    if (!editContent || !editStartTime || !editEndTime) return;
    const parseTime = (s: string) => new Date(s).getTime();

    if (editingId) {
      const msg = messages.find(m => m.id === editingId);
      if (msg) {
        await updateActivity(editingId, editContent, parseTime(editStartTime), parseTime(editEndTime));
      }
    } else if (insertingAfterId) {
      const prevMsg = messages.find(m => m.id === insertingAfterId);
      if (prevMsg) {
        const index = messages.findIndex(m => m.id === insertingAfterId);
        const nextMsg = messages[index + 1];
        await insertActivity(insertingAfterId, nextMsg?.id || null, editContent, parseTime(editStartTime), parseTime(editEndTime));
      }
    }
    setEditingId(null);
    setInsertingAfterId(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await deleteActivity(id);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const todoToComplete = activeTodoId ? todos.find(t => t.id === activeTodoId) : null;

    if (!isMoodMode && activeTodoId) {
      await completeActiveTodo();
      if (todoToComplete && todoToComplete.startedAt) {
        const duration = Math.round((Date.now() - todoToComplete.startedAt) / (1000 * 60));
        await updateMessageDuration(todoToComplete.content, todoToComplete.startedAt, duration);
      }
    }

    if (isMoodMode) {
      await sendMood(input);
    } else {
      await sendMessage(input);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 辅助：计算日期分隔线 ─────────────────────────────────────
  const getDateLabel = (ts: number) => {
    return format(ts, 'M月d日 EEEE', { locale: zhCN });
  };

  const lastActivity = messages.filter(m => !m.isMood).slice(-1)[0];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">记录</h1>
      </header>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── 顶部哨兵：触发上滑加载 ── */}
        <div ref={topSentinelRef} className="h-1" />

        {/* ── 加载旧消息 Loading ── */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-3 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>加载更多记录…</span>
          </div>
        )}

        {/* ── 没有更多历史 ── */}
        {!hasMoreHistory && messages.length > 0 && (
          <div className="flex items-center justify-center py-3 text-xs text-gray-300">
            — 已是最早的记录 —
          </div>
        )}

        {/* ── 昨日回顾引导区 ── */}
        {yesterdaySummary && (
          <div
            onClick={handleLoadMore}
            className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 px-4 py-3 flex items-start gap-3 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-[0.98] transition-all"
          >
            <div className="text-2xl mt-0.5">🌙</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-800">
                昨天你记录了 {yesterdaySummary.count} 件事
              </p>
              <p className="text-xs text-indigo-500 mt-0.5 truncate">
                最后在做：{yesterdaySummary.lastContent}
              </p>
              {hasMoreHistory && (
                <p className="text-xs text-indigo-400 mt-1.5 flex items-center gap-1">
                  <ChevronUp size={12} />
                  点击或上滑查看昨天的记录
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── 今天没有消息时的空状态 ── */}
        {messages.length === 0 && !isLoading && hasInitialized && !yesterdaySummary && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm font-medium">新的一天，从一条记录开始</p>
            <p className="text-xs mt-1 text-gray-300">记录你正在做的事情</p>
          </div>
        )}

        {/* ── 消息列表（含日期分隔线）── */}
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const showDateSep = !prevMsg || !isSameDay(msg.timestamp, prevMsg.timestamp);

          return (
            <React.Fragment key={msg.id}>
              {/* 日期分隔线 */}
              {showDateSep && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {getDateLabel(msg.timestamp)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <div className="flex flex-col space-y-1">
                {msg.isMood ? (
                  // Mood Record
                  <div data-message-id={msg.id} className="group relative flex items-center justify-between bg-pink-50 p-3 rounded-xl shadow-sm border border-pink-100 hover:border-pink-200 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-pink-500" />
                      <div className="flex flex-col">
                        <span className="font-mood text-gray-900">{msg.content}</span>
                        {(() => {
                          const stardust = getStardustByMessageId(msg.id);
                          return stardust ? (
                            <div className="mt-1">
                              <StardustEmoji
                                emoji={stardust.emojiChar}
                                size="sm"
                                onClick={(e) => {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                                  setSelectedStardust({
                                    data: {
                                      emojiChar: stardust.emojiChar,
                                      message: stardust.message,
                                      alienName: stardust.alienName || 'T.S',
                                      createdAt: stardust.createdAt,
                                    },
                                    position: { x: rect.left + rect.width / 2, y: rect.top },
                                  });
                                }}
                              />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {format(msg.timestamp, 'HH:mm')}
                      </div>
                    </div>
                    <div className="absolute right-2 top-2 hidden group-hover:flex space-x-1 bg-white/80 backdrop-blur-sm rounded p-1 shadow-sm border border-gray-100">
                      <button onClick={() => handleDelete(msg.id)} className="p-1 text-gray-500 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ) : (
                  // Activity Record
                  <div data-message-id={msg.id} className="group relative flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{msg.content}</span>
                        {(() => {
                          const stardust = getStardustByMessageId(msg.id);
                          return stardust ? (
                            <div className="mt-1">
                              <StardustEmoji
                                emoji={stardust.emojiChar}
                                size="sm"
                                onClick={(e) => {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                                  setSelectedStardust({
                                    data: {
                                      emojiChar: stardust.emojiChar,
                                      message: stardust.message,
                                      alienName: stardust.alienName || 'T.S',
                                      createdAt: stardust.createdAt,
                                    },
                                    position: { x: rect.left + rect.width / 2, y: rect.top },
                                  });
                                }}
                              />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {format(msg.timestamp, 'HH:mm')} - {msg.duration !== undefined ? format(msg.timestamp + msg.duration * 60 * 1000, 'HH:mm') : '进行中'}
                      </div>
                      {msg.duration !== undefined && (
                        <div className="text-xs font-bold text-green-600 mt-1">
                          耗时 {formatDuration(msg.duration)}
                        </div>
                      )}
                    </div>
                    <div className="absolute right-2 top-2 hidden group-hover:flex space-x-1 bg-white/80 backdrop-blur-sm rounded p-1 shadow-sm border border-gray-100">
                      <button onClick={() => handleEditClick(msg)} className="p-1 text-gray-500 hover:text-blue-600" title="编辑"><Edit2 size={14} /></button>
                      <button onClick={() => handleInsertClick(msg)} className="p-1 text-gray-500 hover:text-green-600" title="在此后插入"><Plus size={14} /></button>
                      <button onClick={() => handleDelete(msg.id)} className="p-1 text-gray-500 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Current Activity Indicator */}
      {(lastActivity || activeTodoId) && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-green-700">
            <Activity size={16} className="animate-pulse" />
            <span className="text-sm font-medium">
              正在进行: <span className="font-bold">
                {activeTodoId
                  ? todos.find(t => t.id === activeTodoId)?.content || lastActivity?.content
                  : lastActivity?.content}
              </span>
            </span>
          </div>
          <span className="text-sm font-bold text-green-600">已持续 {formatDuration(currentDuration)}</span>
        </div>
      )}

      {/* Edit/Insert Modal */}
      {(editingId || insertingAfterId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? '编辑记录' : '插入记录'}</h3>
              <button onClick={() => { setEditingId(null); setInsertingAfterId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">内容</label>
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="做了什么..."
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">开始时间</label>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">结束时间</label>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Save size={16} />
              <span>保存</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 pb-safe">
        <div className={cn(
          "flex items-center space-x-2 rounded-full px-4 py-2 transition-all duration-300",
          isMoodMode
            ? "bg-pink-50 border border-pink-400"
            : "bg-gray-100"
        )}>
          <button
            onClick={() => setIsMoodMode(!isMoodMode)}
            className={cn(
              "transition-all duration-300",
              isMoodMode
                ? "text-pink-500 animate-pulse scale-110"
                : "text-gray-400 hover:text-gray-600"
            )}
            title={isMoodMode ? "切换到活动模式" : "切换到心情模式"}
          >
            <Heart size={18} fill={isMoodMode ? "currentColor" : "none"} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMoodMode ? "记录当前心情（如激动）... 点击爱心切换成活动记录" : "记录当前活动 (如: 吃饭)... 点击爱心切换成心情记录"}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300",
              isMoodMode
                ? "bg-pink-500 hover:bg-pink-600"
                : "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {isLoading ? <Activity className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* 星尘珍藏查看卡片 */}
      <StardustCard
        isOpen={!!selectedStardust}
        data={selectedStardust?.data}
        position={selectedStardust?.position}
        onClose={() => setSelectedStardust(null)}
      />
    </div>
  );
};
