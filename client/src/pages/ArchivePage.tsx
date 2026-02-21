import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { AlarmClock, Bookmark, BookOpenCheck, Download, HandHeart, LibraryBig, Link2, Search, Share2, X, Sun, BookOpenText, BookHeart, Church, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";

type ActivityType = "qt" | "prayer" | "reading" | "bookmark";
type MenuType = "all" | ActivityType | "group";
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

export function formatDateTime(iso: string) {
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

// 기록 종류별로 이동할 경로 생성 (payload.date 우선)
function getMenuDateUrl(log: any) {
  const payload = log.payload || {};
  let date = payload.date;
  if (!date) date = log.occurred_at?.slice(0, 10); // YYYY-MM-DD
  if (log.activity_type === "qt") return `/qt?date=${date}`;
  if (log.activity_type === "prayer") return `/prayer?date=${date}`;
  if (log.activity_type === "reading") return `/reading?date=${date}`;
  // bookmark 등 기타는 기본 아카이브로
  return "/archive";
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
    { key: "all", label: "전체", icon: <Search size={24} /> },
    { key: "qt", label: "QT일기", icon: <BookOpenCheck size={24} /> },
    { key: "prayer", label: "기도(myAmen)", icon: <HandHeart size={24} /> },
    { key: "reading", label: "성경읽기", icon: <LibraryBig size={24} /> },
    { key: "bookmark", label: "즐겨찾기 말씀", icon: <Bookmark size={24} /> },
  ];

  const routeByActivity = (log: ActivityLogRow) => {
    if (log.activity_type === "qt") return "/qt";
    if (log.activity_type === "prayer") return "/prayer";
    if (log.activity_type === "reading") return "/reading";
    return "/search";
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="w-8 h-8 rounded-full border-4 border-[#4A6741] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-[#F8F8F8] rounded-none border border-zinc-100 p-6 text-center">
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
    <div className="min-h-screen bg-[#F8F8F8] pt-20 pb-10 px-4 text-[clamp(13px,1.1em,18px)]">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Removed 개인 저장파일 보관 현황 (30일 무료) section */}

        {/* 말씀카드 이미지 기록 섹션 완전 삭제 */}

        {/* 기간+서브탭 한 박스, 스크롤바 숨김, 돋보기 버튼, 아이콘 추가 */}
        <section className="bg-[#F8F8F8] rounded-none border border-zinc-100">
          <div className="flex flex-col gap-2">
            <div className="overflow-x-auto whitespace-nowrap flex gap-3 pb-1 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', overscrollBehaviorX: 'contain' }}>
              {(() => {
                const tabIcons: Record<MenuType, JSX.Element> = {
                  all: <Search size={24} />,
                  bookmark: <Sun size={24} />,
                  reading: <BookOpenText size={24} />,
                  qt: <BookHeart size={24} />,
                  prayer: <HandHeart size={24} />,
                  group: <Church size={24} />,
                };
                const tabList: { key: MenuType; label: string }[] = [
                  { key: "all", label: "전체조회" },
                  { key: "bookmark", label: "말씀카드" },
                  { key: "reading", label: "성경읽기" },
                  { key: "qt", label: "QT일기" },
                  { key: "prayer", label: "매일기도" },
                  { key: "group", label: "중보모임" },
                ];
                return tabList.map((item) => {
                  const Icon = tabIcons[item.key];
                  const isSelected = menuType === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setMenuType(item.key as MenuType)}
                      className={`px-4 py-1.5 bg-[#F8F8F8] rounded-none text-base font-bold inline-flex items-center justify-center gap-2 relative ${
                        isSelected ? "text-[#4A6741]" : "text-zinc-700"
                      }`}
                      style={{ minWidth: 110 }}
                    >
                      {Icon}
                      {item.label}
                      {isSelected && (
                        <span
                          className="absolute left-2 right-2 -bottom-1 h-[3px] bg-[#4A6741] rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3 mt-1">
              <div>
                <label className="text-xs text-zinc-700">시작</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ml-1 px-3 py-1 rounded-none bg-zinc-50 border border-zinc-200 text-xs"
                  style={{ width: 120 }}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-700">종료</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={defaultEnd}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ml-1 px-3 py-1 rounded-none bg-zinc-50 border border-zinc-200 text-xs"
                  style={{ width: 120 }}
                />
              </div>
              <button
  onClick={() => void loadData(user.id)}
  /* w-7 h-7 대신 px(가로여백)를 주고, rounded-full 대신 rounded-lg 정도로 수정 */
  className="px-2 py-1 rounded-none bg-[#4A6741] opacity-80 text-sm font-bold text-white border border-zinc-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
  aria-label="조회"
>
  조회
</button>
            </div>
          </div>
        </section>
        <br/>
        <div className="flex items-center gap-2 mb-6">
      <div className="w-1.5 h-4 bg-[#4A6741] rounded-full opacity-70" />
      <h4
        className="font-bold text-[#4A6741] opacity-80 text-sm">
        조회 결과
      </h4>
    </div>

        {/* 리스트: 각 탭별 사각형(rounded-none) div, 말씀카드는 기존 유지, 나머지는 일자/시간/기록/음성 등 */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {menuType === "bookmark" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {verseCards.map((card) => (
                <div key={card.id} className="relative">
                  <button
                    onClick={() => setActiveVerseCard(card)}
                    className="w-full overflow-hidden rounded-none border border-zinc-200 bg-zinc-50 text-left"
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
                    className="absolute right-1.5 top-1.5 h-6 w-6 rounded-none bg-black/60 text-white flex items-center justify-center"
                    aria-label="카드 삭제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            menuLogs.map((log) => {
              // 개인/모임 구분 태그 완전 삭제, 모임일 때만 신앙생활/중보기도/교제나눔 태그
              return (
                <div
                  key={log.id}
                  className="w-full text-left bg-white rounded-none border border-zinc-100 p-4 hover:bg-zinc-50 transition-colors mb-2 text-[clamp(13px,1.1em,18px)] flex items-center"
                  style={{ minHeight: 80 }}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-bold text-zinc-900 text-sm line-clamp-2">{getTitle(log)}</div>
                      {/* 모임일 때만 태그 */}
                      {log.source_kind === "group_direct" && ((() => {
                        let tagIcon: React.ReactNode = null;
                        let tagLabel = "";
                        if (log.activity_type === "qt") {
                          tagIcon = <BookHeart size={13} />;
                          tagLabel = "신앙생활";
                        } else if (log.activity_type === "prayer") {
                          tagIcon = <HandHeart size={13} />;
                          tagLabel = "중보기도";
                        } else if (log.activity_type === "reading") {
                          tagIcon = <BookOpenText size={13} />;
                          tagLabel = "교제나눔";
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-none bg-white text-zinc-600 text-[11px] font-bold flex items-center gap-1">
                            {tagIcon} {tagLabel}
                          </span>
                        );
                      })() as React.ReactNode)}
                    </div>
                    <div className="text-xs text-zinc-500 mb-1">{formatDateTime(log.occurred_at)}</div>
                    {(() => {
                      if (log.activity_type === "qt" && log.payload && (log.payload as any).meditation_excerpt) {
                        return <div className="text-xs text-zinc-700 mt-1">{String((log.payload as any).meditation_excerpt)}</div>;
                      } else if (log.activity_type === "prayer" && log.payload && (log.payload as any).audio_url) {
                        return <audio controls className="w-full mt-1" src={String((log.payload as any).audio_url)} preload="none" />;
                      } else if (log.activity_type === "reading" && log.payload && (log.payload as any).book_name) {
                        return <div className="text-xs text-zinc-700 mt-1">{String((log.payload as any).book_name)} {String((log.payload as any).chapter)}장</div>;
                      } else {
                        return null;
                      }
                    })()}
                  </div>
                  <button
                    className="ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-white hover:bg-zinc-100 flex items-center justify-center"
                    onClick={() => setLocation(getMenuDateUrl(log))}
                    aria-label="해당 기록 화면으로 이동"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              );
            })
          )}
          {menuLogs.length === 0 && (
            <div className="bg-white rounded-none border border-zinc-100 px-4 py-8 text-sm text-zinc-500 text-center">
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
