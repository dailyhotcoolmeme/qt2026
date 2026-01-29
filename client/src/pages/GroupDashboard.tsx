import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ChevronLeft, Settings, Share2, Users, Home, Mic, 
  CheckCircle2, MessageCircle, ChevronRight, Plus, PenLine 
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

// 분리된 실제 컴포넌트들을 임포트합니다.
import GroupHome from "../components/group/GroupHome";
import GroupIntercession from "../components/group/GroupIntercession";
import GroupGrowth from "../components/group/GroupGrowth";
import GroupSocial from "../components/group/GroupSocial";
import GroupSettingsModal from "../components/group/GroupSettingsModal";

type GroupRole = 'owner' | 'leader' | 'member' | 'guest';

export default function GroupDashboard() {
  const [, params] = useRoute("/group/:id");
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [role, setRole] = useState<GroupRole>('guest');
  const [activeTab, setActiveTab] = useState<'home' | 'intercession' | 'growth' | 'social'>('home');

  const { scrollY } = useScroll();
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const bannerScale = useTransform(scrollY, [0, 150], [1, 1.1]);
  const headerBgOpacity = useTransform(scrollY, [120, 180], [0, 1]);
  const headerTitleY = useTransform(scrollY, [120, 180], [10, 0]);

  useEffect(() => {
    if (params?.id) fetchGroupData(params.id);
  }, [params?.id]);

  const fetchGroupData = async (groupId: string) => {
    setLoading(true);
    try {
      const { data: groupData, error: gErr } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gErr) throw gErr;
      setGroup(groupData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (groupData.owner_id === user.id) setRole('owner');
        else {
          const { data: memberData } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
          if (memberData) setRole(memberData.role as GroupRole);
        }
      }
    } catch (err) {
      console.error(err);
      setLocation("/community");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#4A6741] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FDFDFD] pb-32">
      {/* 1. 스크롤 헤더 (Topbar 아래 유지) */}
      <motion.div 
        style={{ opacity: headerBgOpacity }}
        className="fixed top-14 left-0 right-0 z-[80] bg-white h-16 border-b border-zinc-100 flex items-center justify-center pointer-events-none"
      >
        <motion.span style={{ y: headerTitleY }} className="font-black text-zinc-900">
          {group?.name}
        </motion.span>
      </motion.div>

      {/* 2. 조작 버튼 레이어 (Topbar 아래 유지) */}
      <div className="fixed top-14 left-0 right-0 z-[90] flex justify-between items-center px-4 h-16 pointer-events-none">
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
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 3. 메인 배너 및 F. 브레드크럼 */}
      <div className="relative w-full h-[260px] bg-zinc-200 overflow-hidden mt-14">
        <motion.div style={{ opacity: bannerOpacity, scale: bannerScale }} className="w-full h-full relative">
          {group?.group_image ? (
            <img src={group.group_image} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#4A6741] to-[#2D3E27] flex items-center justify-center">
              <Users size={64} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
          <div className="absolute bottom-8 left-6 right-6 text-white text-left space-y-2">
            {/* ✅ F항목: 계층적 브레드크럼 */}
            <div className="flex items-center gap-1.5 text-[10px] font-black text-white/60 uppercase tracking-tighter">
              <span>서울동부교회</span>
              <ChevronRight size={10} className="opacity-40" />
              <span>2교구</span>
              <ChevronRight size={10} className="opacity-40" />
              <span className="text-white/90">3구역</span>
            </div>
            
            <h1 className="font-black leading-tight" style={{ fontSize: `${fontSize * 1.6}px` }}>
              {group?.name}
            </h1>
          </div>
        </motion.div>
      </div>

      {/* 4. 상단 스티키 메뉴탭 */}
      <div className="sticky top-14 z-[70] bg-white border-b border-zinc-100 flex px-2 overflow-x-auto no-scrollbar shadow-sm">
        {[
          { id: 'home', label: '홈', icon: <Home size={18}/> },
          { id: 'intercession', label: '중보기도', icon: <Mic size={18}/> },
          { id: 'growth', label: '신앙생활', icon: <CheckCircle2 size={18}/> },
          { id: 'social', label: '교제나눔', icon: <MessageCircle size={18}/> }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 relative ${
              activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-400 font-medium'
            }`}
          >
            {tab.icon}
            <span className="text-[12px] font-bold">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A6741]" />
            )}
          </button>
        ))}
      </div>

      {/* 5. 콘텐츠 영역 */}
      <main className="flex-1 p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <GroupHome group={group} role={role} />}
            {activeTab === 'intercession' && <GroupIntercession groupId={group?.id} role={role} />}
            {activeTab === 'growth' && <GroupGrowth groupId={group?.id} role={role} />}
            {activeTab === 'social' && <GroupSocial groupId={group?.id} role={role} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ✅ G항목: 퀵 액션 플로팅 버튼 */}
      <AnimatePresence>
        {activeTab !== 'home' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-2xl shadow-2xl flex items-center justify-center z-[100]"
          >
            {activeTab === 'intercession' ? <Mic size={24} /> : <PenLine size={24} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* 6. 설정 모달 */}
      <AnimatePresence>
        {showSettings && (
          <GroupSettingsModal 
            group={group} 
            onClose={() => setShowSettings(false)} 
            role={role}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
