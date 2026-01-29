import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Share2, Users, LayoutGrid } from "lucide-react";
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

  const { scrollY } = useScroll();
  
  // 아침 첫 버전의 상단 배너 애니메이션 로직
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const bannerScale = useTransform(scrollY, [0, 150], [1, 1.1]);

  useEffect(() => {
    async function fetchGroup() {
      if (params?.id) {
        try {
          const { data } = await supabase.from('groups').select('*').eq('id', params.id).single();
          if (data) setGroup(data);
        } catch (e) { console.error("Fetch error:", e); }
      }
      setLoading(false);
    }
    fetchGroup();
  }, [params?.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-black text-zinc-400">Loading...</div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col relative" style={{ fontSize: `${fontSize}px` }}>
      
      {/* 1. 상단 헤더 (아침 첫 버전: 그라데이션 없는 담백한 디자인) */}
      <header className="fixed top-0 inset-x-0 z-[100] px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-zinc-50">
        <button onClick={() => setLocation('/')} className="p-2 -ml-2 text-zinc-900 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-black text-zinc-900 tracking-tight">
          {group?.name || "우리 소그룹"}
        </h1>
        <div className="flex gap-1">
          <button className="p-2 text-zinc-400 active:scale-90 transition-all"><Share2 size={20} /></button>
          <button className="p-2 text-zinc-400 active:scale-90 transition-all"><Settings size={20} /></button>
        </div>
      </header>

      {/* 2. 상단 메뉴 탭 (아침 첫 버전: 헤더 아래 위치) */}
      <div className="fixed top-[60px] inset-x-0 z-[90] bg-white/80 backdrop-blur-md border-b border-zinc-100 overflow-x-auto no-scrollbar">
        <div className="flex px-4 items-center">
          {[
            { id: 'home', label: '홈' },
            { id: 'intercession', label: '기도' },
            { id: 'growth', label: '성장' },
            { id: 'social', label: '교제' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-none px-6 py-4 text-sm font-black transition-all relative ${
                activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-6 right-6 h-0.5 bg-[#4A6741] rounded-full" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 콘텐츠 영역 (배너 포함) */}
      <main className="flex-1 pt-[120px] pb-10">
        {/* 상단 배너 (아침 첫 버전 로직) */}
        <div className="relative h-[200px] w-full overflow-hidden px-5 mb-6">
          <motion.div 
            style={{ opacity: bannerOpacity, scale: bannerScale }}
            className="w-full h-full bg-[#4A6741] rounded-[32px] relative overflow-hidden flex items-center justify-center"
          >
            <Users size={60} className="text-white/20" />
            <div className="absolute bottom-6 left-6 text-left">
              <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-2 inline-block">Premium Group</span>
              <h2 className="text-2xl font-black text-white">{group?.name || "소그룹"}</h2>
            </div>
          </motion.div>
        </div>

        {/* 탭별 컴포넌트 렌더링 (추가 기능 로직 유지) */}
        <div className="px-5">
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
        </div>
      </main>
    </div>
  );
}
