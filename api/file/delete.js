import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

function extractR2Key(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;

  try {
    const url = new URL(fileUrl);
    const publicBase = PUBLIC_URL ? new URL(PUBLIC_URL) : null;

    if (publicBase) {
      if (url.origin !== publicBase.origin) return null;
      const basePath = publicBase.pathname.replace(/\/$/, '');
      const targetPath = url.pathname;
      if (!targetPath.startsWith(basePath + '/')) return null;
      return decodeURIComponent(targetPath.slice(basePath.length + 1));
    }

    return decodeURIComponent(url.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fileUrl } = req.body || {};

    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'fileUrl is required' });
    }

    const key = extractR2Key(fileUrl);

    // 카카오/외부 URL 등 R2 객체가 아닌 경우: 삭제 대상 없음으로 성공 처리
    if (!key) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);

    return res.status(200).json({ success: true, key });
  } catch (error) {
    console.error('file delete failed:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'delete failed',
    });
  }
}
