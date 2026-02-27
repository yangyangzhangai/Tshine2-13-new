import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { useAnnotationStore } from '../store/useAnnotationStore';
import { useStardustStore } from '../store/useStardustStore';
import type { Message } from '../store/useChatStore';

interface AIAnnotationBubbleProps {
  relatedMessage?: Message; // 关联的消息对象，用于创建珍藏
  onCondense?: (emojiChar?: string) => void; // 凝结按钮点击回调，传递emoji用于动画
}

/**
 * AI 批注气泡组件
 * 
 * 特点：
 * - 屏幕右侧边缘显示
 * - 毛玻璃背景效果
 * - 8秒后自动消失
 * - 点击可提前关闭
 * - 悬停暂停计时
 * - 支持【凝结】按钮将批注保存为珍藏
 */
export const AIAnnotationBubble: React.FC<AIAnnotationBubbleProps> = ({
  relatedMessage,
  onCondense,
}) => {
  const { currentAnnotation, dismissAnnotation } = useAnnotationStore();
  const { hasStardust, createStardust, isGenerating } = useStardustStore();
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isCondensed, setIsCondensed] = useState(false);

  // 当批注变化时，重置进度
  useEffect(() => {
    if (currentAnnotation) {
      setProgress(100);
      setIsCondensed(false);
    } else {
      // 批注关闭时重置进度，避免新批注因竞态条件被立即关闭
      setProgress(100);
    }
  }, [currentAnnotation?.id]);

  // 检查关联消息是否已有珍藏
  useEffect(() => {
    if (relatedMessage?.id) {
      setIsCondensed(hasStardust(relatedMessage.id));
    }
  }, [relatedMessage?.id, hasStardust]);

  // 处理进度倒计时
  useEffect(() => {
    if (!currentAnnotation || isHovered) return;

    const displayDuration = currentAnnotation.displayDuration || 8000;
    const interval = 50; // 更新频率 50ms
    const decrement = (100 / displayDuration) * interval;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement;
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentAnnotation, isHovered]);

  // 当进度为 0 时关闭批注（避免在渲染过程中调用 setState）
  useEffect(() => {
    if (progress <= 0 && currentAnnotation) {
      dismissAnnotation();
    }
  }, [progress, currentAnnotation, dismissAnnotation]);

  // 从批注内容中提取emoji
  const extractEmojiFromContent = (content: string): string | undefined => {
    // Emoji Unicode 范围正则 (常用Emoji范围)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]/gu;
    const matches = content.match(emojiRegex);
    return matches && matches.length > 0 ? matches[0] : undefined;
  };

  // 处理凝结按钮点击
  const handleCondense = async () => {
    if (!relatedMessage || !currentAnnotation || isCondensed || isGenerating) return;

    // 从批注内容中提取emoji
    const emojiChar = extractEmojiFromContent(currentAnnotation.content);

    // 调用外部回调（用于触发动画等），传递emoji
    onCondense?.(emojiChar);

    // 创建珍藏
    await createStardust({
      messageId: relatedMessage.id,
      message: currentAnnotation.content,
      userRawContent: relatedMessage.content,
      emojiChar, // 传递提取的emoji
    });

    setIsCondensed(true);
  };

  // 如果没有批注，不渲染
  if (!currentAnnotation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 25 
        }}
        data-stardust-bubble
        className="fixed right-4 top-[20%] z-50 max-w-xs"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 毛玻璃气泡 */}
        <div 
          className="relative bg-white/70 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/50"
          style={{
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={dismissAnnotation}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors shadow-sm"
          >
            <X size={14} />
          </button>

          {/* 外星人头像 */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
              👽
            </div>
            
            {/* 批注内容 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-relaxed">
                {currentAnnotation.content}
              </p>
            </div>
          </div>

          {/* 凝结按钮 */}
          {relatedMessage && !isCondensed && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleCondense}
              disabled={isGenerating}
              className="mt-3 w-full flex items-center justify-center space-x-2 py-2 px-4 
                         bg-gradient-to-r from-purple-500 to-blue-500 
                         hover:from-purple-600 hover:to-blue-600
                         text-white text-sm font-medium rounded-full
                         shadow-md hover:shadow-lg
                         transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed
                         animate-pulse-slow"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>凝结中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="animate-pulse" />
                  <span>凝结</span>
                </>
              )}
            </motion.button>
          )}

          {/* 已凝结状态 */}
          {isCondensed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 flex items-center justify-center space-x-2 py-2 px-4 
                         bg-gray-100 text-gray-500 text-sm font-medium rounded-full"
            >
              <Check size={16} className="text-green-500" />
              <span>已凝结</span>
            </motion.div>
          )}

          {/* 进度条 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 rounded-b-2xl overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-400 to-blue-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0 }}
            />
          </div>

          {/* 悬停提示 */}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap"
            >
              悬停中，暂停消失
            </motion.div>
          )}
        </div>

        {/* 装饰性光晕 */}
        <div 
          className="absolute -inset-1 bg-gradient-to-r from-purple-400/20 to-blue-500/20 rounded-2xl blur-xl -z-10"
          style={{ 
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default AIAnnotationBubble;

// 呼吸动画样式（添加到全局CSS或组件内）
const pulseSlowStyle = `
  @keyframes pulse-slow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(147, 51, 234, 0);
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 2s ease-in-out infinite;
  }
`;
