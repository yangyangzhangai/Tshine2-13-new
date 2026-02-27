import { generateAnnotation } from '../src/services/aiService';

async function testMiniMaxAPI() {
  console.log('🚀 开始测试 MiniMax API...\n');

  const testCases = [
    {
      name: '完成活动',
      eventType: 'activity_completed' as const,
      eventData: { activityName: '写代码', duration: 45 },
    },
    {
      name: '深夜工作',
      eventType: 'overwork_detected' as const,
      eventData: { duration: 180 },
    },
    {
      name: '记录心情',
      eventType: 'mood_recorded' as const,
      eventData: { mood: '开心' },
    }
  ];

  const userContext = {
    todayActivities: 3,
    todayDuration: 120,
    currentHour: new Date().getHours(),
    recentAnnotations: []
  };

  for (const testCase of testCases) {
    console.log(`\n--- 测试: ${testCase.name} ---`);
    const startTime = Date.now();
    
    try {
      const result = await generateAnnotation({
        eventType: testCase.eventType,
        eventData: testCase.eventData,
        userContext
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ 成功 (${duration}ms)`);
      console.log(`📝 内容: ${result.content}`);
      console.log(`🎭 语气: ${result.tone}`);
      console.log(`⏱️ 显示时长: ${result.displayDuration}ms`);
      
      // 验证
      const checks = {
        '有内容': result.content.length > 0,
        '长度合理': result.content.length <= 80,
        '语气有效': ['playful', 'celebrating', 'concerned', 'curious'].includes(result.tone),
        '包含中文': /[\u4e00-\u9fa5]/.test(result.content),
        '包含emoji': /[\u{1F300}-\u{1F9FF}]/u.test(result.content)
      };
      
      console.log('✅ 验证:', checks);
      
    } catch (error) {
      console.error(`❌ 失败:`, error);
    }
  }
  
  console.log('\n🎉 测试完成!');
}

testMiniMaxAPI();
