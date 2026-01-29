import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Share2, Users, Home, Mic, CheckCircle2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"; // ✅ 필수 변수만 추가
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

// 분리된 실제 컴포넌트들을 임포트합니다.
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

  // ✅ A. 배너 및 헤더 인터랙션을 위한 애니메이션 정의 (기능 추가)
  const { scrollY } = useScroll();
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const bannerScale = useTransform(scrollY, [0, 150], [1, 1.1]);
  const headerOpacity = useTransform(scrollY, [120, 180], [0, 1]);
  const headerY = useTransform(scrollY, [120, 180], [-20, 0]);

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
      {/* ✅ A. 헤더 반전 로직: 원본 레이아웃 사이에 부드럽게 추가 */}
      <motion.header 
        style={{ opacity: headerOpacity, y: headerY }}
        className="fixed top-0 inset-x-0 z-[110] bg-white/95 backdrop-blur-md border-b border-zinc-100 h-16 flex items-center justify-center px-4 pointer-events-none"
      >
        <span className="font-black text-zinc-900" style={{ fontSize: `${fontSize}px` }}>{group?.name}</span>
      </motion.header>

      [cite_start]{/* 1. 플로팅 상단 버튼 헤더 (디자인 유지 [cite: 18-20]) */}
      <div className="fixed top-0 left-0 right-0 z-[120] flex justify-between items-center px-4 h-16 pointer-events-none">
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

      [cite_start]{/* 2. 메인 배너 (디자인 유지 및 애니메이션 삽입 [cite: 20-22]) */}
      <div className="relative w-full h-[240px] bg-zinc-200 overflow-hidden">
        <motion.div style={{ opacity: bannerOpacity, scale: bannerScale }} className="w-full h-full relative">
          {group?.group_image ? (
            <img src={group.group_image} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#4A6741] to-[#2D3E27] flex items-center justify-center">
              <Users size={64} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-6 right-6 text-white text-left">
            <h1 className="font-black" style={{ fontSize: `${fontSize * 1.5}px` }}>{group?.name}</h1>
          </div>
        </motion.div>
      </div>

      [cite_start]{/* 3. 상단 스티키 메뉴탭 (핵심 디자인 복구 [cite: 22-26]) */}
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
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 relative ${
              activeTab === tab.id ? 'text-[#4A6741]' : 'text-zinc-400 font-medium'
            }`}
          >
            {tab.icon}
            <span className="text-[12px] font-bold">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A6741]" 
              />
            )}
          </button>
        ))}
      </div>

      [cite_start]{/* 4. 탭별 콘텐츠 (분리된 컴포넌트 연결 [cite: 27-28]) */}
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
    </div>
  );
}
