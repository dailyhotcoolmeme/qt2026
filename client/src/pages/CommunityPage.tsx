import React, { useState, useRef, useEffect } from "react";
import { 
  Users, Globe, Plus, X, Camera, ChevronRight, Search, 
  Mic, BarChart3, Check, Settings, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 모임 아이디 실제 중복 체크 함수
  const handleCheckSlug = async () => {
    if (!formData.slug || formData.slug.length < 2) {
      return alert("아이디를 2자 이상 입력해주세요.");
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('group_slug')
        .eq('group_slug', formData.slug)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        alert("이미 사용 중인 아이디입니다.");
        setIsSlugVerified(false);
      } else {
        alert("사용 가능한 아이디입니다! (녹색 배경 확인)");
        setIsSlugVerified(true);
      }
    } catch (err: any) {
      alert("확인 중 오류: " + err.message);
    }
  };

  // 2. 모임 개설 실행 (Supabase 연결)
  const handleCreateSubmit = async () => {
    if (!formData.name) return alert("모임 이름을 입력해주세요.");
    if (!isSlugVerified) return alert("모임 아이디 중복 확인이 필요합니다.");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      // A. groups 테이블에 저장
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ 
          name: formData.name, 
          group_slug: formData.slug,
          password: formData.password,
          category: formData.category,
          description: formData.description,
          owner_id: user.id 
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      // B. 개설자를 리더로 등록
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ 
          group_id: group.id, 
          user_id: user.id, 
          role: 'leader' 
        }]);

      if (memberError) throw memberError;

      alert("모임이 성공적으로 개설되었습니다!");
      setViewMode('list');
      // 초기화
      setFormData({ name: '', slug: '', password: '', category: '교회', description: '', imageUrl: '' });
      setIsSlugVerified(false);
    } catch (error: any) {
      alert("개설 실패 (RLS 정책 확인 필요): " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["가족", "교회", "학교", "직장", "기타"];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar text-left">
      
      {/* 상단 탭 - 기존 디자인 유지 */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-8">
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
                <button 
                  onClick={() => setViewMode('create')} 
                  className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
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
          /* 모임 개설 화면 */
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>

            <div className="bg-white rounded-[36px] p-8 shadow-sm border border-white space-y-8">
              {/* 대표 이미지 설정 문구 복구 */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#4A6741]"
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="대표" />
                  ) : (
                    <Camera size={28} className="text-zinc-300" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) setFormData({...formData, imageUrl: URL.createObjectURL(file)});
                }} />
                <span className="text-[11px] font-bold text-zinc-400 mt-3">모임 대표 이미지 설정</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" 
                    placeholder="모임의 이름을 정해주세요"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 아이디</label>
                  <div className="flex gap-2 items-center w-full">
                    {/* readOnly 제거 및 레이아웃 유지 */}
                    <input 
                      className={`flex-1 min-w-0 border-none rounded-2xl p-4 font-bold transition-all ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-800'}`} 
                      placeholder="아이디 입력"
                      value={formData.slug}
                      onChange={(e) => { setFormData({...formData, slug: e.target.value}); setIsSlugVerified(false); }}
                    />
                    <button 
                      onClick={handleCheckSlug}
                      className="w-24 shrink-0 h-[56px] bg-[#4A6741] text-white rounded-2xl font-black text-sm active:scale-95 transition-all"
                    >
                      {isSlugVerified ? '완료' : '중복확인'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" 
                    placeholder="비밀번호 (공개 표시)"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 유형</label>
                  <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 flex justify-between items-center font-bold text-zinc-800"
                  >
                    <span>{formData.category}</span>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 설명</label>
                  <textarea 
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-28 resize-none font-medium text-zinc-600" 
                    placeholder="모임원들에게 전할 메시지"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateSubmit}
                disabled={loading}
                className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg active:scale-95 transition-all text-lg"
              >
                {loading ? '개설 처리 중...' : '모임 개설하기'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모임 유형 선택 바텀 시트 (2열 배치 및 짤림 방지) */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[40px] p-8 pb-14 shadow-2xl"
            >
              <h4 className="font-black text-zinc-900 mb-6 text-center">모임 유형 선택</h4>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => { setFormData({...formData, category: cat}); setShowCategoryModal(false); }}
                    className={`p-5 rounded-2xl font-bold transition-all ${formData.category === cat ? 'bg-[#4A6741] text-white shadow-md' : 'bg-zinc-50 text-zinc-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
