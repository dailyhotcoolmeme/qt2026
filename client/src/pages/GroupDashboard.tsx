import React, { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Share2, Users, Home, Mic, CheckCircle2, MessageCircle, ChevronRight, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

import GroupHome from "../components/group/GroupHome";
import GroupIntercession from "../components/group/GroupIntercession";
import GroupGrowth from "../components/group/GroupGrowth";
import GroupSocial from "../components/group/GroupSocial";

type GroupRole = 'owner' | 'leader' | 'member' | 'guest';

export default function GroupDashboard() {
  const [, params] = useRoute("/group/:id");
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [role, setRole] = useState<GroupRole>('guest');
  const [activeTab, setActiveTab] = useState<'home' | 'intercession' | 'growth' | 'social'>('home');

  // 스크롤 애니메이션 제어
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  // 스크롤에 따른 배너 투명도 및 높이 변화
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const bannerScale = useTransform(scrollY, [0, 150], [1, 1.1]);
  const headerBg = useTransform(scrollY, [100, 150], ["rgba(255,255,255,0)", "rgba(255,255,255,1)"]);
  const headerShadow = useTransform(scrollY, [100, 150], ["0px 0px 0px rgba(0,0,0,0)", "0px 4px 12px rgba(0,0,0,0.05)"]);
  const titleColor = useTransform(scrollY, [100, 150], ["#ffffff", "#18181b"]);
  const iconBg = useTransform(scrollY, [100, 150], ["rgba(0,0,0,0.2)", "rgba(244,244,245,1)"]);
  const iconColor = useTransform(scrollY, [100, 150], ["#ffffff", "#3f3f46"]);

  useEffect(() => {
    if (params?.id) fetchGroupData(params.id);
  }, [params?.id]);

  const fetchGroupData = async (groupId: string) => {
    setLoading(true);
    try {
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      setGroup(groupData);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && groupData) {
        if (groupData.owner_id === user.id) setRole('owner');
        else {
          const { data: m } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
          if (m) setRole(m.role as GroupRole);
        }
      }
    } catch (err) {
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
    <div ref={containerRef} className="flex flex-col w-full min-h-screen bg-[#FDFDFD] pb-32">
      
      {/* 1. 고도화된 상단 액션 바 (스크롤 인터랙션 포함) */}
      <motion.div 
        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
        className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-4 h-16 transition-colors duration-200"
      >
        <motion.button 
          style={{ backgroundColor: iconBg, color: iconColor }}
          onClick={() => setLocation("/community")} 
          className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </motion.button>

        {/* 스크롤 시 나타나는 중앙 제목 */}
        <motion.span 
          style={{ opacity: useTransform(scrollY, [130, 160], [0, 1]) }}
          className="absolute left-1/2 -translate-x-1/2 font-black text-sm text-zinc-800"
        >
          {group?.name}
        </motion.span>

        <div className="flex gap-2">
          <motion.button style={{ backgroundColor: iconBg, color: iconColor }} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-all">
            <Share2 size={18} />
          </motion.button>
          {(role === 'owner' || role === 'leader') && (
            <motion.button style={{ backgroundColor: iconBg, color: iconColor }} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-all">
              <Settings size={18} />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* 2. 인터랙티브 배너 섹션 */}
      <div className="relative w-full h-[280px] overflow-hidden bg-zinc-900">
        <motion.div 
          style={{ opacity: bannerOpacity, scale: bannerScale }}
          className="w-full h-full"
        >
          {group?.group_image ? (
            <img src={group.group_image} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#4A6741] to-[#2D3E27] flex items-center justify-center opacity-40">
              <Users size={80} className="text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#FDFDFD] via-black/20 to-black/40" />
        </motion.div>

        {/* 배너 위 텍스트 컨텐츠 */}
        <div className="absolute bottom-10 left-6 right-6 text-left">
          {/* F. 계층적 브레드크럼 적용 */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 mb-3"
          >
            <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter flex items-center gap-1">
              <LayoutGrid size={10} /> {group?.location || "Global"}
            </span>
            <ChevronRight size={10} className="text-white/40" />
            <span className="text-[10px] font-black text-[#4A6741] bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
              {group?.category || "모임"}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="font-black leading-tight text-zinc-900" 
            style={{ fontSize: `${fontSize * 1.8}px`, textShadow: '0 2px 10px rgba(255,255,255,0.5)' }}
          >
            {group?.name}
          </motion.h1>
          <p className="text-zinc-500 text-xs font-bold mt-1 line-clamp-1">{group?.description}</p>
        </div>
      </div>

      {/* 3. 스티키 탭 메뉴 (디자인 보정) */}
      <div className="sticky top-16 z-[90] bg-white/80 backdrop-blur-xl border-b border-zinc-100 flex px-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'home', label: '홈', icon: <Home size={18}/> },
          { id: 'intercession', label: '중보기도', icon: <Mic size={18}/> },
          { id: 'growth', label: '신앙생활', icon: <CheckCircle2 size={18}/> },
          { id: 'social', label: '교제나눔', icon: <MessageCircle size={18}/> }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[85px] py-4 flex flex-col items-center gap-1.5 relative transition-all ${
              activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-400 font-bold'
            }`}
          >
            <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'scale-100 opacity-60'}`}>
              {tab.icon}
            </span>
            <span className="text-[11px] uppercase tracking-tight">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTabBar" className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#4A6741] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 4. 컨텐츠 메인 */}
      <main className="flex-1 p-5 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <GroupHome key="home" group={group} role={role} />}
          {activeTab === 'intercession' && <GroupIntercession key="inter" groupId={group.id} role={role} />}
          {activeTab === 'growth' && <GroupGrowth key="growth" groupId={group.id} role={role} />}
          {activeTab === 'social' && <GroupSocial key="social" groupId={group.id} role={role} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
