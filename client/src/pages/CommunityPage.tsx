import React, { useState } from "react";
import { Users, Globe, Plus, X, Camera, Lock, Hash, Tag, Info, CheckCircle2, AlertCircle } from "lucide-react";
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
    slug: '',       // 모임 아이디
    password: '',
    category: '교회',
    customCategory: '',
    description: '',
  });

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // 모임 아이디 중복 체크
  const checkSlug = async (slug: string) => {
    if (slug.length < 3) return;
    setSlugStatus('checking');
    const { data } = await supabase.from('groups').select('group_slug').eq('group_slug', slug).maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  };

  const handleCreate = async () => {
    if (slugStatus !== 'available') return alert("모임 아이디 중복 확인을 해주세요.");
    // ... 실제 생성 로직 (다음 단계에서 연결)
    alert("모임 개설 요청이 전송되었습니다.");
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      {/* 상단 탭 (내 모임으로 이름 변경) */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-8">
        <button onClick={() => setActiveTab('my')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'my' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>내 모임</button>
        <button onClick={() => setActiveTab('open')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>오픈 모임</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center pt-10">
             {/* 모임이 없는 상태의 UI */}
             <div className="w-20 h-20 bg-white rounded-[28px] shadow-sm flex items-center justify-center mb-6 mx-auto text-zinc-300">
                <Users size={32} />
             </div>
             <p className="font-bold text-zinc-400 mb-8">개설된 모임이 없습니다.<br/>첫 번째 모임을 만들어보세요!</p>
             <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2">
                <Plus size={20} /> 모임 개설하기
             </button>
          </motion.div>
        ) : (
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.2}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="text-zinc-400"><X /></button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white space-y-6">
              {/* 이미지 (추후 R2 연결) */}
              <div className="flex flex-col items-center py-2">
                <div className="w-20 h-20 bg-zinc-50 rounded-[28px] border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-300">
                  <Camera size={24} />
                </div>
                <span className="text-[11px] font-bold text-zinc-400 mt-2">모임 대표 이미지</span>
              </div>

              {/* 입력 필드들 */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[11px] font-black text-[#4A6741] ml-1">모임 이름</label>
                  <input className="w-full bg-zinc-50 border-none rounded-2xl p-4 mt-1 font-bold" placeholder="모임 이름을 입력하세요" />
                </div>

                <div className="relative">
                  <label className="text-[11px] font-black text-[#4A6741] ml-1">모임 아이디 (중복확인)</label>
                  <div className="relative">
                    <input 
                      onChange={(e) => checkSlug(e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-2xl p-4 pr-12 mt-1 font-bold" 
                      placeholder="영문, 숫자 3자 이상" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && <div className="w-4 h-4 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin" />}
                      {slugStatus === 'available' && <CheckCircle2 size={20} className="text-green-500" />}
                      {slugStatus === 'taken' && <AlertCircle size={20} className="text-red-500" />}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[11px] font-black text-[#4A6741] ml-1">입장 비밀번호</label>
                  <input type="password" dclassName="w-full bg-zinc-50 border-none rounded-2xl p-4 mt-1 font-bold" placeholder="비밀번호 설정" />
                </div>

                <div className="relative">
                  <label className="text-[11px] font-black text-[#4A6741] ml-1">모임 유형</label>
                  <select className="w-full bg-zinc-50 border-none rounded-2xl p-4 mt-1 font-bold appearance-none">
                    <option>교회</option>
                    <option>가족</option>
                    <option>학교</option>
                    <option>직장</option>
                    <option>기타 (직접입력)</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="text-[11px] font-black text-[#4A6741] ml-1">모임 설명</label>
                  <textarea className="w-full bg-zinc-50 border-none rounded-2xl p-4 mt-1 h-24 resize-none" placeholder="모임원들에게 전할 메시지" />
                </div>
              </div>

              <button onClick={handleCreate} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg">모임 만들기</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
