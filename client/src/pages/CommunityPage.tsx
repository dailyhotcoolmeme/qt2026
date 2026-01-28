import React, { useState, useRef } from "react";
import { Users, Globe, Plus, X, Camera, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; // 설정된 supabase 클라이언트 필요

export default function CommunityPage() {
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
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 모임 개설 서버 연동 함수 (핵심 기능)
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
      // 여기에 리프레시 로직이나 내 모임 목록 업데이트 로직 추가 가능
    } catch (error: any) {
      alert("개설 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["가족", "교회", "학교", "직장", "기타"];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4">
      
      {/* 상단 탭 */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm mb-8">
        <button onClick={() => setActiveTab('my')} className={`flex-1 py-3 rounded-xl font-bold ${activeTab === 'my' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>내 모임</button>
        <button onClick={() => setActiveTab('open')} className={`flex-1 py-3 rounded-xl font-bold ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>오픈 모임</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" className="w-full max-w-md text-center pt-10">
            <p className="text-zinc-400 font-bold mb-8">참여 중인 모임이 없습니다.</p>
            <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
              <Plus size={20} /> 모임 개설하기
            </button>
          </motion.div>
        ) : (
          <motion.div key="create" className="w-full max-w-md space-y-5">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-900 text-xl">모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="text-zinc-400"><X /></button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border space-y-6">
              {/* 이미지 */}
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-zinc-50 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                  {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <Camera size={24} className="text-zinc-300" />}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) setFormData({...formData, imageUrl: URL.createObjectURL(file)});
                }} />
              </div>

              {/* 입력 박스 - 레이아웃 오류 수정됨 */}
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input className="w-full bg-zinc-50 border-none rounded-xl p-4 mt-1 font-bold" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 아이디</label>
                  <div className="flex gap-2 mt-1">
                    {/* 가변 너비로 버튼이 밖으로 나가지 않게 함 */}
                    <input readOnly className={`min-w-0 flex-1 border-none rounded-xl p-4 font-bold ${isSlugVerified ? 'bg-green-50' : 'bg-zinc-50'}`} value={formData.slug} />
                    <button onClick={() => setShowSlugModal(true)} className="shrink-0 px-4 bg-[#4A6741] text-white rounded-xl font-bold text-sm">중복확인</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input className="w-full bg-zinc-50 border-none rounded-xl p-4 mt-1 font-bold" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs font-black text-[#4A6741] ml-1">모임 유형</label>
                  <button onClick={() => setShowCategoryModal(true)} className="w-full bg-zinc-50 border-none rounded-xl p-4 mt-1 flex justify-between items-center font-bold">
                    {formData.category} <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* 동작하는 버튼 */}
              <button 
                disabled={loading}
                onClick={handleCreateSubmit} 
                className={`w-full py-5 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? '개설 중...' : '모임 개설하기'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 바텀 시트 및 중복확인 모달 생략 (위의 UI 확인 후 연동 가능) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={()=>setShowCategoryModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-3" onClick={e=>e.stopPropagation()}>
            {categories.map(cat => (
              <button key={cat} onClick={()=>{setFormData({...formData, category: cat}); setShowCategoryModal(false);}} className="w-full p-4 text-left font-bold bg-zinc-50 rounded-xl">{cat}</button>
            ))}
          </div>
        </div>
      )}

      {showSlugModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 text-center">
            <h4 className="font-bold mb-4 text-zinc-800">모임 아이디 입력</h4>
            <input className="w-full bg-zinc-50 border-none rounded-xl p-3 mb-4 text-center font-bold" value={formData.slug} onChange={(e)=>setFormData({...formData, slug: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={()=>setShowSlugModal(false)} className="flex-1 py-2 bg-zinc-100 rounded-lg">취-소</button>
              <button onClick={()=>{setIsSlugVerified(true); setShowSlugModal(false);}} className="flex-1 py-2 bg-[#4A6741] text-white rounded-lg">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
