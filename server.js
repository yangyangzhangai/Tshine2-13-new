/**
 * Express Server for Zeabur Deployment
 * 托管静态文件 + API 路由
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));

// CORS 中间件
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// API 路由
import annotationHandler from './api/annotation.ts';
import classifyHandler from './api/classify.ts';
import chatHandler from './api/chat.ts';
import diaryHandler from './api/diary.ts';
import reportHandler from './api/report.ts';

app.post('/api/annotation', annotationHandler);
app.post('/api/classify', classifyHandler);
app.post('/api/chat', chatHandler);
app.post('/api/diary', diaryHandler);
app.post('/api/report', reportHandler);

// 静态文件服务 (dist 目录)
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 路由回退 - 所有非 API 路由返回 index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🔌 API endpoints available at /api/*`);
});
