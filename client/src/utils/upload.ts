import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2";

export const uploadFileToR2 = async (file: File, folder: string = "profiles") => {
  // 파일명 중복 방지를 위한 랜덤 접미사 추가
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });

    await r2Client.send(command);

    // 업로드된 파일의 최종 경로(URL) 반환
    return `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error("R2 업로드 실패:", error);
    throw error;
  }
};
