import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    
    if (!fileName) {
      return res.status(400).json({ 
        success: false, 
        error: "fileName이 필요합니다" 
      });
    }

    // Presigned URL 생성 (PUT 요청용)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: 'audio/mp3',
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Public URL
    const publicUrl = `${PUBLIC_URL}/${fileName}`;
    
    return res.json({
      success: true,
      uploadUrl,
      publicUrl,
    });
  } catch (error) {
    console.error('Presigned URL 생성 실패:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "알 수 없는 오류" 
    });
  }
}
