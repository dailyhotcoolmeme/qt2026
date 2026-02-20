import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { AlarmClock, Bookmark, BookOpenCheck, Download, HandHeart, LibraryBig, Link2, SearchCheck, Share2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";

type ActivityType = "qt" | "prayer" | "reading" | "bookmark";
type MenuType = "all" | ActivityType;
type SourceFilter = "all" | "personal" | "group" | "linked";

type ActivityLogRow = {
  id: number;
  activity_type: ActivityType;
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

type RetentionSummary = {
  voiceTotal: number;
  voiceExpiringSoon: number;
  voiceExpired: number;
  voiceSoonestExpireAt: string | null;
  photoTotal: number;
  photoExpiringSoon: number;
  photoExpired: number;
  photoSoonestExpireAt: string | null;
};

type VerseCardRecord = {
  id: string;
  title: string;
  imageDataUrl: string;
  createdAt: string;
};

const RETENTION_DAYS = 30;
const EXPIRING_SOON_DAYS = 7;
const VERSE_CARD_DB = "myamen_verse_cards";
const VERSE_CARD_STORE = "cards";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTitle(log: ActivityLogRow) {
  const payload = log.payload ?? {};

  if (log.activity_type === "qt") {
    const text = payload.meditation_excerpt;
    if (typeof text === "string" && text.trim()) return text;
    return "QT 일기";
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
    return "성경읽기";
  }

  const verseRef = payload.verse_ref;
  if (typeof verseRef === "string" && verseRef.trim()) return verseRef;
  return "즐겨찾기 말씀";
}

function getPrayerDuration(log: ActivityLogRow) {
  if (log.activity_type !== "prayer") return 0;
  const payload = log.payload ?? {};
  const value = payload.audio_duration;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getReadingCount(log: ActivityLogRow) {
  if (log.activity_type !== "reading") return 0;
  const payload = log.payload ?? {};
  const value = payload.read_count;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 1;
  }
  return 1;
}

function calculateRetention(createdAtList: string[]): {
  total: number;
  expiringSoon: number;
  expired: number;
  soonestExpireAt: string | null;
} {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let expiringSoon = 0;
  let expired = 0;
  let soonest: number | null = null;

  createdAtList.forEach((createdAt) => {
    const createdMs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdMs)) return;

    const expireMs = createdMs + RETENTION_DAYS * dayMs;
    if (expireMs < now) {
      expired += 1;
      return;
    }

    const leftDays = Math.ceil((expireMs - now) / dayMs);
    if (leftDays <= EXPIRING_SOON_DAYS) {
      expiringSoon += 1;
      if (soonest === null || expireMs < soonest) soonest = expireMs;
    }
  });

  return {
    total: createdAtList.length,
    expiringSoon,
    expired,
    soonestExpireAt: soonest ? new Date(soonest).toISOString() : null,
  };
}

function verseCardStorageKey(userId?: string | null) {
  return `verse-card-records:${userId || "guest"}`;
}

function openVerseCardDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(VERSE_CARD_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VERSE_CARD_STORE)) {
        db.createObjectStore(VERSE_CARD_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function loadVerseCards(userId?: string | null): Promise<VerseCardRecord[]> {
  const key = verseCardStorageKey(userId);
  const db = await openVerseCardDB();
  if (!db) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as VerseCardRecord[]) : [];
    } catch {
      return [];
    }
  }

  const cards = await new Promise<VerseCardRecord[]>((resolve) => {
    const tx = db.transaction(VERSE_CARD_STORE, "readonly");
    const store = tx.objectStore(VERSE_CARD_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as VerseCardRecord[]) ?? []);
    req.onerror = () => resolve([]);
  });

  db.close();
  return cards;
}

async function saveVerseCards(userId: string, cards: VerseCardRecord[]) {
  const key = verseCardStorageKey(userId);
  const db = await openVerseCardDB();
  if (!db) {
    localStorage.setItem(key, JSON.stringify(cards));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VERSE_CARD_STORE, "readwrite");
    const store = tx.objectStore(VERSE_CARD_STORE);
    store.put(cards, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

async function shareDataUrl(dataUrl: string, title: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], "verse-card.jpg", { type: blob.type || "image/jpeg" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "말씀 카드",
      text: title,
      files: [file],
    });
    return true;
  }
  return false;
}

