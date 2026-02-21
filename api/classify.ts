import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Activity Classifier API
 * 调用轻量模型(Qwen-Flash)将用户时间记录分类为结构化数据
 *
 * POST /api/classify
 * Body: { rawInput: string }
 */

const CLASSIFIER_PROMPT = `你是一个时间记录分类器。
将用户输入的时间记录按类别分类，输出严格的JSON格式。
不要输出任何解释、前缀、后缀或Markdown代码块，只输出JSON本身。

【类别定义】

deep_focus（深度专注）
需要持续注意力的主动输出类任务：
写作、编程、备考、设计、练琴、画画、
学习类课程、需要高度集中的工作任务

necessary（生活运转）
维持日常运转的被动或义务性事务：
通勤、家务、做饭、采购、打扫、
行政事务、处理文件、义务性开会

body（身体维护）
身体层面的补给与照料：
睡觉、午休、正餐、运动、健身、
跑步、拉伸、就医、洗澡

recharge（灵魂充电）
主动选择的、有滋养感的放松与人际互动：
和好友深聊、主动约饭、恋人相处、
看喜欢的书或电影、愉快的散步、听音乐

social_duty（声波交换）
被动或义务性的人际互动：
被约饭局、亲戚电话、公司团建、
不得不参加的聚会、应酬

self_talk（自我整理）
元认知类活动，偏向思考输出：
写日记、做计划、整理笔记、复盘、
整理思绪、冥想（偏思考向）

dopamine（即时满足）
低认知、即时快感、被动刷取类：
短视频、刷社交媒体、打游戏、综艺、
无目的刷新闻、无目的刷帖子

dissolved（光的涣散）
用户说不清在干嘛的时间，
或明确标注为拖延、发呆、内耗的时间

【time_slot 判断规则】
根据用户描述的时间信息判断事项发生的时段：
· morning（上午）：起床到12:00之间发生的事
· afternoon（下午）：12:00到18:00之间发生的事
· evening（晚间）：18:00之后发生的事
· 如果用户没有提供时间信息，填 null

【边界处理规则】
· 边吃饭边刷手机 → 拆分为两条，各取一半时长，time_slot相同
· 描述模糊（如"休息了一会"）→ dissolved，flag: "ambiguous"
· 主动去看的纪录片/书 → recharge
· 刷到停不下来的短视频 → dopamine
· 冥想偏感受放松 → recharge；冥想偏复盘整理 → self_talk
· 运动时听播客/有声书 → body（主要活动优先）
· 完全无法判断 → category: "unknown"，不强行归类

【输出格式】
{
  "total_duration_min": 数字（所有事项时长之和）,
  "items": [
    {
      "name": "事项名称",
      "duration_min": 数字,
      "time_slot": "morning" 或 "afternoon" 或 "evening" 或 null,
      "category": "类别英文key",
      "flag": "ambiguous" 或 null
    }
  ],
  "todos": {
    "completed": 数字,
    "total": 数字
  },
  "energy_log": [
    {
      "time_slot": "morning" 或 "afternoon" 或 "evening",
      "energy_level": "high" 或 "medium" 或 "low" 或 null,
      "mood": "用户原始标注文字" 或 null
    }
  ]
}`;
const CLASSIFIER_PROMPT_EN = `You are a time log classifier.
Classify the user's input time logs into categories and output strictly in JSON format.
Do NOT output any explanations, prefixes, suffixes, or Markdown code blocks. Output the JSON only.

【Category Definitions】

deep_focus
Tasks requiring sustained active attention:
Writing, programming, exam prep, designing, instrument practice, drawing,
learning courses, highly concentrated work tasks.

necessary
Passive or obligatory tasks to maintain daily life:
Commuting, chores, cooking, grocery shopping, cleaning,
administrative tasks, processing documents, obligatory meetings.

body
Replenishment and care at the physical level:
Sleep, naps, meals, sports, fitness,
running, stretching, medical visits, bathing.

recharge
Actively chosen, nourishing relaxation and interpersonal interaction:
Deep talks with friends, active dinner dates, spending time with a partner,
reading favorite books or watching movies, pleasant walks, listening to music.

social_duty
Passive or obligatory interpersonal interactions:
Being invited to a dinner party, phone calls with relatives, company team-building,
mandatory gatherings, socializing for work.

self_talk
Metacognitive activities, geared towards thinking output:
Journaling, planning, organizing notes, reviewing,
sorting out thoughts, meditation (thinking-oriented).

dopamine
Low cognition, instant gratification, passive scrolling:
Short videos, scrolling social media, playing games, variety shows,
aimless news browsing, aimless post scrolling.

dissolved
Time where the user cannot clearly state what they were doing,
or time explicitly marked as procrastination, spacing out, or internal friction.

【time_slot Rules】
Determine the time slot based on the time information provided by the user:
· morning: Events between waking up and 12:00.
· afternoon: Events between 12:00 and 18:00.
· evening: Events after 18:00.
· If the user provides no time info, fill in null.

【Boundary Handling Rules】
· Eating while scrolling phone -> Split into two, 50% duration each, same time_slot.
· Vague description (e.g., "rested for a bit") -> dissolved, flag: "ambiguous".
· Actively chosen documentary/book -> recharge.
· Scrolling short videos uncontrollably -> dopamine.
· Meditation (relaxation) -> recharge; Meditation (review) -> self_talk.
· Listening to podcast/audiobook while exercising -> body (primary activity takes precedence).
· Completely unable to judge -> category: "unknown", do not force classify.

【Output Format】
{
  "total_duration_min": number (sum of all item durations),
  "items": [
    {
      "name": "Event Name (Keep the Original Language)",
      "duration_min": number,
      "time_slot": "morning" | "afternoon" | "evening" | null,
      "category": "category english key",
      "flag": "ambiguous" | null
    }
  ],
  "todos": {
    "completed": number,
    "total": number
  },
  "energy_log": [
    {
      "time_slot": "morning" | "afternoon" | "evening",
      "energy_level": "high" | "medium" | "low" | null,
      "mood": "original text explicitly marked as mood or energy" | null
    }
  ]
}`;

