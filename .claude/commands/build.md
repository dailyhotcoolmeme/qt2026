# EAS Build 실행

빌드 타입: $ARGUMENTS

## 빌드 타입별 명령어

### development (Expo Go 대체, 실기기 테스트용)
```bash
npx eas build --profile development --platform all
```
- 개발 중 실기기 테스트
- 카카오 로그인 테스트 가능
- JS 번들 로컬에서 서빙

### preview (내부 배포용 APK/IPA)
```bash
# 둘 다
npx eas build --profile preview --platform all

# Android만 (APK)
npx eas build --profile preview --platform android

# iOS만 (시뮬레이터)
npx eas build --profile preview --platform ios
```
- 팀 내부 테스트용
- Android: APK 직접 설치
- iOS: TestFlight 업로드 전 단계

### production (스토어 제출용)
```bash
npx eas build --profile production --platform all
```
- App Store / Play Store 제출용
- 반드시 버전/빌드번호 올리고 실행

## 빌드 전 체크리스트
- [ ] .env 환경변수 EAS Secret에 등록됐는지 확인
  ```bash
  npx eas secret:list
  ```
- [ ] app.json 버전/빌드번호 올렸는지 확인
- [ ] TypeScript 에러 없는지 확인
  ```bash
  npx tsc --noEmit
  ```
- [ ] CLAUDE.md 현재 Phase 업데이트

## EAS Secret 등록 (최초 1회)
```bash
npx eas secret:create --scope project --name SUPABASE_URL --value "your-url"
npx eas secret:create --scope project --name SUPABASE_ANON_KEY --value "your-key"
```

## 빌드 상태 확인
```bash
npx eas build:list
```
