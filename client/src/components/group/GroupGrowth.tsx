import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Mic, Calendar as CalIcon, BarChart3, Quote } from "lucide-react";

export default function GroupGrowth({ groupId, role }: any) {
  const [checked, setChecked] = useState<string[]>([]);

  const toggleCheck = (id: string) => {
    setChecked(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-10">
      {/* 주간 통계 (설계도 3번 상속 권한 연동용) */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
        <div className="min-w-[140px] p-5 bg-white rounded-[28px] border border-zinc-100 shadow-sm">
          <BarChart3 size={20} className="text-[#4A6741] mb-2" />
          <div className="text-[10px] font-bold text-zinc-400">이번 주 달성률</div>
          <div className="text-xl font-black text-zinc-900">85%</div>
        </div>
        <div className="min-w-[140px] p-5 bg-white rounded-[28px] border border-zinc-100 shadow-sm">
          <Quote size={20} className="text-blue-500 mb-2" />
          <div className="text-[10px] font-bold text-zinc-400">연속 기록</div>
          <div className="text-xl font-black text-zinc-900">12일차</div>
        </div>
      </div>

      {/* 데일리 체크리스트 */}
      <div className="bg-white rounded-[32px] p-7 shadow-sm border border-zinc-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-zinc-900">오늘의 경건 훈련</h3>
          <CalIcon size={18} className="text-zinc-300" />
        </div>
        
        <div className="space-y-4">
          {[
            { id: 'bible', label: '성경 읽기 (3장)', sub: '말씀으로 시작하는 하루' },
            { id: 'pray', label: '개인 기도 (20분)', sub: '하나님과의 친밀한 대화' },
            { id: 'meditation', label: '오늘의 묵상', sub: '기록하고 되새기기' }
          ].map((task) => (
            <div 
              key={task.id} 
              onClick={() => toggleCheck(task.id)}
              className={`p-5 rounded-[24px] border transition-all flex items-center justify-between cursor-pointer ${
                checked.includes(task.id) ? 'bg-[#4A6741]/5 border-[#4A6741]/20' : 'bg-zinc-50 border-zinc-100'
              }`}
            >
              <div className="flex gap-4 items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  checked.includes(task.id) ? 'bg-[#4A6741] border-[#4A6741]' : 'bg-white border-zinc-200'
                }`}>
                  {checked.includes(task.id) && <Check size={14} className="text-white" />}
                </div>
                <div>
                  <div className={`text-sm font-black ${checked.includes(task.id) ? 'text-[#4A6741]' : 'text-zinc-800'}`}>{task.label}</div>
                  <div className="text-[10px] font-bold text-zinc-400">{task.sub}</div>
                </div>
              </div>
              <Mic size={16} className="text-zinc-300 hover:text-[#4A6741] transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
