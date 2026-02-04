-- Add verse_display_date column to meditations table
-- This column stores the display_date of the scripture card (daily_qt_verses) that the meditation references
-- This allows filtering meditations by the scripture card date, not the creation date

ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS verse_display_date DATE;

-- Create an index for better query performance when filtering by verse_display_date
CREATE INDEX IF NOT EXISTS idx_meditations_verse_display_date 
ON meditations(verse_display_date);

-- Optional: Add a comment to the column for documentation
COMMENT ON COLUMN meditations.verse_display_date IS 
'The display_date from daily_qt_verses table that this meditation references. Used to show meditations under the correct scripture card regardless of when they were written.';
