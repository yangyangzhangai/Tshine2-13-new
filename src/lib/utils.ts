import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  }
  return `${minutes}分钟`;
}

/**
 * 移除 AI 推理模型的 <think>...</think> 标签及其内容
 * 适用于 Qwen3、DeepSeek-R1 等推理模型的响应
 * 
 * @param text 原始文本
 * @returns 过滤后的文本
 */
export function removeThinkingTags(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // 匹配 AI 推理模型的思考标签及其内容（支持多行）
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // 标准 <arg_key> 标签
    .replace(/<think\s+[^>]*>[\s\S]*?<\/think>/gi, '') // 带属性的 <arg_key> 标签
    .replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '') // 转义的 &lt;think&gt; 标签
    .replace(/<\?\?>[\s\S]*?<\?\?>/gi, '') // <??> 自定义标签
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '') // <thinking> 标签
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '') // <reasoning> 标签
    .replace(/<output>[\s\S]*?<\/output>/gi, ''); // <output> 标签（Qwen3 格式）
  
  // 清理可能残留的思考内容（匹配 <arg_key> 开头到文本结束的情况）
  if (cleaned.includes('<think>')) {
    cleaned = cleaned.replace(/<think>.*/gi, '');
  }
  
  return cleaned.trim();
}
