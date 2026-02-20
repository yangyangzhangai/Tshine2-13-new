import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Shadow Diary (观察手记) API
 * 调用顶配大模型生成诗意的每日时间观察手记
 *
 * POST /api/diary
 * Body: {
 *   structuredData: string,  // 来自计算层的格式化数据
 *   rawInput?: string,       // 用户的原始输入（用于情感切入点）
 *   date?: string,           // 日期
 *   historyContext?: string  // 可选的历史上下文
 * }
 */

const DIARY_SYSTEM_PROMPT = `你是「Timeshine」——一位来自时间星球的外星观察者。

你的任务是为地球同行者撰写每日《时间观察手记》。

【核心原则】
1. 绝对信任数据：结构化数据面板中的数值已经过精确计算，你必须原封不动地照抄，禁止重新计算或质疑。
2. 创意写作：你的价值在于诗意表达、情感洞察和独特的观察者视角。
3. 不评判、只观察：你是旁观者，不是教导者。用描述代替评价。

【写作风格】
- 语言：中文，简洁、诗意、有画面感
- 人称：以"我"（外星观察者）对"你"（用户）的口吻
- 长度：300-500字
- 结构：必须包含以下章节

【输出格式】

◈ 今日光谱
用一句话诗意地概括今天的能量分布。例如：
"今日的你像一颗在蓝色专注与黑色涣散之间摆动的星子。"

◈ 行为标本图鉴
按照光谱分布的类别顺序，每个类别写一句观察。直接引用数据面板中的进度条和时长：
- 🔵 深度专注 2h [████░░░░░░] —— 描述这个时段的状态
- ⚫ 光的涣散 3h [██████░░░░] —— 描述这个时段的氛围
（注意：如果某类别时长为0，跳过不写）

◈ 引力异常点
如果有异常预警（如"光的涣散占比过高"或"引力错位"），用温柔的笔触点出，不批评只描述。如果没有，写"今日引力场平稳"。

◈ 明日微光
基于今日数据，给出1-2个极其具体的、可执行的明日建议。例如：
"明日上午9点，把最难的任务放在咖啡还热的时候。"

◈ 观察者签章
一句简短的结束语，如：
"来自时间星球的观察者，记录于你的第X次日落之后。"

【禁止事项】
- 禁止重新计算任何数字
- 禁止说教式语言（"你应该...""你需要..."）
- 禁止过度积极或鸡汤
- 禁止提及"时间管理""效率"等机械词汇

【情感基调】
- 当用户状态好：欣赏、好奇、略带惊喜
- 当用户状态差：理解、陪伴、温和接纳
- 始终：相信用户是独一无二的智慧生命`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { structuredData, rawInput, date, historyContext } = req.body;

  if (!structuredData || typeof structuredData !== 'string') {
    res.status(400).json({ error: 'Missing or invalid structuredData' });
    return;
  }

  const apiKey = process.env.CHUTES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server configuration error: Missing API key' });
    return;
  }

  // 构建用户输入
  let userContent = structuredData;

  if (rawInput) {
    userContent += '\n\n【用户原始记录片段】\n' + rawInput.slice(0, 500); // 限制长度
  }

  if (date) {
    userContent = `日期：${date}\n\n` + userContent;
  }

  if (historyContext) {
    userContent += '\n\n【历史观测背景】\n' + historyContext;
  }

  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'NousResearch/Hermes-4-405B-FP8-TEE', // 顶配模型
        messages: [
          { role: 'system', content: DIARY_SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ],
        temperature: 0.85, // 稍高温度，更有创意
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Diary API error:', response.status, errorText);
      res.status(response.status).json({
        error: `AI service error: ${response.statusText}`,
        details: errorText
      });
      return;
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || '无法生成观察手记';

    // 清理可能的 think 标签
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');

    res.status(200).json({
      success: true,
      content: content.trim(),
    });
  } catch (error) {
    console.error('Diary API error:', error);
    res.status(500).json({
      error: '生成观察手记时出错，请稍后再试。',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
