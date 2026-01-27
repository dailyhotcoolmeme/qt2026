import React, { useState, useEffect } from "react";
import { 
  Mic, Users, Globe, MessageSquare, Heart, 
  BarChart3, CheckCircle2, MoreHorizontal, Plus, 
  Play, Pause, X, Search, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState<'private' | 'open'>('private');
  
  // 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // 가상의 키워드 데이터 (수익 모델: 음성 분석 결과 시각화)
  const hotKeywords = [
    { text: "가정", count: 42, color: "text-[#4A6741]" },
    { text: "건강", count: 28, color: "text-zinc-500" },
    { text: "취업", count: 15, color: "text-zinc-400" },
    { text: "비전", count: 12, color: "text-zinc-400" },
  ];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      {/* 1. 상단 탭 (중보모임 / 오픈모임) */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-8">
        <button 
          onClick={() => setActiveTab('private')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'private' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}
          style={{ fontSize: `${fontSize * 0.9}px` }}
        >
          <Users size={18} />
          중보모임
        </button>
        <button 
          onClick={() => setActiveTab('open')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}
          style={{ fontSize: `${fontSize * 0.9}px` }}
        >
          <Globe size={18} />
          오픈모임
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'private' ? (
          <motion.div 
            key="private" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md space-y-6"
          >
            {/* 2. 모임장 대시보드 (키워드 시각화 카드) */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-white">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-[#4A6741]" size={20} />
                  <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize}px` }}>모임 영적 상태 분석</h3>
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Live Analysis</span>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                {hotKeywords.map((kw, idx) => (
                  <div key={idx} className="bg-zinc-50 px-4 py-2 rounded-full flex items-center gap-2">
                    <span className={`font-black ${kw.color}`} style={{ fontSize: `${fontSize * 0.85}px` }}>#{kw.text}</span>
                    <span className="text-[11px] text-zinc-300 font-bold">{kw.count}</span>
                  </div>
                ))}
              </div>
              <p className="text-zinc-400 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.75}px` }}>
                * 최근 7일간 모임원들의 음성 기도를 분석한 결과입니다. <br/>
                가장 많이 언급된 키워드는 <b className="text-[#4A6741]">"가정"</b>입니다.
              </p>
            </div>

            {/* 3. 모임원 활동 리스트 (관리 기능) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.1}px` }}>모임원 소식</h4>
                <button className="text-[12px] font-bold text-[#4A6741]">전체보기</button>
              </div>

              {/* 활동 카드 예시 */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-50 overflow-hidden" />
                    <div>
                      <p className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 0.9}px` }}>김성도 성도</p>
                      <p className="text-[11px] text-zinc-400 font-bold">15분 전 기록</p>
                    </div>
                  </div>
                  <button className="text-zinc-300"><MoreHorizontal size={20} /></button>
                </div>
                
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-[#4A6741]/5 rounded-2xl p-3 border border-[#4A6741]/10 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-[#4A6741]">QT</span>
                    <CheckCircle2 size={16} className="text-[#4A6741]" />
                  </div>
                  <div className="flex-1 bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-zinc-300">성경</span>
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-200" />
                  </div>
                  <div className="flex-1 bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-zinc-300">기도</span>
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-200" />
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic size={14} className="text-[#4A6741]" />
                    <span className="text-[11px] font-black text-[#4A6741]">음성 기도 남김</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#4A6741]">
                      <Play size={14} fill="currentColor" />
                    </button>
                    <div className="flex-1 h-1 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-[#4A6741]" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-300">0:45</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-zinc-50 pt-4">
                  <button className="flex items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform">
                    <Heart size={18} />
                    <span className="text-xs font-bold">중보하기 12</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-zinc-400">
                    <MessageSquare size={18} />
                    <span className="text-xs font-bold">격려 4</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* 오픈 모임방 영역 */
          <motion.div 
            key="open" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md space-y-4"
          >
            <div className="relative mb-6">
              <input 
                className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 border-none"
                placeholder="관심 있는 모임방을 찾아보세요"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
            </div>

            {['환우 중보팀', '수험생 부모 기도회', '취업준비생 응원방'].map((title, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#4A6741]/10 flex items-center justify-center text-[#4A6741]">
                    <Users size={24} />
                  </div>
                  <div>
                    <h5 className="font-black text-zinc-800" style={{ fontSize: `${fontSize}px` }}>{title}</h5>
                    <p className="text-xs font-bold text-zinc-400">현재 240명 참여 중</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-300" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. 플로팅 버튼 (기도 및 활동 기록) */}
      <button 
        onClick={() => setShowRecordModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* 5. 활동 및 음성 기도 기록 모달 */}
      <AnimatePresence>
        {showRecordModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRecordModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[40px] shadow-2xl p-10 pb-20"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.4}px` }}>나의 신앙 기록</h3>
                <button onClick={() => setShowRecordModal(false)} className="p-2.5 bg-zinc-100 rounded-full text-zinc-400"><X size={24} /></button>
              </div>

              <div className="space-y-8">
                {/* 체크리스트 영역 */}
                <div className="grid grid-cols-3 gap-4">
                  {['오늘 QT', '성경읽기', '예배출석'].map((item) => (
                    <button key={item} className="flex flex-col items-center gap-3 p-4 bg-zinc-50 rounded-3xl border border-zinc-100 active:bg-[#4A6741]/10 transition-colors">
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-200 flex items-center justify-center" />
                      <span className="font-bold text-zinc-500 text-xs">{item}</span>
                    </button>
                  ))}
                </div>

                {/* 핵심: 음성 기도 녹음 버튼 */}
                <div className="flex flex-col items-center py-6">
                  <p className="font-bold text-zinc-400 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>간절한 마음을 음성으로 남겨보세요</p>
                  <button 
                    onMouseDown={() => setIsRecording(true)}
                    onMouseUp={() => setIsRecording(false)}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-red-200' : 'bg-[#4A6741]'} shadow-xl`}
                  >
                    <Mic size={40} className="text-white" fill={isRecording ? "white" : "none"} />
                  </button>
                  <p className={`mt-4 font-black text-sm transition-opacity ${isRecording ? 'opacity-100 text-red-500 animate-pulse' : 'opacity-0'}`}>녹음 중입니다...</p>
                </div>

                <button 
                  className="w-full h-16 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  기록 완료하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
