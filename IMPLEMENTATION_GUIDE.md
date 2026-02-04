# 묵상 나눔 리스트 보여주기 수정 가이드

## 개요
이 변경사항은 묵상 나눔 글이 작성된 날짜가 아닌, 참조하는 말씀카드의 날짜를 기준으로 표시되도록 수정합니다.

## 변경 사항

### 1. 데이터베이스 마이그레이션 (필수)
Supabase 데이터베이스에 새로운 컬럼을 추가해야 합니다.

**적용 방법:**
1. Supabase 프로젝트 대시보드에 로그인
2. SQL Editor로 이동
3. `migrations/add_verse_display_date_to_meditations.sql` 파일의 내용을 복사하여 실행

**SQL 내용:**
```sql
ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS verse_display_date DATE;

CREATE INDEX IF NOT EXISTS idx_meditations_verse_display_date 
ON meditations(verse_display_date);
```

### 2. 코드 변경사항

#### 변경 전 (문제점)
- 묵상 글을 `created_at` (작성 시간)으로 필터링
- 오늘 작성된 글만 표시되고, 말씀카드를 바꿔도 글이 그대로 표시됨

#### 변경 후 (해결)
- 묵상 글을 `verse_display_date` (참조하는 말씀카드의 날짜)로 필터링
- 각 말씀카드의 날짜에 맞는 묵상 글만 표시됨

### 3. 주요 변경 파일

#### `client/src/lib/supabase.ts`
- TypeScript 타입 정의를 실제 데이터베이스 스키마와 일치하도록 수정
- `verse_display_date` 필드 추가

#### `client/src/pages/QTPage.tsx`
- **묵상 글 작성 시:** `verse_display_date` 저장 (line 145)
  ```typescript
  verse_display_date: bibleData?.display_date || null
  ```

- **묵상 글 조회 시:** `verse_display_date`로 필터링 (line 280)
  ```typescript
  .eq('verse_display_date', formattedDate)
  ```

## 작동 방식

### 이전 방식
```
1. 사용자가 2일 전 말씀카드를 보면서 오늘 묵상을 작성
2. 묵상이 오늘 날짜의 created_at으로 저장됨
3. 2일 전 말씀카드를 보면 → 오늘 작성된 글이 보이지 않음 ❌
4. 오늘 말씀카드를 보면 → 2일 전 말씀에 대한 글이 보임 ❌
```

### 새로운 방식
```
1. 사용자가 2일 전 말씀카드를 보면서 오늘 묵상을 작성
2. 묵상이 verse_display_date='2일 전 날짜'로 저장됨
3. 2일 전 말씀카드를 보면 → 오늘 작성된 글이 보임 ✅
4. 오늘 말씀카드를 보면 → 오늘 말씀에 대한 글만 보임 ✅
```

## 테스트 방법

### 1. 마이그레이션 적용 확인
Supabase SQL Editor에서 실행:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meditations' 
AND column_name = 'verse_display_date';
```

### 2. 기능 테스트
1. 오늘 날짜가 아닌 과거 날짜의 말씀카드 선택
2. 묵상 나눔 글 작성
3. 다른 날짜로 말씀카드 변경
4. 다시 해당 날짜로 돌아가기
5. 작성한 글이 올바른 날짜의 말씀카드 아래에 표시되는지 확인

### 3. 기존 데이터 마이그레이션 (선택사항)
기존에 작성된 묵상 글들은 `verse_display_date`가 NULL입니다. 
필요한 경우 기존 글들의 verse 필드를 파싱하여 해당 날짜를 찾아 업데이트할 수 있습니다.

## 주의사항
- 데이터베이스 마이그레이션을 먼저 적용해야 합니다
- 기존에 작성된 묵상 글들은 `verse_display_date`가 NULL이므로 표시되지 않을 수 있습니다
- 필요시 기존 데이터의 마이그레이션 스크립트를 별도로 작성해야 합니다

## 문제 해결
만약 마이그레이션 후에도 글이 표시되지 않는다면:
1. 브라우저 콘솔에서 Supabase 쿼리 오류 확인
2. 데이터베이스에서 `verse_display_date` 컬럼이 올바르게 추가되었는지 확인
3. 새로운 글을 작성하여 테스트 (기존 글은 NULL일 수 있음)