export default function ArchivePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const now = new Date();
  const defaultEnd = toInputDate(now);
  const defaultStartDate = new Date(now);
  defaultStartDate.setDate(defaultStartDate.getDate() - 6);
  const defaultStart = toInputDate(defaultStartDate);

  const [menuType, setMenuType] = useState<MenuType>("all");
  const [statsType, setStatsType] = useState<MenuType>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [links, setLinks] = useState<ActivityLinkRow[]>([]);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});
  const [verseCards, setVerseCards] = useState<VerseCardRecord[]>([]);
  const [activeVerseCard, setActiveVerseCard] = useState<VerseCardRecord | null>(null);
  const [pendingDeleteVerseCard, setPendingDeleteVerseCard] = useState<VerseCardRecord | null>(null);
  const [retention, setRetention] = useState<RetentionSummary>({
    voiceTotal: 0,
    voiceExpiringSoon: 0,
    voiceExpired: 0,
    voiceSoonestExpireAt: null,
    photoTotal: 0,
    photoExpiringSoon: 0,
    photoExpired: 0,
    photoSoonestExpireAt: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setLogs([]);
      setLinks([]);
      setGroupsMap({});
      setVerseCards([]);
      setActiveVerseCard(null);
      setLoading(false);
      return;
    }
    void loadData(user.id);
  }, [user?.id, startDate, endDate]);

  useEffect(() => {
    if (!user?.id) {
      setVerseCards([]);
      setActiveVerseCard(null);
      return;
    }

    loadVerseCards(user.id)
      .then((cards) =>
        setVerseCards(
          cards
            .filter((card) => Boolean(card?.id && card?.imageDataUrl))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        )
      )
      .catch(() => setVerseCards([]));
  }, [user?.id]);

  const saveVerseCardToPhone = async (card: VerseCardRecord) => {
    try {
      await downloadDataUrl(card.imageDataUrl, `verse-card-${card.id}.jpg`);
    } catch (error) {
      console.error("download verse card failed:", error);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  const shareVerseCard = async (card: VerseCardRecord) => {
    try {
      const shared = await shareDataUrl(card.imageDataUrl, card.title || "말씀 카드");
      if (!shared) {
        await downloadDataUrl(card.imageDataUrl, `verse-card-${card.id}.jpg`);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("share verse card failed:", error);
        alert("이미지 공유에 실패했습니다.");
      }
    }
  };

  const deleteVerseCard = async (card: VerseCardRecord) => {
    if (!user?.id) return;
    const nextCards = verseCards.filter((item) => item.id !== card.id);
    setVerseCards(nextCards);
    if (activeVerseCard?.id === card.id) {
      setActiveVerseCard(null);
    }
    setPendingDeleteVerseCard(null);

    try {
      await saveVerseCards(user.id, nextCards);
    } catch (error) {
      console.error("delete verse card failed:", error);
      alert("말씀카드 삭제에 실패했습니다.");
    }
  };

  const loadRetentionSummary = async (userId: string) => {
    const [{ data: prayerRows }, { data: qtRows }] = await Promise.all([
      supabase
        .from("prayer_records")
        .select("created_at, audio_url")
        .eq("user_id", userId)
        .not("audio_url", "is", null),
      supabase
        .from("user_meditation_records")
        .select("created_at, audio_url")
        .eq("user_id", userId)
        .not("audio_url", "is", null),
    ]);

    const voiceCreatedAt = [...(prayerRows ?? []), ...(qtRows ?? [])]
      .map((row: any) => row.created_at)
      .filter(Boolean) as string[];

    const voiceSummary = calculateRetention(voiceCreatedAt);
    const photoSummary = calculateRetention([]);

    setRetention({
      voiceTotal: voiceSummary.total,
      voiceExpiringSoon: voiceSummary.expiringSoon,
      voiceExpired: voiceSummary.expired,
      voiceSoonestExpireAt: voiceSummary.soonestExpireAt,
      photoTotal: photoSummary.total,
      photoExpiringSoon: photoSummary.expiringSoon,
      photoExpired: photoSummary.expired,
      photoSoonestExpireAt: photoSummary.soonestExpireAt,
    });
  };

  const loadData = async (userId: string) => {
    setLoading(true);

    const rangeStart = `${startDate}T00:00:00`;
    const rangeEnd = `${endDate}T23:59:59`;

    const { data: logRows, error: logErr } = await supabase
      .from("activity_logs")
      .select("id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", rangeStart)
      .lte("occurred_at", rangeEnd)
      .order("occurred_at", { ascending: false })
      .limit(1500);

    if (logErr) {
      console.error("archive log load error:", logErr);
      setLogs([]);
      setLinks([]);
      setGroupsMap({});
      await loadRetentionSummary(userId);
      setLoading(false);
      return;
    }

    const nextLogs = (logRows ?? []) as ActivityLogRow[];
    setLogs(nextLogs);

    const logIds = nextLogs.map((row) => row.id);
    if (logIds.length > 0) {
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

      if (groupIds.length > 0) {
        const { data: groups } = await supabase.from("groups").select("id, name").in("id", groupIds);
        const map: Record<string, string> = {};
        (groups ?? []).forEach((group: GroupRow) => {
          map[group.id] = group.name;
        });
        setGroupsMap(map);
      } else {
        setGroupsMap({});
      }
    } else {
      setLinks([]);
      setGroupsMap({});
    }

    await loadRetentionSummary(userId);
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

  const includeBySource = (log: ActivityLogRow) => {
    const relatedLinks = linkMap.get(log.id) ?? [];
    if (sourceFilter === "all") return true;
    if (sourceFilter === "personal") return log.source_kind === "personal" && relatedLinks.length === 0;
    if (sourceFilter === "group") return log.source_kind === "group_direct";
    return log.source_kind === "personal" && relatedLinks.length > 0;
  };

  const menuLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!includeBySource(log)) return false;
      if (menuType === "all") return true;
      return log.activity_type === menuType;
    });
  }, [logs, menuType, sourceFilter, linkMap]);

  const statsLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!includeBySource(log)) return false;
      if (statsType === "all") return true;
      return log.activity_type === statsType;
    });
  }, [logs, statsType, sourceFilter, linkMap]);

  const stats = useMemo(() => {
    const qtCount = statsLogs.filter((log) => log.activity_type === "qt").length;
    const prayerRows = statsLogs.filter((log) => log.activity_type === "prayer");
    const prayerCount = prayerRows.length;
    const prayerDurationSec = prayerRows.reduce((sum, log) => sum + getPrayerDuration(log), 0);
    const readingRows = statsLogs.filter((log) => log.activity_type === "reading");
    const readingCount = readingRows.length;
    const readingChapters = readingRows.reduce((sum, log) => sum + getReadingCount(log), 0);
    const bookmarkCount = statsLogs.filter((log) => log.activity_type === "bookmark").length;

    return {
      qtCount,
      prayerCount,
      prayerDurationSec,
      readingCount,
      readingChapters,
      bookmarkCount,
    };
  }, [statsLogs]);

  const menuConfig: Array<{ key: MenuType; label: string; icon: React.ReactNode }> = [
    { key: "all", label: "전체", icon: <SearchCheck size={15} /> },
    { key: "qt", label: "QT일기", icon: <BookOpenCheck size={15} /> },
    { key: "prayer", label: "기도(myAmen)", icon: <HandHeart size={15} /> },
    { key: "reading", label: "성경읽기", icon: <LibraryBig size={15} /> },
    { key: "bookmark", label: "즐겨찾기 말씀", icon: <Bookmark size={15} /> },
  ];

  const routeByActivity = (log: ActivityLogRow) => {
    if (log.activity_type === "qt") return "/qt";
    if (log.activity_type === "prayer") return "/prayer";
    if (log.activity_type === "reading") return "/reading";
    return "/search";
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
        <div className="max-w-sm w-full bg-[#F6F7F8] rounded-none border border-zinc-100 p-6 text-center">
          <p className="text-sm text-zinc-600 font-bold mb-4">로그인 후 기록함을 확인할 수 있습니다.</p>
          <button
            onClick={() => setLocation("/")}
            className="px-4 py-2 rounded-none bg-[#4A6741] text-white text-sm font-bold"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F8] pt-20 pb-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <section className="bg-white rounded-none border border-zinc-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlarmClock size={16} className="text-[#4A6741]" />
            <h2 className="font-black text-zinc-900 text-sm">개인 저장파일 보관 현황 (30일 무료)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500 mb-1">음성 기도/QT 음성</div>
              <div className="text-sm font-black text-zinc-900">총 {retention.voiceTotal}개</div>
              <div className="text-xs text-amber-700 mt-1">만료 임박 {retention.voiceExpiringSoon}개</div>
              <div className="text-xs text-rose-600">만료 {retention.voiceExpired}개</div>
              {retention.voiceSoonestExpireAt && (
                <div className="text-[11px] text-zinc-500 mt-1">
                  가장 가까운 만료일: {formatDateOnly(retention.voiceSoonestExpireAt)}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500 mb-1">사진 파일</div>
              <div className="text-sm font-black text-zinc-900">총 {retention.photoTotal}개</div>
              <div className="text-xs text-amber-700 mt-1">만료 임박 {retention.photoExpiringSoon}개</div>
              <div className="text-xs text-rose-600">만료 {retention.photoExpired}개</div>
              <div className="text-[11px] text-zinc-500 mt-1">사진 저장 기능은 다음 단계에서 연동됩니다.</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-zinc-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-zinc-900 text-sm">말씀카드 이미지 기록</h2>
            <span className="text-xs text-zinc-500">{verseCards.length}개</span>
          </div>

          {verseCards.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
              저장된 말씀카드가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {verseCards.map((card) => (
                <div key={card.id} className="relative">
                  <button
                    onClick={() => setActiveVerseCard(card)}
                    className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 text-left"
                  >
                    <img src={card.imageDataUrl} alt={card.title || "말씀카드"} className="aspect-[4/5] w-full object-cover" />
                    <div className="px-2 py-1.5">
                      <p className="text-[11px] font-bold text-zinc-700 line-clamp-1">{card.title || "말씀카드"}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{formatDateTime(card.createdAt)}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteVerseCard(card);
                    }}
                    className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="카드 삭제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-zinc-100 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {menuConfig.map((item) => (
              <button
                key={item.key}
                onClick={() => setMenuType(item.key)}
                className={`py-2 px-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 ${
                  menuType === item.key ? "bg-[#4A6741] text-white" : "bg-zinc-50 text-zinc-700"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["all", "전체"],
              ["personal", "개인"],
              ["group", "모임"],
              ["linked", "개인+모임"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSourceFilter(key as SourceFilter)}
                className={`py-2 rounded-xl text-xs font-bold ${
                  sourceFilter === key ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-zinc-500">시작일</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500">종료일</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={defaultEnd}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {menuConfig.map((item) => (
              <button
                key={`stats-${item.key}`}
                onClick={() => setStatsType(item.key)}
                className={`py-2 rounded-xl text-xs font-bold ${
                  statsType === item.key ? "bg-[#4A6741] text-white" : "bg-zinc-50 text-zinc-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">QT 횟수</div>
              <div className="font-black text-zinc-900">{stats.qtCount}회</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">기도</div>
              <div className="font-black text-zinc-900">{stats.prayerCount}회</div>
              <div className="text-[11px] text-zinc-500 mt-1">{Math.floor(stats.prayerDurationSec / 60)}분</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">성경읽기</div>
              <div className="font-black text-zinc-900">{stats.readingCount}회</div>
              <div className="text-[11px] text-zinc-500 mt-1">총 {stats.readingChapters}장</div>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <div className="text-[11px] text-zinc-500">즐겨찾기 말씀</div>
              <div className="font-black text-zinc-900">{stats.bookmarkCount}회</div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500">
            조회 기간: {startDate} ~ {endDate}
          </div>
        </section>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {menuLogs.map((log) => {
            const relatedLinks = linkMap.get(log.id) ?? [];
            const groupNames =
              log.source_kind === "group_direct"
                ? log.source_group_id
                  ? [groupsMap[log.source_group_id]].filter(Boolean)
                  : []
                : relatedLinks.map((link) => groupsMap[link.group_id]).filter(Boolean);

            const contextText =
              log.source_kind === "group_direct"
                ? "모임"
                : relatedLinks.length > 0
                ? "개인+모임"
                : "개인";

            return (
              <button
                key={log.id}
                onClick={() => setLocation(routeByActivity(log))}
                className="w-full text-left bg-white rounded-3xl border border-zinc-100 p-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-zinc-900 text-sm line-clamp-2">{getTitle(log)}</div>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold">
                    {contextText}
                  </span>
                </div>

                <div className="text-xs text-zinc-500 mt-2">{formatDateTime(log.occurred_at)}</div>

                {log.source_kind === "personal" && relatedLinks.length > 0 && (
                  <div className="text-xs text-zinc-600 mt-2 leading-5">
                    개인
                    <br />
                    모임: {groupNames.join(", ") || "-"}
                  </div>
                )}

                {log.source_kind === "group_direct" && groupNames.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    <Link2 size={12} className="text-zinc-400" />
                    {groupNames.map((name, idx) => (
                      <span key={`${name}-${idx}`} className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}

          {menuLogs.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-8 text-sm text-zinc-500 text-center">
              조건에 맞는 기록이 없습니다.
            </div>
          )}
        </motion.section>
      </div>

      <AnimatePresence>
        {activeVerseCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] bg-black/75 p-4 flex items-center justify-center"
          >
            <button
              onClick={() => setActiveVerseCard(null)}
              className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white"
            >
              <X size={18} />
            </button>

            <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow-2xl">
              <img
                src={activeVerseCard.imageDataUrl}
                alt={activeVerseCard.title || "말씀카드"}
                className="mx-auto aspect-[4/5] w-full rounded-xl object-cover"
              />
              <p className="mt-2 text-center text-sm font-bold text-zinc-800">{activeVerseCard.title || "말씀카드"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => void saveVerseCardToPhone(activeVerseCard)}
                  className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  핸드폰 저장
                </button>
                <button
                  onClick={() => void shareVerseCard(activeVerseCard)}
                  className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} />
                  공유
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteVerseCard && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingDeleteVerseCard(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <h4 className="mb-2 text-base font-bold text-zinc-900">
                카드를 삭제할까요?
              </h4>
              <p className="mb-6 text-sm text-zinc-500">
                삭제한 이미지는 복구할 수 없습니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPendingDeleteVerseCard(null)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-600 transition-active active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={() => void deleteVerseCard(pendingDeleteVerseCard)}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
