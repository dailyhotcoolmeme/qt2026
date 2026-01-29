import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, Square, Play, UserPlus, Globe, ShieldCheck, 
  Lock, Heart, MessageSquare, MoreVertical, X, Sparkles, Volume2, ChevronRight,
  CheckCircle2, BarChart3, PieChart, Users, Calendar, Target
} from "lucide-react";

export default function GroupIntercession({ groupId, role }: { groupId: string, role: string }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'report'>('feed');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // ✅ 1. 모임원 개별 기도제목 데이터 (예시)
  const memberPrayers = [
    { id: 1, name: "박마리아", role: "집사", title: "가족 건강과 자녀 진로", tags: ["치유", "진로"], date: "15분 전", status: "answered" },
    { id: 2, name: "김하늘", role: "자매", title: "직장 내 선한 영향력", tags: ["직장", "전도"], date: "2시간 전", status: "active" },
  ];

  // ✅ 2. 월간 리포트 데이터 (자동화 분석 결과 시뮬레이션)
  const monthlyStats = {
    month: "1",
    totalPrayers: 142,
    answeredCount: 28,
    topKeywords: [
      { word: "치유", weight: 45 },
      { word: "평안", weight: 30 },
      { word: "가정", weight: 15 },
      { word: "감사", weight: 10 },
    ]
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 text-left">
      
      {/* 상단 탭 메뉴 */}
      <div className="flex bg-zinc-100 p-1 rounded-2xl mb-4">
        <button 
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${activeTab === 'feed' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}
        >
          기도 피드
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${activeTab === 'report' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}
        >
          월간 리포트
        </button>
      </div>

      {activeTab === 'feed' ? (
        <>
          [span_3](start_span)[span_4](start_span){/* 기도 입력창 (기존 로직 유지)[span_3](end_span)[span_4](end_span) */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-100">
            <h3 className="font-black text-zinc-900 flex items-center gap-2 mb-6">
              <Sparkles size={18} className="text-amber-400" /> 마음 나누기
            </h3>
            <div className="flex flex-col items-center py-10 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200">
              <button 
                onClick={() => isRecording ? setAudioUrl("mock") : setIsRecording(true)}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500' : 'bg-[#4A6741]'}`}
              >
                {isRecording ? <Square size={28} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
              </button>
            </div>
          </div>

          [span_5](start_span)[span_6](start_span){/* 3. 모임원 개별 기도 리스트[span_5](end_span)[span_6](end_span) */}
          <div className="space-y-4">
            <h4 className="font-black text-zinc-900 px-1 text-sm flex items-center gap-2">
              모임원 기도제목 <div className="h-[1px] flex-1 bg-zinc-100" />
            </h4>
            {memberPrayers.map((p) => (
              <div key={p.id} className={`bg-white rounded-[32px] p-6 shadow-sm border ${p.status === 'answered' ? 'border-[#4A6741]/30 bg-[#4A6741]/5' : 'border-zinc-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 bg-zinc-200 rounded-2xl flex items-center justify-center font-black text-white text-xs">{p.name[0]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-800">{p.name} {p.role}</span>
                        {p.status === 'answered' && (
                          <span className="bg-[#4A6741] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-tighter uppercase">
                            <CheckCircle2 size={8}/> Answered
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-400">{p.date}</div>
                    </div>
                  </div>
                  <MoreVertical size={18} className="text-zinc-300"/>
                </div>
                <p className="text-[13px] font-bold text-zinc-700 leading-relaxed mb-4">{p.title}</p>
                <div className="flex gap-2">
                  {p.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black bg-zinc-100 text-zinc-500 px-2 py-1 rounded-lg">#{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        [span_7](start_span)[span_8](start_span)/* 4. 월간 자동 리포트 섹션 (제안 기능)[span_7](end_span)[span_8](end_span) */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-zinc-900 rounded-[35px] p-8 text-white relative overflow-hidden">
            <BarChart3 className="absolute right-[-20px] top-[-20px] w-40 h-40 text-white/5" />
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Monthly Report</span>
              <h3 className="text-2xl font-black mt-1 mb-6">{monthlyStats.month}월 소그룹 은혜 리포트</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-white/60 mb-1">총 기도 나눔</div>
                  <div className="text-xl font-black">{monthlyStats.totalPrayers}건</div>
                </div>
                <div className="bg-[#4A6741] rounded-2xl p-4 shadow-lg">
                  <div className="text-[10px] font-bold text-white/60 mb-1">응답된 기도</div>
                  <div className="text-xl font-black">{monthlyStats.answeredCount}건</div>
                </div>
              </div>
            </div>
          </div>

          {/* 키워드 분석 (비중 표시) */}
          <div className="bg-white rounded-[35px] p-8 border border-zinc-100 shadow-sm">
            <h4 className="font-black text-zinc-900 text-sm mb-6 flex items-center gap-2">
              <Target size={18} className="text-[#4A6741]" /> 이번 달 주요 키워드
            </h4>
            <div className="space-y-4">
              {monthlyStats.topKeywords.map((k) => (
                <div key={k.word} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black text-zinc-600">
                    <span>{k.word}</span>
                    <span>{k.weight}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${k.weight}%` }} 
                      className="h-full bg-[#4A6741]" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-[30px] p-6 border border-amber-100 flex items-center gap-4">
            <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg shadow-amber-200">
              <Calendar size={20} />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black text-amber-600 uppercase">Recommendation</p>
              <p className="text-sm font-bold text-amber-900">다음 달엔 '평안'을 주제로 함께 나눠보는 건 어떨까요?</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
