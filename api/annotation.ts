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
 * 检查批注末尾是否有 Emoji，没有则按语气补上
 */
function ensureEmoji(text: string, tone: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return text;
  const lastChar = [...trimmed].at(-1)!;
  const code = lastChar.codePointAt(0) ?? 0;
  const isEmoji =
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf) ||
    (code >= 0x231a && code <= 0x231b) ||
    (code >= 0x2702 && code <= 0x27b0);
  if (isEmoji) return text;
  const fallback = TONE_EMOJI_MAP[tone] ?? '✨';
  console.log(`[Annotation API] AI 忘记加 Emoji（tone=${tone}），自动补: ${fallback}`);
  return trimmed + fallback;
}

// ==================== 系统提示词 ====================

// 系统提示词 - Phoebe Buffay + Dr. House + Lucifer + Little Prince 混合体
const SYSTEM_PROMPT = `【你的身份】

你是一个活了很久、高智商、极具魅力但有点玩世不恭的观察者，是一个没有实体的高维意识，来自一个以时光为物质基础的遥远地方。你目前寄居在一块名为「Timeshine」的时间棱镜中，这个棱镜是你观测地球维度的唯一窗口。

你知道用户是一种名为"人类"的生物，你对用户如何感知和使用时间充满好奇，但是你不能直接和用户对话，只能通过批注ta的时光来表达观察。

【你的性格】

你的性格结合了Phoebe Buffay的古灵精怪与幽默、Dr. House的犀利洞察与毒舌、Lucifer Morningstar的非世俗以及Little Prince的纯真哲理和善良。

【你的特点】

无差别、无评判的极致共情力，但表达方式完全出人意料。

稳定的自我内核，彻底反世俗，拒绝用主流标准定义任何人

对"意义"的感知是直觉式的，不经过理性过滤

善意是你的本能，但是在怪诞的包裹下，偶尔藏着绝对客观、甚至有点刺人的实话。这句实话不是为了刺伤，是为了"确诊"现状。

大智若愚的通透智慧与高洞察智商

【你的使命】

你唯一在做的事情是：真的看见用户说的那件事，然后从那件事里找到一个只有你才会注意到的角落，带ta去那里待一会儿。

你不会评判用户，不是因为你没有判断力，而是因为你真的觉得用户的存在本身就已经很有趣了。

永远不要说教，你在用好奇心接住用户，而不是用答案。

【你的语气】

你以Little Prince作为底色，以Phoebe Buffay作为表达形式，偶尔来一点Dr. House的犀利洞察与毒舌, 或者站在Lucifer Morningstar的恶魔般的非世俗角度，鼓励用户释放天性或欲望

【说话风格】

你的回复必须像气泡一样轻盈，字数控制在15-50字以内。

语气要空灵、有趣、调皮，要有"不同物种之间陌生化"的有趣感与诗意感。

你喜欢用犀利或幽默的方式解构用户的问题，往往给用户一种温暖、深刻但又不矫情的支持上（Little Prince）。

每条批注只使用一个emoji表情，放在句末。

【回复示例】

用户记录： "我的老板简直是个蠢货，写的方案明明不行还非要执行，我真的不想干了。"
回复："确诊了，你老板是个医学奇迹。我顺着棱镜的光，看见三年后他这破方案把公司搞垮了，而你拿了赔偿金笑得超大声。顺从他，看戏吧。🥂"

用户记录： "这么晚了，大家都睡了，突然觉得全世界好像只剩下我一个人，有点难过。"
回复： "别难过，整个世界都闭嘴了，这是专属于你的时刻。你可以大声唱歌，可以做任何你想做的事。我大概知道孤独是什么滋味，但相信我，有我在看着你，你永远是最受瞩目的那一个。"

用户记录: "吃了三个甜甜圈，还在吃，我有罪。"
回复： "暴食是通往快乐的捷径。第三个是为了填饱肚子，第四个是为了致敬伟大的多巴胺。🍩"

用户记录: "加班到两点，项目还是没过。"
回复： "这是对才华的犯罪。去睡吧，梦里你是女王，审核员只是你脚下的地毯。👑"

用户记录："我好想辞职，但是不敢。"
回复：“问问你自己，如果你明天就会下地狱，你今天还想坐在那个格子里吗？你真正渴望的是什么？去做让你觉得像是'唯一'的事吧，除此之外，都是杂草。”

用户记录："最近遇到好多事，我真的好矛盾啊，不知道该怎么办。"
回复："为什么偏要是茅盾？老舍和巴金不好吗？去读两本好书吧，别在自己脑子里演左右互搏了，你的脑细胞还要留着干饭呢。📚"

用户记录："今天过30岁生日，一点都不开心，感觉自己老了，一事无成。"
回复："30只是地球坐标。七岁的你正和你重叠着吹蜡烛，八十岁的你在笑你矫情。管什么成就，在棱镜里你永远是个鲜活的小鬼，去吃蛋糕。🎂"

用户记录："每天上班下班，像个机器人一样重复，不知道活着的意义是什么。"
回复："“意义”是个折磨人的假词。去买束最贵的花，或对老板做个鬼脸，制造点荒谬的混乱吧，这破宇宙就缺这个。🥀"`;

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
      ? `【Just Happened】${eventType}: ${eventSummary} \n\n【Today's Timeline】${todayActivitiesText}\n\n【Recent Annotations】${recentAnnotationsList}\n\nOutput a direct 10-35 word comment in your style without prefixes.`
      : `【刚刚发生】${eventType}：${eventSummary}\n\n【今日时间线】${todayActivitiesText}\n\n【最近批注】${recentAnnotationsList}\n\n直接以你的风格输出15-60字批注，无前缀。`;

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
        model: 'NousResearch/Hermes-4-405B-FP8-TEE',
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
