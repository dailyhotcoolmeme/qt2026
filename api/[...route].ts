import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import { createServer } from 'http';

// 전역 Express 앱 인스턴스
let app: express.Application | null = null;

async function getApp() {
  if (app) return app;

  app = express();
  const httpServer = createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // 서버 라우트 등록
  const { registerRoutes } = await import('../server/routes');
  await registerRoutes(httpServer, app);

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    
    // Express 앱으로 요청 전달
    return new Promise<void>((resolve, reject) => {
      app(req as any, res as any, (err?: any) => {
        if (err) {
          console.error('Express error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
