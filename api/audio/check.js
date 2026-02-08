import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

export default async function handler(req, res) {
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
    const { fileName } = req.body;
    
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: "fileName이 필요합니다" 
      });
    }

    // 파일 존재 확인
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
      });

      await r2Client.send(command);
      
      // Public URL 반환
      const publicUrl = `${PUBLIC_URL}/${fileName}`;
      
      return res.json({ 
        success: true, 
        publicUrl 
      });
    } catch (error) {
      return res.status(404).json({ 
        success: false, 
        error: "파일이 존재하지 않습니다" 
      });
    }
  } catch (error) {
    console.error('Audio check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "조회 실패" 
    });
  }
}
