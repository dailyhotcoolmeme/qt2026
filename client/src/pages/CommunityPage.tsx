import React, { useState, useEffect } from "react";
import { 
  Users, Globe, Plus, Settings, ShieldCheck, 
  ChevronRight, Mic, BarChart3, X, Check, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; // Supabase 클라이언트
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

type ViewMode = 'no-group' | 'create-group' | 'group-main' | 'admin-panel';

export default function CommunityPage() {
  const { fontSize = 16 } = useDisplaySettings();
  const [viewMode, setViewMode] = useState<ViewMode>('no-group');
  const [activeTab, setActiveTab] = useState<'private' | 'open'>('private');
  const [loading, setLoading] = useState(true);

  // 모임 정보 상태
  const [myGroup, setMyGroup] = useState<any>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  useEffect(() => {
    checkUserGroup();
  }, []);

  // 1. 사용자가 가입한 모임이 있는지 확인하는 함수
  const checkUserGroup = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // group_members 테이블에서 현재 사용자가 속한 모임 조회
      const { data: memberData, error } = await supabase
        .from('group_members')
        .select(`
          role,
          groups (
            id,
            name,
            description,
            owner_id
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData && memberData.groups) {
        setMyGroup(memberData.groups);
        // 리더면 관리자 패널로, 멤버면 일반 메인으로 (기획에 따라 조정 가능)
        setViewMode(memberData.role === 'leader' ? 'admin-panel' : 'group-main');
      } else {
        setViewMode('no-group');
      }
    }
    setLoading(false);
  };

  // 2. 실제 서버에 모임을 개설하는 함수
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return alert("모임 이름을 입력해주세요.");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("로그인이 필요합니다.");

      // A. groups 테이블에 모임 생성
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([
          { 
            name: newGroupName, 
            description: groupDescription, 
            owner_id: user.id 
          }
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // B. 생성자를 리더 권한으로 group_members에 추가
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          { 
            group_id: group.id, 
            user_id: user.id, 
            role: 'leader' 
          }
        ]);

      if (memberError) throw memberError;

      alert("모임이 개설되었습니다!");
      setMyGroup(group);
      setViewMode('admin-panel'); // 개설 직후 관리자 모드로 진입
      
    } catch (error: any) {
      alert("모임 생성 실패: " + error.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-400">불러오는 중...</div>;

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] pt-24 pb-32 px-4 no-scrollbar">
      
      <AnimatePresence mode="wait">
        {/* CASE 1: 모임 없음 */}
        {viewMode === 'no-group' && (
          <motion.div key="no" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md flex flex-col items-center text-center pt-10">
            <div className="w-24 h-24 bg-white rounded-[32px] shadow-sm flex items-center justify-center mb-6 text-[#4A6741]">
              <Users size={40} />
            </div>
            <h2 className="font-black text-zinc-800 mb-2" style={{ fontSize: `${fontSize * 1.3}px` }}>아직 참여 중인<br/>중보모임이 없습니다.</h2>
            <div className="w-full mt-10 space-y-4">
              <button onClick={() => setViewMode('create-group')} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black shadow-xl">새 모임 만들기</button>
            </div>
          </motion.div>
        )}

        {/* CASE 2: 모임 개설 폼 */}
        {viewMode === 'create-group' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-white space-y-6">
              <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.1}px` }}>모임 정보 입력</h3>
              <input 
                value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold"
                placeholder="모임 이름"
              />
              <textarea 
                value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 h-24 resize-none"
                placeholder="모임 소개"
              />
              <button onClick={handleCreateGroup} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black">개설 완료</button>
              <button onClick={() => setViewMode('no-group')} className="w-full text-zinc-400 font-bold text-sm text-center">취소</button>
            </div>
          </motion.div>
        )}

        {/* CASE 3: 관리자 패널 (모임 정보 노출) */}
        {viewMode === 'admin-panel' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#4A6741]" />
                <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.1}px` }}>{myGroup?.name} 관리자</h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-white">
              <p className="text-zinc-500 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.9}px` }}>
                {myGroup?.description || "등록된 소개가 없습니다."}
              </p>
            </div>
            <p className="text-center text-zinc-300 text-xs font-bold pt-10">이제 멤버들을 초대하고 음성 분석 리포트를 확인해보세요.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
