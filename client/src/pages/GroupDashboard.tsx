import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { supabase } from "../lib/supabase";

// 🔍 1. 여기서 하나씩 범인을 찾습니다. 
// 만약 아래 4개 중 하나를 주석 처리했을 때 화면이 나온다면 그 파일이 범인입니다.
import GroupHome from "../components/group/GroupHome";
import GroupIntercession from "../components/group/GroupIntercession";
import GroupGrowth from "../components/group/GroupGrowth";
import GroupSocial from "../components/group/GroupSocial";

export default function GroupDashboard() {
  const [, params] = useRoute("/group/:id");
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroup() {
      if (params?.id) {
        const { data } = await supabase.from('groups').select('*').eq('id', params.id).single();
        setGroup(data);
      }
      setLoading(false);
    }
    fetchGroup();
  }, [params?.id]);

  if (loading) return <div className="p-10 text-center font-bold">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-white p-5 text-left">
      <h1 className="text-xl font-black mb-6">{group?.name || "모임 정보"}</h1>
      
      <div className="space-y-10">
        {/* 🔍 아래 섹션들을 하나씩 확인해보세요 */}
        <section className="border-t pt-5">
          <h2 className="text-sm font-black text-zinc-400 mb-4 uppercase">1. Home Test</h2>
          <GroupHome group={group} role="owner" />
        </section>

        <section className="border-t pt-5">
          <h2 className="text-sm font-black text-zinc-400 mb-4 uppercase">2. Intercession Test</h2>
          <GroupIntercession groupId={group?.id} role="owner" />
        </section>
      </div>
    </div>
  );
}
