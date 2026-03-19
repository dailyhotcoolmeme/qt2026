# 코드 리뷰

리뷰 대상: $ARGUMENTS (비어있으면 최근 작업한 파일들 전체)

## 리뷰 체크리스트

### 🔴 Critical (반드시 수정)
- [ ] TypeScript `any` 사용 여부
- [ ] 환경변수 하드코딩 여부
- [ ] Supabase 에러 처리 누락
- [ ] useEffect cleanup 누락 (특히 Realtime 구독)
- [ ] 민감 정보 콘솔 출력 여부

### 🟡 Warning (강력 권장)
- [ ] 파일당 200줄 초과 여부
- [ ] 비즈니스 로직이 화면 컴포넌트에 있는지
- [ ] FlatList 없이 map() 으로 리스트 렌더링하는지
- [ ] TouchableOpacity 사용 여부 (Pressable로 교체)
- [ ] expo-image 대신 RN Image 사용 여부
- [ ] 인라인 스타일 과다 사용 여부

### 🔵 네이티브 UX
- [ ] Safe area 적용 여부
- [ ] 키보드 회피 처리 (텍스트 입력 화면)
- [ ] Android 하드웨어 백버튼 처리
- [ ] FlatList keyExtractor 설정
- [ ] 이미지 로딩 placeholder/blur 처리
- [ ] 로딩/에러/빈 상태 UI 존재 여부
- [ ] 햅틱 피드백 (중요 액션)

### 🟢 성능
- [ ] useCallback/useMemo 과도하게 사용 여부 (불필요한 최적화)
- [ ] 불필요한 리렌더링 (객체/배열을 props로 직접 전달)
- [ ] FlatList getItemLayout 설정 (고정 높이 아이템)
- [ ] 이미지 cachePolicy 설정

## 출력 형식
각 문제에 대해:
1. 파일명 + 줄 번호
2. 문제 설명
3. 수정 코드 제시

수정이 필요한 경우 바로 수정 진행 여부 물어보기.
