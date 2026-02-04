# Database Migrations

This directory contains SQL migration files for the Supabase database.

## How to Apply Migrations

### Method 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute in the SQL Editor

### Method 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

## Current Migrations

### add_verse_display_date_to_meditations.sql
**Purpose**: Adds `verse_display_date` column to the `meditations` table to properly associate meditation posts with scripture cards by their display date.

**Why**: 
- Users can write meditation posts about any scripture card regardless of the current date
- Previously, posts were filtered by `created_at` (when written)
- Now posts are filtered by `verse_display_date` to show them under the scripture card they reference

**Changes**:
- Adds `verse_display_date` DATE column to `meditations` table
- Creates an index on `verse_display_date` for query performance
- Adds column documentation comment

**Required**: Yes - The application code expects this column to exist.
