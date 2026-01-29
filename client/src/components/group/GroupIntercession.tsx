import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, Square, Sparkles, BarChart3, Users, Calendar, 
  Target, Share2, Download, ChevronLeft, Heart, MessageSquare, 
  CheckCircle2, TrendingUp, Award, Quote
} from "lucide-react";

export default function GroupIntercession({ groupId, role }: any) {
  const [activeTab, setActiveTab] = useState<'feed' | 'report'>('feed');
  const [isRecording, setIsRecording] = useState(false);

  // ✅ 데이터 시뮬레이션 (실제론 DB에서 가져오게 됩니다)
  const reportData = {
    month: "1",
    totalActivity: 254, // 기도 + 묵상 + 댓글 총합
    activeMembers: 12,
    topKeywords: [
      { name: "위로", value: 85, color: "#4A6741" },
      { name: "비전", value: 60, color: "#6A8761" },
      { name: "가정", value: 45, color: "#8A9A5B" },
      { name: "건강", value: 30, color: "#A2C098" }
    ],
    bestMember: "김하늘 자매",
    highlightQuote: "고난 중에도 주시는 평안이 우리를 살게 합니다."
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 text-left relative">
      
      {/* 탭 전환 스위치 */}
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

      {activeTab === 'feed' ? (
        <div className="space-y-6">
          {/* 기도 입력 섹션 (원본 보존) */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100">
             <div className="flex flex-col items-center py-8 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200">
              <button 
                onClick={() => setIsRecording(!isRecording)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-[#4A6741]'}`}
              >
                {isRecording ? <Square size={24} className="text-white fill-white" /> : <Mic size={28} className="text-white" />}
              </button>
              <p className="mt-4 text-[11px] font-bold text-zinc-400">{isRecording ? "기도를 기록 중입니다..." : "터치하여 기도를 시작하세요"}</p>
            </div>
          </div>

          {/* 모임원 기도 리스트 */}
          <div className="space-y-4">
            <h4 className="font-black text-zinc-900 text-sm px-1">최근 중보기도</h4>
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-[28px] p-5 border border-zinc-50 shadow-sm">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-2xl" />
                  <div>
                    <div className="text-sm font-black text-zinc-800">박마리아 집사</div>
                    <div className="text-[10px] font-bold text-zinc-400">1시간 전</div>
                  </div>
                </div>
                <p className="text-[13px] font-bold text-zinc-700">병원 정기 검진 결과가 좋게 나오길 기도 부탁드립니다.</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 📊 월간 모임 리포트 섹션 (신규 자동화 기능) */
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
          
          {/* 리포트 카드 (캡처용 디자인) */}
          <div id="report-card" className="bg-[#4A6741] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Report for Jan 2026</span>
                  <h3 className="text-2xl font-black mt-1">은혜의 여정 리포트</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-xl"><Sparkles size={20} /></div>
              </div>

              {/* 주요 통계 그리드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/10 rounded-3xl p-5 border border-white/5">
                  <TrendingUp className="text-amber-300 mb-2" size={20} />
                  <div className="text-[24px] font-black">{reportData.totalActivity}건</div>
                  <div className="text-[10px] font-bold opacity-60 uppercase">함께한 나눔</div>
                </div>
                <div className="bg-black/10 rounded-3xl p-5 border border-white/5">
                  <Users className="text-blue-300 mb-2" size={20} />
                  <div className="text-[24px] font-black">{reportData.activeMembers}명</div>
                  <div className="text-[10px] font-bold opacity-60 uppercase">참여 지체</div>
                </div>
              </div>

              {/* 키워드 분석 바 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black"><Target size={14}/> 가장 많이 나눈 마음</div>
                <div className="space-y-3">
                  {reportData.topKeywords.map((k) => (
                    <div key={k.name} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>{k.name}</span>
                        <span>{k.value}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${k.value}%` }} 
                          className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 이달의 명언/하이라이트 */}
              <div className="bg-white/10 rounded-3xl p-6 border-l-4 border-white/30 italic">
                <Quote size={16} className="mb-2 opacity-50" />
                <p className="text-sm font-medium leading-relaxed">"{reportData.highlightQuote}"</p>
                <div className="mt-3 text-[10px] font-black not-italic opacity-60">— 이달의 은혜 문장</div>
              </div>
            </div>
          </div>

          {/* 리포트 하단 액션 버튼 */}
          <div className="grid grid-cols-2 gap-3 px-1">
            <button className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-4 rounded-[24px] text-xs font-black shadow-lg">
              <Download size={16} /> 이미지 저장
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#4A6741] text-white py-4 rounded-[24px] text-xs font-black shadow-lg">
              <Share2 size={16} /> 리포트 공유
            </button>
          </div>

          {/* 리더 전용 통계 인사이트 */}
          <div className="bg-white rounded-[35px] p-8 border border-zinc-100 shadow-sm flex items-center gap-5">
            <div className="bg-amber-100 p-4 rounded-2xl text-amber-600"><Award size={24} /></div>
            <div className="text-left">
              <h5 className="text-[11px] font-black text-zinc-400 uppercase">이달의 격려왕</h5>
              <p className="text-sm font-black text-zinc-800">{reportData.bestMember}</p>
              <p className="text-[10px] font-bold text-zinc-400 mt-0.5">가장 많은 댓글과 기도로 함께했습니다.</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
