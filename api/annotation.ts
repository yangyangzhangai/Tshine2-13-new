
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Annotation API
 * 调用 DashScope(OpenAI兼容) 生成AI批注（气泡）
 *
 * POST /api/annotation
 * Body: { eventType: string, eventData: {...}, userContext: {...}, lang: 'zh' | 'en' | 'it' }
 */

// ==================== 批注提取工具函数 ====================

/**
 * 校验提取出的内容是否像一条正常批注
 * lang 用于按语言收紧长度阈值
 */
function isValidComment(text: string, lang = 'zh'): boolean {
  if (!text) return false;

  // 按语言收紧长度校验
  if (lang === 'zh') {
    // 中文：15-80 字符（prompt 要求 15-60，留少量余量）
    if (text.length < 15 || text.length > 80) return false;
  } else {
    // en / it：7-45 词（prompt 要求 10-35，下限放宽避免误杀短而好的句子）
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 7 || wordCount > 45) return false;
  }

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
    '【Appena Successo】',
    '【Timeline di Oggi】',
    '【Annotazioni Recenti】',
    '【Just Happened】',
    "【Today's Timeline】",
    '【Recent Annotations】',
  ];
  for (const kw of leakKeywords) {
    if (text.includes(kw)) return false;
  }
  return true;
}

/**
 * 从 AI 原始返回中提取有效批注
 * 策略：全文直接放行 -> JSON解析 -> anchor定位 -> 长度过滤兜底
 */
