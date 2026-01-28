import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

interface Props {
  groupId: string;
  role: string;
}

export default function GroupIntercession({ groupId, role }: Props) {
  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 멤버 목록 가져오기
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('group_members')
        .select('user_id, users(id, display_name, avatar_url)')
        .eq('group_id', groupId);
      if (data) setGroupMembers(data);
    };
    fetchMembers();
  }, [groupId]);

  // 녹음 제어
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioUrl("v_demo_url"); // 실제 구현 시 Storage 업로드 로직 연결 지점
  };

  const toggleTarget = (member: any) => {
    if (selectedTargets.find(t => t.user_id === member.user_id)) {
      setSelectedTargets(selectedTargets.filter(t => t.user_id !== member.user_id));
    } else {
      setSelectedTargets([...selectedTargets, member]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }} 
      className="space-y-6"
    >
      {/* 1. 기도 입력 카드 */}
      <div className="bg-white rounded-[32px] p-6 shadow-md border border-zinc-100 text-left">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-zinc-900 flex items-center gap-2">
            <Mic size={18} className="text-[#4A6741]" /> 마음 담아 기도하기
          </h3>
          {isRecording && (
            <span className="text-red-500 text-[11px] font-black animate-pulse flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" /> 
              {Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')} RECORDING
            </span>
          )}
        </div>
        
        {!audioUrl ? (
          <div className="flex flex-col items-center py-8 bg-zinc-50 rounded-[28px] border-2 border-dashed border-zinc-100">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                isRecording ? 'bg-red-500 shadow-red-100' : 'bg-[#4A6741] shadow-[#4A6741]/20'
              }`}
            >
              {isRecording ? <Square size={32} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
            </button>
            <p className="mt-4 text-zinc-400 text-xs font-bold">
              {isRecording ? "기도를 마치려면 버튼을 누르세요" : "버튼을 눌러 음성으로 기도하세요"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 오디오 플레이어 더미 */}
            <div className="bg-[#F8F9F7] rounded-2xl p-4 flex items-center gap-4 border border-[#EDF1EB]">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm active:scale-90">
                <Play size={20} fill="currentColor"/>
              </button>
              <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-[#4A6741]" />
              </div>
              <button onClick={() => setAudioUrl(null)} className="text-[11px] font-bold text-zinc-400 underline">다시 녹음</button>
            </div>

            {/* 대상자 선택 */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-zinc-400 ml-1 uppercase tracking-wider">기도 받을 분</label>
              <div className="flex flex-wrap gap-2">
                {selectedTargets.map(t => (
                  <div key={t.user_id} className="bg-[#4A6741] text-white px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    {t.users.display_name} 
                    <X size={12} className="cursor-pointer" onClick={() => toggleTarget(t)}/>
                  </div>
                ))}
                <button 
                  onClick={() => setShowMemberSelector(true)}
                  className="px-3 py-1.5 bg-white rounded-full text-zinc-500 text-[11px] font-bold border border-zinc-200 flex items-center gap-1 hover:bg-zinc-50 transition-colors"
                >
                  <UserPlus size={12}/> 추가
                </button>
              </div>
            </div>

            {/* 공개 범위 */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-zinc-400 ml-1 uppercase tracking-wider">공개 범위 설정</label>
              <div className="flex bg-zinc-100 p-1 rounded-2xl">
                {[
                  { id: 'public', label: '공동체 전체', icon: <Globe size={14}/> },
                  { id: 'targets', label: '대상자만', icon: <ShieldCheck size={14}/> },
                  { id: 'private', label: '나만 보기', icon: <Lock size={14}/> }
                ].map(opt => (
                  <button 
                    key={opt.id} 
                    onClick={() => setVisibility(opt.id as any)} 
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visibility === opt.id ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full py-5 bg-[#4A6741] text-white rounded-[20px] font-black shadow-lg shadow-[#4A6741]/20 active:scale-95 transition-all">
              기도 올리기
            </button>
          </div>
        )}
      </div>

      {/* 2. 기도 피드 (목록) */}
      <div className="space-y-4 pb-10">
        <div className="flex justify-between items-center px-1">
          <h4 className="font-black text-zinc-900">공동체 기도 피드</h4>
          <span className="text-[10px] font-bold text-zinc-400">최신순</span>
        </div>
        
        {/* 예시 카드 */}
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-zinc-50 text-left">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-zinc-100 rounded-[14px]" />
              <div>
                <div className="font-black text-sm text-zinc-800">박이삭 리더</div>
                <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                  <Globe size={10}/> 전체 공개 · 방금 전
                </div>
              </div>
            </div>
            <button className="text-zinc-300"><MoreVertical size={18}/></button>
          </div>
          <div className="bg-[#F8F9F7] rounded-2xl p-4 flex items-center gap-3 mb-4">
            <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm"><Play size={16} fill="currentColor"/></button>
            <div className="text-[12px] font-bold text-zinc-600">청년부 수련회를 위해 기도합니다. (0:45)</div>
          </div>
          <div className="flex items-center gap-4 text-zinc-400 border-t border-zinc-50 pt-4 mt-2">
            <button className="flex items-center gap-1 text-[11px] font-bold"><Heart size={14}/> 5</button>
            <button className="flex items-center gap-1 text-[11px] font-bold"><MessageSquare size={14}/> 2</button>
          </div>
        </div>
      </div>

      {/* 멤버 선택 모달 */}
      <AnimatePresence>
        {showMemberSelector && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMemberSelector(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-zinc-900 text-lg">기도 대상자 선택</h4>
                <button onClick={() => setShowMemberSelector(false)} className="text-zinc-400"><X size={20}/></button>
              </div>
              <div className="max-h-[350px] overflow-y-auto space-y-2 no-scrollbar mb-8">
                {groupMembers.length > 0 ? groupMembers.map(m => (
                  <button 
                    key={m.user_id} 
                    onClick={() => toggleTarget(m)}
                    className={`w-full p-4 rounded-[20px] flex items-center gap-3 transition-all ${
                      selectedTargets.find(t => t.user_id === m.user_id) 
                      ? 'bg-[#4A6741] text-white shadow-md' 
                      : 'bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${selectedTargets.find(t => t.user_id === m.user_id) ? 'bg-white/20' : 'bg-zinc-200'}`} />
                    <span className="font-bold text-sm">{m.users?.display_name || "익명 멤버"}</span>
                  </button>
                )) : (
                  <p className="text-center py-10 text-zinc-400 font-bold">멤버가 없습니다.</p>
                )}
              </div>
              <button onClick={() => setShowMemberSelector(false)} className="w-full py-5 bg-[#4A6741] text-white rounded-[20px] font-black shadow-lg">선택 완료</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
