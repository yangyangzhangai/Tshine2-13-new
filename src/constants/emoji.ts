/**
 * 星尘珍藏核心Emoji列表
 * 
 * 高频情感类Emoji（约100-200个），直接打包在应用中
 * 确保核心体验0等待
 * 
 * @version 1.0.0
 * @see https://twemoji.twitter.com/ Twemoji MIT License
 * @see https://fonts.google.com/noto/specimen/Noto+Color+Emoji Noto Emoji Apache 2.0
 */

export interface EmojiMapping {
  char: string;
  code: string;
  category: EmojiCategory;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'calm' | 'energetic';
}

export type EmojiCategory = 
  | 'celestial'    // 天体星空
  | 'nature'       // 自然元素
  | 'animals'      // 动物
  | 'emotions'     // 情感
  | 'objects'      // 物品
  | 'abstract';    // 抽象

/**
 * 核心Emoji库 - 高频情感类（约100个）
 * 按类别和情感分组，便于AI选择
 */
export const CORE_EMOJI_LIST: EmojiMapping[] = [
  // ===== 天体星空类 =====
  { char: '🌟', code: '1F31F', category: 'celestial', keywords: ['星星', '闪耀', '光芒', '成就', '优秀'], sentiment: 'positive' },
  { char: '⭐', code: '2B50', category: 'celestial', keywords: ['星', '标记', '重点'], sentiment: 'neutral' },
  { char: '✨', code: '2728', category: 'celestial', keywords: ['闪光', ' sparkle', '魔法', 'bling'], sentiment: 'positive' },
  { char: '🌙', code: '1F319', category: 'celestial', keywords: ['月亮', '晚安', '夜晚', '月牙', '宁静'], sentiment: 'calm' },
  { char: '🌛', code: '1F31B', category: 'celestial', keywords: ['弯月', '月夜', '晚安'], sentiment: 'calm' },
  { char: '☀️', code: '2600', category: 'celestial', keywords: ['太阳', '阳光', '白天', '明亮', '温暖'], sentiment: 'positive' },
  { char: '🌞', code: '1F31E', category: 'celestial', keywords: ['太阳脸', '灿烂', '开心'], sentiment: 'positive' },
  { char: '🌈', code: '1F308', category: 'celestial', keywords: ['彩虹', '雨过天晴', '希望', '美好'], sentiment: 'positive' },
  { char: '☁️', code: '2601', category: 'celestial', keywords: ['云', '云朵', '白云', '柔软'], sentiment: 'neutral' },
  { char: '⛅', code: '26C5', category: 'celestial', keywords: ['多云', '阴天', '一般'], sentiment: 'neutral' },
  { char: '🌤️', code: '1F324', category: 'celestial', keywords: ['晴间多云', '不错'], sentiment: 'positive' },
  { char: '⚡', code: '26A1', category: 'celestial', keywords: ['闪电', '能量', '电力', '快速', '爆发'], sentiment: 'energetic' },
  { char: '🔥', code: '1F525', category: 'celestial', keywords: ['火', '火焰', '热情', '燃烧', '热度'], sentiment: 'energetic' },
  { char: '💫', code: '1F4AB', category: 'celestial', keywords: ['眩晕', '星光', '旋转', '梦幻'], sentiment: 'positive' },
  { char: '☄️', code: '2604', category: 'celestial', keywords: ['彗星', '流星', '划过', '快速'], sentiment: 'energetic' },
  { char: '🌠', code: '1F320', category: 'celestial', keywords: ['流星', '许愿', '夜空'], sentiment: 'positive' },
  
  // ===== 自然元素类 =====
  { char: '🫧', code: '1FAE7', category: 'nature', keywords: ['气泡', '轻盈', '泡泡', '梦幻', '飘逸'], sentiment: 'positive' },
  { char: '🌊', code: '1F30A', category: 'nature', keywords: ['海浪', '波浪', '海水', '波澜', '力量'], sentiment: 'energetic' },
  { char: '💧', code: '1F4A7', category: 'nature', keywords: ['水滴', '泪滴', '水', '一滴'], sentiment: 'neutral' },
  { char: '💦', code: '1F4A6', category: 'nature', keywords: ['汗滴', '水花', '汗水'], sentiment: 'neutral' },
  { char: '🍃', code: '1F343', category: 'nature', keywords: ['树叶', '叶子', '飘叶', '轻'], sentiment: 'calm' },
  { char: '🌿', code: '1F33F', category: 'nature', keywords: ['草药', '绿色', '清新', '自然'], sentiment: 'calm' },
  { char: '☘️', code: '2618', category: 'nature', keywords: ['三叶草', '幸运', '绿色'], sentiment: 'positive' },
  { char: '🍀', code: '1F340', category: 'nature', keywords: ['四叶草', '幸运', '好运'], sentiment: 'positive' },
  { char: '🌸', code: '1F338', category: 'nature', keywords: ['樱花', '花朵', '粉色', '美丽', '春天'], sentiment: 'positive' },
  { char: '🌺', code: '1F33A', category: 'nature', keywords: ['芙蓉', '花朵', '绽放'], sentiment: 'positive' },
  { char: '🌻', code: '1F33B', category: 'nature', keywords: ['向日葵', '阳光', '开心'], sentiment: 'positive' },
  { char: '🌼', code: '1F33C', category: 'nature', keywords: ['开花', '花朵', '绽放'], sentiment: 'positive' },
  { char: '🌷', code: '1F337', category: 'nature', keywords: ['郁金香', '花朵', '优雅'], sentiment: 'positive' },
  { char: '💐', code: '1F490', category: 'nature', keywords: ['花束', '鲜花', '礼物', '庆祝'], sentiment: 'positive' },
  { char: '🌳', code: '1F333', category: 'nature', keywords: ['大树', '树木', '成长', '稳重'], sentiment: 'calm' },
  { char: '🌲', code: '1F332', category: 'nature', keywords: ['松树', '常青', '常绿'], sentiment: 'calm' },
  { char: '🌴', code: '1F334', category: 'nature', keywords: ['棕榈树', '度假', '热带'], sentiment: 'positive' },
  { char: '❄️', code: '2744', category: 'nature', keywords: ['雪花', '寒冷', '纯净', '冬天'], sentiment: 'calm' },
  { char: '☃️', code: '2603', category: 'nature', keywords: ['雪人', '冬天', '可爱'], sentiment: 'positive' },
  { char: '🌫️', code: '1F32B', category: 'nature', keywords: ['雾', '迷雾', '朦胧', '疲惫'], sentiment: 'negative' },
  
  // ===== 动物类 =====
  { char: '🕊️', code: '1F54A', category: 'animals', keywords: ['鸽子', '和平', '自由', '飞翔', '解脱'], sentiment: 'positive' },
  { char: '🦋', code: '1F98B', category: 'animals', keywords: ['蝴蝶', '蜕变', '美丽', '飞舞'], sentiment: 'positive' },
  { char: '🐱', code: '1F431', category: 'animals', keywords: ['猫', '猫咪', '喵', '慵懒'], sentiment: 'calm' },
  { char: '🐈', code: '1F408', category: 'animals', keywords: ['猫', '宠物', '陪伴'], sentiment: 'calm' },
  { char: '🐈‍⬛', code: '1F408-200D-2B1B', category: 'animals', keywords: ['黑猫', '神秘', '优雅'], sentiment: 'neutral' },
  { char: '🐶', code: '1F436', category: 'animals', keywords: ['狗', '狗狗', '忠诚', '开心'], sentiment: 'positive' },
  { char: '🐕', code: '1F415', category: 'animals', keywords: ['狗', '宠物', '陪伴'], sentiment: 'positive' },
  { char: '🦮', code: '1F9AE', category: 'animals', keywords: ['导盲犬', '服务', '帮助'], sentiment: 'positive' },
  { char: '🐾', code: '1F43E', category: 'animals', keywords: ['爪印', '足迹', '印记', '痕迹'], sentiment: 'neutral' },
  { char: '🐦', code: '1F426', category: 'animals', keywords: ['鸟', '小鸟', '自由', '飞翔'], sentiment: 'positive' },
  { char: '🐧', code: '1F427', category: 'animals', keywords: ['企鹅', '可爱', '摇摆'], sentiment: 'positive' },
  { char: '🦉', code: '1F989', category: 'animals', keywords: ['猫头鹰', '智慧', '夜晚'], sentiment: 'calm' },
  { char: '🦅', code: '1F985', category: 'animals', keywords: ['鹰', '雄鹰', '力量', '高飞'], sentiment: 'energetic' },
  { char: '🐟', code: '1F41F', category: 'animals', keywords: ['鱼', '游动', '自由', '流畅'], sentiment: 'calm' },
  { char: '🐠', code: '1F420', category: 'animals', keywords: ['热带鱼', '彩色', '美丽'], sentiment: 'positive' },
  { char: '🦈', code: '1F988', category: 'animals', keywords: ['鲨鱼', '凶猛', '力量'], sentiment: 'energetic' },
  { char: '🐢', code: '1F422', category: 'animals', keywords: ['乌龟', '缓慢', '耐心', '稳重'], sentiment: 'calm' },
  { char: '🐌', code: '1F40C', category: 'animals', keywords: ['蜗牛', '慢', '悠闲'], sentiment: 'calm' },
  { char: '🐝', code: '1F41D', category: 'animals', keywords: ['蜜蜂', '勤劳', '忙碌', '嗡嗡'], sentiment: 'energetic' },
  { char: '🦋', code: '1F98B', category: 'animals', keywords: ['蝴蝶', '蜕变', '美丽'], sentiment: 'positive' },
  { char: '🐛', code: '1F41B', category: 'animals', keywords: ['毛毛虫', '成长', '变化'], sentiment: 'neutral' },
  
  // ===== 情感类 =====
  { char: '❤️', code: '2764', category: 'emotions', keywords: ['爱心', '爱', '喜欢', '爱'], sentiment: 'positive' },
  { char: '🧡', code: '1F9E1', category: 'emotions', keywords: ['橙心', '温暖', '活力'], sentiment: 'positive' },
  { char: '💛', code: '1F49B', category: 'emotions', keywords: ['黄心', '友谊', '开心'], sentiment: 'positive' },
  { char: '💚', code: '1F49A', category: 'emotions', keywords: ['绿心', '自然', '希望'], sentiment: 'positive' },
  { char: '💙', code: '1F499', category: 'emotions', keywords: ['蓝心', '平静', '信任'], sentiment: 'calm' },
  { char: '💜', code: '1F49C', category: 'emotions', keywords: ['紫心', '神秘', '高贵'], sentiment: 'positive' },
  { char: '🖤', code: '1F5A4', category: 'emotions', keywords: ['黑心', '深沉', '酷炫'], sentiment: 'neutral' },
  { char: '🤍', code: '1F90D', category: 'emotions', keywords: ['白心', '纯洁', '干净'], sentiment: 'calm' },
  { char: '🤎', code: '1F90E', category: 'emotions', keywords: ['棕心', '踏实', '稳定'], sentiment: 'calm' },
  { char: '💖', code: '1F496', category: 'emotions', keywords: ['闪亮的心', '心动', '喜欢'], sentiment: 'positive' },
  { char: '💗', code: '1F497', category: 'emotions', keywords: ['成长的心', '心动', '悸动'], sentiment: 'positive' },
  { char: '💓', code: '1F493', category: 'emotions', keywords: ['心跳', '心动', '紧张'], sentiment: 'positive' },
  { char: '💕', code: '1F495', category: 'emotions', keywords: ['两颗心', '相爱', '甜蜜'], sentiment: 'positive' },
  { char: '💞', code: '1F49E', category: 'emotions', keywords: ['旋转的心', '迷恋', '陶醉'], sentiment: 'positive' },
  { char: '💝', code: '1F49D', category: 'emotions', keywords: ['系丝带的心', '礼物', '特别'], sentiment: 'positive' },
  { char: '💘', code: '1F498', category: 'emotions', keywords: ['丘比特', '爱情', '一见钟情'], sentiment: 'positive' },
  { char: '💟', code: '1F49F', category: 'emotions', keywords: ['心形装饰', '可爱'], sentiment: 'positive' },
  { char: '❣️', code: '2763', category: 'emotions', keywords: ['心叹号', '强调', '重要'], sentiment: 'positive' },
  { char: '💔', code: '1F494', category: 'emotions', keywords: ['破碎的心', '伤心', '难过'], sentiment: 'negative' },
  { char: '❤️‍🩹', code: '2764-200D-1FA79', category: 'emotions', keywords: ['修复的心', '疗伤', '康复'], sentiment: 'positive' },
  
  // ===== 物品类 =====
  { char: '🎈', code: '1F388', category: 'objects', keywords: ['气球', '轻盈', '飘', '庆祝'], sentiment: 'positive' },
  { char: '🎉', code: '1F389', category: 'objects', keywords: ['庆祝', '派对', '彩带', '完成'], sentiment: 'positive' },
  { char: '🎊', code: '1F38A', category: 'objects', keywords: ['彩球', '庆祝', '胜利'], sentiment: 'positive' },
  { char: '🎁', code: '1F381', category: 'objects', keywords: ['礼物', '礼盒', '惊喜', '奖励'], sentiment: 'positive' },
  { char: '🎀', code: '1F380', category: 'objects', keywords: ['蝴蝶结', '丝带', '可爱'], sentiment: 'positive' },
  { char: '🕯️', code: '1F56F', category: 'objects', keywords: ['蜡烛', '烛光', '温暖', '纪念'], sentiment: 'calm' },
  { char: '💡', code: '1F4A1', category: 'objects', keywords: ['灯泡', '想法', '灵感', '顿悟'], sentiment: 'positive' },
  { char: '📖', code: '1F4D6', category: 'objects', keywords: ['书', '阅读', '学习', '知识'], sentiment: 'neutral' },
  { char: '📚', code: '1F4DA', category: 'objects', keywords: ['书籍', '学习', '积累'], sentiment: 'neutral' },
  { char: '✏️', code: '270F', category: 'objects', keywords: ['铅笔', '书写', '创作', '记录'], sentiment: 'neutral' },
  { char: '📝', code: '1F4DD', category: 'objects', keywords: ['备忘录', '记录', '笔记'], sentiment: 'neutral' },
  { char: '🎨', code: '1F3A8', category: 'objects', keywords: ['调色板', '艺术', '创造', '色彩'], sentiment: 'positive' },
  { char: '🎭', code: '1F3AD', category: 'objects', keywords: ['面具', '表演', '戏剧', '多重'], sentiment: 'neutral' },
  { char: '🎪', code: '1F3AA', category: 'objects', keywords: ['马戏团', '表演', '精彩'], sentiment: 'positive' },
  { char: '🎯', code: '1F3AF', category: 'objects', keywords: ['靶心', '目标', '命中', '专注'], sentiment: 'positive' },
  { char: '🏆', code: '1F3C6', category: 'objects', keywords: ['奖杯', '冠军', '胜利', '成就'], sentiment: 'positive' },
  { char: '🥇', code: '1F947', category: 'objects', keywords: ['金牌', '第一', '最好'], sentiment: 'positive' },
  { char: '⏰', code: '23F0', category: 'objects', keywords: ['闹钟', '时间', '提醒', '早起'], sentiment: 'neutral' },
  { char: '🕰️', code: '1F570', category: 'objects', keywords: ['座钟', '时间', '复古', '流逝'], sentiment: 'neutral' },
  { char: '⏳', code: '23F3', category: 'objects', keywords: ['沙漏', '时间', '流逝', '倒计时'], sentiment: 'neutral' },
  { char: '⌛', code: '231B', category: 'objects', keywords: ['沙漏', '时间', '结束'], sentiment: 'neutral' },
  { char: '🔮', code: '1F52E', category: 'objects', keywords: ['水晶球', '预测', '神秘', '未来'], sentiment: 'neutral' },
  { char: '🗝️', code: '1F5DD', category: 'objects', keywords: ['钥匙', '解开', '答案', '关键'], sentiment: 'positive' },
  { char: '🔑', code: '1F511', category: 'objects', keywords: ['钥匙', '关键', '开启'], sentiment: 'positive' },
  { char: '🗝️', code: '1F5DD', category: 'objects', keywords: ['旧钥匙', '秘密', '宝藏'], sentiment: 'neutral' },
  { char: '💎', code: '1F48E', category: 'objects', keywords: ['钻石', '宝石', '珍贵', '闪耀'], sentiment: 'positive' },
  { char: '🔔', code: '1F514', category: 'objects', keywords: ['铃铛', '提醒', '注意'], sentiment: 'neutral' },
  { char: '🎵', code: '1F3B5', category: 'objects', keywords: ['音符', '音乐', '旋律', '节奏'], sentiment: 'positive' },
  { char: '🎶', code: '1F3B6', category: 'objects', keywords: ['音乐', '旋律', '多音符'], sentiment: 'positive' },
  { char: '🎼', code: '1F3BC', category: 'objects', keywords: ['乐谱', '音乐', '创作'], sentiment: 'positive' },
  
  // ===== 抽象类 =====
  { char: '💭', code: '1F4AD', category: 'abstract', keywords: ['想法', '思考', '思绪', '想'], sentiment: 'neutral' },
  { char: '💬', code: '1F4AC', category: 'abstract', keywords: ['对话', '说话', '消息', '聊天'], sentiment: 'neutral' },
  { char: '🗯️', code: '1F5EF', category: 'abstract', keywords: ['愤怒', '咆哮', '生气'], sentiment: 'negative' },
  { char: '♨️', code: '2668', category: 'abstract', keywords: ['温泉', '热气', '放松', '舒适'], sentiment: 'positive' },
  { char: '💤', code: '1F4A4', category: 'abstract', keywords: ['睡觉', '困', '休息', 'zzz'], sentiment: 'calm' },
  { char: '💨', code: '1F4A8', category: 'abstract', keywords: ['尾气', '快速', '溜走', '跑'], sentiment: 'energetic' },
  { char: '🕳️', code: '1F573', category: 'abstract', keywords: ['洞', '坑', '深渊'], sentiment: 'negative' },
  { char: '💣', code: '1F4A3', category: 'abstract', keywords: ['炸弹', '爆炸', '冲击'], sentiment: 'energetic' },
  { char: '💥', code: '1F4A5', category: 'abstract', keywords: ['爆炸', '碰撞', '冲突', '突破'], sentiment: 'energetic' },
  { char: '💫', code: '1F4AB', category: 'abstract', keywords: ['头晕', '星星', '冲击'], sentiment: 'neutral' },
  { char: '🦠', code: '1F9A0', category: 'abstract', keywords: ['病毒', '细菌', '微小', '蔓延'], sentiment: 'negative' },
  { char: '⚠️', code: '26A0', category: 'abstract', keywords: ['警告', '注意', '提醒', '危险'], sentiment: 'negative' },
  { char: '🔱', code: '1F531', category: 'abstract', keywords: ['三叉戟', '海神', '力量'], sentiment: 'energetic' },
  { char: '📍', code: '1F4CD', category: 'abstract', keywords: ['定位', '标记', '这里', '位置'], sentiment: 'neutral' },
  { char: '🚩', code: '1F6A9', category: 'abstract', keywords: ['旗帜', '标记', '里程碑'], sentiment: 'positive' },
  { char: '🎌', code: '1F38C', category: 'abstract', keywords: ['交叉旗帜', '庆典', '庆祝'], sentiment: 'positive' },
  { char: '🏴‍☠️', code: '1F3F4-200D-2620', category: 'abstract', keywords: ['海盗旗', '冒险', '叛逆'], sentiment: 'neutral' },
  { char: '✝️', code: '271D', category: 'abstract', keywords: ['十字架', '信仰', '神圣'], sentiment: 'calm' },
  { char: '☮️', code: '262E', category: 'abstract', keywords: ['和平', '和平主义', '和谐'], sentiment: 'calm' },
  { char: '✡️', code: '2721', category: 'abstract', keywords: ['六芒星', '神秘', '魔法'], sentiment: 'neutral' },
  { char: '🔯', code: '1F52F', category: 'abstract', keywords: ['六芒星', '幸运', '占卜'], sentiment: 'neutral' },
  { char: '🪬', code: '1FAAC', category: 'abstract', keywords: ['法蒂玛之手', '护身符', '保护'], sentiment: 'positive' },
  { char: '🧿', code: '1F9FF', category: 'abstract', keywords: ['纳扎尔护身符', '辟邪', '保护'], sentiment: 'positive' },
];

