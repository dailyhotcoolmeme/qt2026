import React, { useState, useRef } from "react";
import { 
  Users, Globe, Plus, X, Camera, ChevronRight, Search 
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
    category: '',
    description: '',
    imageUrl: '', 
    imageFile: null as File | null
  });

  const [isSlugVerified, setIsSlugVerified] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 선택 처리
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ 
        ...formData, 
        imageUrl: URL.createObjectURL(file),
        imageFile: file 
      });
    }
  };

  // 모임 아이디 중복 체크
  const handleCheckSlug = async () => {
    if (!formData.slug || formData.slug.length < 2) return alert("아이디를 2자 이상 입력해주세요.");
    try {
      const { data, error } = await supabase.from('groups').select('group_slug').eq('group_slug', formData.slug).maybeSingle();
      if (error) throw error;
      if (data) {
        alert("이미 사용 중인 아이디입니다.");
        setIsSlugVerified(false);
      } else {
        alert("사용 가능한 아이디입니다!");
        setIsSlugVerified(true);
      }
    } catch (err: any) { alert("확인 중 오류: " + err.message); }
  };

  // 모임 개설 실행 (필수/선택값 로직 반영)
  const handleCreateSubmit = async () => {
    // 1. 필수값 체크
    if (!formData.name.trim()) return alert("필수항목: 모임 이름을 입력해주세요.");
    if (!formData.slug.trim()) return alert("필수항목: 모임 아이디를 입력해주세요.");
    if (!isSlugVerified) return alert("필수항목: 모임 아이디 중복 확인이 필요합니다.");
    if (!formData.password.trim()) return alert("필수항목: 입장 비밀번호를 설정해주세요.");
    if (!formData.category) return alert("필수항목: 모임 유형을 선택해주세요.");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      let finalImageUrl = null;

      // 2. 선택값 처리 - 이미지 업로드 (파일이 있을 때만 실행)
      if (formData.imageFile) {
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData.imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrl;
      }

      // 3. DB 저장 (설명은 빈 값이어도 허용)
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ 
          name: formData.name, 
          group_slug: formData.slug,
          password: formData.password,
          category: formData.category,
          description: formData.description || "", // 선택값: 비어있으면 빈 문자열
          owner_id: user.id,
          group_image: finalImageUrl // 선택값: 없으면 null
        }])
        .select().single();

      if (groupError) throw groupError;

      // 리더 권한 부여
      await supabase.from('group_members').insert([{ 
        group_id: group.id, user_id: user.id, role: 'leader' 
      }]);

      alert("모임 개설이 완료되었습니다!");
      setViewMode('list');
      // 상태 초기화
      setFormData({ name: '', slug: '', password: '', category: '교회', description: '', imageUrl: '', imageFile: null });
      setIsSlugVerified(false);
    } catch (error: any) {
      alert("개설 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["가족", "교회", "학교", "직장", "기타"];

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
            <div className="w-20 h-20 bg-white rounded-[28px] shadow-sm flex items-center justify-center mb-6 mx-auto text-zinc-200">
              <Users size={32} />
            </div>
            <p className="font-bold text-zinc-400 mb-8 leading-relaxed">참여 중인 모임이 없습니다.<br/>새로운 공동체를 시작해보세요.</p>
            <button onClick={() => setViewMode('create')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
              <Plus size={20} /> 모임 개설하기
            </button>
          </motion.div>
        ) : (
          /* 모임 개설 화면 */
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>

            <div className="bg-white rounded-[36px] p-8 shadow-sm border border-white space-y-8 text-left">
              {/* 이미지 설정 (선택값) */}
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#4A6741]">
                  {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" alt="대표" /> : <Camera size={28} className="text-zinc-300" />}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                <span className="text-[11px] font-bold text-zinc-400 mt-3">모임 대표 이미지 설정 (선택)</span>
              </div>

              <div className="space-y-6">
                {/* 모임 이름 (필수) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름 <span className="text-red-400">*</span></label>
                  <input className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" placeholder="모임 이름" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>

                {/* 모임 아이디 (필수) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 아이디 <span className="text-red-400">*</span></label>
                  <div className="flex gap-2 items-center">
                    <input className={`flex-1 min-w-0 border-none rounded-2xl p-4 font-bold ${isSlugVerified ? 'bg-green-50 text-green-700' : 'bg-zinc-50'}`} placeholder="아이디 입력" value={formData.slug} onChange={(e) => { setFormData({...formData, slug: e.target.value}); setIsSlugVerified(false); }} />
                    <button onClick={handleCheckSlug} className="w-24 shrink-0 h-[56px] bg-[#4A6741] text-white rounded-2xl font-black text-sm active:scale-95 transition-all">중복확인</button>
                  </div>
                </div>

                {/* 입장 비밀번호 (필수) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">입장 비밀번호 <span className="text-red-400">*</span></label>
                  <input type="text" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-zinc-800" placeholder="비밀번호" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>

                {/* 모임 유형 (필수) */}
                <div className="space-y-2">
  <label className="text-[12px] font-black text-[#4A6741] ml-1">
    모임 유형 <span className="text-red-400">*</span>
  </label>
  <button 
    onClick={() => setShowCategoryModal(true)}
    className="w-full bg-zinc-50 border-none rounded-2xl p-4 flex justify-between items-center font-bold text-zinc-800"
  >
    {/* 값이 없으면 안내 문구, 있으면 선택한 값 표시 */}
    <span className={formData.category ? "text-zinc-800" : "text-zinc-400"}>
      {formData.category || "유형을 선택해주세요"}
    </span>
    <ChevronRight size={18} className="text-zinc-300" />
  </button>
</div>


                {/* 모임 설명 (선택) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#4A6741] ml-1">모임 설명 (선택)</label>
                  <textarea className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-28 resize-none font-medium text-zinc-600 leading-relaxed" placeholder="참여 인원들에게 보여줄 메시지" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>

              <button onClick={handleCreateSubmit} disabled={loading} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg transition-all active:scale-95 text-lg">
                {loading ? '모임 만드는 중...' : '모임 개설하기'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모임 유형 선택 바텀 시트 */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <div onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white w-full max-w-md rounded-t-[40px] p-8 pb-14 shadow-2xl">
              <h4 className="font-black text-zinc-900 mb-6 text-center">모임 유형 선택</h4>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => { setFormData({...formData, category: cat}); setShowCategoryModal(false); }} className={`p-5 rounded-2xl font-bold transition-all ${formData.category === cat ? 'bg-[#4A6741] text-white' : 'bg-zinc-50 text-zinc-500'}`}>{cat}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
