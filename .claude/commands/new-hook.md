# 새 커스텀 훅 생성

훅명: $ARGUMENTS

## 작업 순서

### 1단계: 훅 파일 생성
`src/hooks/{category}/use{Name}.ts`

**필수 포함 요소:**
- 파라미터 타입 인터페이스 정의
- 반환값 타입 인터페이스 정의
- TanStack Query 사용 시 queryKey 상수로 분리
- Supabase 호출은 반드시 try/catch
- 로딩/에러/데이터 상태 모두 반환
- JSDoc 주석으로 사용법 명시

**Query 훅 기본 구조:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/lib/supabase'

// queryKey 상수 (캐시 무효화할 때 사용)
export const {NAME}_QUERY_KEY = ['{name}'] as const

interface Use{Name}Params {
  // 필요한 파라미터
}

interface Use{Name}Result {
  data: {Type}[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
  // mutation들...
}

/**
 * {설명}
 * @example
 * const { data, isLoading } = use{Name}({ userId })
 */
export function use{Name}({ param }: Use{Name}Params): Use{Name}Result {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [{NAME}_QUERY_KEY, param],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('{table}')
        .select('*')
        // 조건들

      if (error) throw error
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (input: {InputType}) => {
      const { data, error } = await supabase
        .from('{table}')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{NAME}_QUERY_KEY] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}
```

### 2단계: src/lib/types.ts에 필요한 타입 추가
해당 훅에서 사용하는 DB 타입이 없으면 추가

### 3단계: 훅을 사용하는 화면에 연결
화면에서 import해서 props 없이 로직 사용

## 주의사항
- Realtime 구독 사용 시 useEffect cleanup에서 반드시 unsubscribe
- 페이지네이션은 `useInfiniteQuery` 사용
- 낙관적 업데이트(optimistic update)는 UX 중요한 곳만
