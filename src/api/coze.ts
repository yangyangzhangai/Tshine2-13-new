export interface CozeWorkflowParams {
  workflow_id: string;
  parameters: Record<string, any>;
}

export interface AIAnalysisResult {
  summary: string;
  timeline: Array<{
    time: string;
    activity: string;
    category: string;
    duration: number;
  }>;
  suggestions: string[];
}

export const runCozeWorkflow = async (params: CozeWorkflowParams): Promise<AIAnalysisResult> => {
  console.log('Calling Coze Workflow:', params);
  
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock response
  return {
    summary: "今日时间管理情况良好，主要集中在工作和学习上。",
    timeline: [
      { time: "09:00", activity: "早餐", category: "生活", duration: 30 },
      { time: "09:30", activity: "工作", category: "工作", duration: 180 },
    ],
    suggestions: [
      "建议增加午休时间",
      "晚上可以安排一些运动"
    ]
  };
};
