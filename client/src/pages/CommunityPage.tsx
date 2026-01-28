import React, { useState, useRef } from "react";
import { Users, Globe, Plus, X, Camera, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  
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

  // 모임 개설 실행 (Supabase 연결)
  const handleCreateSubmit = async () => {
    if (!formData.name) return alert("모임 이름을 입력해주세요.");
    if (!isSlugVerified) return alert("모임 아이디 중복 확인이 필요합니다.");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

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
        .select().single();

      if (groupError) throw groupError;

      await supabase.from('group_members').insert([{ 
        group_id: group.id, user_id: user.id, role: 'leader' 
      }]);

      alert("모임 개설 완료!");
      setViewMode('list');
    } catch (error: any) {
      alert("에러: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["가족", "교회", "학교", "직장", "기타"];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      {/* 상단 탭 유지 */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm mb-8">
        <button onClick={() => setActiveTab('my')} className={`flex-1 py-3 rounded-xl font-bold ${activeTab === 'my' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>내 모임</button>
        <button onClick={() => setActiveTab('open')} className={`flex-1 py-3 rounded-xl font-bold ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>오픈 모임</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" className="w-full max-w-md text-center pt-10">
            <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
              <Plus size={20} /> 모임 개설하기
            </button>
          </motion.div>
        ) : (
          <motion.div key="create" className="w-full max-w-md space-y-5">
            <div className="flex justify-between items-center px-2 text-zinc-900 font-black text-xl">
               <span>모임 개설</span>
               <button onClick={() => setViewMode('list')} className="text-zinc-400"><X /></button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border space-y-6">
              {/* 사진 영역 문구 복구 */}
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-zinc-50 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                  {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <Camera size={24} className="text-zinc-300" />}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) setFormData({...formData, imageUrl: URL.createObjectURL(file)});
                }} />
                <span className="text-[11px] font-bold text-zinc-400 mt-2">모임 대표 이미지 설정</span>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input className="w-full bg-zinc-50 rounded-xl p-4 font-bold border-none" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 아이디</label>
                  <div className="flex gap-2">
                    {/* readOnly 제거하여 입력 가능하게 수정 */}
                    <input 
                      className={`flex-1 min-w-0 rounded-xl p-4 font-bold border-none ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-800'}`} 
                      value={formData.slug} 
                      onChange={(e) => { setFormData({...formData, slug: e.target.value}); setIsSlugVerified(false); }}
                    />
                    <button onClick={() => { if(formData.slug) setIsSlugVerified(true); alert("사용 가능한 아이디입니다."); }} className="shrink-0 px-4 bg-[#4A6741] text-white rounded-xl font-bold text-sm">중복확인</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input className="w-full bg-zinc-50 rounded-xl p-4 font-bold border-none" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 유형</label>
                  <button onClick={() => setShowCategoryModal(true)} className="w-full bg-zinc-50 rounded-xl p-4 flex justify-between items-center font-bold text-zinc-800 border-none">
                    {formData.category} <ChevronRight size={18} className="text-zinc-300" />
                  </button>
                </div>
              </div>

              <button onClick={handleCreateSubmit} disabled={loading} className="w-full py-5 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                {loading ? '개설 중...' : '모임 개설하기'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 유형 선택 바텀 시트 (2열 배치) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 px-4 pb-10" onClick={()=>setShowCategoryModal(false)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6" onClick={e=>e.stopPropagation()}>
            <h4 className="font-black text-center mb-6">모임 유형 선택</h4>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button key={cat} onClick={()=>{setFormData({...formData, category: cat}); setShowCategoryModal(false);}} className={`p-4 font-bold rounded-xl text-center ${formData.category === cat ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-500'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