/**
 * 获取Emoji映射
 */
export function getEmojiMapping(char: string): EmojiMapping | undefined {
  return CORE_EMOJI_LIST.find(e => e.char === char);
}

/**
 * 根据关键词搜索Emoji
 */
export function searchEmojiByKeyword(keyword: string): EmojiMapping[] {
  const lowerKeyword = keyword.toLowerCase();
  return CORE_EMOJI_LIST.filter(e => 
    e.keywords.some(k => k.includes(lowerKeyword)) ||
    e.category.includes(lowerKeyword)
  );
}

/**
 * 根据情感倾向获取Emoji
 */
export function getEmojiBySentiment(sentiment: EmojiMapping['sentiment']): EmojiMapping[] {
  return CORE_EMOJI_LIST.filter(e => e.sentiment === sentiment);
}

/**
 * 获取默认Emoji
 */
export function getDefaultEmoji(): EmojiMapping {
  return CORE_EMOJI_LIST.find(e => e.char === '✨') || CORE_EMOJI_LIST[0];
}

/**
 * 检查是否为核心包Emoji
 */
export function isCoreEmoji(char: string): boolean {
  return CORE_EMOJI_LIST.some(e => e.char === char);
}

/**
 * 核心Emoji总数
 */
export const CORE_EMOJI_COUNT = CORE_EMOJI_LIST.length;
