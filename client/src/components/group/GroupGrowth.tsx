import React, { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  BookOpen, 
  PrayingHand, 
  ChevronRight,
  Trophy,
  Users
} from "lucide-react";
import { motion } from "framer-motion";

interface GroupGrowthProps {
  groupId: string;
  role: string;
}

export default function GroupGrowth({ groupId, role }: GroupGrowthProps) {
  // ✅ I항목: 주간 미션 데이터 세팅
  const [missions, setMissions] = useState([
    { id: 1, title: "매일 아침 말씀 묵상", type: "reading", count: 4, total: 7, icon: <BookOpen size={18} /> },
    { id: 2, title: "공동체 중보기도 참여", type: "prayer", count: 2, total: 3, icon: <PrayingHand size={18} /> },
    { id: 3, title: "주일 예배 실황 인증", type: "worship", count: 0, total: 1, icon: <CheckCircle2 size={18} /> },
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-20 text-left"
    >
      {/* 1. 상단 요약 배너: 이번 주 우리 그룹의 성장 온도 */}
      <div className="bg-gradient-to-br from-[#4A6741] to-[#3D5535] rounded-[32px] p-6 text-white shadow-xl shadow-[#4A6741]/20">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={16} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-wider opacity-80">Weekly Growth</span>
            </div>
            <h3 className="text-xl font-black">우리 그룹 성장 온도</h3>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-300" />
            <span className="text-[12px] font-black">Lv. 14</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-bold opacity-80">
            <span>다음 단계까지 82%</span>
            <span>820 / 1000 XP</span>
          </div>
          <div className="h-3 bg-black/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "82%" }}
              className="h-full bg-gradient-to-r from-amber-300 to-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 2. I항목: 주간 미션 리스트 섹션 */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="font-black text-zinc-900 text-sm">주간 공동체 미션</h4>
          <span className="text-[11px] font-bold text-zinc-400">이번 주 진행률 65%</span>
        </div>

        <div className="space-y-3">
          {missions.map((mission) => {
            const progress = (mission.count / mission.total) * 100;
            const isCompleted = mission.count === mission.total;

            return (
              <div 
                key={mission.id}
                className="bg-white rounded-[28px] p-5 border border-zinc-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isCompleted ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-400'
                  }`}>
                    {mission.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-black text-zinc-800">{mission.title}</div>
                    <div className="text-[10px] font-bold text-zinc-400">
                      {mission.count}회 완료 / 총 {mission.total}회
                    </div>
                  </div>
                  <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-zinc-50 text-zinc-200'
                  }`}>
                    <CheckCircle2 size={20} fill={isCompleted ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* 프로그레스 바 */}
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full ${isCompleted ? 'bg-[#4A6741]' : 'bg-zinc-300'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 명예의 전당 (간략화) */}
      <div className="bg-zinc-50 rounded-[32px] p-6 border border-dashed border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-zinc-400" />
            <span className="text-sm font-black text-zinc-600">이번 주 열심 멤버</span>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-zinc-300 text-xs border border-zinc-100">
                김
              </div>
              <span className="text-[10px] font-bold text-zinc-500">김지수</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
