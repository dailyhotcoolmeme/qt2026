import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, Mic, Calendar as CalIcon, BarChart3, 
  Quote, Flame, Trophy, ChevronRight, Play, RotateCcw, X, BookOpen
} from "lucide-react";

export default function GroupGrowth({ groupId, role }: any) {
  const [checked, setChecked] = useState<string[]>([]);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  const [showBibleReader, setShowBibleReader] = useState(false);

  const toggleCheck = (id: string) => {
    setChecked(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const progress = (checked.length / 3) * 100;

  // 가상의 성경 API 데이터
  const todayPassage = {
    ref: "마태복음 5:3-10",
    verses: [
      { no: 3, text: "심령이 가난한 자는 복이 있나니 천국이 그들의 것임이요" },
      { no: 4, text: "애통하는 자는 복이 있나니 그들이 위로를 받을 것임이요" },
      { no: 5, text: "온유한 자는 복이 있나니 그들이 땅을 기업으로 받을 것임이요" }
    ]
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-20">
      {/* 1. 상단 성취 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-20 h-20 mb-3">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="#f4f4f5" strokeWidth="8" fill="transparent" />
              <motion.circle 
                cx="40" cy="40" r="34" stroke="#4A6741" strokeWidth="8" fill="transparent" 
                strokeDasharray={213.6}
                initial={{ strokeDashoffset: 213.6 }}
                animate={{ strokeDashoffset: 213.6 - (213.6 * progress) / 100 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-zinc-800">{Math.round(progress)}%</div>
          </div>
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">오늘의 달성률</div>
        </div>

        <div className="space-y-3">
          <div className="bg-[#4A6741] rounded-[24px] p-4 text-white shadow-lg shadow-[#4A6741]/20 flex items-center gap-3">
            <Flame size={18} className="text-orange-300" />
            <div>
              <div className="text-[10px] font-bold opacity-70">연속 기록</div>
              <div className="text-sm font-black">12일 달성 중</div>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 border border-zinc-100 flex items-center gap-3">
            <Trophy size={18} className="text-amber-400" />
            <div>
              <div className="text-[10px] font-bold text-zinc-400">그룹 내 순위</div>
              <div className="text-sm font-black text-zinc-800">상위 5%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 경건 훈련 리스트 */}
      <div className="bg-white rounded-[35px] p-8 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-black text-zinc-900 text-lg">경건 훈련</h3>
            <p className="text-xs font-bold text-zinc-400">매일 조금씩 하나님께 가까이</p>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
            <CalIcon size={20} />
          </div>
        </div>
        
        <div className="space-y-5">
          {[
            { id: 'bible', label: '성경 읽기 (3장)', sub: '마태복음 5-7장', action: () => setShowBibleReader(true) },
            { id: 'pray', label: '개인 기도 (20분)', sub: '오늘의 기도 제목' },
            { id: 'meditation', label: '오늘의 묵상', sub: '음성으로 기록 남기기' }
          ].map((task) => (
            <div key={task.id} className="relative">
              <motion.div 
                onClick={() => {
                  if (task.id === 'bible') task.action?.();
                  else toggleCheck(task.id);
                }}
                className={`p-5 rounded-[28px] border-2 transition-all flex items-center justify-between cursor-pointer ${
                  checked.includes(task.id) ? 'bg-white border-[#4A6741] shadow-md' : 'bg-zinc-50 border-transparent text-zinc-400'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    checked.includes(task.id) ? 'bg-[#4A6741] text-white' : 'bg-white border border-zinc-200 text-transparent'
                  }`}>
                    <Check size={16} strokeWidth={4} />
                  </div>
                  <div>
                    <div className={`text-sm font-black ${checked.includes(task.id) ? 'text-zinc-900' : 'text-zinc-400'}`}>{task.label}</div>
                    <div className="text-[10px] font-bold opacity-60">{task.sub}</div>
                  </div>
                </div>
                <ChevronRight size={18} className="opacity-30" />
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* 성경 읽기 드릴다운 오버레이 */}
      <AnimatePresence>
        {showBibleReader && (
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="fixed inset-0 z-[200] bg-white p-6 pt-20"
          >
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowBibleReader(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-full"><X size={20}/></button>
              <h2 className="font-black text-lg">{todayPassage.ref}</h2>
              <div className="w-10" />
            </div>
            <div className="space-y-6 overflow-y-auto max-h-[70vh] px-2">
              {todayPassage.verses.map(v => (
                <div key={v.no} className="flex gap-4">
                  <span className="font-black text-[#4A6741] text-sm pt-1">{v.no}</span>
                  <p className="text-lg font-bold text-zinc-700 leading-relaxed">{v.text}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { toggleCheck('bible'); setShowBibleReader(false); }}
              className="absolute bottom-10 left-6 right-6 py-5 bg-[#4A6741] text-white rounded-[22px] font-black"
            >
              읽기 완료
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
