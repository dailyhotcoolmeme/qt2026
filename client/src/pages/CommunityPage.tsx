import React, { useState, useRef } from "react";
import { Users, Plus, X, Camera, Lock, Hash, Tag, Info, Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  
  // 폼 상태
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

  // 1. 이미지 압축 및 업로드 (임시 브라우저 압축 로직 포함)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: 여기에 이미지 압축 라이브러리(browser-image-compression 등) 연동 가능
    // 현재는 미리보기용 URL 생성 (실제 서버 저장 로직은 다음 단계)
    const previewUrl = URL.createObjectURL(file);
    setFormData({ ...formData, imageUrl: previewUrl });
    alert("이미지가 선택되었습니다. 개설 시 서버에 저장됩니다.");
  };

  // 2. 모임 유형 리스트
  const categories = ["가족", "교회", "학교", "직장", "기타"];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center pt-20">
             <div className="w-20 h-20 bg-white rounded-[28px] shadow-sm flex items-center justify-center mb-6 mx-auto text-zinc-200">
                <Users size={32} />
             </div>
             <p className="font-bold text-zinc-400 mb-8 leading-relaxed">참여 중인 모임이 없습니다.<br/>새로운 공동체를 시작해보세요.</p>
             <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                <Plus size={20} /> 모임 개설하기
             </button>
          </motion.div>
        ) : (
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>

            <div className="bg-white rounded-[36px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white space-y-8">
              
              {/* 대표 이미지 설정 */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#4A6741]"
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="대표이미지" />
                  ) : (
                    <Camera size={28} className="text-zinc-300 group-hover:text-[#4A6741]" />
                  )}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <span className="text-[11px] font-bold text-zinc-400 mt-3">모임 대표 이미지 설정</span>
              </div>

              <div className="space-y-6">
                {/* 모임 이름 */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800 focus:ring-2 focus:ring-[#4A6741]/20 transition-all" 
                    placeholder="모임의 이름을 정해주세요"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* 모임 아이디 + 중복확인 */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 아이디</label>
                  <div className="flex gap-2">
                    <input 
                      disabled={isSlugVerified}
                      className={`flex-1 border-none rounded-2xl p-4 font-bold transition-all ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-800'}`} 
                      placeholder="모임 아이디 입력"
                      value={formData.slug}
                    />
                    <button 
                      onClick={() => setShowSlugModal(true)}
                      className={`px-5 rounded-2xl font-black text-sm shadow-sm transition-all ${isSlugVerified ? 'bg-white text-zinc-300 cursor-default' : 'bg-[#4A6741] text-white active:scale-95'}`}
                    >
                      {isSlugVerified ? '확인완료' : '중복확인'}
                    </button>
                  </div>
                </div>

                {/* 입장 비밀번호 (그대로 노출) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" 
                    placeholder="비밀번호 설정 (보안이 필요할 때)"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                {/* 모임 유형 (커스텀 팝업) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 유형</label>
                  <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 flex justify-between items-center font-bold text-zinc-800 active:bg-zinc-100 transition-colors"
                  >
                    <span>{formData.category}</span>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </button>
                </div>

                {/* 모임 설명 */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 설명</label>
                  <textarea 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-28 resize-none font-medium text-zinc-600 leading-relaxed" 
                    placeholder="모임원들에게 전할 따뜻한 메시지를 입력하세요"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <button className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-[0_10px_25px_rgba(74,103,65,0.2)] active:scale-95 transition-all text-lg">
                모임 개설하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모임 유형 선택 바텀 시트 */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12 shadow-2xl"
            >
              <h4 className="font-black text-zinc-900 mb-6 text-center">모임 유형 선택</h4>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => { setFormData({...formData, category: cat}); setShowCategoryModal(false); }}
                    className={`w-full p-5 rounded-2xl font-bold text-left transition-all ${formData.category === cat ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 모임 아이디 중복확인용 모달 (심플 버전) */}
      <AnimatePresence>
        {showSlugModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-xs rounded-[32px] p-8 text-center shadow-2xl">
              <h4 className="font-black text-zinc-900 mb-4">모임 아이디 확인</h4>
              <input 
                className="w-full bg-zinc-50 border-none rounded-xl p-4 mb-6 font-bold text-center"
                placeholder="아이디 입력"
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowSlugModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-500 rounded-xl font-bold">취소</button>
                <button 
                  onClick={() => { setIsSlugVerified(true); setShowSlugModal(false); }}
                  className="flex-1 py-3 bg-[#4A6741] text-white rounded-xl font-bold"
                >
                  사용하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
