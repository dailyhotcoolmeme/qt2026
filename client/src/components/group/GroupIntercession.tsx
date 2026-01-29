import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X, Sparkles, Volume2, ChevronRight
} from "lucide-react"; // 🔍 lucide-center 오타 수정 완료
import { motion, AnimatePresence } from "framer-motion";

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false); // 🔍 누락되었던 상태 복구
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const timerRef = useRef<any>(null);
  const [waves, setWaves] = useState(Array(15).fill(20));

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setWaves(Array(15).fill(0).map(() => Math.random() * 40 + 10));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setWaves(Array(15).fill(5));
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 text-left">
      {/* 1. 기도 입력창 (원형 파형 디자인 복구) */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-zinc-900 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" /> 마음 나누기
          </h3>
          {isRecording && (
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity }} className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-[10px] font-black text-red-500 uppercase">Recording...</span>
            </motion.div>
          )}
        </div>

        {!audioUrl ? (
          <div className="flex flex-col items-center py-10 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200">
            <div className="flex items-end gap-1 mb-8 h-12">
              {waves.map((h, i) => (
                <motion.div key={i} animate={{ height: isRecording ? h : 4 }} className={`w-1 rounded-full ${isRecording ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
              ))}
            </div>
            <button 
              onClick={() => isRecording ? setAudioUrl("mock") : setIsRecording(true)}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all ${
                isRecording ? 'bg-red-500 shadow-red-200' : 'bg-[#4A6741] shadow-[#4A6741]/20'
              }`}
            >
              {isRecording ? <Square size={28} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="bg-[#4A6741] rounded-[24px] p-5 flex items-center gap-4 text-white">
              <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Play size={20} fill="white"/></button>
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-white" /></div>
              <button onClick={() => setAudioUrl(null)} className="p-1"><X size={16}/></button>
            </div>
            
            {/* 🔍 누락되었던 대상자 선택 버튼 복구 */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
               <button onClick={() => setShowMemberSelector(true)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-[11px] font-black text-zinc-600">
                  <UserPlus size={14}/> 대상자 선택
               </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'public', label: '전체공개', icon: <Globe size={14}/> },
                { id: 'targets', label: '대상자만', icon: <ShieldCheck size={14}/> },
                { id: 'private', label: '나만보기', icon: <Lock size={14}/> }
              ].map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => setVisibility(opt.id as any)}
                  className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
                    visibility === opt.id ? 'bg-[#4A6741] text-white shadow-md' : 'bg-zinc-50 text-zinc-400'
                  }`}
                >
                  {opt.icon}<span className="text-[10px] font-black">{opt.label}</span>
                </button>
              ))}
            </div>
            <button className="w-full py-5 bg-[#4A6741] text-white rounded-[22px] font-black shadow-xl">기도 전달하기</button>
          </motion.div>
        )}
      </div>

      {/* 2. 기도 피드 (상세 데이터 디자인 복구) */}
      <div className="space-y-4">
        <h4 className="font-black text-zinc-900 px-1 text-sm flex items-center gap-2">최근 올라온 기도 <div className="h-[1px] flex-1 bg-zinc-100" /></h4>
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-50 hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-3">
                <div className="w-11 h-11 bg-zinc-100 rounded-2xl" />
                <div>
                  <div className="text-sm font-black text-zinc-800">박마리아 집사</div>
                  <div className="text-[10px] font-bold text-zinc-400">15분 전</div>
                </div>
              </div>
              <MoreVertical size={18} className="text-zinc-300"/>
            </div>
            <div className="bg-zinc-50 rounded-[22px] p-4 flex items-center gap-4 mb-5 border border-zinc-100/50">
              <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm"><Play size={16} fill="currentColor"/></button>
              <div className="flex-1">
                 <div className="text-[12px] font-bold text-zinc-700">치유를 위한 간절한 기도...</div>
                 <div className="text-[10px] font-bold text-zinc-400 opacity-60">00:38</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 text-pink-500 rounded-full text-[11px] font-black"><Heart size={14} fill={i === 1 ? "currentColor" : "none"}/> 24</button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 text-zinc-400 rounded-full text-[11px] font-black"><MessageSquare size={14}/> 8</button>
              </div>
              <button className="text-[11px] font-black text-[#4A6741] flex items-center gap-1">기도에 동참하기 <ChevronRight size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
