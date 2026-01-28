import React, { useState, useRef } from "react";
import { 
  Users, Globe, Plus, X, Camera, Lock, Hash, Tag, 
  Info, Check, ChevronRight, Mic, BarChart3, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  
  // 모임 개설 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    password: '',
    category: '교회',
    description: '',
    imageUrl: ''
  });

  const [isSlugVerified, setIsSlugVerified] = useState(false);
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 변경 및 압축 준비
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData({ ...formData, imageUrl: previewUrl });
    }
  };

  const categories = ["가족", "교회", "학교", "직장", "기타"];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      {/* 1. 상단 탭 (절대 수정 금지 - 복구 완료) */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-8 relative z-20">
        <button 
          onClick={() => setActiveTab('my')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'my' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}
          style={{ fontSize: `${fontSize * 0.9}px` }}
        >
          <Users size={18} /> 내 모임
        </button>
        <button 
          onClick={() => setActiveTab('open')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}
          style={{ fontSize: `${fontSize * 0.9}px` }}
        >
          <Globe size={18} /> 오픈 모임
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md">
            {activeTab === 'my' ? (
              <div className="text-center pt-10">
                <div className="w-20 h-20 bg-white rounded-[28px] shadow-sm flex items-center justify-center mb-6 mx-auto text-zinc-200">
                  <Users size={32} />
                </div>
                <p className="font-bold text-zinc-400 mb-8 leading-relaxed">참여 중인 모임이 없습니다.<br/>새로운 공동체를 시작해보세요.</p>
                <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Plus size={20} /> 모임 개설하기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative mb-6">
                  <input className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 shadow-sm border-none" placeholder="오픈 모임 찾기" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                </div>
                <p className="text-center text-zinc-300 font-bold py-10">개설된 오픈 모임이 없습니다.</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* 2. 모임 개설 화면 (상세 요구사항 반영) */
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>

            <div className="bg-white rounded-[36px] p-8 shadow-sm border border-white space-y-8">
              {/* 이미지 설정 */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="대표" />
                  ) : (
                    <Camera size={28} className="text-zinc-300" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                <span className="text-[11px] font-bold text-zinc-400 mt-3">모임 대표 이미지</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="이름을 입력하세요" />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 아이디</label>
                  <div className="flex gap-2">
                    <input readOnly className={`flex-1 border-none rounded-2xl p-4 font-bold ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50'}`} value={formData.slug} placeholder="아이디" />
                    <button onClick={() => setShowSlugModal(true)} className={`px-5 rounded-2xl font-black text-sm ${isSlugVerified ? 'bg-white text-zinc-300' : 'bg-[#4A6741] text-white'}`}>
                      {isSlugVerified ? '확인완료' : '중복확인'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input type="text" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="비밀번호 (그대로 표시됨)" />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 유형</label>
                  <button onClick={() => setShowCategoryModal(true)} className="w-full bg-zinc-50 border-none rounded-2xl p-4 flex justify-between items-center font-bold">
                    <span>{formData.category}</span>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 설명</label>
                  <textarea className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-28 resize-none font-medium text-zinc-600" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="메시지 입력" />
                </div>
              </div>

              <button className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg">모임 개설하기</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. 모임 유형 선택 바텀 시트 (회원가입 방식 차용) */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12 shadow-2xl">
              <h4 className="font-black text-zinc-900 mb-6 text-center">모임 유형 선택</h4>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => { setFormData({...formData, category: cat}); setShowCategoryModal(false); }} className={`w-full p-5 rounded-2xl font-bold text-left ${formData.category === cat ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-500'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 중복 확인 팝업 (회원가입 방식 차용) */}
      <AnimatePresence>
        {showSlugModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-xs rounded-[32px] p-8 text-center shadow-2xl">
              <h4 className="font-black text-zinc-900 mb-4">모임 아이디 확인</h4>
              <input className="w-full bg-zinc-50 border-none rounded-xl p-4 mb-6 font-bold text-center" placeholder="아이디 입력" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setShowSlugModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-500 rounded-xl font-bold text-sm">취소</button>
                <button onClick={() => { setIsSlugVerified(true); setShowSlugModal(false); }} className="flex-1 py-3 bg-[#4A6741] text-white rounded-xl font-bold text-sm">확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
