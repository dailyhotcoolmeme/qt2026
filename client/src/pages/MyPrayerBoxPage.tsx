import React, { useEffect, useState } from "react";
import { Trash2, HandHeart, Heart, PenLine, Mic, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { supabase } from "../lib/supabase";
import { AudioRecordPlayer } from "../components/AudioRecordPlayer";
import { isAudioOrphaned } from "../lib/audioRef";
import { resolveApiUrl } from "../lib/appUrl";

type HeartPrayer = { display_name: string; created_at: string };
type TextPrayer = { display_name: string; prayer_text: string; created_at: string };
type VoicePrayer = { display_name: string; audio_url: string; audio_duration: number; created_at: string };

type PrayerBoxItem = {
  id: number;
  source_type: string;
  source_topic_id: number | null;
  group_name: string | null;
  topic_content: string;
  heart_count: number;
  heart_prayers: HeartPrayer[];
  text_prayers: TextPrayer[];
  voice_prayers: VoicePrayer[];
  saved_at: string;
};

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
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isLoading || !user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prayer_box_items")
        .select("id, source_type, source_topic_id, group_name, topic_content, heart_count, heart_prayers, text_prayers, voice_prayers, saved_at")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });
      setItems((data ?? []) as PrayerBoxItem[]);
      setLoading(false);
    };
    void fetch();
  }, [user?.id, isLoading]);

  const removeItem = async (item: PrayerBoxItem) => {
    if (!user) return;
    await supabase.from("prayer_box_items").delete().eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));

    // 음성기도 orphan 체크 후 R2 삭제
    for (const vp of item.voice_prayers) {
      if (vp.audio_url && await isAudioOrphaned(vp.audio_url)) {
        fetch(resolveApiUrl("/api/audio/delete"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: vp.audio_url }),
        }).catch(() => undefined);
      }
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        {isLoading || loading ? (
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
            const isGroup = item.source_type === "group";
            const hasRecords = item.heart_count > 0 || item.text_prayers.length > 0 || item.voice_prayers.length > 0;
            const isExpanded = expandedIds.has(item.id);

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HandHeart size={13} className={`shrink-0 ${isGroup ? "text-amber-500" : "text-[#4A6741]"}`} />
                        <span className={`text-[11px] font-bold truncate ${isGroup ? "text-amber-600" : "text-[#4A6741]"}`}>
                          {item.group_name ?? "매일기도"}
                        </span>
                        <span className="text-[11px] text-zinc-400 shrink-0">{formatDate(item.saved_at)}</span>
                      </div>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed font-medium">{item.topic_content}</p>
                    </div>
                    <button
                      onClick={() => void removeItem(item)}
                      className="shrink-0 p-1.5 text-zinc-300 hover:text-rose-400 transition-colors"
                      title="저장 취소"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isGroup && hasRecords && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {item.heart_count > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 text-[11px] font-bold">
                          <Heart size={11} fill="currentColor" /> {item.heart_count}명
                        </span>
                      )}
                      {item.text_prayers.length > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 text-[11px] font-bold">
                          <PenLine size={11} /> 글기도 {item.text_prayers.length}
                        </span>
                      )}
                      {item.voice_prayers.length > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[11px] font-bold">
                          <Mic size={11} /> 음성기도 {item.voice_prayers.length}
                        </span>
                      )}
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 font-bold"
                      >
                        {isExpanded ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> 펼치기</>}
                      </button>
                    </div>
                  )}
                </div>

                {isGroup && isExpanded && (
                  <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-3">
                    {/* 마음기도 */}
                    {item.heart_prayers.length > 0 && (
                      <div className="bg-rose-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Heart size={12} className="text-rose-400" fill="currentColor" />
                          <span className="text-[11px] font-bold text-rose-500">마음기도</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.heart_prayers.map((hp, i) => (
                            <span key={i} className="text-[11px] bg-white px-2 py-0.5 rounded-full text-zinc-600 border border-rose-100">
                              {hp.display_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 글기도 */}
                    {item.text_prayers.map((tp, i) => (
                      <div key={i} className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <PenLine size={12} className="text-blue-400" />
                          <span className="text-[11px] font-bold text-blue-500">글기도</span>
                          <span className="text-[10px] text-zinc-400 ml-1">{tp.display_name}</span>
                          <span className="text-[10px] text-zinc-400 ml-auto">{formatDate(tp.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{tp.prayer_text}</p>
                      </div>
                    ))}

                    {/* 음성기도 */}
                    {item.voice_prayers.map((vp, i) => (
                      <AudioRecordPlayer
                        key={i}
                        src={vp.audio_url}
                        title={`음성기도 — ${vp.display_name}`}
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
