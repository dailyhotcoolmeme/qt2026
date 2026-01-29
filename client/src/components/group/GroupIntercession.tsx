import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X, Sparkles, Volume2, ChevronRight,
  CheckCircle2, BarChart3, TrendingUp, Users, Target, Quote, Download, Share2
} from "lucide-react";

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'report'>('feed');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'targets' | 'private'>('public');
  const [waves, setWaves] = useState(Array(15).fill(20)); // ✅ 음성 파동 상태 복구
  const timerRef = useRef<any>(null);

  // ✅ 월간 리포트 데이터
  const reportData = {
    month: "1",
    totalActivity: 254,
    activeMembers: 12,
    topKeywords: [
      { name: "위로", value: 85 },
      { name: "비전", value: 60 },
      { name: "가정", value: 45 }
    ]
  };

  [span_9](start_span)// ✅ 음성 파동 애니메이션 로직 복구[span_9](end_span)
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-32 text-left relative">
      
      {/* 상단 탭 스위치 */}
      <div className="flex bg-zinc-100 p-1 rounded-2xl mx-1 shadow-inner">
        <button 
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all ${activeTab === 'feed' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}
        >
          실시간 피드
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all ${activeTab === 'report' ? 'bg-white shadow-sm text-[#4A6741]' : 'text-zinc-400'}`}
        >
          월간 리포트
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'feed' ? (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            [span_10](start_span)[span_11](start_span){/* 1. 기도 입력창 (파동 효과 포함 원본 디자인)[span_10](end_span)[span_11](end_span) */}
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
                  [span_12](start_span){/* ✅ 복구된 실시간 파동 뷰[span_12](end_span) */}
                  <div className="flex items-end gap-1 mb-8 h-12">
                    {waves.map((h, i) => (
                      <motion.div key={i} animate={{ height: isRecording ? h : 4 }} className={`w-1 rounded-full ${isRecording ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
                    ))}
                  </div>
                  <button 
                    onClick={() => isRecording ? setAudioUrl("mock") : setIsRecording(true)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all ${isRecording ? 'bg-red-500 shadow-red-200' : 'bg-[#4A6741] shadow-[#4A6741]/20'}`}
                  >
                    {isRecording ? <Square size={28} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                  [span_13](start_span){/* 녹음 완료 후 컨트롤러[span_13](end_span) */}
                  <div className="bg-[#4A6741] rounded-[24px] p-5 flex items-center gap-4 text-white">
                    <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Play size={20} fill="white"/></button>
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-white" /></div>
                    <button onClick={() => setAudioUrl(null)} className="p-1"><X size={16}/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['public', 'targets', 'private'].map(id => (
                      <button key={id} onClick={() => setVisibility(id as any)} className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${visibility === id ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-400'}`}>
                        <span className="text-[10px] font-black">{id === 'public' ? '전체공개' : id === 'targets' ? '대상자만' : '나만보기'}</span>
                      </button>
                    ))}
                  </div>
                  <button className="w-full py-5 bg-[#4A6741] text-white rounded-[22px] font-black shadow-xl">기도 전달하기</button>
                </motion.div>
              )}
            </div>

            [span_14](start_span){/* 2. 기도 피드 (원본 리스트 디자인 100% 복구)[span_14](end_span) */}
            <div className="space-y-4">
              <h4 className="font-black text-zinc-900 px-1 text-sm flex items-center gap-2">최근 올라온 기도 <div className="h-[1px] flex-1 bg-zinc-100" /></h4>
              {[1, 2].map((i) => {
                [span_15](start_span)const isAnswered = i === 2; // ✅ 응답 상태 복구[span_15](end_span)
                return (
                  <div key={i} className={`bg-white rounded-[32px] p-6 shadow-sm border transition-all ${isAnswered ? 'bg-[#4A6741]/5 border-[#4A6741]/20' : 'border-zinc-50'}`}>
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex gap-3">
                        <div className="w-11 h-11 bg-zinc-100 rounded-2xl flex items-center justify-center font-black text-zinc-400 text-xs">박</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-zinc-800">박마리아 집사</div>
                            {isAnswered && (
                              <span className="bg-[#4A6741] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase tracking-tighter">
                                <CheckCircle2 size={8}/> Answered
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400">15분 전</div>
                        </div>
                      </div>
                      <MoreVertical size={18} className="text-zinc-300"/>
                    </div>
                    [span_16](start_span){/* 오디오 바 스타일[span_16](end_span) */}
                    <div className="bg-zinc-50 rounded-[22px] p-4 flex items-center gap-4 mb-5 border border-zinc-100/50">
                      <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm"><Play size={16} fill="currentColor"/></button>
                      <div className="flex-1 text-left">
                         <div className="text-[12px] font-bold text-zinc-700">치유를 위한 간절한 기도...</div>
                         <div className="text-[10px] font-bold text-zinc-400 opacity-60">00:38</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-black ${i === 1 ? "bg-pink-50 text-pink-500" : "bg-zinc-50 text-zinc-400"}`}
                        >
                          <Heart size={14} fill={i === 1 ? "currentColor" : "none"}/>
                          {i === 1 ? '기도 중' : '나도 기도함'} 24
                        </motion.button>
                        <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 text-zinc-400 rounded-full text-[11px] font-black"><MessageSquare size={14}/> 8</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* 3. 월간 리포트 섹션 */
          <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-[#4A6741] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Monthly Recap</span>
                    <h3 className="text-2xl font-black mt-1">{reportData.month}월 소그룹 은혜 리포트</h3>
                  </div>
                  <Sparkles size={24} className="text-amber-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/10 rounded-3xl p-5">
                    <TrendingUp className="text-amber-300 mb-2" size={20} />
                    <div className="text-2xl font-black">{reportData.totalActivity}</div>
                    <div className="text-[10px] font-bold opacity-60">Total Activity</div>
                  </div>
                  <div className="bg-black/10 rounded-3xl p-5">
                    <Users className="text-blue-300 mb-2" size={20} />
                    <div className="text-2xl font-black">{reportData.activeMembers}</div>
                    <div className="text-[10px] font-bold opacity-60">Active Members</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black"><Target size={14}/> 주요 은혜 키워드</div>
                  <div className="space-y-3">
                    {reportData.topKeywords.map((k) => (
                      <div key={k.name} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold"><span>{k.name}</span><span>{k.value}%</span></div>
                        <div className="h-1 bg-white/10 rounded-full">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${k.value}%` }} className="h-full bg-white rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/10 rounded-3xl p-6 italic border-l-4 border-white/30">
                  <Quote size={16} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium leading-relaxed">"우리의 기도가 쌓여 하나님의 일하심이 됩니다."</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-1">
              <button className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-4 rounded-[24px] text-xs font-black shadow-lg"><Download size={16} /> 이미지 저장</button>
              <button className="flex items-center justify-center gap-2 bg-[#4A6741] text-white py-4 rounded-[24px] text-xs font-black shadow-lg"><Share2 size={16} /> 리포트 공유</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
