# Supabase 타입 생성

테이블명: $ARGUMENTS

## 작업 순서

### 1단계: src/lib/types.ts에 타입 추가

**기본 타입 구조:**
```typescript
// ================================
// {TableName}
// ================================
export interface {TableName}Row {
  id: string
  // 컬럼들...
  created_at: string
  updated_at?: string
}

export type {TableName}Insert = Omit<{TableName}Row, 'id' | 'created_at' | 'updated_at'>
export type {TableName}Update = Partial<{TableName}Insert>
```

### 2단계: 관련 훅에서 타입 적용
해당 테이블을 사용하는 훅에 타입 import 및 적용

### 3단계: API 함수 타입 적용
`src/lib/api.ts` 에 관련 함수가 있으면 타입 적용

## 알려진 테이블 목록 (기존 PWA 기준)
- `profiles` — 사용자 프로필
- `daily_words` — 오늘의 말씀
- `qt_records` — QT 기록
- `prayers` — 기도 제목
- `prayer_responses` — 기도 응답
- `posts` — 커뮤니티 게시글
- `comments` — 댓글
- `likes` — 좋아요
- `groups` — 그룹
- `group_members` — 그룹 멤버
- `bible_reading_plans` — 성경 읽기 플랜
- `reading_progress` — 읽기 진도
- `user_terms_agreements` — 약관 동의
- `verse_favorites` — 즐겨찾기 구절

테이블 구조를 모르면 기존 코드에서 사용 패턴 추론해서 작성 후 확인 요청.
