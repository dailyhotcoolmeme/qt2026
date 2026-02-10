import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ 
        success: false, 
        error: "fileUrl이 필요합니다" 
      });
    }

    console.log('[API] R2 삭제 요청:', fileUrl);

    // Public URL에서 파일명 추출
    // 예: https://pub-xxx.r2.dev/audio/meditation/user_id/2026-02-09/qt_123.mp3
    // -> audio/meditation/user_id/2026-02-09/qt_123.mp3
    let fileName = '';
    
    try {
      const url = new URL(fileUrl);
      // pathname은 /audio/meditation/... 형태
      fileName = url.pathname.substring(1); // 첫 번째 / 제거
    } catch (e) {
      // URL 파싱 실패 시 기존 방식 사용
      fileName = fileUrl.split('/').slice(3).join('/');
    }
    
    console.log('[API] 추출된 파일명:', fileName);
    console.log('[API] Bucket:', BUCKET_NAME);
    
    // R2에서 삭제
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const result = await r2Client.send(command);
    console.log('[API] R2 삭제 성공:', result);

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error('[API] R2 삭제 실패:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "알 수 없는 오류" 
    });
  }
}
