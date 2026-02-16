import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 클라이언트 설정
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

/**
 * R2에 오디오 파일 업로드
 */
export async function uploadAudioToR2(
  fileName: string,
  audioBuffer: Uint8Array,
  contentType: string = "audio/mp3"
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  return uploadFileToR2(fileName, audioBuffer, contentType);
}

/**
 * R2에 임의 파일 업로드
 */
export async function uploadFileToR2(
  fileName: string,
  fileBuffer: Uint8Array,
  contentType: string = "application/octet-stream"
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Public URL 반환
    const publicUrl = `${PUBLIC_URL}/${fileName}`;
    
    return {
      success: true,
      publicUrl,
    };
  } catch (error) {
    console.error("R2 업로드 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

/**
 * R2에서 파일 존재 여부 확인
 */
export async function checkAudioExistsInR2(fileName: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * R2 파일의 Public URL 반환
 */
export function getR2PublicUrl(fileName: string): string {
  return `${PUBLIC_URL}/${fileName}`;
}

/**
 * R2에서 파일 삭제
 */
export async function deleteAudioFromR2(
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[R2 deleteAudioFromR2] 삭제 시도:', fileName);
    console.log('[R2 deleteAudioFromR2] Bucket:', BUCKET_NAME);
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const result = await r2Client.send(command);
    console.log('[R2 deleteAudioFromR2] AWS SDK 응답:', result);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('[R2 deleteAudioFromR2] 삭제 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}
