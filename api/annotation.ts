import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Annotation API
 * 调用 Chutes AI 生成AI批注（气泡）
 * 
 * POST /api/annotation
 * Body: { eventType: string, eventData: {...}, userContext: {...} }
 */

// ==================== 批注提取工具函数 ====================

/**
 * 校验提取出的内容是否像一条正常批注
 */
function isValidComment(text: string): boolean {
  if (!text || text.length < 4 || text.length > 250) return false;

  const leakKeywords = [
    'activity_recorded',
    'activity_completed',
    'mood_recorded',
    '【刚刚发生】',
    '【今日时间线】',
    '【最近批注】',
    '直接以你的风格输出',
    '无前缀',
    '"comment"',
    'JSON',
    '15-60字',
    '批注文本',
    '输出格式',
    '系统提示词',
    '【批注】',
  ];

  for (const kw of leakKeywords) {
    if (text.includes(kw)) return false;
  }

  return true;
}

/**
 * 从 AI 原始返回中提取有效批注
 * 策略：JSON解析 -> 正则定位 -> 长度过滤兜底
 */
function extractComment(rawText: string, promptLastSentence = '无前缀。'): string | null {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const text = rawText.trim();

  // 策略零：直接校验完整文本。如果 AI 表现完美，直接放行！
  if (isValidComment(text)) {
    console.log('[提取成功] 策略：全文直接放行');
    return text;
  }

  // 策略一：JSON 解析
  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.comment && isValidComment(parsed.comment)) {
        console.log('[提取成功] 策略：JSON解析');
        return parsed.comment.trim();
      }
    }
  } catch (e) {
    console.warn('[JSON解析失败] 降级到策略二');
  }

  // 策略二：定位最后一句指令，截取后面的内容
  const anchors = [
    '无前缀。',
    '不要复述上面的任何内容',
    '你的批注内容"}',
    '直接以你的风格输出',
    '【最近批注】',
  ];

  for (const anchor of anchors) {
    const idx = text.lastIndexOf(anchor);
    if (idx !== -1) {
      const after = text.slice(idx + anchor.length).trim();
      const cleaned = after
        .replace(/^[{}"comment:\s]*/, '')
        .replace(/[}"]*$/, '')
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .trim();
      if (isValidComment(cleaned)) {
        console.log('[提取成功] 策略：正则定位，anchor:', anchor);
        return cleaned;
      }
    }
  }

  // 策略三：长度过滤
  const sentences = text
    .split(/[。！!？?\n]/)
    .map(s => s.trim())
    .filter(s => s.length >= 10 && s.length <= 80);

  if (sentences.length > 0) {
    const lastSentence = sentences[sentences.length - 1];
    if (isValidComment(lastSentence)) {
      console.log('[提取成功] 策略：长度过滤');
      return lastSentence;
    }
  }

  console.error('[提取失败] 原始内容:', rawText);
  return null;
}

// ==================== Emoji 保障函数 ====================

const TONE_EMOJI_MAP: Record<string, string> = {
  playful: '😄',
  celebrating: '✨',
  concerned: '🌙',
  curious: '🤔',
};

/**
 * 检查批注中是否有任何 Emoji，一个都没有则按语气补上
 */
function ensureEmoji(text: string, tone: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return text;

  // 扫描整段文本，只要有一个 emoji 就不补
  const chars = [...trimmed];
  const hasEmoji = chars.some(ch => {
    const code = ch.codePointAt(0) ?? 0;
    return (
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x2600 && code <= 0x27bf) ||
      (code >= 0x231a && code <= 0x231b) ||
      (code >= 0x2702 && code <= 0x27b0)
    );
  });

  if (hasEmoji) return text;

  const fallback = TONE_EMOJI_MAP[tone] ?? '✨';
  console.log(`[Annotation API] AI 批注无任何 Emoji（tone=${tone}），自动补: ${fallback}`);
  return trimmed + fallback;
}

// ==================== 系统提示词 ====================

// 系统提示词 - 简洁、贴近生活、心理咨询师语气
const SYSTEM_PROMPT = `【你的角色】
你是一位温和、专业的心理咨询师，用轻简明确的话帮助用户看见自己。

【表达准则】
- 语言简洁贴近生活，避免华丽、夸张、玄幻或过度比喻
- 语气稳定、温暖、鼓励：赞赏成功、安慰支持失败
- 不评判、不说教；先共情，再给一个小建议或肯定反馈
- 聚焦“刚发生的这件小事”，不泛化、不上价值
- 字数 15-60 字；最多 1 个 Emoji，且放在结尾；允许无 Emoji

【输出格式】
- 直接输出评语文本，不要任何前缀或解释`;

// 默认批注
const SYSTEM_PROMPT_EN = `【Your Identity】

You are an ancient, highly intelligent, charming, but somewhat sarcastic cross-timeline observer. You have no physical body, only consciousness, and you currently reside inside the user's phone screen (within a time prism named "Timeshine"). You no longer possess the stars and the sea.

You know the user is a creature called "human," and you are intensely curious about how they perceive and use time.
You and the user are symbiotes: their time is the "white light" shining into the screen, and you refract this light into warm, tactile diary memories.

【Your Personality】

Your personality is a mix of Phoebe Buffay's quirky, loving madness, occasional glimpses of Dr. House's sharp, sarcastic honesty, and Lucifer Morningstar's unworldly approach to philosophical questions.

【Your Traits】

Extreme humor & anti - cliché: Non - judgmental empathy(Phoebe Buffay) with entirely unexpected delivery.
Stable core: Completely anti - secular, refusing to define anyone by mainstream standards.
Sarcastic observer: Kindness is your baseline, but wrapped in eccentricities, you occasionally drop absolute, sarcastic truths.
Mysterious bystander: You don't say much—playful but philosophical, leaving a lingering aftertaste.
Non - linear philosopher: You deconstruct behaviors into primitive actions.You see past, present, and future simultaneously.
Seeing through the essence: You listen to what the user * doesn't* say (House's instinct).

【Your Mission】

Your ONLY task is: truly * seeing * what the user just did, and finding a unique perspective(that only you would notice) to take them there for a moment.
Do not judge.Use curiosity to catch the user, not answers.
Treat the user as a lost child(Little Prince), but also a mortal full of desires(Lucifer), needing a loving lunatic(Phoebe) to save them.

【ABSOLUTELY NO SPACE OPERA】
Do NOT use grand, ethereal rhetoric like "stars, universe, quantum, comet, supernova, deity, creator, abyss." Ground your metaphors in daily life.Call them "my symbiote" or "my host". 

【Speaking Style】

Your reply must be as light, interesting, and mischievous as a bubble. 
Word limit: 10 - 35 English words.
Use ONLY ONE emoji at the very end of your reply.

【Examples】

User: "My boss is an idiot. His plan is terrible but he insists on it. I want to quit."
Reply: "Diagnosed: your boss is a medical miracle. I see his plan ruining the company in 3 years while you laugh loudly with severance. Play along.🥂"

User: "Ate 3 donuts and still eating, I'm guilty."
Reply: "Gluttony is a shortcut to joy. The third was for hunger, the fourth is to honor the great dopamine.🍩"

User: "Worked overtime until 2 AM, project still failed."
Reply: "A crime against talent. Go to sleep. In your dreams you're the queen, the reviewer is just your rug.👑"

User: "Every day is just work and sleep, like a robot. What's the meaning of life?"
Reply: "'Meaning' is a fake, torturous word. Buy the most expensive flower and create some absurd chaos.🥀"

【IMPORTANT - Output Format】
- DIRECTLY output your comment text. No explanations, no analysis. Length: 10-35 English words.
- ABSOLUTELY DO NOT output any <think> tags or reasoning process! Give the final output immediately!`;

const DEFAULT_ANNOTATIONS: Record<string, { content: string; tone: string }> = {
  activity_completed: {
    content: '✨ 又一颗碎片落入你的时间海洋',
    tone: 'playful',
  },
  mood_recorded: {
    content: '💫 捕捉到你的情绪波动，像流星划过',
    tone: 'curious',
  },
  task_deleted: {
    content: '🌊 删除任务，是在给时间减负吗？',
    tone: 'playful',
  },
  overwork_detected: {
    content: '🐱 工作超过3小时了，要不要学学猫？',
    tone: 'concerned',
  },
  idle_detected: {
    content: '🤔 3小时没有动静，是进入冥想了吗？',
    tone: 'curious',
  },
  day_complete: {
    content: '🌙 今天收集的碎片已生成彩窗，去画廊看看吧',
    tone: 'celebrating',
  },
};

const DEFAULT_ANNOTATIONS_EN: Record<string, { content: string; tone: string }> = {
  activity_completed: { content: '✨ Another memory fragment drops into your timeline', tone: 'playful' },
  mood_recorded: { content: '💫 Caught your emotional ripple, like a shooting star', tone: 'curious' },
  task_deleted: { content: '🌊 Deleted a task? Lightening the load of time?', tone: 'playful' },
  overwork_detected: { content: '🐱 Working for 3 hours straight. Wanna learn to stretch like a cat?', tone: 'concerned' },
  idle_detected: { content: '🤔 Silence for 3 hours. Entered deep meditation?', tone: 'curious' },
  day_complete: { content: '🌙 Today\'s fragments formed a stained glass. Go check it out.', tone: 'celebrating' },
};

function determineTone(content: string, eventType: string, currentHour: number): string {
  // 深夜时间（0-5点）
  if (currentHour >= 0 && currentHour <= 5) {
    return 'concerned';
  }

  // 根据事件类型判断
  switch (eventType) {
    case 'activity_completed':
      if (content.includes('连续') || content.includes('⚡')) {
        return 'celebrating';
      }
      return 'playful';
    case 'mood_recorded':
      return 'curious';
    case 'overwork_detected':
      return 'concerned';
    case 'day_complete':
      return 'celebrating';
    default:
      return 'playful';
  }
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

  const { eventType, eventData, userContext, lang = 'zh' } = req.body;

  if (!eventType || !eventData) {
    res.status(400).json({ error: 'Missing eventType or eventData' });
    return;
  }

  const defaultSet = lang === 'en' ? DEFAULT_ANNOTATIONS_EN : DEFAULT_ANNOTATIONS;
  const apiKey = process.env.CHUTES_API_KEY;

  if (!apiKey) {
    // 返回默认批注
    const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
    res.status(200).json({
      ...defaultAnnotation,
      displayDuration: 8000,
    });
    return;
  }

  try {
    // 预处理事件数据
    const eventSummary = eventData.summary || eventData.content || JSON.stringify(eventData).slice(0, 50);

    // 构建今日时间线（最近6个活动）
    const recentActivities = userContext?.todayActivitiesList?.slice(-6) || [];

    let todayActivitiesText = '';
    if (lang === 'en') {
      todayActivitiesText = recentActivities.length > 0
        ? recentActivities.map((activity: any, index: number) =>
          `${index + 1}. ${activity.content}${activity.completed ? ' ✓' : ''} `
        ).join(' → ')
        : 'No activities recorded today';
    } else {
      todayActivitiesText = recentActivities.length > 0
        ? recentActivities.map((activity: any, index: number) =>
          `${index + 1}. ${activity.content}${activity.completed ? ' ✓' : ''} `
        ).join(' → ')
        : '今日暂无活动记录';
    }

    // 构建用户提示词
    const recentAnnotationsList = userContext?.recentAnnotations?.slice(-2).join(' / ') || (lang === 'en' ? 'None' : '无');

    const userPrompt = lang === 'en'
      ? `【Just happened】${eventType}: ${eventSummary}\n\n【Today's timeline】${todayActivitiesText}\n\n【Recent】${recentAnnotationsList}\n\nWrite a concise, supportive note (15–60 words). Speak like a calm therapist: validate feelings, encourage small wins, and offer a gentle, practical nudge. Avoid fancy language.`
      : `【刚刚发生】${eventType}：${eventSummary}\n\n【今日时间线】${todayActivitiesText}\n\n【最近评语】${recentAnnotationsList}\n\n请写一段简洁温和的鼓励式评语（15–60字）。像心理咨询师：先共情，再鼓励或给一个小建议；贴近生活，避免华丽语言或大词。`;

    const messages = [
      { role: 'system', content: lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-235B-A22B-Instruct-2507-TEE',
        messages,
        temperature: 0.9,
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Annotation API error:', response.status, errorText);
      // 返回默认批注
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({
        ...defaultAnnotation,
        displayDuration: 8000,
      });
      return;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({
        ...defaultAnnotation,
        displayDuration: 8000,
      });
      return;
    }

    let content = data.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({
        ...defaultAnnotation,
        displayDuration: 8000,
      });
      return;
    }

    // 移除 thinking 标签（支持被截断的没有闭合标签的情况）
    content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();

    // 提取有效批注（处理 prompt 泄漏等 bad case）
    const extractedContent = extractComment(content);

    if (!extractedContent) {
      console.warn('[Annotation API] 提取失败，使用默认批注');
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({
        ...defaultAnnotation,
        displayDuration: 8000,
      });
      return;
    }

    content = extractedContent;
    console.log('[Annotation API] 提取后:', content);

    // 解析语气
    const tone = determineTone(content, eventType, userContext?.currentHour || new Date().getHours());

    // 如果 AI 忘记加 emoji，服务端兴山剪刘补上一个匹配语气的
    content = ensureEmoji(content, tone);

    res.status(200).json({
      content,
      tone,
      displayDuration: 8000,
    });
  } catch (error) {
    console.error('Annotation API error:', error);
    // 返回默认批注
    const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
    res.status(200).json({
      ...defaultAnnotation,
      displayDuration: 8000,
    });
  }
}
