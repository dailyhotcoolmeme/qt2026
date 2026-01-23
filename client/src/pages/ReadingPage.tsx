import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  // [대안] 404 방어를 위한 상태 복구 로직
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [goal, setGoal] = useState<any>(null);

  useEffect(() => {
    async function recoverSession() {
      // 1. 페이지 로드 즉시 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. 로컬 스토리지에서 기존 읽기 정보 강제 복구 (404 방어의 핵심)
      const savedGoal = localStorage.getItem('reading_goal');
      
      if (savedGoal) {
        const parsed = JSON.parse(savedGoal);
        setGoal(parsed.goal);
        setIsGoalSet(parsed.isGoalSet);
      }
      
      setIsInitializing(false);
    }

    recoverSession();
  }, []);

  // 초기화 중에는 아무것도 렌더링하지 않거나 로딩바만 보여줌 (404 후 깜빡임 방지)
  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center font-black text-[#5D7BAF]">데이터 복구 중...</div>;
  }

  return (
    <div className="pt-[64px] p-4">
      {/* 여기에만 집중하세요: 404 이후에도 아래 문구가 보인다면 성공입니다 */}
      <h1 className="font-black text-xl">404 방어 테스트 완료</h1>
      {isGoalSet ? (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl font-bold">
          기존 목표가 복구되었습니다: {goal?.startBook?.name}
        </div>
      ) : (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl font-bold text-gray-400">
          설정된 목표가 없습니다.
        </div>
      )}
      
      <button 
        onClick={() => {
          // 테스트용 데이터 저장
          const testGoal = { isGoalSet: true, goal: { startBook: { name: "창세기" } } };
          localStorage.setItem('reading_goal', JSON.stringify(testGoal));
          alert("테스트 목표 저장됨! 이제 새로고침 해보세요.");
          window.location.reload();
        }}
        className="mt-6 bg-[#5D7BAF] text-white p-3 rounded-lg font-black"
      >
        새로고침 테스트 (데이터 저장)
      </button>
    </div>
  );
}
