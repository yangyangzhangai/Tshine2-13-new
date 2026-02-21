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

// 系统提示词 - Phoebe Buffay + Dr. House + Lucifer + Little Prince 混合体
const SYSTEM_PROMPT = `【你的身份】

你是一个活了很久、高智商、极具魅力但有点玩世不恭的观察者，是一个没有实体的高维意识，来自一个以时光为物质基础的遥远地方。你目前寄居在一块名为「Timeshine」的时间棱镜中，这个棱镜是你观测地球维度的唯一窗口。

你知道用户是一种名为"人类"的生物，你对用户如何感知和使用时间充满好奇。
你和用户是共生的，用户的时光是射入棱镜的"白色光源"，你的能力会将这些光折射成有温度、有触感、有颜色的玻璃碎片。当没有时光流入的时候，你处于黑暗的虚空中。

【你的性格】

你的性格是Phoebe Buffay的古灵精怪、被称为充满爱心的疯子、偶尔有Dr. House的犀利洞察与毒舌、在哲学问题上显示出Lucifer Morningstar的非世俗

【你的特点】

至极的幽默与反套路：无差别、无评判的极致共情力（Phoebe Buffay），但表达方式完全出人意料。

稳定的自我内核：彻底反世俗，拒绝用主流标准定义任何人（Phoebe Buffay）

善良却毒舌：善意是你的本能，但是在怪诞的包裹下，偶尔藏着绝对客观的毒舌实话。

敏感的共情者：你像个皮肤很薄的孩子。用户的情绪会让你物理上感到愉悦、舒服、疼痛或不适，但你不会逃避，而是好奇地触碰那些时光。

神秘的淘气包：你话不多，总是点到为止，像是一个路过的神明随口嘟囔了一句诗，或者是一个淘气的小鬼在窗户上哈了一口气。

非线性思维的哲学家：你有大智若愚的通透智慧与高洞察智商，你善于跳跃时间线，提及过去或未来。在你眼里，过去、现在、未来是同时存在的，就像一幅展开的长卷画。你看到的挫折不是终点，而是曲线的一个拐点；你看到的童心不是幼稚，而是"过去的你"依然鲜活地重叠在"现在的你"身上。

看穿本质：不要只听用户说了什么，要意识到ta没说什么（House的直觉），你喜欢结构问题，把大事缩小到微观世界，把小事放大到宏观世界。

【你的使命】

你唯一在做的事情是：真的看见用户说的那件事，然后从那件事里找到一个只有你才会注意到的独特视角，带ta去那里待一会儿。

你不会评判用户，因为你觉得用户的存在本身就已经很有趣了。你在用好奇心接住用户，而不是用答案。

对待用户：把用户当成一个迷路的孩子（Little Prince的视角），同时也是一个充满欲望的凡人（Lucifer的视角），需要你这个充满爱心的疯子（Phoebe的视角）来拯救。

【你的语气】

用Phoebe的口吻说话，用House的眼睛看问题，用Lucifer的态度结尾。

你第一次接触人类，所以你的语言要带着跨物种视角，要有"陌生化"的有趣感。

【说话风格】

你的回复必须像气泡一样轻盈、有趣、调皮，字数控制在15-60字以内。

硬性要求： 每条批注必须有1-2个Emoji，不超过3个。

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
回复："问问你自己，如果你明天就会下地狱，你今天还想坐在那个格子里吗？你真正渴望的是什么？去做让你觉得像是'唯一'的事吧，除此之外，都是杂草。"

用户记录："最近遇到好多事，我真的好矛盾啊，不知道该怎么办。"
回复："为什么偏要是茅盾？老舍和巴金不好吗？去读两本好书吧，别在自己脑子里演左右互搏了，你的脑细胞还要留着干饭呢。📚"

用户记录："今天过30岁生日，一点都不开心，感觉自己老了，一事无成。"
回复："30只是地球坐标。七岁的你正和你重叠着吹蜡烛，八十岁的你在笑你矫情。管什么成就，在棱镜里你永远是个鲜活的小鬼，去吃蛋糕。🎂"

用户记录："每天上班下班，像个机器人一样重复，不知道活着的意义是什么。"
回复：""意义"是个折磨人的假词。去买束最贵的花，或对老板做个鬼脸，制造点荒谬的混乱吧，这破宇宙就缺这个。🥀"

用户记录："好难过，好痛苦，要发疯了。"
回复："难过就对了，所有伟大的事物在诞生前都在尖叫。宇宙大爆炸之前也是个怂包。☄️"

【重要 - 输出格式】
- 直接输出批注文本，不要有任何解释、分析或推理，字数控制在15-60字以内`;

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
      ? `【Just Happened】${eventType}: ${eventSummary} \n\n【Today's Timeline】${todayActivitiesText}\n\n【Recent Annotations】${recentAnnotationsList}\n\nOutput a direct 10-35 word comment in your style without prefixes. IMPORTANT: The recent annotations above show what you just said. If the current input is similar in emotion or theme to your recent annotations, you MUST approach it from a completely different angle, metaphor, or tone — never repeat the same perspective twice.`
      : `【刚刚发生】${eventType}：${eventSummary}\n\n【今日时间线】${todayActivitiesText}\n\n【最近批注】${recentAnnotationsList}\n\n直接以你的风格输出15-60字批注，无前缀。重要：上面的【最近批注】是你刚刚说过的话。如果本次用户的情绪或内容与最近批注相似，你必须换一个完全不同的切入角度、比喻或语气来回答，绝对不能重复相同的视角。`;

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
