import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronLeft, Church, Shield, TrendingUp, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";

type ScopedGroup = {
  group_id: string;
  depth: number;
};

type GroupRow = {
  id: string;
  name: string;
};

type GroupCard = {
  id: string;
  name: string;
  depth: number;
  memberCount: number;
  prayerCount7d: number;
  faithValue7d: number;
};

export default function LeadershipPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<GroupCard[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setCards([]);
      setLoading(false);
      return;
    }
    void loadData(user.id);
  }, [user?.id]);

  const loadData = async (userId: string) => {
    setLoading(true);

    const { data: scoped, error: scopeErr } = await supabase.rpc("get_scope_groups", {
      p_user_id: userId,
    });

    if (scopeErr || !scoped) {
      setCards([]);
      setLoading(false);
      return;
    }

    const scopedGroups = scoped as ScopedGroup[];
    const groupIds = scopedGroups.map((row) => row.group_id);
    if (groupIds.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceDate = since.toISOString().split("T")[0];

    const [{ data: groups }, { data: members }, { data: prayers }, { data: faithRecords }] =
      await Promise.all([
        supabase.from("groups").select("id, name").in("id", groupIds),
        supabase.from("group_members").select("group_id").in("group_id", groupIds),
        supabase
          .from("group_prayer_records")
          .select("group_id, created_at")
          .in("group_id", groupIds)
          .gte("created_at", `${sinceDate}T00:00:00`),
        supabase
          .from("group_faith_records")
          .select("group_id, value, record_date")
          .in("group_id", groupIds)
          .gte("record_date", sinceDate),
      ]);

    const depthMap = new Map<string, number>();
    scopedGroups.forEach((row) => depthMap.set(row.group_id, row.depth));

    const memberCountMap = new Map<string, number>();
    (members ?? []).forEach((row: { group_id: string }) => {
      memberCountMap.set(row.group_id, (memberCountMap.get(row.group_id) ?? 0) + 1);
    });

    const prayerCountMap = new Map<string, number>();
    (prayers ?? []).forEach((row: { group_id: string }) => {
      prayerCountMap.set(row.group_id, (prayerCountMap.get(row.group_id) ?? 0) + 1);
    });

    const faithValueMap = new Map<string, number>();
    (faithRecords ?? []).forEach((row: { group_id: string; value: number | string }) => {
      faithValueMap.set(row.group_id, (faithValueMap.get(row.group_id) ?? 0) + Number(row.value ?? 0));
    });

    const nextCards: GroupCard[] = ((groups ?? []) as GroupRow[]).map((group) => ({
      id: group.id,
      name: group.name,
      depth: depthMap.get(group.id) ?? 0,
      memberCount: memberCountMap.get(group.id) ?? 0,
      prayerCount7d: prayerCountMap.get(group.id) ?? 0,
      faithValue7d: faithValueMap.get(group.id) ?? 0,
    }));

    nextCards.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name, "ko"));
    setCards(nextCards);
    setLoading(false);
  };

  const summary = useMemo(
    () => ({
      groups: cards.length,
      members: cards.reduce((sum, card) => sum + card.memberCount, 0),
      prayers: cards.reduce((sum, card) => sum + card.prayerCount7d, 0),
      faith: cards.reduce((sum, card) => sum + card.faithValue7d, 0),
    }),
    [cards]
  );

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F8]">
        <div className="w-8 h-8 rounded-full border-4 border-[#4A6741] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-zinc-100 p-6 text-center">
          <p className="text-sm text-zinc-600 font-bold mb-4">로그인 후 리더십 페이지를 볼 수 있습니다.</p>
          <button
            onClick={() => setLocation("/community")}
            className="px-4 py-2 rounded-xl bg-[#4A6741] text-white text-sm font-bold"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F8] pt-24 pb-28 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setLocation("/community")}
            className="w-9 h-9 rounded-full bg-white border border-zinc-100 flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <h1 className="font-black text-zinc-900">리더십</h1>
          <div className="w-9 h-9" />
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-[#4A6741]" />
            <h2 className="font-black text-zinc-900 text-sm">내 관리 범위 요약 (최근 7일)</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">모임</div>
              <div className="text-lg font-black">{summary.groups}</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">멤버</div>
              <div className="text-lg font-black">{summary.members}</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">기도</div>
              <div className="text-lg font-black">{summary.prayers}</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">신앙생활</div>
              <div className="text-lg font-black">{summary.faith}</div>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setLocation(`/group/${card.id}`)}
              className="w-full bg-white rounded-3xl border border-zinc-100 p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-zinc-900">{card.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">계층 깊이: {card.depth}</div>
                </div>
                <Church size={16} className="text-zinc-300" />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-zinc-50 rounded-xl px-3 py-2">
                  <div className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <Users size={12} /> 멤버
                  </div>
                  <div className="font-black text-zinc-900">{card.memberCount}</div>
                </div>
                <div className="bg-zinc-50 rounded-xl px-3 py-2">
                  <div className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <Shield size={12} /> 기도
                  </div>
                  <div className="font-black text-zinc-900">{card.prayerCount7d}</div>
                </div>
                <div className="bg-zinc-50 rounded-xl px-3 py-2">
                  <div className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <TrendingUp size={12} /> 신앙생활
                  </div>
                  <div className="font-black text-zinc-900">{card.faithValue7d}</div>
                </div>
              </div>
            </button>
          ))}

          {cards.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-8 text-sm text-zinc-500 text-center">
              조회 가능한 하위 모임이 없습니다.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
