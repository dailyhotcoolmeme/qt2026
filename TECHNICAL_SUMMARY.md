# Technical Summary: Meditation List Filtering Fix

## Problem
Meditation posts were being filtered by **when they were written** (`created_at`), not by **which scripture card they reference**.

### Example of the Issue:
```
Day 1 Scripture Card: "Genesis 1:1"
Day 2 Scripture Card: "Exodus 2:1"
Day 3 Scripture Card: "Leviticus 3:1"

User writes meditation about "Genesis 1:1" on Day 3
→ Saved with created_at = Day 3
→ When viewing Day 1 card: meditation doesn't show ❌
→ When viewing Day 3 card: meditation shows (wrong!) ❌
```

## Solution
Add `verse_display_date` column to track **which scripture card** the meditation references.

### New Behavior:
```
Day 1 Scripture Card: "Genesis 1:1" (display_date = 2024-01-01)
Day 2 Scripture Card: "Exodus 2:1" (display_date = 2024-01-02)
Day 3 Scripture Card: "Leviticus 3:1" (display_date = 2024-01-03)

User writes meditation about "Genesis 1:1" on Day 3
→ Saved with:
   - created_at = 2024-01-03 (when written)
   - verse_display_date = 2024-01-01 (which card it's about)
→ When viewing Day 1 card: meditation shows ✅
→ When viewing Day 3 card: meditation doesn't show ✅
```

## Code Changes

### 1. Database Schema
```sql
ALTER TABLE meditations 
ADD COLUMN verse_display_date DATE;
```

### 2. When Creating Meditation (QTPage.tsx line 145)
**Before:**
```typescript
.insert({
  user_id: user.id,
  user_nickname: user?.nickname ?? '회원',
  is_anonymous: isAnonymous,
  my_meditation: textContent,
  verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : null,
})
```

**After:**
```typescript
.insert({
  user_id: user.id,
  user_nickname: user?.nickname ?? '회원',
  is_anonymous: isAnonymous,
  my_meditation: textContent,
  verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : null,
  verse_display_date: bibleData?.display_date || null,  // ← NEW: Save scripture card date
})
```

### 3. When Fetching Meditations (QTPage.tsx line 280)
**Before:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data } = await supabase
  .from('meditations')
  .select(`id, user_id, user_nickname, is_anonymous, my_meditation, verse, created_at`)
  .gte('created_at', `${today}T00:00:00`)     // ← Filter by creation date
  .lt('created_at', `${today}T23:59:59`)      // ← Filter by creation date
  .order('created_at', { ascending: false });
```

**After:**
```typescript
const formattedDate = currentDate.toISOString().split('T')[0];  // ← Use viewing date
const { data } = await supabase
  .from('meditations')
  .select(`id, user_id, user_nickname, is_anonymous, my_meditation, verse, verse_display_date, created_at`)
  .eq('verse_display_date', formattedDate)    // ← Filter by scripture card date
  .order('created_at', { ascending: false });
```

## Files Changed
1. **client/src/lib/supabase.ts** - TypeScript types
2. **client/src/pages/QTPage.tsx** - Insert & query logic
3. **migrations/add_verse_display_date_to_meditations.sql** - Database migration
4. **migrations/migrate_existing_data.sql** - Optional data migration for existing records

## Impact on Existing Data
- ⚠️ **Existing meditations will have `verse_display_date = NULL`**
- They won't appear until migrated or `verse_display_date` is populated
- Use `migrations/migrate_existing_data.sql` to automatically populate based on `verse` field

## Testing Checklist
- [ ] Apply SQL migration to Supabase
- [ ] Create a meditation for today's scripture card
- [ ] Navigate to yesterday's scripture card
- [ ] Verify today's meditation doesn't show there
- [ ] Navigate back to today's card
- [ ] Verify today's meditation shows
- [ ] Create a meditation for yesterday's card while viewing it
- [ ] Verify it shows under yesterday's card, not today's
