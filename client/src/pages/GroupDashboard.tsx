import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ChevronLeft, Settings, Share2, MessageCircle, 
  CheckCircle2, Users, Home, Bell, MoreVertical, Mic 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

type GroupRole = 'owner' | 'leader' | 'member' | 'guest';

export default function GroupDashboard() {
  const [, params] = useRoute("/group/:id");
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [role, setRole] = useState<GroupRole>('guest');
  const [activeTab, setActiveTab] = useState<'home' | 'intercession' | 'growth' | 'social'>('home');

  useEffect(() => {
    if (params?.id) {
      fetchGroupData(params.id);
    }
  }, [params?.id]);

  const fetchGroupData = async (groupId: string) => {
    setLoading(true);
    try {
      // 1. 모임 기본 정보 가져오기
      const { data: groupData, error: gErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (gErr) throw gErr;
      setGroup(groupData);

      // 2. 내 권한 확인하기
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (groupData.owner_id === user.id) {
          setRole('owner');
        } else {
          const { data: memberData } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (memberData) {
            setRole(memberData.role as GroupRole);
          }
        }
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      alert("모임 정보를 불러올 수 없습니다.");
      setLocation("/community");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-[#4A6741] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FDFDFD] pb-24">
      {/* 1. 상단 액션 바 (투명 -> 스크롤 시 반전 로직은 향후 추가) */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-4 h-16 pointer-events-none">
        <button 
          onClick={() => setLocation("/community")}
          className="w-10 h-10 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white pointer-events-auto active:scale-90 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button className="w-10 h-10 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
            <Share2 size={20} />
          </button>
          {(role === 'owner' || role === 'leader') && (
            <button className="w-10 h-10 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Full-Width 배너 섹션 (설계도 4번 공통 UI) */}
      <div className="relative w-full h-[280px] bg-zinc-200 overflow-hidden">
        {group?.group_image ? (
          <img src={group.group_image} className="w-full h-full object-cover" alt="Group Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#4A6741] to-[#2D3E27] flex items-center justify-center">
            <Users size={64} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-6 right-6 text-white text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold border border-white/30 uppercase tracking-wider">
              {group?.category || "Community"}
            </span>
          </div>
          <h1 className="font-black leading-tight truncate" style={{ fontSize: `${fontSize * 1.6}px` }}>
            {group?.name}
          </h1>
          <p className="text-white/70 text-sm mt-1 font-medium line-clamp-1">{group?.description || "함께 성장하는 신앙 공동체입니다."}</p>
        </div>
      </div>

      {/* 3. Sticky 탭 메뉴 (네이버 카페 스타일) */}
      <div className="sticky top-0 z-[90] bg-white border-b border-zinc-100 flex px-2 overflow-x-auto no-scrollbar shadow-sm">
        {[
          { id: 'home', label: '홈', icon: <Home size={18}/> },
          { id: 'intercession', label: '중보기도', icon: <Mic size={18}/> },
          { id: 'growth', label: '신앙생활', icon: <CheckCircle2 size={18}/> },
          { id: 'social', label: '교제나눔', icon: <MessageCircle size={18}/> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 transition-all relative ${
              activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-400 font-medium'
            }`}
          >
            <span className={activeTab === tab.id ? 'scale-110 transition-transform' : ''}>{tab.icon}</span>
            <span className="text-[12px] font-bold">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A6741]" />
            )}
          </button>
        ))}
      </div>

      {/* 4. 컨텐츠 영역 (설계도 4번 분기) */}
      <main className="flex-1 p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* 요약 정보 섹션 */}
              <div className="bg-[#F1F3F0] rounded-[28px] p-6 border border-[#E2E6E1]">
                <h3 className="font-black text-[#4A6741] mb-4 flex items-center gap-2">
                  <Bell size={18} /> 모임 소식
                </h3>
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <p className="text-sm font-bold text-zinc-800 leading-relaxed">
                    이번 주 정기 모임은 장소가 변경되었습니다. 공지사항을 확인해주세요!
                  </p>
                  <span className="text-[10px] text-zinc-400 mt-2 block">2시간 전</span>
                </div>
              </div>

              {/* 내 상태 카드 */}
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-zinc-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-zinc-900">나의 수행 현황</h3>
                  <button className="text-[12px] font-bold text-[#4A6741]">기록하기 &gt;</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {['성경', '기도', '묵상'].map(item => (
                    <div key={item} className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 border border-zinc-100">
                        <CheckCircle2 size={24} />
                      </div>
                      <span className="text-xs font-bold text-zinc-500">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'intercession' && (
            <motion.div key="intercession" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <Mic size={48} className="mx-auto text-zinc-200 mb-4" />
              <p className="text-zinc-400 font-bold">중보기도 모듈 준비 중입니다.</p>
            </motion.div>
          )}

          {activeTab !== 'home' && activeTab !== 'intercession' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <p className="text-zinc-400 font-bold">{activeTab} 섹션 준비 중</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
