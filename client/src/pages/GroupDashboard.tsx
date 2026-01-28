import React, { useState } from "react";

export default function GroupDashboard() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10">
      <h1 className="text-2xl font-black text-[#4A6741] mb-4">대시보드 테스트</h1>
      <p className="text-zinc-500 font-bold">이 화면이 보인다면 설정은 정상입니다!</p>
      <div className="mt-10 grid grid-cols-2 gap-4 w-full">
        <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center font-bold">홈</div>
        <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center font-bold">기도</div>
      </div>
    </div>
  );
}
