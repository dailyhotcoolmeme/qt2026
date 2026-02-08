import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileName, audioBase64 } = req.body;
    
    if (!fileName || !audioBase64) {
      return res.status(400).json({ 
        success: false, 
        error: "fileName과 audioBase64가 필요합니다" 
      });
    }

    // Base64 디코딩
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // R2에 업로드
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: audioBuffer,
      ContentType: 'audio/mp3',
    });

    await r2Client.send(command);

    // Public URL 반환
    const publicUrl = `${PUBLIC_URL}/${fileName}`;
    
    return res.json({
      success: true,
      publicUrl,
    });
  } catch (error) {
    console.error('R2 업로드 실패:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "알 수 없는 오류" 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
