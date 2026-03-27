import React, { useEffect, useState } from "react";
import { Trash2, HandHeart, Heart, PenLine, Mic, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { supabase } from "../lib/supabase";
import { AudioRecordPlayer } from "../components/AudioRecordPlayer";

type PrayerBoxItem = {
  topicId: number;
  content: string;
  groupName: string;
  savedAt: string;
};

type GroupRecord = {
  id: number;
  user_id: string;
  title: string | null;
  audio_url: string;
  audio_duration: number;
  prayer_text: string | null;
  created_at: string;
};

type TopicMeta = {
  group_id: string;
  author_id: string;
};

type TopicRecords = {
  heartCount: number;
  textPrayers: GroupRecord[];
  voicePrayers: GroupRecord[];
};

function getStorageKey(userId: string) {
  return `myamen_prayer_box_${userId}`;
}

function loadItems(userId: string): PrayerBoxItem[] {
  try { return JSON.parse(localStorage.getItem(getStorageKey(userId)) || "[]"); } catch { return []; }
}

function saveItems(userId: string, items: PrayerBoxItem[]) {
  try { localStorage.setItem(getStorageKey(userId), JSON.stringify(items)); } catch {}
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return ""; }
}

export default function MyPrayerBoxPage() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<PrayerBoxItem[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [recordsMap, setRecordsMap] = useState<Map<number, TopicRecords>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    setItems(loadItems(user.id));
  }, [user?.id, isLoading]);

  useEffect(() => {
    const groupItems = items.filter(i => i.groupName !== "매일기도");
    if (!groupItems.length) return;

    const fetchRecords = async () => {
      setLoadingRecords(true);
      try {
        const topicIds = groupItems.map(i => i.topicId);

        const { data: topicData } = await supabase
          .from("group_prayer_topics")
          .select("id, group_id, author_id")
          .in("id", topicIds);

        if (!topicData?.length) return;

        const topicMeta = new Map<number, TopicMeta>();
        (topicData as Array<{ id: number; group_id: string; author_id: string }>).forEach(t => {
          topicMeta.set(t.id, { group_id: t.group_id, author_id: t.author_id });
        });

        const newMap = new Map<number, TopicRecords>();

        await Promise.all(topicIds.map(async (topicId) => {
          const meta = topicMeta.get(topicId);
          if (!meta) return;

          const { data: records } = await supabase
            .from("group_prayer_records")
            .select("id, user_id, title, audio_url, audio_duration, prayer_text, created_at")
            .eq("group_id", meta.group_id)
            .or(`title.ilike.[user:${meta.author_id}]%,title.ilike.[topic:${topicId}]%`)
            .order("created_at", { ascending: true });

          if (!records?.length) return;

          const recs = records as GroupRecord[];
          const heartCount = recs.filter(r => r.audio_url === "amen").length;
          const textPrayers = recs.filter(r => r.audio_url === "text" && r.prayer_text);
          const voicePrayers = recs.filter(r => r.audio_url !== "amen" && r.audio_url !== "text" && r.audio_url);

          newMap.set(topicId, { heartCount, textPrayers, voicePrayers });
        }));

        setRecordsMap(newMap);
      } catch (err) {
        console.error("Error fetching prayer records:", err);
      } finally {
        setLoadingRecords(false);
      }
    };

    void fetchRecords();
  }, [items]);

  const removeItem = (savedAt: string) => {
    if (!user) return;
    const next = items.filter(i => i.savedAt !== savedAt);
    saveItems(user.id, next);
    setItems(next);
  };

  const toggleExpand = (topicId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  if (!isLoading && !user) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F6F7] pt-[var(--app-page-top)] flex flex-col items-center justify-center gap-4 px-6">
        <HandHeart size={40} className="text-zinc-300" />
        <p className="text-zinc-500 text-sm">로그인이 필요합니다.</p>
        <button onClick={() => setShowLoginModal(true)} className="px-5 py-2.5 rounded-xl bg-[#4A6741] text-white font-bold text-sm">
          로그인
        </button>
        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F6F7] pt-[var(--app-page-top)] pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <HandHeart size={36} className="text-zinc-200" />
            <p className="text-sm">저장된 기도제목이 없습니다.</p>
            <p className="text-xs text-zinc-300 text-center">중보모임 기도제목 옆 북마크 아이콘을 눌러 저장하세요.</p>
          </div>
        ) : (
          items.map(item => {
            const isGroup = item.groupName !== "매일기도";
            const records = recordsMap.get(item.topicId);
            const hasRecords = records && (records.heartCount > 0 || records.textPrayers.length > 0 || records.voicePrayers.length > 0);
            const isExpanded = expandedIds.has(item.topicId);

            return (
              <div key={`${item.topicId}_${item.savedAt}`} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HandHeart size={13} className={`shrink-0 ${isGroup ? "text-amber-500" : "text-[#4A6741]"}`} />
                        <span className={`text-[11px] font-bold truncate ${isGroup ? "text-amber-600" : "text-[#4A6741]"}`}>{item.groupName}</span>
                        <span className="text-[11px] text-zinc-400 shrink-0">{formatDate(item.savedAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed font-medium">{item.content}</p>
                    </div>
                    <button onClick={() => removeItem(item.savedAt)} className="shrink-0 p-1.5 text-zinc-300 hover:text-rose-400 transition-colors" title="저장 취소">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isGroup && !loadingRecords && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {records?.heartCount ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 text-[11px] font-bold">
                          <Heart size={11} fill="currentColor" /> {records.heartCount}명
                        </span>
                      ) : null}
                      {records?.textPrayers.length ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 text-[11px] font-bold">
                          <PenLine size={11} /> 글기도 {records.textPrayers.length}
                        </span>
                      ) : null}
                      {records?.voicePrayers.length ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[11px] font-bold">
                          <Mic size={11} /> 음성기도 {records.voicePrayers.length}
                        </span>
                      ) : null}
                      {hasRecords && (
                        <button
                          onClick={() => toggleExpand(item.topicId)}
                          className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 font-bold"
                        >
                          {isExpanded ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> 펼치기</>}
                        </button>
                      )}
                    </div>
                  )}

                  {isGroup && loadingRecords && (
                    <div className="mt-3 h-4 w-24 bg-zinc-100 rounded-full animate-pulse" />
                  )}
                </div>

                {isGroup && isExpanded && records && (
                  <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-3">
                    {records.textPrayers.map(tp => (
                      <div key={tp.id} className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <PenLine size={12} className="text-blue-400" />
                          <span className="text-[11px] font-bold text-blue-500">글기도</span>
                          <span className="text-[10px] text-zinc-400 ml-auto">{formatDate(tp.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{tp.prayer_text}</p>
                      </div>
                    ))}

                    {records.voicePrayers.map(vp => (
                      <AudioRecordPlayer
                        key={vp.id}
                        src={vp.audio_url}
                        title="음성기도"
                        subtitle={formatDate(vp.created_at)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
