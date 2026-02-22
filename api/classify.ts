import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Activity Classifier API
 * 璋冪敤杞婚噺妯″瀷(Qwen-Flash)灏嗙敤鎴锋椂闂磋褰曞垎绫讳负缁撴瀯鍖栨暟鎹?
 *
 * POST /api/classify
 * Body: { rawInput: string }
 */

const CLASSIFIER_PROMPT = `浣犳槸涓€涓椂闂磋褰曞垎绫诲櫒銆?
灏嗙敤鎴疯緭鍏ョ殑鏃堕棿璁板綍鎸夌被鍒垎绫伙紝杈撳嚭涓ユ牸鐨凧SON鏍煎紡銆?
涓嶈杈撳嚭浠讳綍瑙ｉ噴銆佸墠缂€銆佸悗缂€鎴朚arkdown浠ｇ爜鍧楋紝鍙緭鍑篔SON鏈韩銆?

銆愮被鍒畾涔夈€?

deep_focus锛堟繁搴︿笓娉級
闇€瑕佹寔缁敞鎰忓姏鐨勪富鍔ㄨ緭鍑虹被浠诲姟锛?
鍐欎綔銆佺紪绋嬨€佸鑰冦€佽璁°€佺粌鐞淬€佺敾鐢汇€?
瀛︿範绫昏绋嬨€侀渶瑕侀珮搴﹂泦涓殑宸ヤ綔浠诲姟

necessary锛堢敓娲昏繍杞級
缁存寔鏃ュ父杩愯浆鐨勮鍔ㄦ垨涔夊姟鎬т簨鍔★細
閫氬嫟銆佸鍔°€佸仛楗€侀噰璐€佹墦鎵€?
琛屾斂浜嬪姟銆佸鐞嗘枃浠躲€佷箟鍔℃€у紑浼?

body锛堣韩浣撶淮鎶わ級
韬綋灞傞潰鐨勮ˉ缁欎笌鐓ф枡锛?
鐫¤銆佸崍浼戙€佹椁愩€佽繍鍔ㄣ€佸仴韬€?
璺戞銆佹媺浼搞€佸氨鍖汇€佹礂婢?

recharge锛堢伒榄傚厖鐢碉級
涓诲姩閫夋嫨鐨勩€佹湁婊嬪吇鎰熺殑鏀炬澗涓庝汉闄呬簰鍔細
鍜屽ソ鍙嬫繁鑱娿€佷富鍔ㄧ害楗€佹亱浜虹浉澶勩€?
鐪嬪枩娆㈢殑涔︽垨鐢靛奖銆佹剦蹇殑鏁ｆ銆佸惉闊充箰

social_duty锛堝０娉氦鎹級
琚姩鎴栦箟鍔℃€х殑浜洪檯浜掑姩锛?
琚害楗眬銆佷翰鎴氱數璇濄€佸叕鍙稿洟寤恒€?
涓嶅緱涓嶅弬鍔犵殑鑱氫細銆佸簲閰?

self_talk锛堣嚜鎴戞暣鐞嗭級
鍏冭鐭ョ被娲诲姩锛屽亸鍚戞€濊€冭緭鍑猴細
鍐欐棩璁般€佸仛璁″垝銆佹暣鐞嗙瑪璁般€佸鐩樸€?
鏁寸悊鎬濈华銆佸啣鎯筹紙鍋忔€濊€冨悜锛?

dopamine锛堝嵆鏃舵弧瓒筹級
浣庤鐭ャ€佸嵆鏃跺揩鎰熴€佽鍔ㄥ埛鍙栫被锛?
鐭棰戙€佸埛绀句氦濯掍綋銆佹墦娓告垙銆佺患鑹恒€?
鏃犵洰鐨勫埛鏂伴椈銆佹棤鐩殑鍒峰笘瀛?

dissolved锛堝厜鐨勬叮鏁ｏ級
鐢ㄦ埛璇翠笉娓呭湪骞插槢鐨勬椂闂达紝
鎴栨槑纭爣娉ㄤ负鎷栧欢銆佸彂鍛嗐€佸唴鑰楃殑鏃堕棿

銆恡ime_slot 鍒ゆ柇瑙勫垯銆?
鏍规嵁鐢ㄦ埛鎻忚堪鐨勬椂闂翠俊鎭垽鏂簨椤瑰彂鐢熺殑鏃舵锛?
路 morning锛堜笂鍗堬級锛氳捣搴婂埌12:00涔嬮棿鍙戠敓鐨勪簨
路 afternoon锛堜笅鍗堬級锛?2:00鍒?8:00涔嬮棿鍙戠敓鐨勪簨
路 evening锛堟櫄闂达級锛?8:00涔嬪悗鍙戠敓鐨勪簨
路 濡傛灉鐢ㄦ埛娌℃湁鎻愪緵鏃堕棿淇℃伅锛屽～ null

銆愯竟鐣屽鐞嗚鍒欍€?
路 杈瑰悆楗竟鍒锋墜鏈?鈫?鎷嗗垎涓轰袱鏉★紝鍚勫彇涓€鍗婃椂闀匡紝time_slot鐩稿悓
路 鎻忚堪妯＄硦锛堝"浼戞伅浜嗕竴浼?锛夆啋 dissolved锛宖lag: "ambiguous"
路 涓诲姩鍘荤湅鐨勭邯褰曠墖/涔?鈫?recharge
路 鍒峰埌鍋滀笉涓嬫潵鐨勭煭瑙嗛 鈫?dopamine
路 鍐ユ兂鍋忔劅鍙楁斁鏉?鈫?recharge锛涘啣鎯冲亸澶嶇洏鏁寸悊 鈫?self_talk
路 杩愬姩鏃跺惉鎾/鏈夊０涔?鈫?body锛堜富瑕佹椿鍔ㄤ紭鍏堬級
路 瀹屽叏鏃犳硶鍒ゆ柇 鈫?category: "unknown"锛屼笉寮鸿褰掔被

銆愯緭鍑烘牸寮忋€?
{
  "total_duration_min": 鏁板瓧锛堟墍鏈変簨椤规椂闀夸箣鍜岋級,
  "items": [
    {
      "name": "浜嬮」鍚嶇О",
      "duration_min": 鏁板瓧,
      "time_slot": "morning" 鎴?"afternoon" 鎴?"evening" 鎴?null,
      "category": "绫诲埆鑻辨枃key",
      "flag": "ambiguous" 鎴?null
    }
  ],
  "todos": {
    "completed": 鏁板瓧,
    "total": 鏁板瓧
  },
  "energy_log": [
    {
      "time_slot": "morning" 鎴?"afternoon" 鎴?"evening",
      "energy_level": "high" 鎴?"medium" 鎴?"low" 鎴?null, // 蹇呴』鏍规嵁鎯呯华璇嶆眹鍒ゆ柇銆傚鏋滅敤鎴锋弿杩板紑蹇?鑷緥/涓撴敞/骞插姴/楦¤锛岃涓?high锛涘鏋滄弿杩板钩绋?姝ｅ父/瀹屾垚锛岃涓?medium锛涘鏋滄弿杩扮柌鎯?琚帹鐫€璧?鍐呰€?鐢甸噺铏氭爣/闈犳剰蹇楃画鍛?鐑﹁簛/涓嶆兂鍔紝蹇呴』璁颁綔 low銆傛病鏈夋槑纭儏缁嚎绱㈠～ null銆?
      "mood": "鐢ㄦ埛鍘熷鏍囨敞鏂囧瓧" 鎴?null
    }
  ]
}
`;
const CLASSIFIER_PROMPT_EN = `You are a time log classifier.
Classify the user's input time logs into categories and output strictly in JSON format.
Do NOT output any explanations, prefixes, suffixes, or Markdown code blocks. Output the JSON only.

銆怌ategory Definitions銆?

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

銆恡ime_slot Rules銆?
Determine the time slot based on the time information provided by the user:
路 morning: Events between waking up and 12:00.
路 afternoon: Events between 12:00 and 18:00.
路 evening: Events after 18:00.
路 If the user provides no time info, fill in null.

銆怋oundary Handling Rules銆?
路 Eating while scrolling phone -> Split into two, 50% duration each, same time_slot.
路 Vague description (e.g., "rested for a bit") -> dissolved, flag: "ambiguous".
路 Actively chosen documentary/book -> recharge.
路 Scrolling short videos uncontrollably -> dopamine.
路 Meditation (relaxation) -> recharge; Meditation (review) -> self_talk.
路 Listening to podcast/audiobook while exercising -> body (primary activity takes precedence).
路 Completely unable to judge -> category: "unknown", do not force classify.

銆怬utput Format銆?
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
      "energy_level": "high" | "medium" | "low" | null, // Strict mapping: 'high' for motivated/focused/happy; 'medium' for normal/finished; 'low' for pushed/drained/exhausted/forcing myself/friction. null if no emotional cue.
      "mood": "original text explicitly marked as mood or energy" | null
    }
  ]
}`;
const CLASSIFIER_PROMPT_IT = \`Sei un classificatore di registri di tempo.
Classifica i registri di tempo inseriti dall'utente in categorie e restituisci rigorosamente in formato JSON.
NON produrre alcuna spiegazione, prefisso, suffisso o blocco di codice Markdown. Restituisci solo il JSON.

【Definizioni delle Categorie】

deep_focus
Attività che richiedono un'attenzione attiva prolungata:
Scrivere, programmare, preparazione agli esami, progettare, pratica di uno strumento, disegnare,
seguire corsi di apprendimento, compiti di lavoro ad alta concentrazione.

necessary
Compiti passivi o obbligatori per mantenere la vita quotidiana:
Pendolarismo, faccende domestiche, cucinare, fare la spesa, pulire,
compiti amministrativi, elaborazione di documenti, riunioni obbligatorie.

body
Rifornimento e cura a livello fisico:
Sonno, pisolini, pasti, sport, fitness,
correre, stretching, visite mediche, fare il bagno.

recharge
Rilassamento nutriente e interazione interpersonale scelti attivamente:
Discorsi profondi con amici, cene attive, passare del tempo con un partner,
leggere libri preferiti o guardare film, piacevoli passeggiate, ascoltare musica.

social_duty
Interazioni interpersonali passive o obbligatorie:
Essere invitati a una cena, telefonate con i parenti, team-building aziendale,
incontri obbligatori, socializzare per lavoro.

self_talk
Attività metacognitive, orientate verso l'output di pensiero:
Tenere un diario, pianificare, organizzare appunti, revisionare,
ordinare i pensieri, meditazione (orientata al pensiero).

dopamine
Bassa cognizione, gratificazione istantanea, scorrimento passivo:
Brevi video, scorrere i social media, giocare, programmi di varietà,
navigare tra le notizie senza meta, scorrere post senza meta.

dissolved
Tempo in cui l'utente non può dichiarare chiaramente cosa stava facendo,
o tempo esplicitamente contrassegnato come procrastinazione, distrazione, o attrito interno.

【Regole time_slot】
Determina la fascia oraria in base alle informazioni temporali fornite dall'utente:
· morning: Eventi tra il risveglio e le 12:00.
· afternoon: Eventi tra le 12:00 e le 18:00.
· evening: Eventi dopo le 18:00.
· Se l'utente non fornisce informazioni sull'orario, compila con null.

【Regole di Gestione dei Confini】
· Mangiare mentre si scorre il telefono -> Dividi in due, 50% di durata ciascuno, stesso time_slot.
· Descrizione vaga (es. "riposato un po'") -> dissolved, flag: "ambiguous".
· Documentario/libro scelto attivamente -> recharge.
· Scorrere brevi video incontrollabilmente -> dopamine.
· Meditazione (rilassamento) -> recharge; Meditazione (revisione) -> self_talk.
· Ascoltare podcast/audiolibro mentre ci si allena -> body (l'attività principale ha la precedenza).
· Completamente incapace di giudicare -> categoria: "unknown", non forzare la classificazione.

【Formato di Output】
{
  "total_duration_min": number (somma di tutte le durate degli elementi),
  "items": [
    {
      "name": "Nome Evento (Mantieni la Lingua Originale)",
      "duration_min": number,
      "time_slot": "morning" | "afternoon" | "evening" | null,
      "category": "chiave inglese della categoria (es. deep_focus)",
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
      "energy_level": "high" | "medium" | "low" | null, // high per motivato/felice; medium per normale; low per stanco/sfiancato. null se nessuna indicazione.
      "mood": "testo originale esplicitamente contrassegnato come umore o energia" | null
    }
  ]
}\`;

/**
  * 鍓ョ妯″瀷杈撳嚭涓彲鑳藉瓨鍦ㄧ殑Markdown浠ｇ爜鍧楀寘瑁?
  */
function parseClassifierResponse(raw: string): any {
  // 浼樺厛灏濊瘯鐩存帴瑙ｆ瀽
  try {
    return JSON.parse(raw.trim());
  } catch {
    // 缁х画灏濊瘯鍏朵粬鏂规硶
  }

  // 鐢ㄦ鍒欐彁鍙栫涓€涓畬鏁寸殑 { ... } 鍧?
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // 缁х画鍏滃簳
    }
  }

  // 鍏滃簳锛氳繑鍥炵┖缁撴瀯
  console.warn('鈿狅笍 鍒嗙被鍣ㄨ緭鍑烘棤娉曡В鏋愶紝杩斿洖绌虹粨鏋?);
  return {
    total_duration_min: 0,
    items: [],
    todos: { completed: 0, total: 0 },
    energy_log: []
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 璁剧疆 CORS 澶?
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 澶勭悊棰勬璇锋眰
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 鍙厑璁?POST
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

  // 浣跨敤 ZhiPu API
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
        'Authorization': `Bearer ${ zhipuApiKey } `,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: lang === 'en' ? CLASSIFIER_PROMPT_EN : lang === 'it' ? CLASSIFIER_PROMPT_IT : CLASSIFIER_PROMPT },
          { role: 'user', content: rawInput }
        ],
        temperature: 0.6, // 璁剧疆涓?.6
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Classifier API error:', response.status, errorText);
      res.status(response.status).json({
        error: `AI service error: ${ response.statusText } `,
        details: errorText
      });
      return;
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || '';

    // 鍓ョJSON鍖呰９鐥?
    const parsed = parseClassifierResponse(rawContent);

    res.status(200).json({
      success: true,
      data: parsed,
      raw: rawContent, // 璋冭瘯鐢紝鍙€?
    });
  } catch (error) {
    console.error('Classifier API error:', error);
    res.status(500).json({
      error: '鍒嗙被鏈嶅姟鍑洪敊锛岃绋嶅悗鍐嶈瘯銆?,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


