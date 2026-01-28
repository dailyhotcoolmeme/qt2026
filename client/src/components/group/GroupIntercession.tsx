import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, UserPlus, Globe, ShieldCheck, Lock, Heart, MessageSquare, MoreVertical, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioUrl("mock_audio");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* 입력 섹션 */}
      <div className="bg-white rounded-[32px] p-6 shadow-md border border-zinc-100 text-left">
        <h3 className="font-black text-zinc-900 mb-4 flex justify-between items-center">
          함께 기도하기
          {isRecording && <span className="text-red-500 text-xs animate-pulse font-bold">● {Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>}
        </h3>
        
        {!audioUrl ? (
          <div className="flex flex-col items-center py-6 bg-zinc-50 rounded-[24px] border border-dashed border-zinc-200">
            <button onClick={isRecording ? stopRecording : startRecording} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-lg shadow-red-100' : 'bg-[#4A6741] shadow-lg shadow-[#4A6741]/20'} active:scale-90`}>
              {isRecording ? <Square size={24} className="text-white fill-white" /> : <Mic size={24} className="text-white" />}
            </button>
            <p className="mt-4 text-zinc-400 text-[11px] font-bold">{isRecording ? "녹음 중단하려면 클릭" : "버튼을 눌러 음성 기도 시작"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-50 rounded-2xl p-4 flex items-center gap-4">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm"><Play size={20} fill="currentColor"/></button>
              <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-[#4A6741]" /></div>
              <button onClick={() => setAudioUrl(null)} className="text-[11px] font-bold text-zinc-400 underline">다시 녹음</button>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black text-zinc-400 ml-1 uppercase">공개 범위</label>
              <div className="flex bg-zinc-50 p-1 rounded-2xl">
                {[
                  { id: 'public', label: '전체공개', icon: <Globe size={14}/> },
                  { id: 'targets', label: '대상자만', icon: <ShieldCheck size={14}/> },
                  { id: 'private', label: '비공개', icon: <Lock size={14}/> }
                ].map(opt => (
                  <button key={opt.id} onClick={() => setVisibility(opt.id as any)} className={`flex-1 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all ${visibility === opt.id ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'}`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="w-full py-4 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg shadow-[#4A6741]/20 active:scale-95 transition-all">기도 올리기</button>
          </div>
        )}
      </div>

      {/* 피드 섹션 (예시) */}
      <div className="space-y-4 pb-10">
        <h4 className="font-black text-zinc-900 ml-1">공동체 기도 피드</h4>
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-zinc-50 text-left opacity-60">
          <p className="text-sm font-bold text-zinc-400 text-center py-10">아직 등록된 기도가 없습니다.</p>
        </div>
      </div>
    </motion.div>
  );
}