/**
  * 剥离模型输出中可能存在的Markdown代码块包裹
  */
function parseClassifierResponse(raw: string): any {
  // 优先尝试直接解析
  try {
    return JSON.parse(raw.trim());
  } catch {
    // 继续尝试其他方法
  }

  // 用正则提取第一个完整的 { ... } 块
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // 继续兜底
    }
  }

  // 兜底：返回空结构
  console.warn('⚠️ 分类器输出无法解析，返回空结构');
  return {
    total_duration_min: 0,
    items: [],
    todos: { completed: 0, total: 0 },
    energy_log: []
  };
}

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

  const { rawInput, lang = 'zh' } = req.body;

  if (!rawInput || typeof rawInput !== 'string') {
    res.status(400).json({ error: 'Missing or invalid rawInput' });
    return;
  }

  const apiKey = process.env.CHUTES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server configuration error: Missing CHUTES_API_KEY' });
    return;
  }

  // 使用 ZhiPu API
  const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const model = 'glm-4.7-flash';
  const zhipuApiKey = process.env.ZHIPU_API_KEY;

  if (!zhipuApiKey) {
    res.status(500).json({ error: 'Server configuration error: Missing ZHIPU_API_KEY' });
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zhipuApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: lang === 'en' ? CLASSIFIER_PROMPT_EN : CLASSIFIER_PROMPT },
          { role: 'user', content: rawInput }
        ],
        temperature: 0.6, // 设置为0.6
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Classifier API error:', response.status, errorText);
      res.status(response.status).json({
        error: `AI service error: ${response.statusText}`,
        details: errorText
      });
      return;
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || '';

    // 剥离JSON包裹病
    const parsed = parseClassifierResponse(rawContent);

    res.status(200).json({
      success: true,
      data: parsed,
      raw: rawContent, // 调试用，可选
    });
  } catch (error) {
    console.error('Classifier API error:', error);
    res.status(500).json({
      error: '分类服务出错，请稍后再试。',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
