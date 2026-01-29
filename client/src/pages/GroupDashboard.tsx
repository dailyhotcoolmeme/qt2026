import React, { useState, useEffect } from "react";
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
  const [role, setRole] = useState<GroupRole>('owner');
  const [activeTab, setActiveTab] = useState<'home' | 'intercession' | 'growth' | 'social'>('home');

  const { scrollY } = useScroll();
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const bannerScale = useTransform(scrollY, [0, 150], [1, 1.1]);
  const headerBg = useTransform(
    scrollY,
    [100, 150],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.9)"]
  );

  useEffect(() => {
    async function fetchGroup() {
      if (params?.id) {
        try {
          const { data, error } = await supabase.from('groups').select('*').eq('id', params.id).single();
          if (data) setGroup(data);
        } catch (e) {
          console.error("Group fetch error:", e);
        }
      }
      setLoading(false);
    }
    fetchGroup();
  }, [params?.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-12 h-12 bg-[#4A6741]/10 rounded-3xl flex items-center justify-center">
          <LayoutGrid className="text-[#4A6741]" />
        </div>
        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Loading Dashboard</span>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden" style={{ fontSize: `${fontSize}px` }}>
      {/* 1. 플로팅 헤더 (사용자님 원본 로직) */}
      <motion.header 
        style={{ backgroundColor: headerBg }}
        className="fixed top-0 inset-x-0 z-[100] px-6 py-5 flex items-center justify-between backdrop-blur-md transition-colors"
      >
        <button 
          onClick={() => setLocation('/')}
          className="w-10 h-10 bg-white shadow-lg shadow-zinc-200/50 rounded-2xl flex items-center justify-center text-zinc-900 active:scale-90 transition-all"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <motion.h1 className="text-sm font-black text-zinc-900 tracking-tight">
          {group?.name || "우리 소그룹"}
        </motion.h1>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-white shadow-lg shadow-zinc-200/50 rounded-2xl flex items-center justify-center text-zinc-400 active:scale-90 transition-all">
            <Share2 size={18} strokeWidth={2.5} />
          </button>
          <button className="w-10 h-10 bg-white shadow-lg shadow-zinc-200/50 rounded-2xl flex items-center justify-center text-zinc-400 active:scale-90 transition-all">
            <Settings size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.header>

      {/* 2. 상단 비주얼 배너 (사용자님 원본 디자인) */}
      <div className="relative h-[240px] w-full overflow-hidden bg-zinc-900">
        <motion.div style={{ opacity: bannerOpacity, scale: bannerScale }} className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-white z-10" />
          <div className="w-full h-full bg-[#4A6741] flex items-center justify-center">
             <Users size={80} className="text-white/20" />
          </div>
        </motion.div>
        
        <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col gap-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <span className="bg-[#4A6741] text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Active Group</span>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-zinc-200" />
              ))}
              <div className="w-6 h-6 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[8px] font-black text-zinc-400">+12</div>
            </div>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-black text-zinc-900 tracking-tighter">
            {group?.name || "샘물 소그룹"}
          </motion.h2>
        </div>
      </div>

      {/* 3. 하단 탭바 (사용자님 원본 애니메이션) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-zinc-100 px-4 pb-8 pt-2 flex justify-between items-center z-[100]">
        {[
          { id: 'home', label: '홈', icon: <Home size={18}/> },
          { id: 'intercession', label: '기도', icon: <Mic size={18}/> },
          { id: 'growth', label: '성장', icon: <CheckCircle2 size={18}/> },
          { id: 'social', label: '교제', icon: <MessageCircle size={18}/> }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[70px] py-4 flex flex-col items-center gap-1.5 relative transition-all ${activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-300'}`}
          >
            <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'scale-100 opacity-60'}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-tight">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabBar" 
                className="absolute bottom-0 left-4 right-4 h-1 bg-[#4A6741] rounded-full" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 4. 메인 콘텐츠 뷰 */}
      <main className="flex-1 p-5 max-w-2xl mx-auto w-full pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <GroupHome group={group} role={role} />}
            {activeTab === 'intercession' && <GroupIntercession groupId={params?.id || ""} role={role} />}
            {activeTab === 'growth' && <GroupGrowth groupId={params?.id || ""} role={role} />}
            {activeTab === 'social' && <GroupSocial groupId={params?.id || ""} role={role} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
