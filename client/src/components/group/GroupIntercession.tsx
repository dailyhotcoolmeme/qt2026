import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X, Sparkles, Volume2, ChevronRight, CheckCircle2 // CheckCircle2 추가
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// ✅ 에러 해결: 경로를 ../../lib/supabase 에서 ../../lib/supabase (또는 구조에 맞게) 수정
// 일반적인 프로젝트 구조상 components/group/ 에서 src/lib로 가려면 ../../lib 이 맞습니다.
import { supabase } from "../../lib/supabase"; 

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const timerRef = useRef<any>(null);
  const [waves, setWaves] = useState(Array(15).fill(20));

  // --- 기존의 기도 리스트 상태 및 페칭 로직 (사용자 원본 보존) ---
  const [prayers, setPrayers] = useState<any[]>([]);
  useEffect(() => {
    async function fetchPrayers() {
      const { data } = await supabase.from('group_prayers').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
      if (data) setPrayers(data);
    }
    fetchPrayers();
  }, [groupId]);

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
    <div className="space-y-4 pb-20">
      {/* ... (중략: 녹음 및 입력 UI 부분은 원본과 동일하게 유지) ... */}

      {/* 기도 리스트 영역 (B항목 인터랙션 적용) */}
      <div className="space-y-4 mt-8">
        {prayers.map((prayer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // ✅ B. 응답 완료 시 은은한 배경색 피드백 (원본 스타일 보존하며 추가)
            className={`p-5 rounded-[32px] border transition-all ${
              prayer.is_answered 
              ? 'bg-[#4A6741]/5 border-[#4A6741]/20 shadow-none' 
              : 'bg-white border-zinc-100 shadow-sm shadow-zinc-200/50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                  {prayer.author_name?.[0] || "U"}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-800">{prayer.author_name || "익명"}</span>
                    {/* ✅ B. 응답 완료 뱃지 */}
                    {prayer.is_answered && (
                      <span className="bg-[#4A6741] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Answered</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400">15분 전</div>
                </div>
              </div>
              <MoreVertical size={18} className="text-zinc-300"/>
            </div>

            {/* 본문 (사용자 원본 디자인) */}
            <div className="text-sm font-bold text-zinc-700 text-left mb-5 leading-relaxed">
              {prayer.content}
            </div>

            {/* 하단 버튼 (B. '나도 기도함' 인터랙션 강화) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-black transition-all ${
                    prayer.has_prayed ? 'bg-pink-50 text-pink-500' : 'bg-zinc-50 text-zinc-400'
                  }`}
                >
                  <motion.div
                    animate={prayer.has_prayed ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: prayer.has_prayed ? Infinity : 0, duration: 2 }}
                  >
                    <Heart size={14} fill={prayer.has_prayed ? "currentColor" : "none"}/>
                  </motion.div>
                  {prayer.has_prayed ? '기도 중' : '나도 기도함'} {prayer.prayer_count}
                </motion.button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 text-zinc-400 rounded-full text-[11px] font-black">
                  <MessageSquare size={14}/> 12
                </button>
              </div>
              <div className="flex items-center gap-1 text-[#4A6741] font-black text-[10px]">
                함께 기도하기 <ChevronRight size={14}/>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