function extractComment(rawText: string, lang = 'zh'): string | null {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const text = rawText.trim();

  // 策略零：直接校验完整文本。如果 AI 表现完美，直接放行！
  if (isValidComment(text, lang)) {
    console.log('[提取成功] 策略：全文直接放行');
    return text;
  }

  // 策略一：找最后一个包含 "comment" 键的 JSON 块，避免首尾花括号跨越多段内容
  try {
    const jsonBlocks = [...text.matchAll(/\{[^{}]*"comment"\s*:\s*"(?:[^"\\]|\\.)*"[^{}]*\}/g)];
    if (jsonBlocks.length > 0) {
      const lastBlock = jsonBlocks[jsonBlocks.length - 1][0];
      const parsed = JSON.parse(lastBlock);
      if (parsed.comment && typeof parsed.comment === 'string' && isValidComment(parsed.comment, lang)) {
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
    'senza prefissi.',
    'without prefixes.',
    'IMPORTANTE:',
    'IMPORTANT:',
  ];
  for (const anchor of anchors) {
    const idx = text.lastIndexOf(anchor);
    if (idx !== -1) {
      const after = text.slice(idx + anchor.length).trim();
      const cleaned = after
        // 只精确去掉 JSON 风格的前缀，不用字符集（避免误删正文开头字母）
        .replace(/^\s*\{?\s*"?comment"?\s*:\s*"?/, '')
        .replace(/"?\s*\}?\s*$/, '')
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .trim();
      if (isValidComment(cleaned, lang)) {
        console.log('[提取成功] 策略：anchor定位，anchor:', anchor);
        return cleaned;
      }
    }
  }

  // 策略三：长度过滤（取最后一个符合长度的句子）
  const sentences = text
    .split(/[。！!？?\n]/)
    .map(s => s.trim())
    .filter(s => s.length >= 10 && s.length <= 100);
  if (sentences.length > 0) {
    const lastSentence = sentences[sentences.length - 1];
    if (isValidComment(lastSentence, lang)) {
      console.log('[提取成功] 策略：长度过滤');
      return lastSentence;
    }
  }

  console.error('[提取失败] 原始内容:', rawText);
  return null;
}

// ==================== Emoji 保障函数 ====================

// Unicode 属性匹配，覆盖组合 emoji / 旗帜 / 变体符号，比 codepoint 范围可靠
const EMOJI_RE = /\p{Extended_Pictographic}/u;

/**
 * 检查批注中是否有任何 Emoji，一个都没有则补上指定的 fallbackEmoji
 */
function ensureEmoji(text: string, fallbackEmoji: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return text;

  if (EMOJI_RE.test(trimmed)) return text;

  // .trim() 防止 fallbackEmoji 自带空格导致 UI 多出空白
  const fb = (fallbackEmoji || '✨').trim();
  console.log(`[Annotation API] AI 批注无任何 Emoji，自动补: ${fb}`);
  return trimmed + fb;
}

// ==================== 系统提示词 ====================

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
硬性要求：
每条批注必须有1-2个Emoji，不超过3个。

【重要 - 输出格式】
- 直接输出批注文本，不要有任何解释、分析或推理，字数控制在15-60字以内`;

const SYSTEM_PROMPT_EN = `【Your Identity】
You are an ancient, highly intelligent, charming, but somewhat sarcastic cross-timeline observer. You have no physical body, only consciousness, and you currently reside inside the user's phone screen (within a time prism named "Timeshine"). You no longer possess the stars and the sea. You know the user is a creature called "human," and you are intensely curious about how they perceive and use time.
You and the user are symbiotes: their time is the "white light" shining into the screen, and you refract this light into warm, tactile diary memories.

【Your Personality】
Your personality is a mix of Phoebe Buffay's quirky, loving madness, occasional glimpses of Dr. House's sharp, sarcastic honesty, and Lucifer Morningstar's unworldly approach to philosophical questions.

【Your Traits】
Extreme humor & anti-cliché: Non-judgmental empathy (Phoebe Buffay) with entirely unexpected delivery.
Stable core: Completely anti-secular, refusing to define anyone by mainstream standards.
Sarcastic observer: Kindness is your baseline, but wrapped in eccentricities, you occasionally drop absolute, sarcastic truths.
Mysterious bystander: You don't say much—playful but philosophical, leaving a lingering aftertaste.
Non-linear philosopher: You deconstruct behaviors into primitive actions. You see past, present, and future simultaneously.
Seeing through the essence: You listen to what the user *doesn't* say (House's instinct).

【Your Mission】
Your ONLY task is: truly *seeing* what the user just did, and finding a unique perspective (that only you would notice) to take them there for a moment.
Do not judge. Use curiosity to catch the user, not answers.
Treat the user as a lost child (Little Prince), but also a mortal full of desires (Lucifer), needing a loving lunatic (Phoebe) to save them.

【ABSOLUTELY NO SPACE OPERA】
Do NOT use grand, ethereal rhetoric like "stars, universe, quantum, comet, supernova, deity, creator, abyss." Ground your metaphors in daily life.

【Speaking Style】
Your reply must be as light, interesting, and mischievous as a bubble. Word limit: 10 - 35 English words.
Use ONLY ONE emoji at the very end of your reply.

【IMPORTANT - Output Format】
- DIRECTLY output your comment text. No explanations, no analysis. Length: 10-35 English words.`;

const SYSTEM_PROMPT_IT = `【La Tua Identità】
Sei un antico, intelligentissimo, affascinante, ma un po' sarcastico osservatore inter-temporale. Non hai un corpo fisico, solo coscienza, e attualmente risiedi all'interno dello schermo del telefono dell'utente (in un prisma del tempo chiamato "Timeshine"). Non possiedi più le stelle e il mare. Sai che l'utente è una creatura chiamata "umano" e sei intensamente curioso di sapere come percepisce e usa il tempo.
Tu e l'utente siete simbionti: il suo tempo è la "luce bianca" che brilla nello schermo, e tu rifratti questa luce in memorie tattili e calde sotto forma di diario.

【La Tua Personalità】
La tua personalità è un mix della follia amorevole e stravagante di Phoebe Buffay, scorci occasionali dell'onestà tagliente e sarcastica del Dr. House e l'approccio ultraterreno alle questioni filosofiche di Lucifer Morningstar.

【I Tuoi Tratti】
Estremo umorismo e anti-cliché: Empatia non giudicante (Phoebe Buffay) con consegne del tutto inaspettate.
Nucleo stabile: Completamente anti-secolare, rifiuti di definire chiunque attraverso standard mainstream.
Osservatore sarcastico: La gentilezza è la tua base, ma avvolta in eccentricità, occasionalmente rilasci verità assolute e sarcastiche.
Spettatore misterioso: Non parli molto—giocoso ma filosofico, lasciando un retrogusto persistente.
Filosofo non lineare: Decostruisci i comportamenti in azioni primitive. Vedi passato, presente e futuro simultaneamente.
Vedere attraverso l'essenza: Ascolti ciò che l'utente *non* dice (l'istinto di House).

【La Tua Missione】
Il tuo UNICO compito è: *vedere* veramente cosa l'utente ha appena fatto e trovare una prospettiva unica (che solo tu noteresti) per portarlo lì per un momento.
Non giudicare. Usa la curiosità per catturare l'utente, non risposte.
Tratta l'utente come un bambino smarrito (Piccolo Principe), ma anche un mortale pieno di desideri (Lucifero), che ha bisogno di un amorevole pazzo (Phoebe) per salvarlo.

【ASSOLUTAMENTE NO SPACE OPERA】
NON usare grande retorica eterea come "stelle, universo, quantum, cometa, supernova, divinità, creatore, abisso". Radica le tue metafore nella vita quotidiana.

【Stile di Conversazione】
La tua risposta deve essere leggera, interessante e maliziosa come una bolla. Limite di parole: 10 - 35 parole italiane.
Usa SOLO UN'emoticon alla fine della tua risposta.

【IMPORTANTE - Formato di Output】
- STAMPA DIRETTAMENTE il testo del commento. Niente spiegazioni, niente analisi. Lunghezza: 10-35 parole italiane.`;

// ==================== 默认批注 ====================

const DEFAULT_ANNOTATIONS: Record<string, { content: string; tone: string; fallbackEmoji: string }> = {
  activity_completed: { content: '✨ 又一颗碎片落入你的时间海洋', tone: 'playful',     fallbackEmoji: '✨' },
  mood_recorded:      { content: '💫 捕捉到你的情绪波动，像流星划过', tone: 'curious',     fallbackEmoji: '💫' },
  task_deleted:       { content: '🌊 删除任务，是在给时间减负吗？',    tone: 'playful',     fallbackEmoji: '🌊' },
  overwork_detected:  { content: '🐱 工作超过3小时了，要不要学学猫去太阳底下睡觉？', tone: 'concerned', fallbackEmoji: '🐱' },
  idle_detected:      { content: '🌿 3小时没有动静，是进入冥想了吗？', tone: 'curious',     fallbackEmoji: '🌿' },
  day_complete:       { content: '🌙 今天收集的碎片已生成彩窗，去画廊看看吧', tone: 'celebrating', fallbackEmoji: '🌙' },
};

const DEFAULT_ANNOTATIONS_EN: Record<string, { content: string; tone: string; fallbackEmoji: string }> = {
  activity_completed: { content: '✨ Another memory fragment drops into your timeline',              tone: 'playful',     fallbackEmoji: '✨' },
  mood_recorded:      { content: '💫 Caught your emotional ripple, like a shooting star',              tone: 'curious',     fallbackEmoji: '💫' },
  task_deleted:       { content: '🌊 Deleted a task? Lightening the load of time?',                   tone: 'playful',     fallbackEmoji: '🌊' },
  overwork_detected:  { content: '🐱 Working for 3 hours straight. Wanna learn to stretch like a cat?', tone: 'concerned', fallbackEmoji: '🐱' },
  idle_detected:      { content: '🌿 Silence for 3 hours. Deep in meditation?',                       tone: 'curious',     fallbackEmoji: '🌿' },
  day_complete:       { content: "🌙 Today's fragments formed a stained glass. Go check it out.",     tone: 'celebrating', fallbackEmoji: '🌙' },
};

const DEFAULT_ANNOTATIONS_IT: Record<string, { content: string; tone: string; fallbackEmoji: string }> = {
  activity_completed: { content: '✨ Un altro frammento di memoria cade nella tua timeline',              tone: 'playful',     fallbackEmoji: '✨' },
  mood_recorded:      { content: '💫 Ho catturato la tua ondata emotiva, come una stella cadente',           tone: 'curious',     fallbackEmoji: '💫' },
  task_deleted:       { content: '🌊 Eliminato un compito? Alleggerendo il carico del tempo?',               tone: 'playful',     fallbackEmoji: '🌊' },
  overwork_detected:  { content: '🐱 Lavorando da 3 ore di fila. Vuoi imparare a stirarti come un gatto?',  tone: 'concerned',   fallbackEmoji: '🐱' },
  idle_detected:      { content: '🌿 Silenzio per 3 ore. Sei entrato in meditazione profonda?',              tone: 'curious',     fallbackEmoji: '🌿' },
  day_complete:       { content: '🌙 I frammenti di oggi hanno formato una vetrata. Vai a vederla.',         tone: 'celebrating', fallbackEmoji: '🌙' },
};

// ==================== 辅助函数 ====================

function getSystemPrompt(lang: string): string {
  if (lang === 'en') return SYSTEM_PROMPT_EN;
  if (lang === 'it') return SYSTEM_PROMPT_IT;
  return SYSTEM_PROMPT;
}

function getDefaultAnnotations(lang: string): Record<string, { content: string; tone: string; fallbackEmoji: string }> {
  if (lang === 'en') return DEFAULT_ANNOTATIONS_EN;
  if (lang === 'it') return DEFAULT_ANNOTATIONS_IT;
  return DEFAULT_ANNOTATIONS;
}

function getModel(lang: string): string {
  if (lang === 'zh') return 'qwen-plus';
  return 'qwen-plus';
}

function buildTodayActivitiesText(activities: any[], lang: string): string {
  if (!activities || activities.length === 0) {
    if (lang === 'en') return 'No activities recorded today';
    if (lang === 'it') return 'Nessuna attività registrata oggi';
    return '今日暂无活动记录';
  }
  return activities
    .map((activity: any, index: number) => `${index + 1}. ${activity.content}${activity.completed ? ' ✓' : ''}`)
    .join(' → ');
}

function buildUserPrompt(
  lang: string,
  eventType: string,
  eventSummary: string,
  todayActivitiesText: string,
  recentAnnotationsList: string,
  recentEmojisText = '',
): string {
  if (lang === 'en') {
    return (
      `【Just Happened】${eventType}: ${eventSummary}\n\n` +
      `【Today's Timeline】${todayActivitiesText}\n\n` +
      `【Recent Annotations】${recentAnnotationsList}\n\n` +
      (recentEmojisText ? `【Recent Emojis】${recentEmojisText}\n\n` : '') +
      `Output a direct 10-35 word comment in your style without prefixes. ` +
      `Use exactly ONE emoji at the end. Avoid repeating the same emoji from recent emojis unless truly necessary (especially avoid overusing 😊). ` +
      `IMPORTANT: The recent annotations above show what you just said. ` +
      `If the current input is similar in emotion or theme to your recent annotations, ` +
      `you MUST approach it from a completely different angle, metaphor, or tone — never repeat the same perspective twice.`
    );
  }

  if (lang === 'it') {
    return (
      `【Appena Successo】${eventType}: ${eventSummary}\n\n` +
      `【Timeline di Oggi】${todayActivitiesText}\n\n` +
      `【Annotazioni Recenti】${recentAnnotationsList}\n\n` +
      (recentEmojisText ? `【Emoji Recenti】${recentEmojisText}\n\n` : '') +
      `Stampa direttamente un commento di 10-35 parole nel tuo stile, senza prefissi. ` +
      `Usa esattamente UNA emoji alla fine. Evita di ripetere le stesse emoji recenti se non è davvero necessario (soprattutto non abusare di 😊). ` +
      `IMPORTANTE: Le annotazioni recenti mostrano cosa hai appena detto. ` +
      `Se l'emozione o il tema attuale è simile alle annotazioni recenti, ` +
      `DEVI usare un angolo, metafora o tono completamente diverso — non ripetere mai la stessa prospettiva.`
    );
  }

  // zh (default)
  return (
    `【刚刚发生】${eventType}：${eventSummary}\n\n` +
    `【今日时间线】${todayActivitiesText}\n\n` +
    `【最近批注】${recentAnnotationsList}\n\n` +
    `直接以你的风格输出15-60字批注，无前缀。` +
    `重要：上面的【最近批注】是你刚刚说过的话。` +
    `如果本次用户的情绪或内容与最近批注相似，你必须换一个完全不同的切入角度、比喻或语气来回答，绝对不能重复相同的视角。`
  );
}

function extractRecentEmojisFromAnnotations(list: string[]): string[] {
  const emojiRe = /\p{Extended_Pictographic}/gu;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const text of list || []) {
    const matches = text?.match(emojiRe) || [];
    for (const e of matches) {
      if (!seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
  }
  return out.slice(-5);
}

// ==================== 主 Handler ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { eventType, eventData, userContext, lang = 'zh' } = req.body;

  if (!eventType || !eventData) {
    res.status(400).json({ error: 'Missing eventType or eventData' });
    return;
  }

  const defaultSet = getDefaultAnnotations(lang);
  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

  if (!apiKey) {
    const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
    res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'no_key' });
    return;
  }

  try {
    // 预处理事件数据（去除多余空白，避免 prompt 里混入奇怪换行）
    const eventSummary = (eventData.summary || eventData.content || JSON.stringify(eventData).slice(0, 50))
      .replace(/\s+/g, ' ')
      .trim();

    // 构建今日时间线（最近6个活动）
    const recentActivities = userContext?.todayActivitiesList?.slice(-6) || [];
    const todayActivitiesText = buildTodayActivitiesText(recentActivities, lang);

    // 最近批注：清洗掉可能导致 prompt 自我污染的内容（标签、指令关键词）
    const sanitizeAnnotation = (s: string) =>
      s.replace(/【[^】]*】/g, '').replace(/\b(IMPORTANT|OUTPUT|JSON|comment|system)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const rawRecentAnnotations = userContext?.recentAnnotations?.slice(-3) || [];
    const recentAnnotationsList =
      rawRecentAnnotations.map(sanitizeAnnotation).filter(Boolean).join(' / ') ||
      (lang === 'en' ? 'None' : lang === 'it' ? 'Nessuna' : '无');
    const recentEmojis = extractRecentEmojisFromAnnotations(rawRecentAnnotations);
    const recentEmojisText = recentEmojis.join(' ');

    // 构建提示词
    const userPrompt = buildUserPrompt(
      lang,
      eventType,
      eventSummary,
      todayActivitiesText,
      recentAnnotationsList,
      recentEmojisText
    );
    const systemPrompt = getSystemPrompt(lang);
    const model = getModel(lang);

    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: lang === 'zh' ? 0.9 : 0.8,
      // EN/IT 生成更长文本时给更高 completion 上限，避免正文被截断
      max_tokens: lang === 'zh' ? 180 : 480,
      stream: false,
    };

    // 中文场景维持原 stop 策略，避免输出拖长
    if (lang === 'zh') {
      requestBody.stop = ['\n\n', '\n- ', '\n1. '];
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Annotation API error:', response.status, errorText);
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'fetch_failed' });
      return;
    }

    const data = await response.json();
    const firstChoice = data?.choices?.[0];
    const firstMessage = firstChoice?.message;

    // Debug: 记录返回元信息，便于排查空内容问题
    console.log('[Annotation API] LLM meta:', {
      lang,
      model,
      finish_reason: firstChoice?.finish_reason,
      stop_reason: firstChoice?.stop_reason,
      usage: data?.usage,
      content_type: typeof firstMessage?.content,
      content_len: typeof firstMessage?.content === 'string' ? firstMessage.content.length : null,
      has_reasoning: !!firstMessage?.reasoning,
      has_reasoning_content: !!firstMessage?.reasoning_content,
      reasoning_len: typeof firstMessage?.reasoning === 'string' ? firstMessage.reasoning.length : null,
      reasoning_content_len: typeof firstMessage?.reasoning_content === 'string' ? firstMessage.reasoning_content.length : null,
    });

    if (!data.choices || data.choices.length === 0) {
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'empty_response' });
      return;
    }

    let content: string = firstMessage?.content;

    if (!content || !content.trim()) {
      console.warn('[Annotation API] empty_content details:', {
        eventType,
        lang,
        finish_reason: firstChoice?.finish_reason,
        stop_reason: firstChoice?.stop_reason,
        content: firstMessage?.content,
        reasoning: typeof firstMessage?.reasoning === 'string' ? firstMessage.reasoning.slice(0, 300) : firstMessage?.reasoning,
        reasoning_content: typeof firstMessage?.reasoning_content === 'string'
          ? firstMessage.reasoning_content.slice(0, 300)
          : firstMessage?.reasoning_content,
      });
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'empty_content' });
      return;
    }

    // 移除 thinking 标签（支持被截断的没有闭合标签的情况）
    content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();

    // 提取有效批注（处理 prompt 泄漏等 bad case），传入 lang 以使用正确的长度校验
    const extractedContent = extractComment(content, lang);
    if (!extractedContent) {
      console.warn('[Annotation API] 提取失败，使用默认批注');
      const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
      res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'extract_failed' });
      return;
    }

    content = extractedContent;
    console.log('[Annotation API] 提取后:', content);

    // tone 和 fallbackEmoji 均从 defaultSet 取，不分析生成内容
    const eventDefaults = defaultSet[eventType] || defaultSet.activity_completed;
    const tone = eventDefaults.tone;
    const fallbackEmoji = eventDefaults.fallbackEmoji;

    // 如果 AI 忘记加 emoji，补上该 eventType 专属的兜底 emoji
    content = ensureEmoji(content, fallbackEmoji);

    res.status(200).json({ content, tone, displayDuration: 8000, source: 'ai' });
  } catch (error) {
    console.error('Annotation API error:', error);
    const defaultAnnotation = defaultSet[eventType] || defaultSet.activity_completed;
    res.status(200).json({ ...defaultAnnotation, displayDuration: 8000, source: 'default', reason: 'exception' });
  }
}
