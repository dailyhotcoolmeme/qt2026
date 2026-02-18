import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function toBool(value, fallback = false) {
  if (!value) return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return fallback;
}

function toInt(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}

function pad3(num) {
  return String(num).padStart(3, "0");
}

function toKoreanNumber(num) {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return String(num);

  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const units = ["", "십", "백", "천"];
  const chars = String(n).split("").map((c) => Number(c));
  const len = chars.length;
  let out = "";

  for (let i = 0; i < len; i += 1) {
    const digit = chars[i];
    if (digit === 0) continue;
    const pos = len - i - 1;
    const unit = units[pos] || "";
    if (digit === 1 && pos > 0) {
      out += unit;
    } else {
      out += `${digits[digit]}${unit}`;
    }
  }
  return out || "영";
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function sanitizeForNaver(text, level = 1) {
  let s = cleanText(text).normalize("NFKC");
  s = s
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[{}[\]]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[·•]/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  if (level >= 2) {
    s = s
      .replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ\s.,!?;:()'"-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (level >= 3) {
    s = s
      .replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return s;
}

function splitLongToken(text, maxChars) {
  const out = [];
  let left = text;
  while (left.length > maxChars) {
    out.push(left.slice(0, maxChars));
    left = left.slice(maxChars);
  }
  if (left.length) out.push(left);
  return out;
}

function splitTextForTts(text, maxChars) {
  const source = cleanText(text);
  if (!source) return [];
  if (source.length <= maxChars) return [source];

  const hardSentences = source
    .split(/(?<=[.!?。！？])\s+/)
    .flatMap((s) => s.split(/(?<=,|，|;|；)\s+/))
    .map((s) => s.trim())
    .filter(Boolean);

  const units = hardSentences.length ? hardSentences : [source];
  const out = [];
  let cur = "";

  for (const unit of units) {
    if (unit.length > maxChars) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      out.push(...splitLongToken(unit, maxChars));
      continue;
    }
    if (!cur) {
      cur = unit;
      continue;
    }
    if (cur.length + 1 + unit.length <= maxChars) {
      cur += ` ${unit}`;
    } else {
      out.push(cur);
      cur = unit;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function splitByBraceBoundary(text) {
  const source = cleanText(text);
  if (!source) return [];

  const parts = [];
  let cursor = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "}") {
      const chunk = source.slice(cursor, i + 1).replace(/[{}]/g, " ").trim();
      if (chunk) parts.push({ text: chunk, addPauseAfter: true });
      cursor = i + 1;
    }
  }

  const tail = source.slice(cursor).replace(/[{}]/g, " ").trim();
  if (tail) parts.push({ text: tail, addPauseAfter: false });
  if (!parts.length) return [{ text: source, addPauseAfter: false }];
  parts[parts.length - 1].addPauseAfter = false;
  return parts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadEnvFromText(text) {
  for (const line of text.split(/\r?\n/)) {
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
}

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    loadEnvFromText(raw);
  } catch {}
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
  if (!value) throw new Error(`Missing env for ${name}: ${keys.join(", ")}`);
  return value;
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
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + size;
    if (chunkEnd > buffer.length) break;

    if (id === "fmt ") {
      fmt = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        byteRate: buffer.readUInt32LE(chunkStart + 8),
        blockAlign: buffer.readUInt16LE(chunkStart + 12),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (id === "data") {
      dataStart = chunkStart;
      dataSize = size;
    }
    offset = chunkEnd + (size % 2);
  }

  if (!fmt || dataStart < 0 || dataSize < 0) throw new Error("Invalid WAV: missing fmt/data");
  if (fmt.audioFormat !== 1) throw new Error(`Unsupported WAV format ${fmt.audioFormat}`);

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
  const dataSize = pcmChunks.reduce((sum, c) => sum + c.length, 0);
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
    throw new Error(`Naver TTS failed (${response.status}): ${errText.slice(0, 280)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeTextSegments(text, config, chapterLabel, verseLabel) {
  const attempts = [sanitizeForNaver(text, 1), sanitizeForNaver(text, 2), sanitizeForNaver(text, 3)]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  if (!attempts.length) return [];
  const out = [];
  let finalError = null;

  for (let sanitizeIdx = 0; sanitizeIdx < attempts.length; sanitizeIdx += 1) {
    const candidateText = attempts[sanitizeIdx];
    const segments = splitTextForTts(candidateText, config.naverMaxChars);
    if (!segments.length) continue;

    out.length = 0;
    let candidateFailed = false;

    for (let idx = 0; idx < segments.length; idx += 1) {
      const segmentText = segments[idx];
      let lastError = null;

      for (let attempt = 1; attempt <= config.requestRetry; attempt += 1) {
        try {
          const wav = await naverTtsToWav({
            clientId: config.naverClientId,
            clientSecret: config.naverClientSecret,
            speaker: config.speaker,
            speed: config.speed,
            pitch: config.pitch,
            volume: config.volume,
            text: segmentText,
          });
          out.push(parseWav(wav));
          break;
        } catch (error) {
          lastError = error;
          if (attempt < config.requestRetry) {
            await sleep(config.retryBackoffMs * attempt);
          }
        }
      }

      if (lastError && out.length !== idx + 1) {
        finalError = lastError;
        candidateFailed = true;
        break;
      }
      await sleep(config.requestDelayMs);
    }

    if (!candidateFailed) return out;
  }

  throw new Error(
    `TTS failed at ${chapterLabel} ${verseLabel}: ${finalError ? finalError.message : "unknown"}`
  );
}

function ensureSameFormat(baseFormat, parsed, label) {
  if (!baseFormat) return;
  if (
    baseFormat.channels !== parsed.channels ||
    baseFormat.sampleRate !== parsed.sampleRate ||
    baseFormat.bitsPerSample !== parsed.bitsPerSample
  ) {
    throw new Error(
      `Inconsistent WAV format at ${label}: ${parsed.sampleRate}Hz/${parsed.channels}ch/${parsed.bitsPerSample}bit`
    );
  }
}

async function processChapter(chapterData, config, supabase, r2Client) {
  const { testament, bookId, chapter, bookName, verses } = chapterData;
  const chapterLabel = `${bookName} ${chapter}`;
  const tempDir = path.join(ROOT_DIR, ".tmp", "bible-audio", testament, `b${pad3(bookId)}`, `c${pad3(chapter)}`);
  await fs.mkdir(tempDir, { recursive: true });

  const unit = bookName === "시편" ? "편" : "장";
  const introText = `${bookName} ${toKoreanNumber(chapter)}${unit}.`;
  const pcmChunks = [];
  const verseTimings = [];
  let wavFormat = null;
  let totalSamples = 0;
  let splitVerseCount = 0;

  const introSegments = await synthesizeTextSegments(introText, config, chapterLabel, "intro");
  for (const segment of introSegments) {
    ensureSameFormat(wavFormat, segment, `${chapterLabel} intro`);
    if (!wavFormat) {
      wavFormat = {
        channels: segment.channels,
        sampleRate: segment.sampleRate,
        bitsPerSample: segment.bitsPerSample,
        blockAlign: segment.blockAlign,
        byteRate: segment.byteRate,
      };
    }
    pcmChunks.push(segment.data);
    totalSamples += segment.samples;
  }
  if (config.introGapMs > 0 && wavFormat) {
    const introGapSamples = Math.round((config.introGapMs / 1000) * wavFormat.sampleRate);
    pcmChunks.push(Buffer.alloc(introGapSamples * wavFormat.blockAlign));
    totalSamples += introGapSamples;
  }

  for (let i = 0; i < verses.length; i += 1) {
    const verseRow = verses[i];
    const verseNo = Number(verseRow.verse);
    const verseText = cleanText(verseRow.content);
    if (!verseText) continue;

    const startSample = totalSamples;
    let verseSamples = 0;
    const braceParts = splitByBraceBoundary(verseText);

    for (let p = 0; p < braceParts.length; p += 1) {
      const part = braceParts[p];
      const splitSegments = splitTextForTts(part.text, config.naverMaxChars);
      if (splitSegments.length > 1) splitVerseCount += 1;

      const parsedSegments = await synthesizeTextSegments(
        part.text,
        config,
        chapterLabel,
        `v${verseNo} part${p + 1}`
      );

      for (const parsed of parsedSegments) {
        ensureSameFormat(wavFormat, parsed, `${chapterLabel} verse ${verseNo}`);
        if (!wavFormat) {
          wavFormat = {
            channels: parsed.channels,
            sampleRate: parsed.sampleRate,
            bitsPerSample: parsed.bitsPerSample,
            blockAlign: parsed.blockAlign,
            byteRate: parsed.byteRate,
          };
        }
        pcmChunks.push(parsed.data);
        totalSamples += parsed.samples;
        verseSamples += parsed.samples;
      }

      if (part.addPauseAfter && config.braceGapMs > 0 && wavFormat) {
        const braceGapSamples = Math.round((config.braceGapMs / 1000) * wavFormat.sampleRate);
        pcmChunks.push(Buffer.alloc(braceGapSamples * wavFormat.blockAlign));
        totalSamples += braceGapSamples;
        verseSamples += braceGapSamples;
      }
    }

    const endSample = startSample + verseSamples;
    verseTimings.push({
      verse: verseNo,
      start_sample: startSample,
      end_sample: endSample,
      start_ms: Math.round((startSample / wavFormat.sampleRate) * 1000),
      end_ms: Math.round((endSample / wavFormat.sampleRate) * 1000),
      duration_sample: verseSamples,
      duration_ms: Math.round((verseSamples / wavFormat.sampleRate) * 1000),
    });

    if (i < verses.length - 1 && config.verseGapMs > 0) {
      const gapSamples = Math.round((config.verseGapMs / 1000) * wavFormat.sampleRate);
      pcmChunks.push(Buffer.alloc(gapSamples * wavFormat.blockAlign));
      totalSamples += gapSamples;
    }
  }

  if (!wavFormat || !verseTimings.length) {
    throw new Error(`No synthesized content for ${chapterLabel}`);
  }

  const chapterWavPath = path.join(tempDir, "chapter.wav");
  const chapterM4aPath = path.join(tempDir, "chapter.m4a");
  await fs.writeFile(chapterWavPath, createWav(wavFormat, pcmChunks));

  await execFileAsync(config.ffmpegPath, [
    "-y",
    "-i",
    chapterWavPath,
    "-ac",
    "1",
    "-ar",
    String(wavFormat.sampleRate),
    "-c:a",
    "aac",
    "-b:a",
    config.aacBitrate,
    chapterM4aPath,
  ]);

  const encodedBuffer = await fs.readFile(chapterM4aPath);
  const audioKey = `audio/bible/${config.audioVersion}/${config.voiceTag}/${testament}/b${pad3(bookId)}/c${pad3(chapter)}.m4a`;
  const audioUrl = `${config.r2PublicUrl}/${audioKey}`;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: config.r2BucketName,
      Key: audioKey,
      Body: encodedBuffer,
      ContentType: "audio/mp4",
    })
  );

  const durationMs = Math.round((totalSamples / wavFormat.sampleRate) * 1000);
  const metadataPayload = {
    schema_version: 3,
    format: "m4a",
    codec: "aac",
    audio_key: audioKey,
    sample_rate: wavFormat.sampleRate,
    channels: wavFormat.channels,
    bits_per_sample: wavFormat.bitsPerSample,
    voice_tag: config.voiceTag,
    tts_provider: "naver",
    tts_speaker: config.speaker,
    naver_speed: config.speed,
    verse_gap_ms: config.verseGapMs,
    brace_gap_ms: config.braceGapMs,
    chapter_intro_text: introText,
    chapter_intro_gap_ms: config.introGapMs,
    naver_max_chars: config.naverMaxChars,
    split_verse_count: splitVerseCount,
    verses: verseTimings,
  };

  const { error: upsertError } = await supabase.from("bible_audio_metadata").upsert(
    {
      testament,
      book_id: bookId,
      chapter,
      audio_url: audioUrl,
      verse_timings: metadataPayload,
      duration: durationMs,
    },
    { onConflict: "book_id,chapter" }
  );
  if (upsertError) {
    throw new Error(`Supabase upsert failed for ${chapterLabel}: ${upsertError.message}`);
  }

  if (!config.keepTemp) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  return {
    chapterLabel,
    verseCount: verseTimings.length,
    durationMs,
    splitVerseCount,
    audioKey,
  };
}

function inRange(chapter, filters) {
  if (filters.startBookId !== null) {
    if (chapter.bookId < filters.startBookId) return false;
    if (
      chapter.bookId === filters.startBookId &&
      filters.startChapter !== null &&
      chapter.chapter < filters.startChapter
    ) {
      return false;
    }
  }
  if (filters.endBookId !== null) {
    if (chapter.bookId > filters.endBookId) return false;
    if (
      chapter.bookId === filters.endBookId &&
      filters.endChapter !== null &&
      chapter.chapter > filters.endChapter
    ) {
      return false;
    }
  }
  return true;
}

async function run() {
  await loadEnvFile(path.join(ROOT_DIR, ".env"));
  await loadEnvFile(path.join(ROOT_DIR, "client", ".env"));

  const config = {
    ffmpegPath: getEnv("FFMPEG_PATH") || "ffmpeg",
    supabaseUrl: requireEnv("SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL"),
    supabaseKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"),
    naverClientId: requireEnv("NAVER_CLIENT_ID", "NAVER_TTS_CLIENT_ID", "NAVER_CLIENT_ID", "NCP_CLIENT_ID"),
    naverClientSecret: requireEnv(
      "NAVER_CLIENT_SECRET",
      "NAVER_TTS_CLIENT_SECRET",
      "NAVER_CLIENT_SECRET",
      "NCP_CLIENT_SECRET"
    ),
    speaker: getEnv("NAVER_TTS_SPEAKER") || "nsunkyung",
    speed: toInt(getEnv("NAVER_TTS_SPEED"), 1),
    pitch: toInt(getEnv("NAVER_TTS_PITCH"), 0),
    volume: toInt(getEnv("NAVER_TTS_VOLUME"), 0),
    requestDelayMs: toInt(getEnv("NAVER_TTS_REQUEST_DELAY_MS"), 150),
    requestRetry: Math.max(1, toInt(getEnv("NAVER_TTS_REQUEST_RETRY"), 3)),
    retryBackoffMs: toInt(getEnv("NAVER_TTS_RETRY_BACKOFF_MS"), 500),
    naverMaxChars: Math.max(100, toInt(getEnv("NAVER_TTS_MAX_CHARS"), 1500)),
    verseGapMs: toInt(getEnv("BIBLE_AUDIO_VERSE_GAP_MS"), 450),
    introGapMs: toInt(
      getEnv("BIBLE_AUDIO_CHAPTER_INTRO_GAP_MS"),
      toInt(getEnv("BIBLE_AUDIO_VERSE_GAP_MS"), 450)
    ),
    braceGapMs: toInt(
      getEnv("BIBLE_AUDIO_BRACE_GAP_MS"),
      toInt(getEnv("BIBLE_AUDIO_VERSE_GAP_MS"), 450)
    ),
    aacBitrate: getEnv("BIBLE_AUDIO_AAC_BITRATE") || "48k",
    audioVersion: getEnv("BIBLE_AUDIO_VERSION") || "v1",
    voiceTag: getEnv("BIBLE_AUDIO_VOICE_TAG") || (getEnv("NAVER_TTS_SPEAKER") || "nsunkyung"),
    targetTestament: (getEnv("BIBLE_AUDIO_TARGET_TESTAMENT") || "OT").toUpperCase(),
    skipExisting: toBool(getEnv("BIBLE_AUDIO_SKIP_EXISTING"), true),
    maxChapters: toInt(getEnv("BIBLE_AUDIO_MAX_CHAPTERS"), 0),
    keepTemp: toBool(getEnv("BIBLE_AUDIO_KEEP_TEMP"), false),
    r2Endpoint: requireEnv("R2_ENDPOINT", "R2_ENDPOINT", "VITE_R2_ENDPOINT"),
    r2AccessKeyId: requireEnv("R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID", "VITE_R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY", "VITE_R2_SECRET_ACCESS_KEY"),
    r2BucketName: requireEnv("R2_BUCKET_NAME", "R2_BUCKET_NAME", "VITE_R2_BUCKET_NAME"),
    r2PublicUrl: requireEnv("R2_PUBLIC_URL", "R2_PUBLIC_URL", "VITE_R2_PUBLIC_URL"),
  };

  await execFileAsync(config.ffmpegPath, ["-version"]).catch((error) => {
    throw new Error(`ffmpeg not found: ${error.message}`);
  });

  const startBookId = toInt(getEnv("BIBLE_AUDIO_START_BOOK_ID"), null);
  const startChapter = toInt(getEnv("BIBLE_AUDIO_START_CHAPTER"), null);
  const endBookId = toInt(getEnv("BIBLE_AUDIO_END_BOOK_ID"), null);
  const endChapter = toInt(getEnv("BIBLE_AUDIO_END_CHAPTER"), null);

  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const r2Client = new S3Client({
    region: "auto",
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });

  const rows = [];
  const pageSize = 1000;
  for (let page = 0; ; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("bible_verses")
      .select("testament,book_id,book_name,chapter,verse,content")
      .eq("testament", config.targetTestament)
      .order("book_id", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`Failed to load bible_verses page ${page + 1}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  if (!rows.length) throw new Error(`No rows found for testament=${config.targetTestament}`);

  const chapterMap = new Map();
  for (const row of rows) {
    const bookId = Number(row.book_id);
    const chapter = Number(row.chapter);
    const verse = Number(row.verse);
    if (!bookId || !chapter || !verse) continue;
    const key = `${bookId}:${chapter}`;
    if (!chapterMap.has(key)) {
      chapterMap.set(key, {
        testament: row.testament,
        bookId,
        chapter,
        bookName: row.book_name,
        verses: [],
      });
    }
    chapterMap.get(key).verses.push({
      verse,
      content: row.content,
    });
  }

  let chapters = Array.from(chapterMap.values())
    .filter((c) => inRange(c, { startBookId, startChapter, endBookId, endChapter }))
    .sort((a, b) => (a.bookId !== b.bookId ? a.bookId - b.bookId : a.chapter - b.chapter));

  if (config.maxChapters > 0) chapters = chapters.slice(0, config.maxChapters);
  if (!chapters.length) throw new Error("No target chapters matched current filters.");

  let skipSet = new Set();
  if (config.skipExisting) {
    const { data: existing, error: existingError } = await supabase
      .from("bible_audio_metadata")
      .select("book_id,chapter")
      .eq("testament", config.targetTestament);
    if (existingError) throw new Error(`Failed to load existing metadata: ${existingError.message}`);
    skipSet = new Set((existing || []).map((v) => `${v.book_id}:${v.chapter}`));
  }

  console.log(
    `Batch start testament=${config.targetTestament}, chapters=${chapters.length}, skipExisting=${config.skipExisting}, maxChars=${config.naverMaxChars}`
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const failList = [];

  for (let i = 0; i < chapters.length; i += 1) {
    const chapterData = chapters[i];
    const chapterKey = `${chapterData.bookId}:${chapterData.chapter}`;
    const chapterLabel = `${chapterData.bookName} ${chapterData.chapter}`;

    if (config.skipExisting && skipSet.has(chapterKey)) {
      skipped += 1;
      console.log(`[${i + 1}/${chapters.length}] skip ${chapterLabel} (already exists)`);
      continue;
    }

    console.log(`[${i + 1}/${chapters.length}] process ${chapterLabel}`);
    try {
      const result = await processChapter(chapterData, config, supabase, r2Client);
      processed += 1;
      console.log(
        `  done ${result.chapterLabel} duration=${result.durationMs}ms verses=${result.verseCount} splitVerses=${result.splitVerseCount}`
      );
    } catch (chapterError) {
      failed += 1;
      failList.push(`${chapterLabel}: ${chapterError.message}`);
      console.error(`  fail ${chapterLabel}: ${chapterError.message}`);
    }
  }

  console.log("");
  console.log("Batch finished.");
  console.log(`processed=${processed} skipped=${skipped} failed=${failed}`);
  if (failList.length) {
    console.log("Failures:");
    for (const item of failList) console.log(`- ${item}`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
