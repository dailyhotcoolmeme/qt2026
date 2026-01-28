import React from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, ChevronRight, Zap, Target } from "lucide-react";

export default function GroupHome({ group, role }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-10">
      {/* 1. 모임 공지 배너 */}
      <div className="bg-[#4A6741] rounded-[32px] p-6 text-white shadow-lg shadow-[#4A6741]/20 relative overflow-hidden">
        <Zap className="absolute right-[-10px] top-[-10px] w-24 h-24 text-white/10 rotate-12" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-yellow-300" />
            <span className="text-[11px] font-black uppercase tracking-widest">Notice</span>
          </div>
          <p className="font-bold text-sm leading-relaxed mb-4">
            {group?.description || "반갑습니다! 우리 모임의 첫 페이지입니다. 공지사항을 등록해주세요."}
          </p>
          <div className="h-[1px] bg-white/20 w-full mb-4" />
          <button className="text-[11px] font-black flex items-center gap-1 opacity-80">
            공지사항 전체보기 <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* 2. 오늘 나의 미션 (설계도 4-② 연동) */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-zinc-900 flex items-center gap-2">
            <Target size={18} className="text-blue-500" /> 오늘 나의 미션
          </h3>
          <span className="text-[11px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">진행중</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['성경', '기도', '묵상'].map((item) => (
            <div key={item} className="flex flex-col items-center gap-3 p-4 bg-zinc-50 rounded-[24px] border border-zinc-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-200" />
              </div>
              <span className="text-xs font-black text-zinc-500">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 모임 일정 */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100">
        <h3 className="font-black text-zinc-900 mb-5 flex items-center gap-2">
          <Calendar size={18} className="text-orange-400" /> 다가오는 일정
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div className="bg-white w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-black text-orange-400 uppercase">Feb</span>
              <span className="text-lg font-black text-zinc-800 leading-none">02</span>
            </div>
            <div>
              <div className="font-black text-sm text-zinc-800">정기 모임 및 나눔</div>
              <div className="text-[11px] font-bold text-zinc-400">오후 8:00 · 온라인 줌(Zoom)</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
