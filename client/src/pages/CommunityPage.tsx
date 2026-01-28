import React, { useState, useRef } from "react";
import { 
  Users, Globe, Plus, X, Camera, ChevronRight, Search, MapPin, UserCircle, Hash 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  
  // 폼 상태 - 내 모임과 오픈 모임을 완전히 분리 (데이터 혼선 방지)
  const [type, setType] = useState<'private' | 'open'>('private');
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    password: '',
    category: '',
    location: '', // 오픈모임 전용 (필수)
    ageRange: '', // 오픈모임 전용 (필수)
    tags: '',     // 오픈모임 전용 (선택)
    description: '',
    imageUrl: '', 
    imageFile: null as File | null
  });

  const [isSlugVerified, setIsSlugVerified] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'location' | 'age' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ["가족", "교회", "학교", "직장", "기타"];
  const locations = ["전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const ages = ["연령 무관", "10대", "20대", "30대", "40대", "50대", "60대 이상"];

  // 탭 전환 시 폼 초기화 (데이터 섞임 방지)
  const handleTypeChange = (newType: 'private' | 'open') => {
    setType(newType);
    setFormData({
      name: '', slug: '', password: '', category: '',
      location: '', ageRange: '', tags: '', description: '',
      imageUrl: '', imageFile: null
    });
    setIsSlugVerified(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imageUrl: URL.createObjectURL(file), imageFile: file });
    }
  };

  const handleCheckSlug = async () => {
    if (!formData.slug || formData.slug.length < 2) return alert("아이디를 2자 이상 입력해주세요.");
    try {
      const { data } = await supabase.from('groups').select('group_slug').eq('group_slug', formData.slug).maybeSingle();
      if (data) { alert("이미 사용 중인 아이디입니다."); setIsSlugVerified(false); }
      else { alert("사용 가능한 아이디입니다!"); setIsSlugVerified(true); }
    } catch (err: any) { alert("확인 중 오류: " + err.message); }
  };

  const handleCreateSubmit = async () => {
    // 1. 공통 필수 체크
    if (!formData.name.trim()) return alert("모임 이름을 입력해주세요.");
    if (!isSlugVerified) return alert("아이디 중복 확인이 필요합니다.");

    // 2. 타입별 필수 체크
    if (type === 'private') {
      if (!formData.password.trim()) return alert("입장 비밀번호를 입력해주세요.");
      if (!formData.category) return alert("모임 유형을 선택해주세요.");
    } else {
      if (!formData.location) return alert("모임 지역을 선택해주세요.");
      if (!formData.ageRange) return alert("모임 연령대를 선택해주세요.");
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      let finalImageUrl = null;
      if (formData.imageFile) {
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData.imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ 
          name: formData.name, 
          group_slug: formData.slug,
          password: formData.password, // 오픈모임은 선택값이므로 빈값 허용
          category: type === 'private' ? formData.category : '오픈모임',
          description: formData.description,
          owner_id: user.id,
          group_image: finalImageUrl,
          is_open: type === 'open',
          location: type === 'open' ? formData.location : null,
          age_range: type === 'open' ? formData.ageRange : null,
          tags: type === 'open' ? formData.tags : null
        }])
        .select().single();

      if (groupError) throw groupError;
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id, role: 'leader' }]);

      alert("모임 개설 완료!");
      setViewMode('list');
      handleTypeChange('private');
    } catch (error: any) { alert("개설 실패: " + error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      {/* 상단 탭 */}
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-8">
        <button onClick={() => setActiveTab('my')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'my' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>
          <Users size={18} /> 내 모임
        </button>
        <button onClick={() => setActiveTab('open')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'open' ? 'bg-[#4A6741] text-white' : 'text-zinc-400'}`}>
          <Globe size={18} /> 오픈 모임
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center pt-10">
            <div className="w-20 h-20 bg-white rounded-[28px] shadow-sm flex items-center justify-center mb-6 mx-auto text-zinc-200"><Users size={32} /></div>
            <p className="font-bold text-zinc-400 mb-8">참여 중인 모임이 없습니다.</p>
            <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Plus size={20} /> 모임 개설하기</button>
          </motion.div>
        ) : (
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>

            <div className="bg-white rounded-[36px] p-8 shadow-sm border space-y-8 text-left">
              {/* 일반/오픈 선택 스위치 */}
              <div className="flex bg-zinc-100 p-1 rounded-2xl">
                <button onClick={() => handleTypeChange('private')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${type === 'private' ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'}`}>내 모임</button>
                <button onClick={() => handleTypeChange('open')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${type === 'open' ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'}`}>오픈 모임</button>
              </div>

              {/* 이미지 (선택) */}
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#4A6741]">
                  {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <Camera size={28} className="text-zinc-300" />}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                <span className="text-[11px] font-bold text-zinc-400 mt-3 text-center">모임 대표 이미지 설정 (선택)</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름 <span className="text-red-400">*</span></label>
                  <input className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" placeholder="모임 이름" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 아이디 <span className="text-red-400">*</span></label>
                  <div className="flex gap-2 items-center">
                    <input className={`flex-1 min-w-0 border-none rounded-2xl p-4 font-bold ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50'}`} placeholder="아이디 입력" value={formData.slug} onChange={(e) => { setFormData({...formData, slug: e.target.value}); setIsSlugVerified(false); }} />
                    <button onClick={handleCheckSlug} className="w-24 shrink-0 h-[56px] bg-[#4A6741] text-white rounded-2xl font-black text-sm transition-all">중복확인</button>
                  </div>
                </div>

                {/* 내 모임일 때만 유형 표시 */}
                {type === 'private' && (
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 유형 <span className="text-red-400">*</span></label>
                    <button onClick={() => setModalType('category')} className="w-full bg-zinc-50 border-none rounded-2xl p-4 flex justify-between items-center font-bold">
                      <span className={formData.category ? "text-zinc-800" : "text-zinc-400"}>{formData.category || "유형을 선택해주세요"}</span>
                      <ChevronRight size={18} className="text-zinc-300" />
                    </button>
                  </div>
                )}

                {/* 오픈 모임일 때만 지역/연령대/키워드 표시 */}
                {type === 'open' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[12px] font-black text-blue-500 ml-1 flex items-center gap-1"><MapPin size={12}/> 모임 지역 <span className="text-red-400">*</span></label>
                      <button onClick={() => setModalType('location')} className="w-full bg-blue-50/30 border-none rounded-2xl p-4 flex justify-between items-center font-bold">
                        <span className={formData.location ? "text-zinc-800" : "text-zinc-400"}>{formData.location || "지역을 선택해주세요"}</span>
                        <ChevronRight size={18} className="text-blue-200" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-black text-blue-500 ml-1 flex items-center gap-1"><UserCircle size={12}/> 모임 연령대 <span className="text-red-400">*</span></label>
                      <button onClick={() => setModalType('age')} className="w-full bg-blue-50/30 border-none rounded-2xl p-4 flex justify-between items-center font-bold">
                        <span className={formData.ageRange ? "text-zinc-800" : "text-zinc-400"}>{formData.ageRange || "연령대를 선택해주세요"}</span>
                        <ChevronRight size={18} className="text-blue-200" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-black text-blue-500 ml-1 flex items-center gap-1"><Hash size={12}/> 모임 검색 키워드 (선택)</label>
                      <input className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" placeholder="#기독교 #찬양 #서울지역" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} />
                      <p className="text-[10px] text-zinc-400 ml-1">키워드를 입력하면 다른 사람들이 모임을 더 쉽게 찾을 수 있습니다.</p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">입장 비밀번호 {type === 'private' ? <span className="text-red-400">*</span> : '(선택)'}</label>
                  <input type="text" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" placeholder="비밀번호 설정" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 설명 (선택)</label>
                  <textarea className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-28 resize-none font-medium text-zinc-600" placeholder="모임의 목적과 분위기를 소개해주세요" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>

              <button onClick={handleCreateSubmit} disabled={loading} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg transition-all active:scale-95 text-lg">
                {loading ? '모임 개설 중...' : '모임 개설하기'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달 관리 */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6">
            <div onClick={() => setModalType(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white w-full max-w-md rounded-[40px] p-8 pb-14 shadow-2xl max-h-[70vh] overflow-y-auto no-scrollbar">
              <h4 className="font-black text-zinc-900 mb-6 text-center">
                {modalType === 'category' ? '모임 유형 선택' : modalType === 'location' ? '지역 선택' : '연령대 선택'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {(modalType === 'category' ? categories : modalType === 'location' ? locations : ages).map((item) => (
                  <button key={item} onClick={() => {
                      if(modalType === 'category') setFormData({...formData, category: item});
                      else if(modalType === 'location') setFormData({...formData, location: item});
                      else setFormData({...formData, ageRange: item});
                      setModalType(null);
                    }} className={`p-4 rounded-2xl font-bold transition-all ${(modalType === 'category' ? formData.category : modalType === 'location' ? formData.location : formData.ageRange) === item ? 'bg-[#4A6741] text-white shadow-md' : 'bg-zinc-50 text-zinc-500'}`}>{item}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
