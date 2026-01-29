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
  const timerRef = useRef<any>(null);

  // 리포트 시뮬레이션 데이터
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

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 100);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-32 text-left relative">
      
      {/* 탭 메뉴 */}
      <div className="flex bg-zinc-100 p-1 rounded-2xl mx-1">
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
            
            {/* 1. 기도 입력 섹션 (원본 디자인) */}
            <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-zinc-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" /> 마음 나누기
                </h3>
                <div className="flex items-center gap-1 bg-zinc-50 px-3 py-1.5 rounded-full">
                  <Globe size={12} className="text-[#4A6741]" />
                  <span className="text-[10px] font-black text-zinc-500">전체 공개</span>
                </div>
              </div>

              <div className="flex flex-col items-center py-10 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200 relative overflow-hidden">
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl z-10 transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-[#4A6741]'}`}
                >
                  {isRecording ? <Square size={28} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
                </button>
                <p className="mt-4 text-[11px] font-black text-zinc-400 z-10">
                  {isRecording ? "기도를 기록하고 있습니다..." : "터치하여 기도를 시작하세요"}
                </p>
              </div>
            </div>

            {/* 2. 중보기도 리스트 (사용자님이 좋아하셨던 리스트 방식 복구) */}
            <div className="space-y-4">
              <h4 className="font-black text-zinc-900 text-sm px-1 flex items-center justify-between">
                최근 중보기도 <ChevronRight size={16} className="text-zinc-300" />
              </h4>
              
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-[35px] p-6 shadow-sm border border-zinc-50">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-[20px] flex items-center justify-center font-black text-zinc-400">
                        {i === 1 ? "박" : "김"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-zinc-800">{i === 1 ? "박마리아 집사" : "김하늘 자매"}</span>
                          {i === 1 && <CheckCircle2 size={14} className="text-[#4A6741]" />}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-400">중보기도 요청 · {i}시간 전</div>
                      </div>
                    </div>
                    <button className="text-zinc-300"><MoreVertical size={20}/></button>
                  </div>

                  {/* 오디오 플레이어 스타일 바 */}
                  <div className="bg-zinc-50 rounded-[24px] p-4 mb-5 flex items-center gap-3 border border-zinc-100">
                    <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#4A6741] shadow-sm">
                      <Play size={14} fill="currentColor" />
                    </button>
                    <div className="flex-1 text-left">
                      <div className="text-[11px] font-bold text-zinc-700 line-clamp-1">{i === 1 ? "가족의 건강과 평안을 위한 기도" : "직장 내 선한 영향력을 위해"}</div>
                      <div className="text-[9px] font-bold text-zinc-400">00:{i === 1 ? "42" : "38"}</div>
                    </div>
                  </div>

                  {/* 인터랙션 버튼 */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                    <div className="flex items-center gap-3">
                      <button className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black ${i === 1 ? 'bg-rose-50 text-rose-500' : 'bg-zinc-50 text-zinc-400'}`}>
                        <Heart size={14} fill={i === 1 ? "currentColor" : "none"} />
                        {i === 1 ? '기도 중' : '나도 기도함'} {i === 1 ? 24 : 12}
                      </button>
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 text-zinc-400 rounded-full text-[11px] font-black">
                        <MessageSquare size={14} /> 8
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* 3. 월간 리포트 섹션 (신규 기능 통합) */
          <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-[#4A6741] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Monthly Recap</span>
                    <h3 className="text-2xl font-black mt-1">{reportData.month}월 우리 소그룹 리포트</h3>
                  </div>
                  <Sparkles size={24} className="text-amber-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/10 rounded-3xl p-5">
                    <TrendingUp className="text-amber-300 mb-2" size={20} />
                    <div className="text-2xl font-black">{reportData.totalActivity}</div>
                    <div className="text-[10px] font-bold opacity-60 uppercase">Total Grace</div>
                  </div>
                  <div className="bg-black/10 rounded-3xl p-5">
                    <Users className="text-blue-300 mb-2" size={20} />
                    <div className="text-2xl font-black">{reportData.activeMembers}</div>
                    <div className="text-[10px] font-bold opacity-60 uppercase">Members</div>
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
                  <p className="text-sm font-medium leading-relaxed">"고난 중에도 주시는 평안이 우리를 살게 합니다."</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-1">
              <button className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-4 rounded-[24px] text-xs font-black"><Download size={16} /> 이미지 저장</button>
              <button className="flex items-center justify-center gap-2 bg-[#4A6741] text-white py-4 rounded-[24px] text-xs font-black"><Share2 size={16} /> 리포트 공유</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
