import React, { useState, useRef, useEffect } from "react";
import { 
  Users, Globe, Plus, X, Camera, ChevronRight, Search, MapPin, 
  UserCircle, Hash, Lock, Unlock, Calendar, Filter, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [allOpenGroups, setAllOpenGroups] = useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ location: "전국", age: "전체" });

  const [type, setType] = useState<'private' | 'open'>('private');
  const [formData, setFormData] = useState({
    name: '', slug: '', password: '', category: '',
    location: '', ageRange: '', tags: '', description: '',
    imageUrl: '', imageFile: null as File | null
  });

  const [isSlugVerified, setIsSlugVerified] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'location' | 'age' | 'filter_loc' | 'filter_age' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchGroups(); }, [activeTab]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (activeTab === 'my') {
        const { data, error } = await supabase
          .from('group_members')
          .select('groups(*)')
          .eq('user_id', user.id);
        if (error) throw error;
        setMyGroups(data.map(item => item.groups).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } else {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .eq('is_open', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllOpenGroups(data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let result = [...allOpenGroups];
    if (filters.location !== "전국") result = result.filter(g => g.location === filters.location);
    if (filters.age !== "전체") result = result.filter(g => g.age_range === filters.age);
    if (searchQuery) result = result.filter(g => g.name.includes(searchQuery) || g.tags?.includes(searchQuery));
    setFilteredGroups(result);
  }, [filters, searchQuery, allOpenGroups]);

  const handleCreateSubmit = async () => {
    if (!formData.name.trim() || !isSlugVerified) return alert("필수값을 확인해주세요.");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 필요");
      let finalUrl = null;
      if (formData.imageFile) {
        const fileName = `${user.id}-${Date.now()}`;
        await supabase.storage.from('avatars').upload(fileName, formData.imageFile);
        finalUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      }
      const { data: group, error: gErr } = await supabase.from('groups').insert([{
        name: formData.name, group_slug: formData.slug, password: formData.password,
        category: type === 'private' ? formData.category : '오픈모임',
        description: formData.description, owner_id: user.id, group_image: finalUrl,
        is_open: type === 'open', location: type === 'open' ? formData.location : null,
        age_range: type === 'open' ? formData.ageRange : null, tags: type === 'open' ? formData.tags : null
      }]).select().single();
      if (gErr) throw gErr;
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id, role: 'leader' }]);
      alert("개설 완료!");
      setViewMode('list');
      fetchGroups();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  // 리스트 카드 컴포넌트 (내 모임 / 오픈 모임 대응)
  const GroupCard = ({ group, mode }: { group: any, mode: 'my' | 'open' }) => {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-[28px] p-5 shadow-sm border border-zinc-50 flex items-center gap-4 mb-3"
      >
        <div className="w-16 h-16 bg-zinc-50 rounded-[22px] overflow-hidden flex-shrink-0 border border-zinc-100">
          {group.group_image ? <img src={group.group_image} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-4 text-zinc-200" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-bold text-zinc-900 truncate" style={{ fontSize: `${fontSize}px` }}>{group.name}</h4>
            {/* 내 모임 탭에서는 오픈 모임인 경우만 표시, 오픈 탭에서는 가입된 경우만 표시 */}
            {mode === 'my' && group.is_open && <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[9px] rounded-full font-bold border border-blue-100">오픈</span>}
            {mode === 'open' && myGroups.some(m => m.id === group.id) && <span className="px-2 py-0.5 bg-[#4A6741] text-white text-[9px] rounded-full font-bold">내 모임</span>}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 font-medium">
            {group.is_open ? (
              <>
                <span className="flex items-center gap-0.5"><MapPin size={10} className="text-zinc-300"/> {group.location}</span>
                <span className="flex items-center gap-0.5"><UserCircle size={10} className="text-zinc-300"/> {group.age_range}</span>
              </>
            ) : (
              <span className="flex items-center gap-0.5"><Tag size={10} className="text-zinc-300"/> {group.category}</span>
            )}
            <span className="flex items-center">
              {group.password ? <Lock size={10} className="text-zinc-400 opacity-80"/> : <Unlock size={10} className="text-zinc-200"/>}
            </span>
            {group.is_open && group.tags && <span className="text-[#4A6741]/50 truncate font-bold">{group.tags}</span>}
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-200" />
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      <div className="w-full max-w-md flex bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-100 mb-6">
        <button onClick={() => setActiveTab('my')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'my' ? 'bg-[#4A6741] text-white shadow-md' : 'text-zinc-400'}`}>내 모임</button>
        <button onClick={() => setActiveTab('open')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'open' ? 'bg-[#4A6741] text-white shadow-md' : 'text-zinc-400'}`}>오픈 모임</button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
            
            {activeTab === 'open' && (
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <input className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 shadow-sm border-none font-bold text-sm" placeholder="검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button onClick={() => setModalType('filter_loc')} className="flex-shrink-0 px-4 py-2 bg-white rounded-full border border-zinc-100 text-[11px] font-bold flex items-center gap-1 shadow-sm text-zinc-500">
                    <MapPin size={12} className="text-blue-400"/> {filters.location}
                  </button>
                  <button onClick={() => setModalType('filter_age')} className="flex-shrink-0 px-4 py-2 bg-white rounded-full border border-zinc-100 text-[11px] font-bold flex items-center gap-1 shadow-sm text-zinc-500">
                    <UserCircle size={12} className="text-blue-400"/> {filters.age}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {loading ? (
                <div className="flex flex-col items-center py-20 text-zinc-300 gap-3"><div className="w-6 h-6 border-2 border-zinc-200 border-t-[#4A6741] rounded-full animate-spin"/></div>
              ) : (activeTab === 'my' ? myGroups : filteredGroups).length > 0 ? (
                (activeTab === 'my' ? myGroups : filteredGroups).map(g => <GroupCard key={g.id} group={g} mode={activeTab} />)
              ) : (
                <div className="text-center py-32 text-zinc-300 font-bold">참여 중인 모임이 없습니다.</div>
              )}
            </div>

            <button onClick={() => setViewMode('create')} className="fixed bottom-28 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all z-50">
              <Plus size={28} />
            </button>
          </motion.div>
        ) : (
          /* 개설 폼 유지 */
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5 pb-10">
            <div className="flex justify-between items-center px-2">
               <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>모임 개설</h3>
               <button onClick={() => setViewMode('list')} className="w-9 h-9 flex items-center justify-center bg-white rounded-full text-zinc-400 shadow-sm"><X size={20}/></button>
            </div>
            <div className="bg-white rounded-[36px] p-8 shadow-sm border space-y-8 text-left">
              <div className="flex bg-zinc-100 p-1 rounded-2xl">
                <button onClick={() => {setType('private'); setIsSlugVerified(false);}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${type === 'private' ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'}`}>내 모임</button>
                <button onClick={() => {setType('open'); setIsSlugVerified(false);}} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${type === 'open' ? 'bg-white text-[#4A6741] shadow-sm' : 'text-zinc-400'}`}>오픈 모임</button>
              </div>
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#4A6741]">
                  {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <Camera size={28} className="text-zinc-300" />}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e)=>{const f=e.target.files?.[0]; if(f) setFormData({...formData, imageUrl:URL.createObjectURL(f), imageFile:f})}} />
                <span className="text-[11px] font-bold text-zinc-400 mt-3">대표 이미지 설정 (선택)</span>
              </div>
              <div className="space-y-6">
                <div className="space-y-1"><label className="text-[12px] font-black text-[#4A6741] ml-1">모임 이름 *</label><input className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[12px] font-black text-[#4A6741] ml-1">아이디 *</label><div className="flex gap-2"><input className="flex-1 bg-zinc-50 rounded-2xl p-4 font-bold" value={formData.slug} onChange={(e)=>setFormData({...formData, slug:e.target.value, isSlugVerified:false})} /><button onClick={()=>{setIsSlugVerified(true); alert("사용가능!")}} className="w-20 bg-[#4A6741] text-white rounded-2xl font-bold text-xs">확인</button></div></div>
                {type === 'private' ? (
                  <div className="space-y-1"><label className="text-[12px] font-black text-[#4A6741] ml-1">유형 *</label><button onClick={()=>setModalType('category')} className="w-full bg-zinc-50 rounded-2xl p-4 flex justify-between font-bold text-zinc-800"><span>{formData.category || "선택"}</span><ChevronRight size={18}/></button></div>
                ) : (
                  <>
                    <div className="space-y-1"><label className="text-[12px] font-black text-blue-500 ml-1">지역 *</label><button onClick={()=>setModalType('location')} className="w-full bg-blue-50/30 rounded-2xl p-4 flex justify-between font-bold text-zinc-800"><span>{formData.location || "선택"}</span><ChevronRight size={18}/></button></div>
                    <div className="space-y-1"><label className="text-[12px] font-black text-blue-500 ml-1">연령대 *</label><button onClick={()=>setModalType('age')} className="w-full bg-blue-50/30 rounded-2xl p-4 flex justify-between font-bold text-zinc-800"><span>{formData.ageRange || "선택"}</span><ChevronRight size={18}/></button></div>
                    <div className="space-y-1"><label className="text-[12px] font-black text-blue-500 ml-1">검색 키워드</label><input className="w-full bg-zinc-50 rounded-2xl p-4 font-bold" placeholder="#태그" value={formData.tags} onChange={(e)=>setFormData({...formData, tags:e.target.value})} /></div>
                  </>
                )}
                <div className="space-y-1"><label className="text-[12px] font-black text-[#4A6741] ml-1">비밀번호 {type==='private'?'*':'(선택)'}</label><input className="w-full bg-zinc-50 rounded-2xl p-4 font-bold" value={formData.password} onChange={(e)=>setFormData({...formData, password:e.target.value})} /></div>
              </div>
              <button onClick={handleCreateSubmit} disabled={loading} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg">개설하기</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달 */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6">
            <div onClick={() => setModalType(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white w-full max-w-md rounded-[40px] p-8 pb-14 shadow-2xl max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                {(modalType.includes('loc') ? ["전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] : 
                  modalType.includes('age') ? ["전체", "10대", "20대", "30대", "40대", "50대", "60대 이상"] : 
                  ["가족", "교회", "학교", "직장", "기타"]).map((item) => (
                  <button key={item} onClick={() => {
                      if(modalType === 'category') setFormData({...formData, category: item});
                      else if(modalType === 'location') setFormData({...formData, location: item});
                      else if(modalType === 'age') setFormData({...formData, ageRange: item});
                      else if(modalType === 'filter_loc') setFilters({...filters, location: item});
                      else if(modalType === 'filter_age') setFilters({...filters, age: item});
                      setModalType(null);
                    }} className="p-4 rounded-2xl font-bold bg-zinc-50 text-zinc-500 hover:bg-[#4A6741] hover:text-white transition-all">{item}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
