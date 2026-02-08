import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// 서버 라우트 등록 (초기화는 한 번만)
let routesRegistered = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Express 앱이 아직 초기화되지 않았으면 초기화
  if (!routesRegistered) {
    await registerRoutes(httpServer, app);
    routesRegistered = true;
  }

  // Express 앱으로 요청 전달
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
