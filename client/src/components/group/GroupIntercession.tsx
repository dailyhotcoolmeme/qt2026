import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X, Sparkles, Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // E. 음성 파형 시각화를 위한 더미 데이터 (실제 녹음 시 소리 크기에 반응하도록 확장 가능)
  const [waves, setWaves] = useState(Array(15).fill(20));

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        // 파형 애니메이션용 난수 생성
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
      
      {/* 1. 고도화된 기도 입력창 */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-zinc-900 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" /> 마음 나누기
          </h3>
          {isRecording && (
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity }} className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Recording...</span>
            </motion.div>
          )}
        </div>

        {!audioUrl ? (
          <div className="relative flex flex-col items-center py-10 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200 overflow-hidden">
            {/* E. 음성 파형 비주얼라이저 */}
            <div className="flex items-end gap-1 mb-8 h-12">
              {waves.map((h, i) => (
                <motion.div 
                  key={i} 
                  animate={{ height: isRecording ? h : 4 }} 
                  className={`w-1 rounded-full ${isRecording ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} 
                />
              ))}
            </div>

            <button 
              onClick={() => isRecording ? setAudioUrl("mock") : setIsRecording(true)}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90 ${
                isRecording ? 'bg-red-500 shadow-red-200' : 'bg-[#4A6741] shadow-[#4A6741]/20'
              }`}
            >
              {isRecording ? <Square size={28} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
              {isRecording && (
                <motion.div 
                  initial={{ scale: 1 }} animate={{ scale: 1.5, opacity: 0 }} 
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 bg-red-500 rounded-full -z-10" 
                />
              )}
            </button>
            
            <p className="mt-6 text-zinc-400 text-[11px] font-black tracking-tight">
              {isRecording ? `${Math.floor(recordingTime/600)}:${((recordingTime/10)%60).toFixed(0).padStart(2,'0')} - 중단하려면 버튼 클릭` : "버튼을 눌러 기도를 시작하세요"}
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            {/* 오디오 플레이어 커스텀 */}
            <div className="bg-[#4A6741] rounded-[24px] p-5 flex items-center gap-4 shadow-lg shadow-[#4A6741]/20">
              <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md"><Play size={20} fill="white"/></button>
              <div className="flex-1">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-white" />
                </div>
                <div className="flex justify-between mt-2 text-[9px] font-black text-white/60"><span>0:12</span><span>0:45</span></div>
              </div>
              <button onClick={() => setAudioUrl(null)} className="w-8 h-8 flex items-center justify-center bg-black/10 rounded-full text-white"><X size={16}/></button>
            </div>

            {/* 공개 범위 설정 버튼 그룹 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'public', label: '전체공개', icon: <Globe size={14}/> },
                { id: 'targets', label: '대상자만', icon: <ShieldCheck size={14}/> },
                { id: 'private', label: '나만보기', icon: <Lock size={14}/> }
              ].map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => setVisibility(opt.id as any)}
                  className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all border ${
                    visibility === opt.id ? 'bg-[#4A6741] border-[#4A6741] text-white shadow-md' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                  }`}
                >
                  {opt.icon} <span className="text-[10px] font-black">{opt.label}</span>
                </button>
              ))}
            </div>

            <button className="w-full py-5 bg-[#4A6741] text-white rounded-[22px] font-black shadow-xl active:scale-95 transition-all">기도 전달하기</button>
          </motion.div>
        )}
      </div>

      {/* 2. B. 중보기도 카드 디테일 (피드) */}
      <div className="space-y-4">
        <h4 className="font-black text-zinc-900 px-1 text-sm flex items-center gap-2">
          최근 올라온 기도 <div className="h-[1px] flex-1 bg-zinc-100" />
        </h4>
        
        {[1, 2].map((i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -2 }}
            className="group bg-white rounded-[32px] p-6 shadow-sm border border-zinc-50 hover:shadow-xl hover:shadow-zinc-200/50 transition-all"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-3">
                <div className="relative">
                  <div className="w-11 h-11 bg-zinc-100 rounded-2xl" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Volume2 size={10} className="text-[#4A6741]" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-black text-zinc-800">박마리아 집사</div>
                  <div className="text-[10px] font-bold text-zinc-400">경기도 광명시 · 15분 전</div>
                </div>
              </div>
              <button className="text-zinc-300 group-hover:text-zinc-500 transition-colors"><MoreVertical size={18}/></button>
            </div>

            <div className="bg-zinc-50 rounded-[22px] p-4 flex items-center gap-4 mb-5 border border-zinc-100/50">
              <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm"><Play size={16} fill="currentColor"/></button>
              <div className="flex-1">
                 <div className="text-[12px] font-bold text-zinc-700">치유를 위한 간절한 기도...</div>
                 <div className="text-[10px] font-bold text-zinc-400">00:38</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 text-pink-500 rounded-full text-[11px] font-black active:scale-90 transition-all">
                  <Heart size={14} fill={i === 1 ? "currentColor" : "none"}/> 24
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 text-zinc-400 rounded-full text-[11px] font-black active:scale-90 transition-all">
                  <MessageSquare size={14}/> 8
                </button>
              </div>
              {/* '나도 기도함' 액션 (설계도 핵심) */}
              <button className="text-[11px] font-black text-[#4A6741] flex items-center gap-1 bg-[#4A6741]/5 px-3 py-2 rounded-full">
                기도에 동참하기 <ChevronRight size={12}/>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
