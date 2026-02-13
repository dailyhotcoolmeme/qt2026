-- Add new fields to prayer_records table for STT and metadata
ALTER TABLE prayer_records
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;

-- Add index for searching by hashtags
CREATE INDEX IF NOT EXISTS idx_prayer_records_hashtags ON prayer_records USING GIN (hashtags);

-- Add index for full-text search on transcription (using simple or english)
CREATE INDEX IF NOT EXISTS idx_prayer_records_transcription ON prayer_records USING GIN (to_tsvector('simple', COALESCE(transcription, '')));
