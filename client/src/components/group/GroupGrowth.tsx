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

  // 추가제안: 드릴다운용 데이터
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
              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100" />
              <motion.circle 
                cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={213.6}
                initial={{ strokeDashoffset: 213.6 }}
                animate={{ strokeDashoffset: 213.6 - (213.6 * progress) / 100 }}
                className="text-[#4A6741]"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-zinc-800">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">오늘의 달성률</div>
        </div>

        <div className="space-y-3">
          <div className="bg-[#4A6741] rounded-[24px] p-4 text-white shadow-lg shadow-[#4A6741]/20 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Flame size={18} className="text-orange-300" /></div>
            <div>
              <div className="text-[10px] font-bold opacity-70">연속 기록</div>
              <div className="text-sm font-black">12일 달성 중</div>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 border border-zinc-100 flex items-center gap-3">
            <div className="bg-zinc-50 p-2 rounded-xl"><Trophy size={18} className="text-amber-400" /></div>
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
            { id: 'bible', label: '성경 읽기 (3장)', sub: '마태복음 5-7장' },
            { id: 'pray', label: '개인 기도 (20분)', sub: '오전 07:30 완료' },
            { id: 'meditation', label: '오늘의 묵상', sub: '음성으로 기록 남기기' }
          ].map((task) => (
            <div key={task.id} className="relative">
              <motion.div 
                onClick={() => {
                  if (task.id === 'bible') setShowBibleReader(true);
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
                <div className="flex items-center gap-2">
                  {task.id === 'meditation' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveRecording(task.id); }}
                      className={`p-2 rounded-full ${checked.includes(task.id) ? 'text-[#4A6741] bg-[#4A6741]/5' : 'text-zinc-300'}`}
                    >
                      <Mic size={20} />
                    </button>
                  )}
                  <ChevronRight size={18} className="opacity-20" />
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 섹션 */}
      <div className="bg-zinc-900 rounded-[30px] p-6 text-white flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
          <div className="text-[10px] font-black text-white/40 uppercase mb-1">Community Stats</div>
          <div className="text-sm font-bold">우리 그룹은 지금 <span className="text-[#A2C098]">82%</span> 달성 중!</div>
        </div>
        <button className="relative z-10 p-3 bg-white/10 backdrop-blur-md rounded-2xl">
          <ChevronRight size={18} />
        </button>
        <BarChart3 className="absolute right-[-10px] bottom-[-10px] w-20 h-20 text-white/5" />
      </div>

      {/* 드릴다운 1: 성경 읽기 */}
      <AnimatePresence>
        {showBibleReader && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="fixed inset-0 z-[200] bg-white p-6 pt-20"
          >
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowBibleReader(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-full active:scale-90 transition-all"><X size={20}/></button>
              <h2 className="font-black text-lg text-zinc-800">{todayPassage.ref}</h2>
              <div className="w-10" />
            </div>
            <div className="space-y-8 overflow-y-auto max-h-[70vh] px-2 custom-scrollbar">
              {todayPassage.verses.map(v => (
                <div key={v.no} className="flex gap-4">
                  <span className="font-black text-[#4A6741] text-sm pt-1.5 opacity-60">{v.no}</span>
                  <p className="text-lg font-bold text-zinc-700 leading-relaxed">{v.text}</p>
                </div>
              ))}
            </div>
            <div className="absolute bottom-10 left-6 right-6">
              <button 
                onClick={() => { toggleCheck('bible'); setShowBibleReader(false); }}
                className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-xl shadow-[#4A6741]/20 active:scale-95 transition-all"
              >
                말씀 읽기 완료
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 드릴다운 2: 음성 기록 모달 */}
      <AnimatePresence>
        {activeRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-4 bottom-24 z-[110] bg-white rounded-[35px] p-8 shadow-2xl border border-zinc-100"
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-zinc-800">오늘의 묵상 기록</h4>
              <button onClick={() => setActiveRecording(null)}><X size={20} className="text-zinc-400"/></button>
            </div>
            <div className="flex flex-col items-center py-6">
               <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Mic size={32} className="text-orange-500 animate-pulse" />
               </div>
               <p className="text-xs font-bold text-zinc-400">말씀을 묵상하며 느낀 점을 들려주세요</p>
            </div>
            <button 
              onClick={() => { toggleCheck('meditation'); setActiveRecording(null); }}
              className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-100"
            >
              녹음 완료
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
