import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fileName, fileBase64, contentType } = req.body || {};

    if (!fileName || !fileBase64) {
      return res.status(400).json({
        success: false,
        error: 'fileName and fileBase64 are required',
      });
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType || 'application/octet-stream',
    });

    await r2Client.send(command);

    return res.status(200).json({
      success: true,
      publicUrl: `${PUBLIC_URL}/${fileName}`,
    });
  } catch (error) {
    console.error('file upload failed:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'upload failed',
    });
  }
}
