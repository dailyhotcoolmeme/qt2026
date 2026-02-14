import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export default async function handler(req, res) {
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
    const { sourceUrl, targetPath } = req.body;
    
    if (!sourceUrl || !targetPath) {
      return res.status(400).json({ 
        success: false, 
        error: "sourceUrl과 targetPath가 필요합니다" 
      });
    }

    console.log('[API] R2 파일 이동 요청');
    console.log('[API] Source:', sourceUrl);
    console.log('[API] Target:', targetPath);

    // Source URL에서 Key 추출
    let sourceKey = '';
    try {
      const url = new URL(sourceUrl);
      sourceKey = url.pathname.substring(1);
    } catch (e) {
      sourceKey = sourceUrl.split('/').slice(3).join('/');
    }

    console.log('[API] Source Key:', sourceKey);
    console.log('[API] Target Key:', targetPath);

    // 1. Copy (R2 내부에서 복사 - 빠름)
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: targetPath,
    });

    await r2Client.send(copyCommand);
    console.log('[API] Copy 완료');

    // 2. Delete source (temp 삭제)
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: sourceKey,
    });

    await r2Client.send(deleteCommand);
    console.log('[API] Source 삭제 완료');

    // 3. 새 Public URL 생성
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${targetPath}`;

    return res.json({
      success: true,
      publicUrl
    });
  } catch (error) {
    console.error('[API] R2 이동 실패:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "알 수 없는 오류" 
    });
  }
}
