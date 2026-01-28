import React, { useState, useEffect } from "react";
import { ChevronLeft, Camera, Users, Settings } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { supabase } from "../lib/supabase";

export default function GroupDashboard() {
  const [, params] = useRoute("/group/:id");
  const groupId = params?.id;
  const [, setLocation] = useLocation();
  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    // 1단계: 모임 기본 정보 로드 (대표 이미지 등)
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      setGroup(data);
    };
    if (groupId) fetchGroup();
  }, [groupId]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      {/* [최종정리 반영] 최상단: 가로형 Full-Width 대표 이미지 배너 */}
      <div className="relative w-full h-[220px] bg-zinc-200">
        {group?.cover_image ? (
          <img src={group.cover_image} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-300 to-zinc-400" />
        )}
        
        {/* 상단 오버레이 버튼 */}
        <div className="absolute top-12 left-4 right-4 flex justify-between">
          <button onClick={() => setLocation("/community")} className="p-2 bg-black/20 rounded-full text-white backdrop-blur-sm">
            <ChevronLeft size={20} />
          </button>
          <button className="p-2 bg-black/20 rounded-full text-white backdrop-blur-sm">
            <Settings size={20} />
          </button>
        </div>

        {/* 배너 하단 정보 (사진 위에 오버레이) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-white">{group?.name || "모임 이름"}</h1>
              <div className="flex items-center gap-2 text-white/70 text-xs font-bold mt-1">
                <Users size={14} />
                <span>멤버 12명</span>
              </div>
            </div>
            {/* 권한자에게만 보이는 배너 수정 버튼 */}
            <button className="p-2 bg-white/20 rounded-lg text-white backdrop-blur-sm">
              <Camera size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 내일부터 채워나갈 탭 메뉴 및 컨텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center p-10 text-zinc-300 font-bold text-center">
        설계도에 따라 <br/>내일부터 4단 탭과 컨텐츠를 채워갑니다.
      </div>
    </div>
  );
}
