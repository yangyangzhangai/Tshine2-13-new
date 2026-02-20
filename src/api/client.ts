/**
 * 前端 API Client - 调用 Vercel Serverless Functions
 * 
 * 所有 AI 请求都通过服务端中转，API Key 不会暴露在前端
 */

// 自动检测环境
const isDevelopment = import.meta.env.DEV;
const isVercel = import.meta.env.VERCEL || window.location.hostname.includes('vercel.app');

// API 基础 URL
const API_BASE = isDevelopment && !isVercel 
  ? '/api'  // 本地开发时通过 Vite proxy
  : '/api'; // 生产环境直接调用

interface ChatRequest {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ReportRequest {
  data: {
    date: string;
    todos: any[];
    activities: { time: string; content: string; duration: number }[];
    stats: any;
  };
  type: 'daily' | 'weekly' | 'monthly';
}

interface ReportResponse {
  content: string;
}

interface AnnotationRequest {
  eventType: string;
  eventData: any;
  userContext: {
    todayActivities?: number;
    todayDuration?: number;
    currentHour?: number;
    recentAnnotations?: string[];
    todayActivitiesList?: any[];
  };
}

interface AnnotationResponse {
  content: string;
  tone: 'playful' | 'celebrating' | 'concerned' | 'curious';
  displayDuration: number;
}

/**
 * 调用 Chat API
 */
export async function callChatAPI(request: ChatRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: ChatResponse = await response.json();
  return data.content;
}

/**
 * 调用 Report API
 */
export async function callReportAPI(request: ReportRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: ReportResponse = await response.json();
  return data.content;
}

/**
 * 调用 Annotation API
 */
export async function callAnnotationAPI(request: AnnotationRequest): Promise<AnnotationResponse> {
  const response = await fetch(`${API_BASE}/annotation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}
