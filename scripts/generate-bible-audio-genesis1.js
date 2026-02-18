import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function loadEnvFile(envPath) {
  return fs
    .readFile(envPath, "utf8")
    .then((raw) => {
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx <= 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    })
    .catch(() => {});
}

function getEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function requireEnv(name, ...keys) {
  const value = getEnv(...keys);
  if (!value) {
    throw new Error(`Missing env for ${name}: tried ${keys.join(", ")}`);
  }
  return value;
}

function pad3(num) {
  return String(num).padStart(3, "0");
}

function toKoreanNumber(num) {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return String(num);

  const ones = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const tens = ["", "십", "이십", "삼십", "사십", "오십", "육십", "칠십", "팔십", "구십"];

  if (n < 10) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${ones[o]}`;
  }

  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundredPart = `${ones[h]}백`;
  if (rest === 0) return hundredPart;
  return `${hundredPart}${toKoreanNumber(rest)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { ...options, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseWav(buffer) {
  if (buffer.length < 44) throw new Error("Invalid WAV: too short");
  if (buffer.toString("ascii", 0, 4) !== "RIFF") throw new Error("Invalid WAV: missing RIFF");
  if (buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV: missing WAVE");

  let offset = 12;
  let fmt = null;
  let dataStart = -1;
  let dataSize = -1;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkSize;

    if (chunkDataEnd > buffer.length) break;

    if (chunkId === "fmt ") {
      fmt = {
        audioFormat: buffer.readUInt16LE(chunkDataStart),
        channels: buffer.readUInt16LE(chunkDataStart + 2),
        sampleRate: buffer.readUInt32LE(chunkDataStart + 4),
        byteRate: buffer.readUInt32LE(chunkDataStart + 8),
        blockAlign: buffer.readUInt16LE(chunkDataStart + 12),
        bitsPerSample: buffer.readUInt16LE(chunkDataStart + 14),
      };
    } else if (chunkId === "data") {
      dataStart = chunkDataStart;
      dataSize = chunkSize;
    }

    offset = chunkDataEnd + (chunkSize % 2);
  }

  if (!fmt || dataStart < 0 || dataSize < 0) {
    throw new Error("Invalid WAV: missing fmt/data chunk");
  }
  if (fmt.audioFormat !== 1) {
    throw new Error(`Unsupported WAV format: audioFormat=${fmt.audioFormat}, expected PCM (1)`);
  }

  const samples = Math.floor(dataSize / fmt.blockAlign);
  const durationMs = Math.round((samples / fmt.sampleRate) * 1000);
  const data = buffer.subarray(dataStart, dataStart + dataSize);

  return {
    channels: fmt.channels,
    sampleRate: fmt.sampleRate,
    bitsPerSample: fmt.bitsPerSample,
    blockAlign: fmt.blockAlign,
    byteRate: fmt.byteRate,
    samples,
    durationMs,
    data,
  };
}

function createWav(format, pcmChunks) {
  const dataSize = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = Buffer.allocUnsafe(44 + dataSize);
  out.write("RIFF", 0, 4, "ascii");
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8, 4, "ascii");
  out.write("fmt ", 12, 4, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(format.channels, 22);
  out.writeUInt32LE(format.sampleRate, 24);
  out.writeUInt32LE(format.byteRate, 28);
  out.writeUInt16LE(format.blockAlign, 32);
  out.writeUInt16LE(format.bitsPerSample, 34);
  out.write("data", 36, 4, "ascii");
  out.writeUInt32LE(dataSize, 40);

  let cursor = 44;
  for (const chunk of pcmChunks) {
    chunk.copy(out, cursor);
    cursor += chunk.length;
  }
  return out;
}

async function naverTtsToWav({
  clientId,
  clientSecret,
  speaker,
  speed,
  pitch,
  volume,
  text,
}) {
  const body = new URLSearchParams({
    speaker,
    speed: String(speed),
    pitch: String(pitch),
    volume: String(volume),
    format: "wav",
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
    throw new Error(`Naver TTS failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function run() {
  await loadEnvFile(path.join(ROOT_DIR, ".env"));
  await loadEnvFile(path.join(ROOT_DIR, "client", ".env"));

  const ffmpegPath = getEnv("FFMPEG_PATH") || "ffmpeg";
  try {
    await execFileAsync(ffmpegPath, ["-version"]);
  } catch (error) {
    throw new Error(
      `ffmpeg not found. Install ffmpeg or set FFMPEG_PATH. Original error: ${error.message}`
    );
  }

  const supabaseUrl = requireEnv("SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY"
  );

  const naverClientId = requireEnv(
    "NAVER TTS Client ID",
    "NAVER_TTS_CLIENT_ID",
    "NAVER_CLIENT_ID",
    "NCP_CLIENT_ID"
  );
  const naverClientSecret = requireEnv(
    "NAVER TTS Client Secret",
    "NAVER_TTS_CLIENT_SECRET",
    "NAVER_CLIENT_SECRET",
    "NCP_CLIENT_SECRET"
  );

  const r2Endpoint = requireEnv("R2 endpoint", "R2_ENDPOINT", "VITE_R2_ENDPOINT");
  const r2AccessKeyId = requireEnv("R2 access key", "R2_ACCESS_KEY_ID", "VITE_R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = requireEnv(
    "R2 secret key",
    "R2_SECRET_ACCESS_KEY",
    "VITE_R2_SECRET_ACCESS_KEY"
  );
  const r2BucketName = requireEnv("R2 bucket", "R2_BUCKET_NAME", "VITE_R2_BUCKET_NAME");
  const r2PublicUrl = requireEnv("R2 public url", "R2_PUBLIC_URL", "VITE_R2_PUBLIC_URL");

  const speaker = getEnv("NAVER_TTS_SPEAKER") || "nsunkyung";
  const speed = Number(getEnv("NAVER_TTS_SPEED") || "1");
  const pitch = Number(getEnv("NAVER_TTS_PITCH") || "0");
  const volume = Number(getEnv("NAVER_TTS_VOLUME") || "0");
  const verseGapMs = Number(getEnv("BIBLE_AUDIO_VERSE_GAP_MS") || "450");
  const introGapMs = Number(getEnv("BIBLE_AUDIO_CHAPTER_INTRO_GAP_MS") || String(verseGapMs));
  const requestDelayMs = Number(getEnv("NAVER_TTS_REQUEST_DELAY_MS") || "150");
  const aacBitrate = getEnv("BIBLE_AUDIO_AAC_BITRATE") || "48k";
  const audioVersion = getEnv("BIBLE_AUDIO_VERSION") || "v1";
  const voiceTag = getEnv("BIBLE_AUDIO_VOICE_TAG") || speaker;

  const target = {
    testament: "OT",
    bookId: 1,
    chapter: 1,
  };

  const supabase = createClient(supabaseUrl, supabaseKey);
  const r2Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  const { data: verses, error: versesError } = await supabase
    .from("bible_verses")
    .select("testament,book_id,book_name,chapter,verse,content")
    .eq("testament", target.testament)
    .eq("book_id", target.bookId)
    .eq("chapter", target.chapter)
    .order("verse", { ascending: true });

  if (versesError) {
    throw new Error(`Failed to load verses: ${versesError.message}`);
  }
  if (!verses || verses.length === 0) {
    throw new Error("No verses found for Genesis 1");
  }

  const tempDir = path.join(ROOT_DIR, ".tmp", "bible-audio", target.testament, `b${pad3(target.bookId)}`, `c${pad3(target.chapter)}`);
  await fs.mkdir(tempDir, { recursive: true });

  console.log(`Generating TTS for ${verses[0].book_name} ${target.chapter} (${verses.length} verses)`);

  let wavFormat = null;
  let totalSamples = 0;
  const pcmChunks = [];
  const verseTimings = [];
  const chapterLabelUnit = verses[0].book_name === "시편" ? "편" : "장";
  const chapterIntroText = `${verses[0].book_name} ${toKoreanNumber(target.chapter)}${chapterLabelUnit}.`;

  const introWavBuffer = await naverTtsToWav({
    clientId: naverClientId,
    clientSecret: naverClientSecret,
    speaker,
    speed,
    pitch,
    volume,
    text: chapterIntroText,
  });
  const introParsed = parseWav(introWavBuffer);
  wavFormat = {
    channels: introParsed.channels,
    sampleRate: introParsed.sampleRate,
    bitsPerSample: introParsed.bitsPerSample,
    blockAlign: introParsed.blockAlign,
    byteRate: introParsed.byteRate,
  };
  pcmChunks.push(introParsed.data);
  totalSamples += introParsed.samples;
  await fs.writeFile(path.join(tempDir, "intro.wav"), introWavBuffer);
  console.log(`  intro "${chapterIntroText}": ${introParsed.durationMs}ms`);

  if (introGapMs > 0) {
    const introGapSamples = Math.round((introGapMs / 1000) * introParsed.sampleRate);
    const introGapBytes = introGapSamples * introParsed.blockAlign;
    pcmChunks.push(Buffer.alloc(introGapBytes));
    totalSamples += introGapSamples;
  }

  for (let i = 0; i < verses.length; i += 1) {
    const row = verses[i];
    const verseNo = Number(row.verse);
    const text = String(row.content || "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const wavBuffer = await naverTtsToWav({
      clientId: naverClientId,
      clientSecret: naverClientSecret,
      speaker,
      speed,
      pitch,
      volume,
      text,
    });

    const parsed = parseWav(wavBuffer);
    if (wavFormat) {
      if (
        wavFormat.channels !== parsed.channels ||
        wavFormat.sampleRate !== parsed.sampleRate ||
        wavFormat.bitsPerSample !== parsed.bitsPerSample
      ) {
        throw new Error(
          `Inconsistent WAV format at verse ${verseNo}: ` +
            `${parsed.sampleRate}Hz/${parsed.channels}ch/${parsed.bitsPerSample}bit`
        );
      }
    } else {
      wavFormat = {
        channels: parsed.channels,
        sampleRate: parsed.sampleRate,
        bitsPerSample: parsed.bitsPerSample,
        blockAlign: parsed.blockAlign,
        byteRate: parsed.byteRate,
      };
    }

    const startSample = totalSamples;
    const endSample = totalSamples + parsed.samples;
    verseTimings.push({
      verse: verseNo,
      start_sample: startSample,
      end_sample: endSample,
      start_ms: Math.round((startSample / parsed.sampleRate) * 1000),
      end_ms: Math.round((endSample / parsed.sampleRate) * 1000),
      duration_sample: parsed.samples,
      duration_ms: parsed.durationMs,
    });

    totalSamples = endSample;
    pcmChunks.push(parsed.data);
    await fs.writeFile(path.join(tempDir, `v${pad3(verseNo)}.wav`), wavBuffer);
    console.log(`  verse ${verseNo}: ${parsed.durationMs}ms`);

    // Add a short pause between verses for more natural chapter playback.
    if (i < verses.length - 1 && verseGapMs > 0) {
      const gapSamples = Math.round((verseGapMs / 1000) * parsed.sampleRate);
      const gapBytes = gapSamples * parsed.blockAlign;
      pcmChunks.push(Buffer.alloc(gapBytes));
      totalSamples += gapSamples;
    }

    await sleep(requestDelayMs);
  }

  if (!wavFormat || pcmChunks.length === 0) {
    throw new Error("No audio generated");
  }

  const mergedWav = createWav(wavFormat, pcmChunks);
  const mergedWavPath = path.join(tempDir, "chapter.wav");
  const mergedM4aPath = path.join(tempDir, "chapter.m4a");
  await fs.writeFile(mergedWavPath, mergedWav);

  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    mergedWavPath,
    "-ac",
    "1",
    "-ar",
    String(wavFormat.sampleRate),
    "-c:a",
    "aac",
    "-b:a",
    aacBitrate,
    mergedM4aPath,
  ]);

  const encodedBuffer = await fs.readFile(mergedM4aPath);
  const audioKey = `audio/bible/${audioVersion}/${voiceTag}/${target.testament}/b${pad3(target.bookId)}/c${pad3(target.chapter)}.m4a`;
  const audioUrl = `${r2PublicUrl}/${audioKey}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: audioKey,
      Body: encodedBuffer,
      ContentType: "audio/mp4",
    })
  );

  const chapterDurationMs = Math.round((totalSamples / wavFormat.sampleRate) * 1000);
  const metadataPayload = {
    schema_version: 1,
    format: "m4a",
    codec: "aac",
    audio_key: audioKey,
    sample_rate: wavFormat.sampleRate,
    channels: wavFormat.channels,
    bits_per_sample: wavFormat.bitsPerSample,
    voice_tag: voiceTag,
    tts_provider: "naver",
    tts_speaker: speaker,
    verses: verseTimings,
  };

  const { error: upsertError } = await supabase.from("bible_audio_metadata").upsert(
    {
      testament: target.testament,
      book_id: target.bookId,
      chapter: target.chapter,
      audio_url: audioUrl,
      verse_timings: metadataPayload,
      duration: chapterDurationMs,
    },
    { onConflict: "book_id,chapter" }
  );

  if (upsertError) {
    throw new Error(`Failed to upsert bible_audio_metadata: ${upsertError.message}`);
  }

  console.log("");
  console.log("Done.");
  console.log(`R2 key: ${audioKey}`);
  console.log(`R2 url: ${audioUrl}`);
  console.log(`Duration: ${chapterDurationMs}ms`);
  console.log(`Verses with timing: ${verseTimings.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
