import React from "react";
import { 
  Calendar, 
  Users, 
  ChevronRight, 
  MessageSquare, 
  Heart, 
  TrendingUp, 
  Target,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";

interface GroupHomeProps {
  group: any;
  role: string;
}

export default function GroupHome({ group, role }: GroupHomeProps) {
  // ✅ H항목: 활동 통계 데이터 (추후 DB 연결 가능하도록 구조화)
  const stats = [
    { label: "이번 주 기도", value: "24회", icon: <Heart size={16} className="text-rose-500" />, bg: "bg-rose-50" },
    { label: "모임 출석률", value: "92%", icon: <TrendingUp size={16} className="text-emerald-500" />, bg: "bg-emerald-50" },
    { label: "새로운 소식", value: "3건", icon: <MessageSquare size={16} className="text-blue-500" />, bg: "bg-blue-50" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-20 text-left"
    >
      {/* 1. H항목: 활동 통계 요약 위젯 */}
      <section className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-[24px] border border-white/50 shadow-sm`}>
            <div className="mb-2">{stat.icon}</div>
            <div className="text-[10px] font-bold text-zinc-500 mb-0.5">{stat.label}</div>
            <div className="text-sm font-black text-zinc-900">{stat.value}</div>
          </div>
        ))}
      </section>

      {/* 2. 모임 공지사항 (원본 스타일 유지) */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-zinc-900 flex items-center gap-2 text-sm">
            <Calendar size={18} className="text-[#4A6741]" /> 이번 주 일정
          </h3>
          <button className="text-[11px] font-bold text-zinc-400 flex items-center">
            전체보기 <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-4 p-4 bg-zinc-50 rounded-[22px] border border-zinc-100">
            <div className="flex flex-col items-center justify-center bg-white px-3 py-2 rounded-xl shadow-sm min-w-[50px]">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Jan</span>
              <span className="text-lg font-black text-[#4A6741]">29</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[13px] font-black text-zinc-800">정기 구역 예배</div>
              <div className="text-[11px] font-bold text-zinc-400">오후 8:00 • 김마리아 권사님 댁</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 모임 정보 및 소개 */}
      <div className="bg-[#4A6741] rounded-[32px] p-6 text-white shadow-xl shadow-[#4A6741]/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Target size={20} className="text-white/60" />
            <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Group Vision</span>
          </div>
          <p className="text-sm font-bold leading-relaxed mb-6">
            "말씀 안에서 서로 사랑하며, <br />
            기도로 하나 되는 은혜의 공동체"
          </p>
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#4A6741] bg-zinc-200 flex items-center justify-center text-[10px] font-black text-zinc-500">
                  {i === 3 ? '+9' : '박'}
                </div>
              ))}
            </div>
            <div className="text-[11px] font-black">
              {group?.member_count || 12}명의 지체가 함께하고 있습니다
            </div>
          </div>
        </div>
        <Users size={120} className="absolute -bottom-4 -right-4 text-white/5 rotate-12" />
      </div>

      {/* 4. 리더 정보 (owner/leader 전용 UI 포함 가능) */}
      <div className="px-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-black text-zinc-400 text-xs">리</div>
          <div>
            <div className="text-[12px] font-black text-zinc-800">모임 리더</div>
            <div className="text-[10px] font-bold text-zinc-400">이요한 전도사</div>
          </div>
        </div>
        {role === 'owner' && (
          <button className="text-[11px] font-black text-[#4A6741] px-3 py-1 bg-[#4A6741]/10 rounded-full">
            관리자 설정
          </button>
        )}
      </div>
    </motion.div>
  );
}
