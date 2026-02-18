import { createHash } from "crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\d+\.?\s*/g, " ")
    .trim();
}

function safeKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function synthesizeNaverMp3({ text, speaker, speed, pitch, volume, clientId, clientSecret }) {
  const body = new URLSearchParams({
    speaker,
    speed: String(speed),
    pitch: String(pitch),
    volume: String(volume),
    format: "mp3",
    text,
  });

  const response = await fetch("https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts", {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Naver TTS failed (${response.status}): ${errText.slice(0, 240)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const text = normalizeText(req.body?.text || "");
    if (!text) return res.status(400).json({ error: "text is required" });

    const clientId = getEnv("NAVER_CLIENT_ID", "NAVER_TTS_CLIENT_ID", "NCP_CLIENT_ID");
    const clientSecret = getEnv("NAVER_CLIENT_SECRET", "NAVER_TTS_CLIENT_SECRET", "NCP_CLIENT_SECRET");
    const r2Endpoint = getEnv("R2_ENDPOINT", "VITE_R2_ENDPOINT");
    const r2AccessKeyId = getEnv("R2_ACCESS_KEY_ID", "VITE_R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = getEnv("R2_SECRET_ACCESS_KEY", "VITE_R2_SECRET_ACCESS_KEY");
    const r2BucketName = getEnv("R2_BUCKET_NAME", "VITE_R2_BUCKET_NAME");
    const r2PublicUrl = getEnv("R2_PUBLIC_URL", "VITE_R2_PUBLIC_URL");
    if (!clientId || !clientSecret || !r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !r2PublicUrl) {
      return res.status(500).json({ error: "missing env for naver/r2" });
    }

    const speaker = getEnv("NAVER_TTS_SPEAKER", "BIBLE_AUDIO_VOICE_TAG") || "nsunkyung";
    const speed = toInt(getEnv("NAVER_TTS_SPEED"), 1);
    const pitch = toInt(getEnv("NAVER_TTS_PITCH"), 0);
    const volume = toInt(getEnv("NAVER_TTS_VOLUME"), 0);

    const keyBase = safeKeyPart(req.body?.cacheKey || "");
    const digest = createHash("sha1").update(text).digest("hex").slice(0, 12);
    const objectKey = `audio/qt-cache/v1/${speaker}/${keyBase || digest}-${digest}.mp3`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    let cached = false;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: r2BucketName, Key: objectKey }));
      cached = true;
    } catch {}

    if (!cached) {
      const mp3 = await synthesizeNaverMp3({
        text,
        speaker,
        speed,
        pitch,
        volume,
        clientId,
        clientSecret,
      });
      await s3.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: objectKey,
          Body: mp3,
          ContentType: "audio/mpeg",
        })
      );
    }

    const baseUrl = r2PublicUrl.replace(/\/+$/, "");
    return res.status(200).json({
      audio_url: `${baseUrl}/${objectKey}`,
      cached,
      object_key: objectKey,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "unknown error" });
  }
}

