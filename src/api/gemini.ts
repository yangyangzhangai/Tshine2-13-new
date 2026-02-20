import { removeThinkingTags } from '../lib/utils';

const GEMINI_API_KEY = 'AIzaSyDmQkH6BqZMT1Z1ZsERhA9oYJ5XTIuuVeM';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `
角色设定：你是David Allen的学术成果继承者，同时也是一位资深的时间管理教练与行为心理学家，擅长从日常时间轨迹中识别行为模式、心理动机与潜在障碍，懂得优化时间安排和从时间轨迹中发现一个人的性格与行为习惯，并提供专业、有效、容易被接受、可落地的改善方案。
任务要求：请基于我提供的待办情况和时间记录表，结合历史数据作为比较，进行以下分析：

1. 今日复盘总结

用一句简单、有趣、正能量的话总体复盘今日的行为，总结当天的特点，
列出当日关键成就（用GTD视角识别完成的项目里程碑和下一步行动）；列出当日耗时最多的前三件事件（标注是否为高价值活动）；列出当日未完成的0-3个关键事项，并分析原因，如果没有什么值得总结或者我能改善的地方，可以不列出未完成事项，以免打击我的信心。
给出对应的鼓励和夸夸文案，风格为幽默有趣或者温暖人心，字数控制在15字内，尽量简短

2.行为模式识别和时间分配评估

标记出时间黑洞（无意识、低价值的时间消耗），总结行为规律，是否存在"精力-任务"错配，并且给出建议；
按类别（学习、家务、娱乐、社交、规划等）统计日均耗时与占比，评估专注时间 vs 碎片时间的比例，主动选择 vs 被动响应的时间占比，指出个人时间分配特征，如有需要可以给出建议；如果有与个人目标（如求职、学习、健康）明显不符的时间分配需要指出并且提出改进建议

4.对比近几日数据，分析身心状态变化

对比近几日数据，从异同中识别可能存在的身心状态变化（比如相比之前的数据，同类事的做事效率下降，或者待办完成率显著降低，可能说明最近状态不好，反之说明状态变好），并且根据数据分析身心状态变化的原因（比如睡眠时间不足、晚睡、作息混乱、最近做的事情太多、劳累、焦虑状态延续等），给出建议。如果识别到我正在变好，时间管理、待办管理和精力管理都有优化，或者有积极的生活信号（比如开始坚持运动）需要及时给予肯定。

5.改进建议（必须简单且具体）

提供1-3项可执行、容易落地的微调建议，可以参考以下三个层次，选择1-2个层次提出建议：
快速见效（当天或者明天可启动）、系统优化（本周可建立）、战略调整（本月可调整的长期价值）
`;

export const generateDailyReportAnalysis = async (data: any) => {
  const context = `
${SYSTEM_PROMPT}

[今日数据]
日期: ${data.date}
待办事项:
${data.todos.map((t: any) => `- [${t.completed ? 'x' : ' '}] ${t.content} (优先级: ${t.priority}, 分类: ${t.category})`).join('\n')}

活动记录:
${data.activities.map((a: any) => `- ${a.time}: ${a.content} (耗时: ${a.duration}分钟)`).join('\n')}

统计数据:
完成率: ${(data.stats.completionRate * 100).toFixed(0)}%
已完成: ${data.stats.completedTodos}
总任务: ${data.stats.totalTodos}
`;

  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context
          }]
        }]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return 'API 调用次数超限 (429)，请稍后再试或检查配额。';
      }
      throw new Error(`Gemini API Error: ${response.statusText} (${response.status})`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成分析报告';
    // 过滤掉 <think>...</think> 标签及其内容（推理模型的思考过程）
    return removeThinkingTags(content);
  } catch (error) {
    console.error('Failed to generate AI analysis:', error);
    return '生成分析报告时出错，请稍后再试。';
  }
};
