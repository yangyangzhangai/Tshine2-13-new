import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Chat API
 * 调用 Chutes AI (Hermes-4-405B-FP8-TEE) 进行对话
 * 
 * POST /api/chat
 * Body: { messages: [{ role: string, content: string }], temperature?: number, max_tokens?: number }
 */
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

  const { messages, temperature = 0.9, max_tokens = 512 } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Missing or invalid messages' });
    return;
  }

  const apiKey = process.env.CHUTES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server configuration error: Missing API key' });
    return;
  }

  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'NousResearch/Hermes-4-405B-FP8-TEE',
        messages,
        temperature,
        max_tokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chutes API error:', response.status, errorText);
      res.status(response.status).json({ 
        error: `AI service error: ${response.statusText}`,
        details: errorText
      });
      return;
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      res.status(502).json({ error: 'Empty response from AI service' });
      return;
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'Empty content from AI service' });
      return;
    }

    res.status(200).json({ 
      content: content.trim(),
      model: data.model,
      usage: data.usage
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
