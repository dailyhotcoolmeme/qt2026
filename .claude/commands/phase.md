# Phase 진행 관리

현재 Phase: $ARGUMENTS

## 지시사항

### 만약 $ARGUMENTS가 "done N" 형식이면 (예: `done 1`)
Phase N이 완료된 것으로 처리:
1. CLAUDE.md에서 해당 Phase의 모든 체크박스를 `[x]`로 업데이트
2. "현재 작업 상태" 섹션을 다음 Phase로 업데이트
3. 완료 요약 출력:
   ```
   ✅ Phase N 완료
   완료된 작업: (체크된 항목 나열)
   소요 시간: (예상)
   ```

### 만약 $ARGUMENTS가 "start N" 형식이면 (예: `start 2`)
Phase N 시작:
1. CLAUDE.md에서 해당 Phase 항목 확인
2. 첫 번째 미완료 작업부터 순서대로 진행
3. 각 작업 완료 시마다 CLAUDE.md 체크박스 업데이트
4. 막히는 부분 있으면 즉시 보고

### 만약 $ARGUMENTS가 숫자만이면 (예: `2`)
현재 Phase 상태 확인:
1. CLAUDE.md에서 해당 Phase 항목 읽기
2. 완료된 항목 / 미완료 항목 현황 출력
3. 다음으로 할 작업 제안

## 출력 형식
```
📋 Phase N 현황
✅ 완료: X개
⏳ 진행 중: 없음 or 현재 작업명
🔲 대기: Y개

다음 작업: (항목명)
예상 소요: (시간)
```
