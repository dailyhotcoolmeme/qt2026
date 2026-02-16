import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Bookmark, BookOpen, HandHeart, Library, Link2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";

type ArchiveType = "qt" | "prayer" | "reading" | "bookmark";
type ContextFilter = "all" | "group_direct" | "personal" | "linked";

type ActivityLogRow = {
  id: number;
  activity_type: ArchiveType;
  source_kind: "personal" | "group_direct";
  source_group_id: string | null;
  source_table: string;
  source_row_id: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

type ActivityLinkRow = {
  activity_log_id: number;
  group_id: string;
  linked_at: string;
};

type GroupRow = {
  id: string;
  name: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTitle(log: ActivityLogRow) {
  const payload = log.payload ?? {};

  if (log.activity_type === "qt") {
    const text = payload.meditation_excerpt;
    if (typeof text === "string" && text.trim()) return text;
    const date = payload.target_date;
    if (typeof date === "string") return `QT 기록 (${date})`;
    return "QT 기록";
  }

  if (log.activity_type === "prayer") {
    const title = payload.title;
    if (typeof title === "string" && title.trim()) return title;
    return "기도 기록";
  }

  if (log.activity_type === "reading") {
    const book = payload.book_name;
    const chapter = payload.chapter;
    if (typeof book === "string" && (typeof chapter === "number" || typeof chapter === "string")) {
      return `${book} ${chapter}장`;
    }
    return "성경읽기 기록";
  }

  const verseRef = payload.verse_ref;
  if (typeof verseRef === "string" && verseRef.trim()) return verseRef;
  return "말씀 즐겨찾기";
}

export default function ArchivePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [activeType, setActiveType] = useState<ArchiveType>("qt");
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all");
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [links, setLinks] = useState<ActivityLinkRow[]>([]);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.id) {
      setLogs([]);
      setLinks([]);
      setGroupsMap({});
      setLoading(false);
      return;
    }
    void loadData(user.id, activeType);
  }, [user?.id, activeType]);

  const loadData = async (userId: string, type: ArchiveType) => {
    setLoading(true);

    const { data: logRows, error: logErr } = await supabase
      .from("activity_logs")
      .select("id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at")
      .eq("user_id", userId)
      .eq("activity_type", type)
      .order("occurred_at", { ascending: false })
      .limit(300);

    if (logErr) {
      setLogs([]);
      setLinks([]);
      setGroupsMap({});
      setLoading(false);
      return;
    }

    const nextLogs = (logRows ?? []) as ActivityLogRow[];
    setLogs(nextLogs);

    const logIds = nextLogs.map((row) => row.id);
    if (logIds.length === 0) {
      setLinks([]);
      setGroupsMap({});
      setLoading(false);
      return;
    }

    const { data: linkRows } = await supabase
      .from("activity_group_links")
      .select("activity_log_id, group_id, linked_at")
      .in("activity_log_id", logIds);

    const nextLinks = (linkRows ?? []) as ActivityLinkRow[];
    setLinks(nextLinks);

    const groupIds = Array.from(
      new Set([
        ...nextLogs.map((row) => row.source_group_id).filter(Boolean),
        ...nextLinks.map((row) => row.group_id),
      ])
    ) as string[];

    if (groupIds.length === 0) {
      setGroupsMap({});
      setLoading(false);
      return;
    }

    const { data: groups } = await supabase.from("groups").select("id, name").in("id", groupIds);
    const map: Record<string, string> = {};
    (groups ?? []).forEach((group: GroupRow) => {
      map[group.id] = group.name;
    });
    setGroupsMap(map);
    setLoading(false);
  };

  const linkMap = useMemo(() => {
    const map = new Map<number, ActivityLinkRow[]>();
    links.forEach((link) => {
      const prev = map.get(link.activity_log_id) ?? [];
      prev.push(link);
      map.set(link.activity_log_id, prev);
    });
    return map;
  }, [links]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const relatedLinks = linkMap.get(log.id) ?? [];
      const isLinked = log.source_kind === "personal" && relatedLinks.length > 0;

      if (contextFilter === "all") return true;
      if (contextFilter === "group_direct") return log.source_kind === "group_direct";
      if (contextFilter === "personal") return log.source_kind === "personal" && relatedLinks.length === 0;
      if (contextFilter === "linked") return isLinked;
      return true;
    });
  }, [logs, linkMap, contextFilter]);

  const typeConfig: Record<ArchiveType, { label: string; icon: React.ReactNode }> = {
    qt: { label: "QT", icon: <BookOpen size={16} /> },
    prayer: { label: "기도", icon: <HandHeart size={16} /> },
    reading: { label: "성경읽기", icon: <Library size={16} /> },
    bookmark: { label: "말씀 즐겨찾기", icon: <Bookmark size={16} /> },
  };

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
          <p className="text-sm text-zinc-600 font-bold mb-4">로그인 후 내 기록함을 볼 수 있습니다.</p>
          <button
            onClick={() => setLocation("/")}
            className="px-4 py-2 rounded-xl bg-[#4A6741] text-white text-sm font-bold"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F8] pt-24 pb-28 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-black text-zinc-900">내 기록함</h1>
          <p className="text-xs text-zinc-500 mt-1">모임 내 수행 / 개인 수행 / 개인→모임 연결 흐름을 함께 확인할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1 rounded-2xl border border-zinc-100">
          {(Object.keys(typeConfig) as ArchiveType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveType(type);
                setContextFilter("all");
              }}
              className={`py-2 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1 ${
                activeType === type ? "bg-[#4A6741] text-white" : "text-zinc-500"
              }`}
            >
              {typeConfig[type].icon}
              {typeConfig[type].label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            ["all", "전체"],
            ["group_direct", "모임 내 수행"],
            ["personal", "개인 수행"],
            ["linked", "개인→모임 연결"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setContextFilter(id as ContextFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                contextFilter === id ? "bg-[#4A6741] text-white" : "bg-white text-zinc-600 border border-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {filteredLogs.map((log) => {
            const relatedLinks = linkMap.get(log.id) ?? [];
            const contextLabel =
              log.source_kind === "group_direct"
                ? "모임 내 수행"
                : relatedLinks.length > 0
                ? "개인 수행→모임 연결"
                : "개인 수행";

            const groupNames =
              log.source_kind === "group_direct"
                ? log.source_group_id
                  ? [groupsMap[log.source_group_id]].filter(Boolean)
                  : []
                : relatedLinks.map((link) => groupsMap[link.group_id]).filter(Boolean);

            return (
              <div key={log.id} className="bg-white rounded-3xl border border-zinc-100 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-zinc-900 text-sm">{getTitle(log)}</div>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold">
                    {contextLabel}
                  </span>
                </div>

                <div className="text-xs text-zinc-500 mt-2">{formatDateTime(log.occurred_at)}</div>

                {groupNames.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    <Link2 size={12} className="text-zinc-400" />
                    {groupNames.map((name, idx) => (
                      <span key={`${name}-${idx}`} className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-8 text-sm text-zinc-500 text-center">
              표시할 기록이 없습니다.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
