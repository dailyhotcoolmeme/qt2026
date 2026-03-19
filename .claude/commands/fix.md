# 버그 수정

에러/문제: $ARGUMENTS

## 작업 순서

### 1단계: 원인 분석
- 에러 메시지 읽기
- 관련 파일 확인
- 원인 가설 1~3개 제시

### 2단계: 수정
- 가장 유력한 원인부터 수정
- 수정 전/후 코드 명확히 표시

### 3단계: 검증
- TypeScript 타입 체크 통과 여부
- 관련 화면에서 실제 동작 확인 방법 안내

## 자주 발생하는 에러 패턴

### Metro Bundler 에러
```
# 캐시 초기화
npx expo start --clear
```

### TypeScript 에러
- `Object is possibly 'null'` → 옵셔널 체이닝 또는 조건부 렌더링
- `Type 'X' is not assignable to type 'Y'` → 타입 정의 확인

### Supabase 에러
- `row-level security` → RLS 정책 확인 필요 (백엔드팀 이슈)
- `JWT expired` → 세션 갱신 로직 확인

### Navigation 에러
- `undefined is not an object (evaluating 'route.params.XXX')` → 파라미터 옵셔널 처리

### 이미지 에러
- Android에서 이미지 안 보임 → `contentFit` prop 확인
- R2 이미지 403 → CORS 설정 또는 URL 확인
