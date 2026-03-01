import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  ImagePlus,
  LayoutGrid,
  LayoutList,
  Link2,
  Lock,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Plus,
  SendHorizontal,
  Settings,
  Shield,
  Square,
  Trash2,
  UserPlus,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Loader2, CalendarX, CalendarPlus, User, Heart, Pencil, MoreVertical } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isBefore, isAfter, startOfDay, addMinutes, addWeeks, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "../lib/supabase";
import Cropper from "react-easy-crop";
import getCroppedImg from "../lib/cropImage";

type GroupRole = "owner" | "leader" | "member" | "guest";
type TabKey = "faith" | "prayer" | "social" | "members" | "admin" | "schedule";
type FaithType = "check" | "count" | "attendance";
type FaithSourceMode = "manual" | "linked" | "both";
type LinkedFeature = "none" | "qt" | "prayer" | "reading";
type ActivityType = "qt" | "prayer" | "reading" | "bookmark";

interface GroupSchedule {
  id: string;
  group_id: string;
  user_id: string;
  type: "event" | "unavailable";
  title: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
}

type GroupRow = {
  id: string;
  name: string;
  group_slug: string | null;
  description: string | null;
  owner_id: string | null;
  group_type?: string | null;
  password?: string | null;
  group_image?: string | null;
  header_image_url?: string | null;
  header_color?: string | null;
  is_closed?: boolean | null;
  created_at?: string;
  menu_settings?: { faith?: boolean; prayer?: boolean; social?: boolean; schedule?: boolean; };
};

type GroupPrayerRecord = {
  id: number;
  group_id: string;
  user_id: string;
  source_type: "direct" | "linked";
  source_prayer_record_id: number | null;
  title: string | null;
  audio_url: string;
  audio_duration: number;
  created_at: string;
};

type PersonalPrayerRecord = {
  id: number;
  title: string | null;
  audio_url: string;
  audio_duration: number;
  created_at: string;
};

type ProfileLite = {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

type GroupMemberRow = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  profile?: ProfileLite;
};

type GroupJoinRequest = {
  id: string;
  group_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile?: ProfileLite;
};

type GroupPostRow = {
  id: number;
  group_id: string;
  author_id: string;
  post_type: "post" | "notice";
  title: string | null;
  content: string;
  created_at: string;
  image_urls?: string[];
};

type GroupPostImageRow = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
};

type GroupPrayerTopic = {
  id: number;
  group_id: string;
  author_id: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

type FaithItemRow = {
  id: string;
  name: string;
  item_type: FaithType;
  source_mode: FaithSourceMode;
  linked_feature: LinkedFeature;
  sort_order: number;
};

type ActivityGroupLink = {
  group_id: string;
};

type ActivityLogRow = {
  id: number;
  activity_type: ActivityType;
  source_kind: "personal" | "group_direct";
  source_table: string;
  source_row_id: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
  activity_group_links?: ActivityGroupLink[];
};

type FaithBoardRow = {
  user_id: string;
  name: string;
  role: string;
  values: Record<string, number>;
  total: number;
};

type FaithRecordDetail = {
  item_id: string;
  source_type: "manual" | "linked";
  source_event_type: string | null;
  source_event_id: string | null;
  note: string | null;
  payload: Record<string, unknown> | null;
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}. ${hours}:${minutes}`;
}

function formatJoinedAt(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}. ${hh}:${min}`;
}

function toLabel(role: string) {
  if (role === "owner") return "관리자";
  if (role === "leader") return "리더";
  if (role === "member") return "일반";
  return role;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadToR2(fileName: string, blob: Blob): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const response = await fetch("/api/audio/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, audioBase64 }),
  });

  if (!response.ok) throw new Error("failed to upload audio");
  const data = await response.json();
  return data.publicUrl as string;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureHttpsUrl(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

async function resizeImageFile(file: File, maxSize = 1280, quality = 0.84): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * ratio));
  const targetH = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg"), { type: "image/jpeg" });
}

function getHashQueryParams() {
  const hash = window.location.hash || "";
  const queryIdx = hash.indexOf("?");
  if (queryIdx < 0) return new URLSearchParams();
  return new URLSearchParams(hash.substring(queryIdx + 1));
}

function getTabQueryParam(pathWithQuery?: string) {
  const fromHash = getHashQueryParams().get("tab");
  if (fromHash) return fromHash;

  const fromSearch = new URLSearchParams(window.location.search).get("tab");
  if (fromSearch) return fromSearch;

  const source = String(pathWithQuery || "");
  const queryIdx = source.indexOf("?");
  if (queryIdx >= 0) {
    const fromPathQuery = new URLSearchParams(source.substring(queryIdx + 1)).get("tab");
    if (fromPathQuery) return fromPathQuery;
  }

  return null;
}

async function uploadFileToR2(fileName: string, blob: Blob, contentType: string): Promise<string> {
  const fileBase64 = await blobToBase64(blob);
  const response = await fetch("/api/file/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileBase64, contentType }),
  });

  if (!response.ok) throw new Error("failed to upload file");
  const data = await response.json();
  if (!data?.success || !data?.publicUrl) {
    throw new Error(data?.error || "failed to upload file");
  }
  return data.publicUrl as string;
}

const LAST_GROUP_KEY = "last_group_id";
const GROUP_INVITE_PARAM = "invite_group";
const HEADER_PALETTE = ["#4A6741", "#1F4E5F", "#7C3A2D", "#3E335A", "#2F4858", "#5C4A3D", "#4B3F72", "#374151"];
const KOREAN_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절", "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일", "2026-06-06": "현충일", "2026-08-15": "광복절", "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일", "2026-10-09": "한글날", "2026-12-25": "성탄절",
  "2027-01-01": "신정", "2027-02-06": "설날 연휴", "2027-02-07": "설날", "2027-02-08": "설날 연휴", "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절", "2027-05-05": "어린이날", "2027-05-13": "부처님오신날", "2027-06-06": "현충일", "2027-06-07": "대체공휴일",
  "2027-08-15": "광복절", "2027-08-16": "대체공휴일", "2027-09-14": "추석 연휴", "2027-09-15": "추석", "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절", "2027-10-04": "대체공휴일", "2027-10-09": "한글날", "2027-10-11": "대체공휴일", "2027-12-25": "성탄절"
};

function GroupScheduleTab({ groupId, user, isManager }: { groupId: string, user: any, isManager: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [schedules, setSchedules] = useState<GroupSchedule[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);


  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState<"event" | "unavailable">("event");
  const [listType, setListType] = useState<"event" | "unavailable">("event");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStartTime, setFormStartTime] = useState("12:00");
  const [formEndTime, setFormEndTime] = useState("13:00");
  const [saving, setSaving] = useState(false);

  const [selectedDateEvents, setSelectedDateEvents] = useState<{ dateStr: string, events: GroupSchedule[] } | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const { data } = await supabase
      .from("group_schedules")
      .select("*, user:profiles(nickname, username)")
      .eq("group_id", groupId)
      .gte("end_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());
    if (data) setSchedules(data);

    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth, groupId]);

  const saveSchedule = async () => {
    if (!formDate || !formStartTime) return;
    if (formType === "event" && !formTitle.trim()) {
      alert("모임 일정 제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    const startStr = `${formDate}T${formStartTime}:00`;
    const endStr = formEndTime ? `${formDate}T${formEndTime}:00` : startStr;

    // basic validation
    if (new Date(endStr) < new Date(startStr)) {
      alert("종료 시간이 시작 시간보다 작을 수 없습니다.");
      setSaving(false); return;
    }

    const { error } = await supabase.from("group_schedules").insert({
      group_id: groupId,
      user_id: user.id,
      type: formType,
      title: formType === "event" ? formTitle.trim() : null,
      start_time: new Date(startStr).toISOString(),
      end_time: new Date(endStr).toISOString(),
    });

    if (error) {
      alert("일정 등록에 실패했습니다.");
    } else {
      setShowModal(false);
      fetchSchedules();
    }
    setSaving(false);
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("group_schedules").delete().eq("id", id);
    if (!error) {
      fetchSchedules();
      setSelectedDateEvents(prev => prev ? { ...prev, events: prev.events.filter(e => e.id !== id) } : null);
    }
  };

  const daysInMonth = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) });

  const currentList = schedules.filter(s => s.type === listType).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">
      <div className="flex items-center justify-between text-zinc-900 bg-transparent p-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronLeft /></button>
        <span className="font-black text-[22px] tracking-tight">{format(currentMonth, "yyyy년 M월")}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronRight /></button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
        <div className="flex border-b border-zinc-100 mb-4">
          <button onClick={() => setListType("event")} className={`flex-1 pb-3 text-[14px] font-black transition-colors border-b-2 ${listType === "event" ? "border-[#4A6741] text-[#4A6741]" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>모임 일정</button>
          <button onClick={() => setListType("unavailable")} className={`flex-1 pb-3 text-[14px] font-black transition-colors border-b-2 ${listType === "unavailable" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>모임 불가</button>
        </div>
        {currentList.length === 0 ? (
          <div className="text-zinc-400 text-center py-8 text-sm font-bold bg-zinc-50 rounded-xl">등록된 내용이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {currentList.map(ev => {
              return (
                <div key={ev.id} className="flex gap-3 text-sm items-center bg-zinc-50 p-3 rounded-xl border border-zinc-100 relative pr-4 block">
                  <div className={`w-1.5 h-full min-h-[2rem] rounded-full ${ev.type === "event" ? "bg-[#4A6741]" : "bg-rose-500"}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-900 truncate">
                      {ev.type === "event" ? ev.title : `${(ev as any).user?.nickname || "멤버"} 불가`}
                    </div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      {format(parseISO(ev.start_time), "M월 d일 HH:mm")} ~ {format(parseISO(ev.end_time), "HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-zinc-900 text-base">일정 달력</h3>
          <div className="flex gap-2 text-xs font-bold items-center">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4A6741]"></span>모임</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>불가</span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-t border-l border-zinc-200 text-center text-xs font-bold text-zinc-400 mt-4 bg-zinc-50">
          <div className="border-r border-b border-zinc-200 py-2 text-rose-500">일</div>
          <div className="border-r border-b border-zinc-200 py-2">월</div>
          <div className="border-r border-b border-zinc-200 py-2">화</div>
          <div className="border-r border-b border-zinc-200 py-2">수</div>
          <div className="border-r border-b border-zinc-200 py-2">목</div>
          <div className="border-r border-b border-zinc-200 py-2">금</div>
          <div className="border-r border-b border-zinc-200 py-2 text-blue-500">토</div>
        </div>
        <div className="grid grid-cols-7 flex-1 border-l border-zinc-200">
          {daysInMonth.map(day => {
            const isCurMonth = isSameMonth(day, currentMonth);
            const dateStr = format(day, "yyyy-MM-dd");
            const holidayName = KOREAN_HOLIDAYS[dateStr];
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;
            const isRedDay = isSunday || holidayName;

            const daySchedules = schedules.filter(s => isSameDay(parseISO(s.start_time), day)).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            return (
              <div key={day.toISOString()} className={`relative border-r border-b border-zinc-200 px-0.5 py-1 min-h-[70px] ${!isCurMonth ? "bg-zinc-50/50" : isSameDay(day, new Date()) ? "bg-zinc-100/80" : "bg-white"} flex flex-col items-center justify-start cursor-pointer hover:bg-zinc-50 transition-colors`} onClick={() => setSelectedDateEvents({ dateStr, events: daySchedules })}>
                <div className="flex flex-col items-center mb-1 w-full mt-0.5">
                  <span className={`text-[10px] sm:text-[11px] font-bold ${!isCurMonth ? "text-zinc-300" : isRedDay ? "text-rose-500" : isSaturday ? "text-blue-500" : "text-zinc-800"}`}>
                    {format(day, "d")}
                  </span>
                  {holidayName && <span className="text-[8px] leading-[1] text-rose-500 font-bold max-w-full truncate px-0.5 mt-0.5" style={{ transform: "scale(0.95)" }}>{holidayName}</span>}
                </div>
                <div className="flex flex-col gap-[2px] w-full px-[1px]">
                  {daySchedules.filter(s => s.type === "event").slice(0, 2).map((s, idx) => (
                    <div key={`e-${idx}`} className="w-full bg-[#4A6741] text-[10px] text-white overflow-hidden text-center px-0.5 rounded-[3px] leading-tight font-black shadow-sm h-4 flex items-center justify-center">
                      <span className="scale-[0.9]">모임</span>
                    </div>
                  ))}
                  {daySchedules.filter(s => s.type === "unavailable").slice(0, 3).map((s, idx) => (
                    <div key={`u-${idx}`} className="w-full bg-rose-500 text-[10px] text-white overflow-hidden text-center truncate px-0.5 rounded-[3px] leading-tight font-black shadow-sm h-4 flex items-center justify-center">
                      <span className="scale-[0.9]">{(s as any).user?.nickname || "멤버"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed right-5 bottom-24 z-[90] flex flex-col gap-3">
        <button onClick={() => { setFormType("unavailable"); setShowModal(true); setFormTitle(""); }} className="w-14 h-14 rounded-full bg-rose-500 text-white shadow-2xl flex items-center justify-center hover:bg-rose-600 transition-colors" aria-label="불가능 일정 등록">
          <CalendarX size={24} />
        </button>
        <button onClick={() => { setFormType("event"); setShowModal(true); setFormTitle(""); }} className="w-14 h-14 rounded-full bg-[#4A6741] opacity-90 text-white shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors" aria-label="모임일정 등록">
          <CalendarPlus size={24} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl animate-in slide-in-from-bottom-5 mt-auto sm:mt-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-zinc-900">{formType === "event" ? "모임일정 등록" : "불가능한 시간 등록"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-800"><X size={16} /></button>
            </div>

            <div className="space-y-4">
              {formType === "event" && (
                <div>
                  <label className="text-sm font-bold text-zinc-700 ml-1 mb-1.5 block">일정 제목</label>
                  <input className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20" placeholder="예: 첫 정기 모임" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                </div>
              )}
              <div>
                <label className="text-sm font-bold text-zinc-700 ml-1 mb-1.5 block">날짜</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-bold text-zinc-700 ml-1 mb-1.5 block">시작 시간</label>
                  <input type="time" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold text-zinc-700 ml-1 mb-1.5 block">종료 시간</label>
                  <input type="time" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
                </div>
              </div>

              <div className="pt-2">
                <button disabled={saving} onClick={saveSchedule} className={`w-full py-4 text-white font-black text-base shadow-lg rounded-2xl mt-2 active:scale-95 transition-transform disabled:opacity-60 ${formType === "event" ? "bg-[#4A6741]" : "bg-rose-500"}`}>
                  {saving ? "저장 중..." : "등록하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDateEvents && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDateEvents(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl space-y-4 animate-in slide-in-from-bottom-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-2 border-b">
              <h3 className="font-black text-xl text-zinc-900">{format(parseISO(selectedDateEvents.dateStr), "M월 d일")} 일정</h3>
              <button onClick={() => setSelectedDateEvents(null)} className="w-8 h-8 shrink-0 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"><X size={16} /></button>
            </div>

            <div className="flex gap-2 pb-2">
              <button
                onClick={() => { setFormType("event"); setFormDate(selectedDateEvents.dateStr); setSelectedDateEvents(null); setShowModal(true); setFormTitle(""); }}
                className="flex-1 py-3 bg-[#4A6741] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#3d5535] transition-colors"
              >
                모임 등록
              </button>
              <button
                onClick={() => { setFormType("unavailable"); setFormDate(selectedDateEvents.dateStr); setSelectedDateEvents(null); setShowModal(true); setFormTitle(""); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-600 transition-colors"
              >
                모임 불가 등록
              </button>
            </div>

            <div className="space-y-4">
              {selectedDateEvents.events.length === 0 && (
                <div className="text-center text-zinc-400 font-bold py-4">등록된 일정이 없습니다.</div>
              )}
              {selectedDateEvents.events.map((ev) => (
                <div key={ev.id} className="space-y-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                  <h4 className="font-bold text-zinc-900 border-b pb-2 mb-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${ev.type === "event" ? "bg-[#4A6741]" : "bg-rose-400"}`}></span>
                    {ev.type === "event" ? ev.title : `${(ev as any).user?.nickname || "멤버"} 불가`}
                  </h4>
                  <div className="text-base text-zinc-800 font-bold flex justify-between">
                    <span className="text-sm text-zinc-400">시작</span>
                    {format(parseISO(ev.start_time), "MM월 dd일 HH:mm")}
                  </div>
                  <div className="text-base text-zinc-800 font-bold flex justify-between">
                    <span className="text-sm text-zinc-400">종료</span>
                    {format(parseISO(ev.end_time), "MM월 dd일 HH:mm")}
                  </div>
                  {(isManager || user?.id === ev.user_id) && (
                    <div className="pt-2 mt-2 border-t border-zinc-200">
                      <button onClick={() => deleteSchedule(ev.id)} className="w-full bg-rose-50 text-rose-500 py-3 rounded-xl font-bold text-base hover:bg-rose-100 transition-colors">이 일정 삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const PostImageCarousel = ({ urls, onImageClick }: { urls: string[]; onImageClick: (index: number) => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const MathIndex = Math.round(scrollLeft / width);
    if (MathIndex !== activeIndex) {
      setActiveIndex(MathIndex);
    }
  };

  if (!urls || urls.length === 0) return null;

  return (
    <div className="w-full mt-3 mb-1 flex flex-col relative px-4">
      <div
        onScroll={handleScroll}
        className="w-full flex overflow-x-auto touch-pan-x snap-x snap-mandatory items-center pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {urls.map((url, idx) => (
          <div key={idx} className="flex-shrink-0 w-full snap-center flex justify-center cursor-pointer px-1" onClick={() => onImageClick(idx)}>
            <img src={url} alt={`img-${idx}`} className="w-full h-auto max-h-[400px] object-cover sm:object-contain rounded-2xl shadow-sm border border-black/5" />
          </div>
        ))}
      </div>
      {urls.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-1">
          {urls.map((_, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === activeIndex ? "bg-[#4A6741]" : "bg-zinc-200"}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function GroupDashboard() {
  const [matched, routeParams] = useRoute("/group/:id");
  const routeIdRaw = matched ? (routeParams as { id: string }).id : null;
  const groupId = routeIdRaw?.split("?")[0] || null;
  const urlTabMatch = routeIdRaw?.match(/\?tab=([^&]+)/);
  const initialTab = urlTabMatch ? urlTabMatch[1] : null;
  const [location, setLocation] = useLocation();

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [role, setRole] = useState<GroupRole>("guest");
  const [activeTab, setActiveTab] = useState<TabKey>((initialTab as TabKey) || "faith");
  const [loading, setLoading] = useState(true);

  const [groupPrayers, setGroupPrayers] = useState<GroupPrayerRecord[]>([]);
  const [groupPrayerTopics, setGroupPrayerTopics] = useState<GroupPrayerTopic[]>([]);
  const [personalPrayers, setPersonalPrayers] = useState<PersonalPrayerRecord[]>([]);
  const [showPrayerLinkModal, setShowPrayerLinkModal] = useState(false);
  const [showPrayerComposer, setShowPrayerComposer] = useState(false);
  const [showPrayerTopicModal, setShowPrayerTopicModal] = useState(false);
  const [newPrayerTopic, setNewPrayerTopic] = useState("");

  const [recordTitle, setRecordTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordPreviewUrl, setRecordPreviewUrl] = useState<string | null>(null);
  const [savingPrayer, setSavingPrayer] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [faithItems, setFaithItems] = useState<FaithItemRow[]>([]);
  const [faithValues, setFaithValues] = useState<Record<string, number>>({});
  const [newFaithName, setNewFaithName] = useState("");
  const [newFaithType, setNewFaithType] = useState<FaithType>("check");
  const [newFaithSourceMode, setNewFaithSourceMode] = useState<FaithSourceMode>("manual");
  const [newFaithLinkedFeature, setNewFaithLinkedFeature] = useState<LinkedFeature>("none");
  const [showFaithLinkModal, setShowFaithLinkModal] = useState(false);
  const [selectedFaithItem, setSelectedFaithItem] = useState<FaithItemRow | null>(null);
  const [availableActivities, setAvailableActivities] = useState<ActivityLogRow[]>([]);
  const [linkingActivityId, setLinkingActivityId] = useState<number | null>(null);
  const [faithRecordDetails, setFaithRecordDetails] = useState<Record<string, FaithRecordDetail>>({});
  const [faithCurrentDate, setFaithCurrentDate] = useState(() => new Date());
  const [faithBoardRows, setFaithBoardRows] = useState<FaithBoardRow[]>([]);
  const [faithBoardLoading, setFaithBoardLoading] = useState(false);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<Record<string, Record<string, number>>>({});

  const [posts, setPosts] = useState<GroupPostRow[]>([]);
  const [postType, setPostType] = useState<"post" | "notice">("post");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [socialViewMode, setSocialViewMode] = useState<"board" | "blog">("board");
  const [showPostComposerModal, setShowPostComposerModal] = useState(false);
  const [editingPost, setEditingPost] = useState<GroupPostRow | null>(null);
  const [postImageFiles, setPostImageFiles] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const [postExistingImages, setPostExistingImages] = useState<string[]>([]);
  const [authorMap, setAuthorMap] = useState<Record<string, ProfileLite>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);

  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);

  const [joinPassword, setJoinPassword] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [guestJoinPending, setGuestJoinPending] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [scopeLeaderUserId, setScopeLeaderUserId] = useState("");
  const [closingGroup, setClosingGroup] = useState(false);
  const [childGroupCode, setChildGroupCode] = useState("");
  const [linkingChildGroup, setLinkingChildGroup] = useState(false);

  const [showHeaderEditModal, setShowHeaderEditModal] = useState(false);
  const [headerImageDraft, setHeaderImageDraft] = useState("");
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImageUploading, setHeaderImageUploading] = useState(false);
  const [headerColorDraft, setHeaderColorDraft] = useState("#4A6741");
  // Removed dynamic header/tab pinning logic

  const [groupEditName, setGroupEditName] = useState("");
  const [groupEditSlug, setGroupEditSlug] = useState("");
  const [groupEditDescription, setGroupEditDescription] = useState("");
  const [groupEditType, setGroupEditType] = useState("etc");
  const [groupEditPassword, setGroupEditPassword] = useState("");
  const [groupEditImageFile, setGroupEditImageFile] = useState<File | null>(null);
  const [groupEditImageUploading, setGroupEditImageUploading] = useState(false);
  const [groupEditSaving, setGroupEditSaving] = useState(false);
  const [slugCheckState, setSlugCheckState] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const [adminTab, setAdminTab] = useState<"info" | "menu" | "manage">("info");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleGroupImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setCropModalOpen(true);
      // 부모 input 리셋용
      e.target.value = '';
    }
  };

  const processCrop = async () => {
    try {
      if (!cropImageSrc || !croppedAreaPixels) return;
      const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (croppedFile) {
        setGroupEditImageFile(croppedFile);
      }
    } catch (e) {
      console.error(e);
    }
    setCropModalOpen(false);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ? { id: data.user.id } : null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!groupId) return;
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const queryTab = searchParams.get("tab");
    const validTabs: TabKey[] = ["faith", "prayer", "social", "members", "admin", "schedule"];
    if (queryTab && validTabs.includes(queryTab as TabKey)) {
      setActiveTab(queryTab as TabKey);
    } else {
      setActiveTab("faith");
    }
    void loadAll(groupId, user?.id ?? null);
  }, [groupId, user?.id, location, authReady]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!recordedBlob) {
      setRecordPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(recordedBlob);
    setRecordPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  useEffect(() => {
    const urls = postImageFiles.map((file) => URL.createObjectURL(file));
    setPostImagePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [postImageFiles]);

  useEffect(() => {
    if (!group?.id) return;
    localStorage.setItem(LAST_GROUP_KEY, group.id);
    setHeaderColorDraft(group.header_color || "#4A6741");
    setHeaderImageDraft(ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image) || "");
  }, [group?.id, group?.header_color, group?.header_image_url, group?.group_image]);

  useEffect(() => {
    if (!group) return;
    setGroupEditName(group.name || "");
    setGroupEditSlug(group.group_slug || "");
    setGroupEditDescription(group.description || "");
    setGroupEditType(group.group_type || "etc");
  }, [group?.id, group?.name, group?.group_slug, group?.description, group?.group_type]);

  // Removed dynamic header/tab pinning effect

  const isManager = role === "owner" || role === "leader";

  const loadAll = async (targetGroupId: string, userId: string | null) => {
    setLoading(true);

    const { data: groupData, error: groupErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", targetGroupId)
      .maybeSingle();

    if (groupErr || !groupData) {
      setLoading(false);
      setLocation("/community?list=1");
      return;
    }

    setGroup({
      id: groupData.id,
      name: groupData.name,
      group_slug: groupData.group_slug ?? null,
      description: groupData.description ?? null,
      owner_id: groupData.owner_id ?? null,
      group_type: (groupData as any).group_type ?? "etc",
      password: (groupData as any).password ?? null,
      menu_settings: (groupData as any).menu_settings ?? { faith: true, prayer: true, social: true, schedule: true },
      group_image: ensureHttpsUrl((groupData as any).group_image) ?? null,
      header_image_url: ensureHttpsUrl((groupData as any).header_image_url) ?? null,
      header_color: (groupData as any).header_color ?? "#4A6741",
      is_closed: Boolean((groupData as any).is_closed),
      created_at: (groupData as any).created_at,
    });

    let nextRole: GroupRole = "guest";
    if (userId && groupData.owner_id === userId) {
      nextRole = "owner";
    } else if (userId) {
      const { data: memberData } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", targetGroupId)
        .eq("user_id", userId)
        .maybeSingle();
      if (memberData?.role) nextRole = memberData.role as GroupRole;
    }

    setRole(nextRole);

    if (nextRole === "guest") {
      if (userId) {
        const { data: pending } = await supabase
          .from("group_join_requests")
          .select("id")
          .eq("group_id", targetGroupId)
          .eq("user_id", userId)
          .eq("status", "pending")
          .maybeSingle();
        setGuestJoinPending(Boolean(pending));
      } else {
        setGuestJoinPending(false);
      }

      setGroupPrayers([]);
      setGroupPrayerTopics([]);
      setPersonalPrayers([]);
      setFaithItems([]);
      setFaithValues({});
      setFaithBoardRows([]);
      setPosts([]);
      setFaithRecordDetails({});
      setAuthorMap({});
      setMembers([]);
      setJoinRequests([]);
      setLoading(false);
      return;
    }

    setGuestJoinPending(false);

    const [, , , , , nextMembers] = await Promise.all([
      loadGroupPrayerTopics(targetGroupId),
      loadGroupPrayers(targetGroupId),
      loadPersonalPrayers(userId!),
      loadFaith(targetGroupId, userId!),
      loadPosts(targetGroupId),
      loadMembers(targetGroupId, groupData.owner_id),
      loadJoinRequests(targetGroupId),
    ]);

    if (nextRole === "owner" || nextRole === "leader") {
      await loadFaithBoard(targetGroupId, buildWeekIso(new Date()), nextMembers);
    } else {
      setFaithBoardRows([]);
    }

    setLoading(false);
  };

  const loadGroupPrayerTopics = async (targetGroupId: string) => {
    const { data, error } = await supabase
      .from("group_prayer_topics")
      .select("id, group_id, author_id, content, is_active, created_at")
      .eq("group_id", targetGroupId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setGroupPrayerTopics([]);
      return;
    }

    const topics = (data ?? []) as GroupPrayerTopic[];
    setGroupPrayerTopics(topics);

    const authorIds = Array.from(new Set(topics.map((item) => item.author_id)));
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, nickname, avatar_url")
        .in("id", authorIds);

      if (profiles?.length) {
        setAuthorMap((prev) => {
          const next = { ...prev };
          profiles.forEach((profile: ProfileLite) => {
            next[profile.id] = profile;
          });
          return next;
        });
      }
    }
  };

  const loadGroupPrayers = async (targetGroupId: string) => {
    const { data } = await supabase
      .from("group_prayer_records")
      .select("id, group_id, user_id, source_type, source_prayer_record_id, title, audio_url, audio_duration, created_at")
      .eq("group_id", targetGroupId)
      .order("created_at", { ascending: false });

    setGroupPrayers((data ?? []) as GroupPrayerRecord[]);
  };

  const loadPersonalPrayers = async (userId: string) => {
    const { data } = await supabase
      .from("prayer_records")
      .select("id, title, audio_url, audio_duration, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    setPersonalPrayers((data ?? []) as PersonalPrayerRecord[]);
  };

  const loadFaith = async (targetGroupId: string, userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const [{ data: items }, { data: records }] = await Promise.all([
      supabase
        .from("group_faith_items")
        .select("id, name, item_type, source_mode, linked_feature, sort_order")
        .eq("group_id", targetGroupId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("group_faith_records")
        .select("item_id, value, note, source_type, source_event_type, source_event_id")
        .eq("group_id", targetGroupId)
        .eq("user_id", userId)
        .eq("record_date", today),
    ]);

    let currentItems = (items ?? []) as FaithItemRow[];
    // Ensure default items exist (성경, QT, 기도, 예배)
    const requiredItems = [
      { name: "성경", type: "check", mode: "both", feature: "reading" },
      { name: "QT", type: "check", mode: "both", feature: "qt" },
      { name: "기도", type: "check", mode: "both", feature: "prayer" },
      { name: "예배", type: "check", mode: "manual", feature: "none" }
    ];

    let needReload = false;
    for (const req of requiredItems) {
      if (!currentItems.find(i => i.name === req.name)) {
        await supabase.from("group_faith_items").insert({
          group_id: targetGroupId,
          name: req.name,
          item_type: req.type,
          source_mode: req.mode,
          linked_feature: req.feature,
          created_by: userId
        });
        needReload = true;
      }
    }

    if (needReload) {
      const { data: updatedItems } = await supabase
        .from("group_faith_items")
        .select("id, name, item_type, source_mode, linked_feature, sort_order")
        .eq("group_id", targetGroupId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      currentItems = (updatedItems ?? []) as FaithItemRow[];
    }
    setFaithItems(currentItems);

    const nextValues: Record<string, number> = {};
    const baseDetails: Record<string, FaithRecordDetail> = {};
    const linkedActivityIds: number[] = [];

    (records ?? []).forEach((record: {
      item_id: string;
      value: number | string;
      note?: string | null;
      source_type?: "manual" | "linked";
      source_event_type?: string | null;
      source_event_id?: string | null;
    }) => {
      nextValues[record.item_id] = Number(record.value ?? 0);
      baseDetails[record.item_id] = {
        item_id: record.item_id,
        source_type: (record.source_type ?? "manual") as "manual" | "linked",
        source_event_type: record.source_event_type ?? null,
        source_event_id: record.source_event_id ?? null,
        note: record.note ?? null,
        payload: null,
      };
      if (record.source_type === "linked" && record.source_event_id) {
        const parsed = Number(record.source_event_id);
        if (!Number.isNaN(parsed)) linkedActivityIds.push(parsed);
      }
    });
    setFaithValues(nextValues);

    if (!linkedActivityIds.length) {
      setFaithRecordDetails(baseDetails);
      return;
    }

    const { data: linkedLogs } = await supabase
      .from("activity_logs")
      .select("id, payload")
      .in("id", Array.from(new Set(linkedActivityIds)));

    const payloadMap = new Map<number, Record<string, unknown>>();
    (linkedLogs ?? []).forEach((row: { id: number; payload: Record<string, unknown> | null }) => {
      payloadMap.set(row.id, row.payload ?? {});
    });

    Object.keys(baseDetails).forEach((itemId) => {
      const detail = baseDetails[itemId];
      const eventId = Number(detail.source_event_id ?? "");
      if (!Number.isNaN(eventId) && payloadMap.has(eventId)) {
        detail.payload = payloadMap.get(eventId) ?? null;
      }
    });

    setFaithRecordDetails(baseDetails);
  };

  const buildWeekIso = (ref = new Date()) => {
    const start = startOfWeek(ref, { weekStartsOn: 0 });
    const end = endOfWeek(ref, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
  };

  const loadWeeklyFaithRecords = async (refDate = faithCurrentDate) => {
    if (!group?.id || !user) return;
    const dates = buildWeekIso(refDate);
    try {
      const { data } = await supabase
        .from("group_faith_records")
        .select("item_id, value, record_date")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .in("record_date", dates as string[]);

      const map: Record<string, Record<string, number>> = {};
      (data ?? []).forEach((row: any) => {
        const d = row.record_date;
        map[d] = map[d] ?? {};
        map[d][row.item_id] = Number(row.value ?? 0);
      });
      setWeekDates(dates);
      setWeeklyRecords(map);
    } catch (error) {
      setWeekDates(buildWeekIso(new Date()));
      setWeeklyRecords({});
    }
  };

  useEffect(() => {
    if (activeTab === "faith") {
      void loadWeeklyFaithRecords(faithCurrentDate);
      if (role === "owner" || role === "leader") {
        void loadFaithBoard(group?.id || "", buildWeekIso(faithCurrentDate), members);
      }
    }
  }, [group?.id, user?.id, faithCurrentDate, activeTab]);

  const handleFaithToggleForDate = async (item: FaithItemRow, dateIso: string) => {
    if (!group || !user) return;
    const current = (weeklyRecords[dateIso]?.[item.id] ?? 0) as number;
    const nextValue = current > 0 ? 0 : item.item_type === "count" ? current + 1 : 1;

    try {
      if (nextValue <= 0) {
        await supabase
          .from("group_faith_records")
          .delete()
          .eq("group_id", group.id)
          .eq("item_id", item.id)
          .eq("user_id", user.id)
          .eq("record_date", dateIso);
      } else {
        const { error } = await supabase.from("group_faith_records").upsert(
          {
            group_id: group.id,
            item_id: item.id,
            user_id: user.id,
            record_date: dateIso,
            value: nextValue,
            note: null,
            source_type: "manual",
            source_event_type: null,
            source_event_id: null,
          },
          { onConflict: "group_id,item_id,user_id,record_date" }
        );
        if (error) throw error;
      }
      await loadWeeklyFaithRecords();
      const todayIso = new Date().toISOString().split("T")[0];
      if (dateIso === todayIso) await loadFaith(group.id, user.id);
    } catch (error) {
      console.error("failed to toggle faith record:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const loadPosts = async (targetGroupId: string) => {
    const withTitle = await supabase
      .from("group_posts")
      .select("id, group_id, author_id, post_type, title, content, created_at")
      .eq("group_id", targetGroupId)
      .order("created_at", { ascending: false })
      .limit(100);

    let nextPosts = (withTitle.data ?? []) as GroupPostRow[];
    if (withTitle.error && withTitle.error.code === "42703") {
      const fallback = await supabase
        .from("group_posts")
        .select("id, group_id, author_id, post_type, content, created_at")
        .eq("group_id", targetGroupId)
        .order("created_at", { ascending: false })
        .limit(100);

      nextPosts = ((fallback.data ?? []) as Array<Omit<GroupPostRow, "title">>).map((row) => ({
        ...row,
        title: null,
      }));
    }

    const postIds = nextPosts.map((post) => post.id);
    if (postIds.length > 0) {
      const { data: imageRows, error: imageErr } = await supabase
        .from("group_post_images")
        .select("id, post_id, image_url, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (!imageErr) {
        const imageMap = new Map<number, string[]>();
        ((imageRows ?? []) as GroupPostImageRow[]).forEach((row) => {
          const prev = imageMap.get(row.post_id) ?? [];
          prev.push(row.image_url);
          imageMap.set(row.post_id, prev);
        });

        nextPosts = nextPosts.map((post) => ({
          ...post,
          image_urls: imageMap.get(post.id) ?? [],
        }));
      }
    }

    nextPosts = [...nextPosts].sort((a, b) => {
      if (a.post_type !== b.post_type) {
        return a.post_type === "notice" ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(nextPosts);

    const authorIds = Array.from(new Set(nextPosts.map((post) => post.author_id)));
    if (authorIds.length === 0) {
      setAuthorMap({});
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, nickname, avatar_url")
      .in("id", authorIds);

    const map: Record<string, ProfileLite> = {};
    (profiles ?? []).forEach((profile: ProfileLite) => {
      map[profile.id] = profile;
    });
    setAuthorMap((prev) => ({ ...prev, ...map }));
  };

  const loadMembers = async (targetGroupId: string, ownerId: string | null): Promise<GroupMemberRow[]> => {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_group_member_snapshot", {
      p_group_id: targetGroupId,
    });

    if (rpcError) {
      console.error("load members rpc failed:", rpcError);
      setMembers([]);
      return [];
    }

    const nextMembers: GroupMemberRow[] = ((rpcData ?? []) as Array<any>).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      role: String(row.role || (ownerId && String(row.user_id) === ownerId ? "owner" : "member")),
      joined_at: row.joined_at ?? null,
      profile: {
        id: String(row.user_id),
        username: row.username ?? null,
        nickname: row.nickname ?? null,
      },
    }));

    setMembers(nextMembers);
    return nextMembers;
  };

  const loadFaithBoard = async (
    targetGroupId: string,
    dates: string[],
    memberRows?: GroupMemberRow[]
  ) => {
    const baseMembers = memberRows ?? members;
    if (!baseMembers.length || !dates.length) {
      setFaithBoardRows([]);
      return;
    }

    setFaithBoardLoading(true);
    const memberIds = Array.from(new Set(baseMembers.map((member) => member.user_id)));

    const { data, error } = await supabase
      .from("group_faith_records")
      .select("user_id, item_id, value, record_date")
      .eq("group_id", targetGroupId)
      .in("record_date", dates)
      .in("user_id", memberIds);

    if (error) {
      console.error("failed to load faith board:", error);
      setFaithBoardRows([]);
      setFaithBoardLoading(false);
      return;
    }

    const valueMap = new Map<string, Record<string, number>>();
    (data ?? []).forEach((row: any) => {
      // row.value > 0 means done for this day
      if (Number(row.value) > 0) {
        const prev = valueMap.get(row.user_id) ?? {};
        prev[row.item_id] = (prev[row.item_id] || 0) + 1;
        valueMap.set(row.user_id, prev);
      }
    });

    const boardRows: FaithBoardRow[] = baseMembers
      .map((member) => {
        const values = valueMap.get(member.user_id) ?? {};
        const total = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
        let name = member.profile?.nickname || member.profile?.username || "이름없음";
        if (name.length > 4) name = name.substring(0, 4);

        return {
          user_id: member.user_id,
          role: member.role,
          name: name,
          values,
          total,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    setFaithBoardRows(boardRows);
    setFaithBoardLoading(false);
  };

  const loadJoinRequests = async (targetGroupId: string) => {
    const { data } = await supabase
      .from("group_join_requests")
      .select("id, group_id, user_id, message, status, created_at")
      .eq("group_id", targetGroupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const requests = (data ?? []) as GroupJoinRequest[];
    const requesterIds = Array.from(new Set(requests.map((req) => req.user_id)));

    if (requesterIds.length === 0) {
      setJoinRequests([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, nickname, avatar_url")
      .in("id", requesterIds);

    const profileMap = new Map<string, ProfileLite>();
    (profiles ?? []).forEach((profile: ProfileLite) => {
      profileMap.set(profile.id, profile);
    });

    setJoinRequests(
      requests.map((req) => ({
        ...req,
        profile: profileMap.get(req.user_id),
      }))
    );
  };

  const submitJoinRequest = async () => {
    if (!group || !user) return;
    // group에 비밀번호가 설정되어 있을 때만 비밀번호 검증
    if (group.password && !joinPassword.trim()) {
      alert("가입 비밀번호를 입력해주세요.");
      return;
    }

    setJoinSubmitting(true);
    try {
      const { error } = await supabase.rpc("create_group_join_request_with_password", {
        p_group_id: group.id,
        p_join_password: joinPassword.trim(),
        p_message: joinMessage.trim() || null,
      });

      if (error) {
        if (error.code === "42883") {
          alert("가입 신청 기능을 사용하려면 최신 DB 마이그레이션 적용이 필요합니다.");
          return;
        }
        alert(error.message || "가입 신청에 실패했습니다.");
        return;
      }

      setJoinPassword("");
      setJoinMessage("");
      setGuestJoinPending(true);
      alert("가입 신청이 접수되었습니다.");
      setLocation(`/community?pending_group=${group.id}`);
    } finally {
      setJoinSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType ?? "audio/webm",
        });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (error) {
      console.error(error);
      alert("마이크 권한이 필요합니다.");
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.pause();
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || !isPaused) return;
    mediaRecorderRef.current.resume();
    setIsPaused(false);
    timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
  };

  const saveDirectPrayer = async () => {
    if (!group || !user || !recordedBlob) return;
    setSavingPrayer(true);

    try {
      const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
      const extension = recordedBlob.type.includes("mp4") ? "m4a" : "webm";
      const fileName = `audio/group-prayer/${group.id}/${user.id}/${kstDate}/group_prayer_${Date.now()}.${extension}`;
      const publicUrl = await uploadToR2(fileName, recordedBlob);

      const { error } = await supabase.from("group_prayer_records").insert({
        group_id: group.id,
        user_id: user.id,
        source_type: "direct",
        source_prayer_record_id: null,
        title: recordTitle.trim() || null,
        audio_url: publicUrl,
        audio_duration: recordingTime,
      });

      if (error) throw error;

      setRecordTitle("");
      setRecordedBlob(null);
      setRecordingTime(0);
      setShowPrayerComposer(false);
      await loadGroupPrayers(group.id);
    } catch (error) {
      console.error(error);
      alert("모임 기도 저장에 실패했습니다.");
    } finally {
      setSavingPrayer(false);
    }
  };

  const addPrayerTopic = async () => {
    if (!group || !user || !newPrayerTopic.trim()) return;

    const { error } = await supabase.from("group_prayer_topics").insert({
      group_id: group.id,
      author_id: user.id,
      content: newPrayerTopic.trim(),
      is_active: true,
    });

    if (error) {
      if (error.code === "42P01") {
        alert("기도제목 기능을 사용하려면 최신 DB 마이그레이션 적용이 필요합니다.");
        return;
      }
      alert("기도제목 등록에 실패했습니다.");
      return;
    }

    setNewPrayerTopic("");
    setShowPrayerTopicModal(false);
    await loadGroupPrayerTopics(group.id);
  };

  const linkPrayerToGroup = async (record: PersonalPrayerRecord) => {
    if (!group || !user) return;

    try {
      const { error } = await supabase.from("group_prayer_records").insert({
        group_id: group.id,
        user_id: user.id,
        source_type: "linked",
        source_prayer_record_id: record.id,
        title: record.title || null,
        audio_url: record.audio_url,
        audio_duration: record.audio_duration || 0,
      });

      if (error) {
        if (error.code === "23505") {
          alert("이미 이 모임에 연결된 기도 기록입니다.");
          return;
        }
        throw error;
      }

      await loadGroupPrayers(group.id);
    } catch (error) {
      console.error(error);
      alert("기도 연결에 실패했습니다.");
    }
  };

  const removeGroupPrayer = async (record: GroupPrayerRecord) => {
    if (!group || !user || !(isManager || record.user_id === user.id)) return;
    if (!confirm("이 기도 기록을 삭제할까요?")) return;

    const { error } = await supabase.from("group_prayer_records").delete().eq("id", record.id);
    if (error) {
      alert("삭제에 실패했습니다.");
      return;
    }

    if (record.source_type === "direct") {
      fetch("/api/audio/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: record.audio_url }),
      }).catch(() => undefined);
    }

    await loadGroupPrayers(group.id);
  };

  const addFaithItem = async () => {
    if (!group || !user || !isManager || !newFaithName.trim()) return;

    const payload = {
      group_id: group.id,
      name: newFaithName.trim(),
      item_type: newFaithType,
      source_mode: newFaithSourceMode,
      linked_feature:
        newFaithSourceMode === "manual" ? ("none" as const) : newFaithLinkedFeature,
      created_by: user.id,
    };

    const { error } = await supabase.from("group_faith_items").insert(payload);
    if (error) {
      alert("항목 추가에 실패했습니다.");
      return;
    }

    setNewFaithName("");
    setNewFaithType("check");
    setNewFaithSourceMode("manual");
    setNewFaithLinkedFeature("none");
    await loadFaith(group.id, user.id);
  };

  const removeFaithItem = async (itemId: string) => {
    if (!group || !user || !isManager) return;
    if (!confirm("이 항목을 삭제할까요?")) return;

    const { error } = await supabase.from("group_faith_items").delete().eq("id", itemId);
    if (error) {
      alert("삭제에 실패했습니다.");
      return;
    }
    await loadFaith(group.id, user.id);
  };

  const setFaithValue = async (
    item: FaithItemRow,
    nextValue: number,
    options?: {
      note?: string | null;
      sourceType?: "manual" | "linked";
      sourceEventType?: string | null;
      sourceEventId?: string | null;
    }
  ) => {
    if (!group || !user) return;

    const today = new Date().toISOString().split("T")[0];
    if (nextValue <= 0) {
      await supabase
        .from("group_faith_records")
        .delete()
        .eq("group_id", group.id)
        .eq("item_id", item.id)
        .eq("user_id", user.id)
        .eq("record_date", today);

      await loadFaith(group.id, user.id);
      return;
    }

    const { error } = await supabase.from("group_faith_records").upsert(
      {
        group_id: group.id,
        item_id: item.id,
        user_id: user.id,
        record_date: today,
        value: nextValue,
        note: options?.note ?? null,
        source_type: options?.sourceType ?? "manual",
        source_event_type: options?.sourceEventType ?? null,
        source_event_id: options?.sourceEventId ?? null,
      },
      { onConflict: "group_id,item_id,user_id,record_date" }
    );

    if (error) {
      alert("저장에 실패했습니다.");
      return;
    }
    await loadFaith(group.id, user.id);
  };

  const openFaithLinkModal = async (item: FaithItemRow) => {
    if (!group || !user) return;
    const linkedType = getLinkedFeatureForItem(item);
    if (linkedType === "none") {
      alert("이 항목은 연결 가능한 개인 활동이 없습니다.");
      return;
    }
    setSelectedFaithItem(item);
    setShowFaithLinkModal(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const { data, error } = await supabase
      .from("activity_logs")
      .select(
        "id, activity_type, source_kind, source_table, source_row_id, payload, occurred_at, activity_group_links(group_id)"
      )
      .eq("user_id", user.id)
      .eq("source_kind", "personal")
      .eq("activity_type", linkedType)
      .gte("occurred_at", todayStart.toISOString())
      .lt("occurred_at", tomorrowStart.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(150);

    if (error) {
      setAvailableActivities([]);
      return;
    }

    const rows = (data ?? []) as ActivityLogRow[];
    const available = rows.filter((row) => {
      const links = row.activity_group_links ?? [];
      return !links.some((link) => link.group_id === group.id);
    });
    setAvailableActivities(available);
  };

  const getActivityTitle = (activity: ActivityLogRow) => {
    const payload = activity.payload ?? {};

    if (activity.activity_type === "prayer") {
      const title = payload.title;
      return typeof title === "string" && title.trim() ? title : "기도 기록";
    }

    if (activity.activity_type === "qt") {
      const excerpt = payload.meditation_excerpt;
      if (typeof excerpt === "string" && excerpt.trim()) return excerpt;
      return "QT 기록";
    }

    if (activity.activity_type === "reading") {
      const book = payload.book_name;
      const chapter = payload.chapter;
      if (typeof book === "string" && (typeof chapter === "string" || typeof chapter === "number")) {
        return `${book} ${chapter}장`;
      }
      return "성경 읽기 기록";
    }

    return "기록";
  };

  const getTodayKoreanLabel = () =>
    new Date().toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });

  const getWeekKoreanLabel = (date: Date) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const week = Math.ceil((d.getDate() + firstDay) / 7);
    return `${year}년 ${month}월 ${week}주차`;
  };

  const getFaithItemByKeywords = (keywords: string[]) => {
    const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
    return (
      faithItems.find((item) => {
        const name = item.name.toLowerCase();
        return lowerKeywords.some((keyword) => name.includes(keyword));
      }) ?? null
    );
  };

  const getLinkedFeatureForItem = (item: FaithItemRow): LinkedFeature => {
    if (item.linked_feature !== "none") return item.linked_feature;
    const name = item.name.toLowerCase();
    if (name.includes("qt") || name.includes("묵상")) return "qt";
    if (name.includes("기도") || name.includes("prayer")) return "prayer";
    if (name.includes("성경") || name.includes("읽기") || name.includes("reading")) return "reading";
    return "none";
  };

  const faithItemSlots = [
    { key: "reading", label: "성경", item: getFaithItemByKeywords(["성경", "읽기", "reading"]) },
    { key: "qt", label: "QT", item: getFaithItemByKeywords(["qt", "묵상"]) },
    { key: "prayer", label: "기도", item: getFaithItemByKeywords(["기도", "prayer"]) },
    { key: "attendance", label: "예배", item: getFaithItemByKeywords(["예배", "출석", "attendance"]) },
  ] as const;

  const getLinkedFaithDetailText = (itemId: string) => {
    const detail = faithRecordDetails[itemId];
    if (!detail) return "";
    if (detail.note?.trim()) return detail.note.trim();

    const payload = detail.payload ?? {};
    if (detail.source_event_type === "prayer") {
      const title = payload.title;
      const duration = payload.audio_duration;
      const titleText = typeof title === "string" && title.trim() ? title.trim() : "기도 기록";
      if (typeof duration === "number" && duration > 0) return `${titleText} (${Math.floor(duration / 60)}분 ${duration % 60}초)`;
      return titleText;
    }

    if (detail.source_event_type === "reading") {
      const bookName = payload.book_name;
      const chapter = payload.chapter;
      const endChapter = payload.end_chapter;
      if (typeof bookName === "string" && (typeof chapter === "number" || typeof chapter === "string")) {
        if (typeof endChapter === "number" && endChapter !== Number(chapter)) {
          return `${bookName} ${chapter}~${endChapter}장`;
        }
        return `${bookName} ${chapter}장`;
      }
    }

    if (detail.source_event_type === "qt") {
      const excerpt = payload.meditation_excerpt;
      if (typeof excerpt === "string" && excerpt.trim()) return excerpt.trim();
      return "QT 기록 연결";
    }

    return "";
  };

  const handleFaithToggle = async (item: FaithItemRow) => {
    if (!group || !user) return;
    const currentValue = faithValues[item.id] ?? 0;
    if (currentValue > 0) {
      const shouldCancel = confirm("완료를 취소할까요?");
      if (!shouldCancel) return;
      await setFaithValue(item, 0);
      return;
    }

    const linkedType = getLinkedFeatureForItem(item);
    if (linkedType !== "none") {
      const shouldLink = confirm("개인 활동 기록을 오늘 내역으로 연결할까요?");
      if (shouldLink) {
        await openFaithLinkModal(item);
        return;
      }
    }

    if (linkedType === "none" && item.item_type === "attendance") {
      const worshipType = prompt("참석 예배를 입력하세요. (예: 주일낮, 주일저녁, 수요)", "주일낮");
      if (worshipType === null) return;
      await setFaithValue(item, 1, { note: worshipType.trim() || null });
      return;
    }

    await setFaithValue(item, 1);
  };

  const linkActivityToFaith = async (activity: ActivityLogRow) => {
    if (!group || !user || !selectedFaithItem) return;
    setLinkingActivityId(activity.id);

    try {
      const { error: linkError } = await supabase.from("activity_group_links").insert({
        activity_log_id: activity.id,
        group_id: group.id,
        linked_by: user.id,
      });

      if (linkError && linkError.code !== "23505") {
        throw linkError;
      }

      const currentValue = faithValues[selectedFaithItem.id] ?? 0;
      const nextValue = selectedFaithItem.item_type === "count" ? currentValue + 1 : 1;
      const noteText =
        activity.activity_type === "reading"
          ? (() => {
            const payload = activity.payload ?? {};
            const book = payload.book_name;
            const chapter = payload.chapter;
            const endChapter = payload.end_chapter;
            if (typeof book !== "string" || (typeof chapter !== "number" && typeof chapter !== "string")) {
              return null;
            }
            if (typeof endChapter === "number" && endChapter !== Number(chapter)) {
              return `${book} ${chapter}~${endChapter}장`;
            }
            return `${book} ${chapter}장`;
          })()
          : null;

      const { error: faithError } = await supabase.from("group_faith_records").upsert(
        {
          group_id: group.id,
          item_id: selectedFaithItem.id,
          user_id: user.id,
          record_date: new Date().toISOString().split("T")[0],
          value: nextValue,
          note: noteText,
          source_type: "linked",
          source_event_type: activity.activity_type,
          source_event_id: String(activity.id),
        },
        { onConflict: "group_id,item_id,user_id,record_date" }
      );

      if (faithError) throw faithError;

      await loadFaith(group.id, user.id);
      setAvailableActivities((prev) => prev.filter((row) => row.id !== activity.id));
      setShowFaithLinkModal(false);
    } catch (error) {
      console.error(error);
      alert("외부 활동 연결에 실패했습니다.");
    } finally {
      setLinkingActivityId(null);
    }
  };

  const handlePostImageSelect = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 10);
    setPostImageFiles((prev) => [...prev, ...selected].slice(0, 10));
  };

  const removePostImage = (index: number) => {
    setPostImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addPost = async () => {
    if (!group || !user || !postContent.trim()) return;
    if (postType === "notice" && !isManager) {
      alert("공지 작성은 리더/관리자만 가능합니다.");
      return;
    }

    const payload = {
      group_id: group.id,
      author_id: user.id,
      post_type: postType,
      title: postTitle.trim() || null,
      content: postContent.trim(),
    };

    if (editingPost) {
      const { error } = await supabase
        .from("group_posts")
        .update({ title: postTitle.trim() || null, content: postContent.trim() })
        .eq("id", editingPost.id);

      if (error) {
        alert("게시글 수정에 실패했습니다.");
        return;
      }

      await supabase.from("group_post_images").delete().eq("post_id", editingPost.id);

      try {
        let uploadedUrls: string[] = [];
        if (postImageFiles.length > 0) {
          uploadedUrls = await Promise.all(
            postImageFiles.map(async (file, index) => {
              const resized = await resizeImageFile(file, 1080, 0.82);
              const safeName = sanitizeFileName(resized.name || `image_${index + 1}.jpg`);
              const key = `images/group-posts/${group.id}/${user.id}/${Date.now()}_${index}_${safeName}`;
              return uploadFileToR2(key, resized, resized.type || "image/jpeg");
            })
          );
        }

        const finalUrls = [...postExistingImages, ...uploadedUrls];
        if (finalUrls.length > 0) {
          const { error: imageInsertError } = await supabase.from("group_post_images").insert(
            finalUrls.map((url, index) => ({
              post_id: editingPost.id,
              uploader_id: user.id,
              image_url: url,
              sort_order: index,
            }))
          );
          if (imageInsertError) throw imageInsertError;
        }
      } catch (uploadError) {
        console.error("post image upload error:", uploadError);
        alert(`사진 업로드/저장에 실패했습니다.`);
      }

      setPostTitle("");
      setPostContent("");
      setPostImageFiles([]);
      setPostImagePreviews([]);
      setPostExistingImages([]);
      setShowPostComposerModal(false);
      setEditingPost(null);
      await loadPosts(group.id);
      return;
    }

    let createdPostId: number | null = null;
    let { data: createdPost, error } = await supabase
      .from("group_posts")
      .insert(payload)
      .select("id")
      .single();

    if (!error) {
      createdPostId = createdPost?.id ?? null;
    }

    if (error && error.code === "42703") {
      const merged = postTitle.trim()
        ? `[${postTitle.trim()}]\n${postContent.trim()}`
        : postContent.trim();
      const fallback = await supabase
        .from("group_posts")
        .insert({
          group_id: group.id,
          author_id: user.id,
          post_type: postType,
          content: merged,
        })
        .select("id")
        .single();
      error = fallback.error;
      createdPostId = fallback.data?.id ?? null;
    }

    if (error) {
      alert("게시글 등록에 실패했습니다.");
      return;
    }

    if (createdPostId && postImageFiles.length > 0) {
      try {
        const uploadedUrls = await Promise.all(
          postImageFiles.map(async (file, index) => {
            const resized = await resizeImageFile(file, 1080, 0.82);
            const safeName = sanitizeFileName(resized.name || `image_${index + 1}.jpg`);
            const key = `images/group-posts/${group.id}/${user.id}/${Date.now()}_${index}_${safeName}`;
            return uploadFileToR2(key, resized, resized.type || "image/jpeg");
          })
        );

        const { error: imageInsertError } = await supabase.from("group_post_images").insert(
          uploadedUrls.map((url, index) => ({
            post_id: createdPostId,
            uploader_id: user.id,
            image_url: url,
            sort_order: index,
          }))
        );

        if (imageInsertError) throw imageInsertError;
      } catch (uploadError) {
        console.error("post image upload error:", uploadError);
        const message = uploadError instanceof Error ? uploadError.message : "알 수 없는 오류";
        alert(`사진 업로드/저장에 실패했습니다: ${message}`);
      }
    }

    setPostType("post");
    setPostTitle("");
    setPostContent("");
    setPostImageFiles([]);
    setPostExistingImages([]);
    setShowPostComposerModal(false);
    await loadPosts(group.id);
  };

  const removePost = async (post: GroupPostRow) => {
    if (!group || !user) return;
    if (!(isManager || post.author_id === user.id)) return;
    if (!confirm("이 게시글을 삭제할까요?")) return;

    const { error } = await supabase.from("group_posts").delete().eq("id", post.id);
    if (error) {
      alert("삭제에 실패했습니다.");
      return;
    }
    await loadPosts(group.id);
  };

  const changeMemberRole = async (targetUserId: string, nextRole: "leader" | "member") => {
    if (!group || !user || role !== "owner" || targetUserId === group.owner_id) return;

    const { error } = await supabase.rpc("update_group_member_role", {
      p_group_id: group.id,
      p_target_user_id: targetUserId,
      p_next_role: nextRole,
    });

    if (error) {
      alert("권한 변경에 실패했습니다.");
      return;
    }
    await loadMembers(group.id, group.owner_id);
    alert(nextRole === "leader" ? "리더로 변경했습니다." : "일반멤버로 변경했습니다.");
  };

  const removeMember = async (targetUserId: string) => {
    if (!group || !isManager || targetUserId === group.owner_id) return;
    if (!confirm("이 멤버를 모임에서 강퇴할까요?")) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", targetUserId);

    if (error) {
      alert("강퇴에 실패했습니다.");
      return;
    }
    await loadMembers(group.id, group.owner_id);
  };

  const resolveJoinRequest = async (requestId: string, approve: boolean) => {
    if (!group || !isManager || !user) return;

    const { error } = await supabase.rpc("resolve_group_join_request", {
      p_approve: approve,
      p_request_id: requestId,
    });

    if (error) {
      console.error("resolve_join_request failed:", error);
      if (error.code === "23505") {
        await loadAll(group.id, user.id);
        alert("이미 처리된 가입 요청입니다. 목록을 갱신했습니다.");
        return;
      }
      if ((error.code === "P0001" || error.code === "PGRST116") && String(error.message || "").includes("pending request not found")) {
        await loadAll(group.id, user.id);
        alert("이미 처리된 가입 요청입니다. 목록을 갱신했습니다.");
        return;
      }
      if (error.code === "PGRST202" || error.code === "42883") {
        alert("서버 DB 마이그레이션이 필요합니다. 최신 배포 후 다시 시도해주세요.");
      } else {
        alert("요청 처리에 실패했습니다.");
      }
      return;
    }

    await loadAll(group.id, user.id);
    alert(approve ? "가입 요청을 승인했습니다." : "가입 요청을 거절했습니다.");
  };

  const saveHeaderSettings = async () => {
    if (!group || !isManager) return;
    const nextImage = ensureHttpsUrl(headerImageDraft.trim()) || null;
    const { data, error } = await supabase.rpc("update_group_visual_settings", {
      p_group_id: group.id,
      p_group_image: nextImage,
      p_header_image_url: nextImage,
      p_header_color: headerColorDraft || "#4A6741",
    });

    if (error) {
      console.error("saveHeaderSettings failed:", error);
      alert("헤더 설정 저장에 실패했습니다.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) {
      alert("헤더 설정 저장에 실패했습니다.");
      return;
    }

    setGroup((prev) =>
      prev
        ? {
          ...prev,
          header_image_url: ensureHttpsUrl(row.header_image_url) ?? nextImage,
          group_image: ensureHttpsUrl(row.group_image) ?? nextImage,
          header_color: row.header_color || headerColorDraft || "#4A6741",
        }
        : prev
    );
    setShowHeaderEditModal(false);
  };

  const checkSlugDuplicate = async () => {
    if (!groupEditSlug.trim() || !user || !group) return;
    if (groupEditSlug === group.group_slug) {
      setSlugCheckState("available");
      return;
    }
    setSlugCheckState("checking");
    const { data } = await supabase
      .from("groups")
      .select("id")
      .eq("group_slug", groupEditSlug.trim())
      .single();

    if (data) {
      setSlugCheckState("taken");
    } else {
      setSlugCheckState("available");
    }
  };

  const saveGroupBasicSettings = async () => {
    if (!group || !user || !isManager) return;
    const name = groupEditName.trim();
    const slug = groupEditSlug.trim().toLowerCase();
    const description = groupEditDescription.trim();
    const groupType = groupEditType.trim() || "etc";
    let nextImageUrl = ensureHttpsUrl(group?.group_image || null);

    if (!name || !slug) {
      alert("모임 이름과 모임 아이디를 입력해주세요.");
      return;
    }
    if (slug !== group.group_slug && slugCheckState !== "available") {
      alert("아이디 중복 확인을 먼저 해주세요.");
      return;
    }

    setGroupEditSaving(true);
    try {
      if (groupEditImageFile) {
        setGroupEditImageUploading(true);
        const optimized = await resizeImageFile(groupEditImageFile, 1280, 0.84);
        const safeName = sanitizeFileName(optimized.name || "group.jpg");
        const key = `images/group/${group.id}/${user.id}/${Date.now()}_${safeName}`;
        const imageUrl = ensureHttpsUrl(await uploadFileToR2(key, optimized, optimized.type || "image/jpeg"));
        if (!imageUrl) throw new Error("invalid image url");

        nextImageUrl = imageUrl;
        setHeaderImageDraft(imageUrl);
        await supabase.rpc("update_group_visual_settings", {
          p_group_id: group.id,
          p_group_image: imageUrl,
          p_header_image_url: imageUrl,
          p_header_color: headerColorDraft || "#4A6741",
        });
      }

      const { data, error } = await supabase.rpc("update_group_basic_settings", {
        p_group_id: group.id,
        p_name: name,
        p_group_slug: slug,
        p_description: description || null,
        p_group_type: groupType,
        p_password: groupEditPassword.trim() || null,
        p_group_image: nextImageUrl || null,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error("failed to save group basic settings");

      setGroup((prev) =>
        prev
          ? {
            ...prev,
            name: row.name || name,
            group_slug: row.group_slug || slug,
            description: row.description ?? (description || null),
            group_type: row.group_type || groupType,
            group_image: ensureHttpsUrl(row.group_image) ?? (nextImageUrl || null),
            password: row.password ?? (groupEditPassword.trim() ? groupEditPassword.trim() : prev.password || null),
          }
          : prev
      );
      setGroupEditPassword("");
      setGroupEditImageFile(null);
      alert("모임 설정을 저장했습니다.");
    } catch (error) {
      console.error(error);
      if (String((error as any)?.message || "").toLowerCase().includes("slug")) {
        alert("이미 사용 중인 모임 아이디입니다.");
      } else {
        alert("모임 설정 저장에 실패했습니다.");
      }
    } finally {
      setGroupEditSaving(false);
      setGroupEditImageUploading(false);
    }
  };

  const uploadHeaderImage = async () => {
    if (!group || !user || !headerImageFile) return;
    setHeaderImageUploading(true);
    try {
      const optimized = await resizeImageFile(headerImageFile, 1600, 0.86);
      const safeName = sanitizeFileName(optimized.name || "header.jpg");
      const key = `images/group-header/${group.id}/${user.id}/${Date.now()}_${safeName}`;
      const imageUrl = ensureHttpsUrl(await uploadFileToR2(key, optimized, optimized.type || "image/jpeg"));
      setHeaderImageDraft(imageUrl || "");

      const { data, error: persistError } = await supabase.rpc("update_group_visual_settings", {
        p_group_id: group.id,
        p_group_image: imageUrl,
        p_header_image_url: imageUrl,
        p_header_color: headerColorDraft || "#4A6741",
      });
      if (persistError) throw persistError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error("failed to persist header image");

      setGroup((prev) =>
        prev
          ? {
            ...prev,
            header_image_url: ensureHttpsUrl(row.header_image_url) ?? imageUrl,
            group_image: ensureHttpsUrl(row.group_image) ?? imageUrl,
            header_color: row.header_color || prev.header_color,
          }
          : prev
      );
      setHeaderImageFile(null);
      alert("헤더 이미지를 업로드했습니다.");
    } catch (error) {
      console.error(error);
      alert("헤더 이미지 업로드에 실패했습니다.");
    } finally {
      setHeaderImageUploading(false);
    }
  };

  const registerScopeLeader = async () => {
    if (!group || !isManager || !scopeLeaderUserId) return;

    const { error } = await supabase.from("group_scope_leaders").upsert(
      {
        user_id: scopeLeaderUserId,
        root_group_id: group.id,
        can_manage: true,
      },
      { onConflict: "user_id,root_group_id" }
    );

    if (error) {
      alert("상위 리더 등록에 실패했습니다.");
      return;
    }

    alert("상위 리더로 등록했습니다.");
    setScopeLeaderUserId("");
  };

  const linkChildGroup = async () => {
    if (!group || !user || !isManager || !childGroupCode.trim()) return;

    setLinkingChildGroup(true);
    const code = childGroupCode.trim().toLowerCase();
    try {
      const { data: child, error: childErr } = await supabase
        .from("groups")
        .select("id")
        .eq("group_slug", code)
        .maybeSingle();

      if (childErr || !child?.id) {
        alert("해당 아이디의 모임을 찾지 못했습니다.");
        return;
      }

      if (child.id === group.id) {
        alert("현재 모임은 하위 모임으로 연결할 수 없습니다.");
        return;
      }

      const { error } = await supabase.from("group_edges").upsert(
        {
          parent_group_id: group.id,
          child_group_id: child.id,
          created_by: user.id,
        },
        { onConflict: "parent_group_id,child_group_id" }
      );

      if (error) {
        alert("하위 모임 연결에 실패했습니다.");
        return;
      }

      setChildGroupCode("");
      alert("하위 모임 연결을 저장했습니다.");
    } finally {
      setLinkingChildGroup(false);
    }
  };

  const closeGroup = async () => {
    if (!group || !user) return;
    if (role !== "owner") {
      alert("모임 삭제는 관리자만 가능합니다.");
      return;
    }
    if (!confirm("모임을 완전히 삭제할까요? 모든 기록이 삭제되며 복구할 수 없습니다.")) return;

    setClosingGroup(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_group_hard", {
        p_group_id: group.id,
      });
      if (rpcError) throw rpcError;

      localStorage.removeItem(LAST_GROUP_KEY);
      alert("모임이 완전히 삭제되었습니다.");
      setLocation("/community?list=1");
    } catch (error) {
      console.error(error);
      alert("모임 삭제 처리에 실패했습니다.");
    } finally {
      setClosingGroup(false);
    }
  };

  const leaveGroup = async () => {
    if (!group || !user) return;
    if (role === "owner") {
      alert("관리자는 모임을 나갈 수 없습니다. 먼저 소유권을 이전하세요.");
      return;
    }
    if (!confirm("모임을 탈퇴하시겠습니까?")) return;

    const { error } = await supabase.rpc("leave_group", {
      p_group_id: group.id,
    });

    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") {
        alert("서버 DB 마이그레이션이 필요합니다. 최신 배포 후 다시 시도해주세요.");
      } else {
        alert("모임 나가기에 실패했습니다.");
      }
      return;
    }
    alert("모임에서 나갔습니다.");
    setLocation("/community?list=1");
  };

  const buildInviteUrl = () => {
    if (!group?.id) return "";
    return `${window.location.origin}/#/register?${GROUP_INVITE_PARAM}=${encodeURIComponent(group.id)}`;
  };

  const buildInviteMessage = () => {
    if (!group) return "";
    const groupCode = group.group_slug || "-";
    const inviteUrl = buildInviteUrl();
    return [
      "myAmen(마이아멘)",
      `${group.name}(${groupCode})에서 당신을 초대했어요.`,
      "아래 링크에서 회원가입하면 바로 모임에 입장할 수 있어요.",
      inviteUrl,
    ].join("\n");
  };

  const copyInviteMessage = async () => {
    const text = buildInviteMessage();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("초대장을 복사했습니다. 카카오톡에 붙여넣어 보내주세요.");
    } catch (error) {
      console.error("invite copy failed:", error);
      alert("초대장 복사에 실패했습니다.");
    }
  };

  const shareInviteMessage = async () => {
    if (!group) return;
    const inviteUrl = buildInviteUrl();
    const text = buildInviteMessage();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `myAmen 모임 초대 - ${group.name}`,
          text,
          url: inviteUrl,
        });
        return;
      }
      await copyInviteMessage();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("invite share failed:", error);
      await copyInviteMessage();
    }
  };

  const topicsByAuthor = useMemo(() => {
    const map = new Map<string, typeof groupPrayerTopics>();
    groupPrayerTopics.forEach(topic => {
      if (!map.has(topic.author_id)) map.set(topic.author_id, []);
      map.get(topic.author_id)!.push(topic);
    });
    return Array.from(map.entries()).map(([userId, topics]) => ({
      userId,
      topics,
      author: authorMap[userId] || { nickname: "이름 없음" }
    }));
  }, [groupPrayerTopics, authorMap]);

  const prayersByTopic = useMemo(() => {
    const map = new Map<number, typeof groupPrayers>();
    groupPrayers.forEach(record => {
      const match = record.title?.match(/^\[topic:(\d+)\]/);
      if (match) {
        const tid = parseInt(match[1]);
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(record);
      }
    });
    return map;
  }, [groupPrayers]);

  // 1. groupId 없으면 아무것도 렌더링하지 않음
  if (!groupId) return null;

  // 2. authReady 또는 loading이 끝나기 전에는 무조건 스피너만 렌더링
  if (!authReady || loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center gap-3 w-full">
        <Loader2 size={48} className="text-zinc-200 animate-spin" strokeWidth={1.5} />
        <p className="text-zinc-400 text-sm font-medium text-center">
          모임 화면 불러오는 중...
        </p>
      </div>
    );
  }

  // 3. group 데이터가 없으면 아무것도 렌더링하지 않음
  if (!group) return null;

  // 4. role이 guest일 때 가입 폼 렌더링 (단, loading/authReady 끝난 뒤에만)
  if (role === "guest") {
    return (
      <div className="min-h-screen bg-[#F6F7F8] pb-10 text-base">
        <div
          className="pt-20 pb-10 min-h-[260px] flex flex-col justify-between"
          style={{
            background:
              ((ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)) ?? "").trim()
                ? `linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,.45)), url(${ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)}) center/cover`
                : `linear-gradient(135deg, ${group.header_color || "#4A6741"}, #1f2937)`,
          }}
        >
          <div className="max-w-2xl mx-auto px-4 w-full h-full flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocation("/community?list=1")}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur shadow-sm hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="text-white mt-8 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-2xl sm:text-3xl font-black truncate drop-shadow-md">{group.name}</div>
                {group.is_closed && <span className="px-2 py-0.5 rounded-sm bg-rose-500/90 text-sm font-bold shadow-sm shrink-0">폐쇄됨</span>}
              </div>
              <div className="mt-3 text-sm sm:text-sm text-white/90 flex flex-col gap-0 font-medium">
                {group.group_slug && <span>모임 아이디 : {group.group_slug}</span>}
                <span>개설일자 : {group.created_at ? new Date(group.created_at).toLocaleDateString("ko-KR").slice(0, -1).replace(/\. /g, '.') : "-"}</span>
                <span>나의 등급 : 방문자</span>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 pt-6 pb-4 space-y-6">
          {/* 모임 소개 섹션 (카드 스타일) */}
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-zinc-100">
            <h2 className="text-base font-black text-[#4A6741] mb-6 flex items-center gap-2">
              <Users size={16} /> 모임 소개
            </h2>
            <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {group.description?.trim() || "모임 소개가 아직 등록되지 않았습니다."}
            </div>
            {group.is_closed && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold border border-rose-100">
                <Lock size={14} /> 현재 폐쇄된 모임입니다.
              </div>
            )}
          </div>

          {/* 가입 신청 섹션 (카드 스타일) */}
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-white/20">
            <h2 className="text-base font-black text-[#4A6741] mb-6 flex items-center gap-2">
              <SendHorizontal size={16} /> 가입 신청서 작성
            </h2>

            <div className="space-y-4">
              {/* group.password 가 null 이거나 빈 문자열이 아니면(즉 비밀번호가 설정되어 있으면) 입력창 표시 */}
              {group.password ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-zinc-700 ml-1">모임 비밀번호</label>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                    placeholder="비밀번호를 입력하세요"
                    disabled={!!user === false || !!guestJoinPending || !!group?.is_closed}
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-700 ml-1">신청 메시지</label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  className="w-full min-h-[120px] px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all resize-none"
                  placeholder="가입 승인에 필요한 내용을 입력해주세요 (선택)"
                  disabled={!!user === false || !!guestJoinPending || !!group?.is_closed}
                />
              </div>
            </div>

            <div className="mt-4">
              {!user ? (
                <button
                  onClick={() => setLocation("/auth")}
                  className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black text-lg shadow-lg hover:bg-[#3d5535] transition-all"
                >
                  로그인 후 신청하기
                </button>
              ) : !!guestJoinPending ? (
                <div className="p-4 bg-[#4A6741]/5 border border-[#4A6741]/10 rounded-2xl text-center">
                  <div className="text-base text-[#4A6741] font-black">가입 신청 완료!</div>
                  <div className="text-sm text-[#4A6741]/70 mt-1">관리자/리더의 승인을 기다리고 있습니다.</div>
                </div>
              ) : (
                <button
                  onClick={submitJoinRequest}
                  disabled={!!joinSubmitting || !!group?.is_closed}
                  className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black text-lg shadow-lg hover:bg-[#3d5535] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <SendHorizontal size={18} />
                  {joinSubmitting ? "신청 중..." : "가입 신청하기"}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 5. user 없으면 아무것도 렌더링하지 않음
  if (!user) return null;

  const handleHeartPrayer = async (topicId: number) => {
    if (!group || !user) return;
    try {
      const { error } = await supabase.from("group_prayer_records").insert({
        group_id: group.id,
        user_id: user.id,
        source_type: "direct",
        title: `[topic:${topicId}] Amen`,
        audio_url: "amen",
        audio_duration: 0,
      });
      if (error) throw error;
      await loadGroupPrayers(group.id);
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 50, 20]);
    } catch (err) {
      console.error(err);
      alert("마음기도 저장에 실패했습니다.");
    }
  };

  const startVoicePrayerForTopic = (topicId: number) => {
    setRecordTitle(`[topic:${topicId}] 음성기도`);
    setShowPrayerComposer(true);
  };

  const deletePrayerTopic = async (topicId: number) => {
    if (!confirm("정말 기도제목을 삭제하시겠습니까? 관련 마음기도와 음성기도도 함께 삭제될 수 있습니다.")) return;
    try {
      const { error } = await supabase.from("group_prayer_topics").delete().eq("id", topicId);
      if (error) throw error;
      if (group?.id) loadGroupPrayerTopics(group.id);
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const editPrayerTopic = async (topic: typeof groupPrayerTopics[0]) => {
    const newContent = prompt("수정할 기도제목을 입력하세요.", topic.content);
    if (newContent === null) return;
    if (newContent.trim() === "") {
      alert("기도제목을 입력해주세요.");
      return;
    }
    try {
      const { error } = await supabase.from("group_prayer_topics").update({ content: newContent }).eq("id", topic.id);
      if (error) throw error;
      if (group?.id) loadGroupPrayerTopics(group.id);
    } catch (err) {
      console.error(err);
      alert("수정에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] pb-12 text-base">
      <header
        className="relative overflow-hidden max-h-[320px] opacity-100 transition-all duration-250"
        style={{
          background:
            ((ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)) ?? "").trim()
              ? `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.52)), url(${ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)}) center/cover`
              : `linear-gradient(120deg, ${group.header_color || "#4A6741"}, #1f2937)`,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 pt-20 pb-10 min-h-[260px] flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation("/community?list=1")}
              className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur"
            >
              <ChevronLeft size={16} />
            </button>
            {isManager && (
              <button
                onClick={() => setActiveTab("admin")}
                className="w-8 h-8 rounded-full bg-transparent text-white font-bold inline-flex items-center justify-center gap-1.5 hover:bg-white/30 transition-colors"
              >
                <Settings size={16} />
              </button>
            )}
          </div>

          <div className="text-white mt-8">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl sm:text-2xl font-bold truncate leading-none py-1">{group.name}</div>
              <button
                onClick={() => setActiveTab("members")}
                className="px-2.5 py-1 rounded-full bg-white/20 text-sm sm:text-sm font-bold flex-shrink-0 inline-flex items-center justify-center gap-1 hover:bg-white/30 transition-colors h-fit"
                title="회원 조회"
              >
                <Users size={14} />
                회원수 {members.length}명
              </button>
              {group.is_closed && <span className="px-2 py-0.5 rounded-sm bg-rose-500/90 text-sm font-bold shadow-sm shrink-0">폐쇄됨</span>}
            </div>

            <div className="mt-3 text-sm sm:text-sm text-white/80 flex flex-col gap-1.5">
              {group.group_slug && <span>모임 아이디 : {group.group_slug}</span>}
              <span>개설 일자 : {group.created_at ? new Date(group.created_at).toLocaleDateString("ko-KR").slice(0, -1).replace(/\. /g, '.') : "-"}</span>
              <span>나의 등급 : {toLabel(role)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-zinc-200 transition-all overflow-x-auto hide-scrollbar">
        <div className="w-full">
          <nav className="flex items-center justify-center w-full max-w-xl mx-auto">
            {([
              ["faith", "신앙생활"],
              ["prayer", "중보기도"],
              ["social", "교제나눔"],
              ["schedule", "모임일정"],
            ] as Array<[TabKey, string]>)
              .filter(([id]) => group.menu_settings?.[id as keyof typeof group.menu_settings] !== false)
              .map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 min-w-[4rem] py-3 text-base font-bold border-b-2 transition-colors ${activeTab === id
                    ? "border-[#4A6741] bg-white text-[#4A6741]"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                    }`}
                >
                  {label}
                </button>
              ))}
          </nav>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {activeTab === "prayer" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <section className="relative">
              <div className="space-y-4">
                {topicsByAuthor.map(({ userId, topics, author }) => (
                  <div key={userId} className="bg-white rounded-2xl shadow-sm border border-zinc-100/50 pt-4 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 px-5">
                      {author.avatar_url ? (
                        <img src={author.avatar_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="avatar" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#4A6741]/10 flex items-center justify-center text-[#4A6741] shrink-0">
                          <User size={18} />
                        </div>
                      )}
                      <span className="font-bold text-zinc-900 text-[16px]">{author.nickname || author.username}</span>
                    </div>

                    <div className="space-y-0 pb-3 px-5">
                      {topics.map(topic => {
                        const relatedPrayers = prayersByTopic.get(topic.id) || [];
                        const heartCount = relatedPrayers.filter(p => p.audio_url === 'amen').length;
                        const voicePrayers = relatedPrayers.filter(p => p.audio_url && p.audio_url !== 'amen')
                          .filter(vp => vp.user_id === user.id || userId === user.id); // 오직 기도자/소유자만 필터링됨
                        const isMine = topic.author_id === user.id;

                        return (
                          <div key={topic.id} className="border-b border-zinc-100 py-3 last:border-0 last:pb-0 relative group">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="w-full flex justify-between items-start gap-2">
                                <div className="flex-1 font-bold text-[#4A6741] text-sm leading-relaxed whitespace-pre-wrap">{topic.content}</div>
                                {isMine && (
                                  <div className="flex items-center gap-1 opacity-60 mb-0.5 shrink-0 self-start">
                                    <button onClick={() => editPrayerTopic(topic)} className="p-1 hover:text-[#4A6741]">
                                      <Pencil size={13} />
                                    </button>
                                    <button onClick={() => deletePrayerTopic(topic.id)} className="p-1 hover:text-rose-500">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 shrink-0">
                                <button
                                  onClick={() => handleHeartPrayer(topic.id)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-500 text-xs font-bold transition-all active:scale-95"
                                >
                                  <Heart size={12} fill="currentColor" className="opacity-80" /> 마음기도 {heartCount > 0 && <span>{heartCount}</span>}
                                </button>
                                <button
                                  onClick={() => startVoicePrayerForTopic(topic.id)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-full border border-[#4A6741]/20 bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold transition-all active:scale-95"
                                >
                                  <Mic size={12} /> 음성기도
                                </button>
                              </div>
                            </div>

                            {/* 음성 기도 목록 */}
                            {voicePrayers.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {voicePrayers.map(vp => {
                                  // 필터링되어 넘어오므로 모두 들을 수 있음
                                  const prayingUser = authorMap[vp.user_id];
                                  const pname = prayingUser?.nickname || prayingUser?.username || "모임원";
                                  const canDelete = isManager || vp.user_id === user.id;

                                  return (
                                    <div key={vp.id} className="bg-white rounded-xl border border-zinc-100 p-2.5 shadow-sm">
                                      <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
                                          <Mic size={12} /> {pname}
                                        </div>
                                        {canDelete && (
                                          <button onClick={() => removeGroupPrayer(vp)} className="text-rose-400 p-1 hover:text-rose-500 rounded-full">
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                      <audio controls className="w-full h-8" src={vp.audio_url} preload="none" />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {topicsByAuthor.length === 0 && (
                  <div className="py-10 text-center text-[15px] text-zinc-400">
                    등록된 기도제목이 없습니다.
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPrayerTopicModal(true)}
                className="fixed right-5 bottom-24 z-[90] w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors"
                aria-label="내 기도제목 등록"
              >
                <Plus size={24} />
              </button>
            </section>
          </motion.div>
        )}

        {activeTab === "faith" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">

            <div className="flex items-center justify-between text-zinc-900 bg-transparent p-4">
              <button onClick={() => setFaithCurrentDate(subWeeks(faithCurrentDate, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronLeft /></button>
              <span className="font-black text-[22px] tracking-tight">{getWeekKoreanLabel(faithCurrentDate)}</span>
              <button onClick={() => setFaithCurrentDate(addWeeks(faithCurrentDate, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronRight /></button>
            </div>

            {/* ── 주간 수행 현황 카드 ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 overflow-hidden">
              <div className="w-full">
                <div className="w-full select-none pb-0">
                  {/* 헤더 항목 */}
                  <div className="flex items-center pt-1 pb-4 px-0 sm:px-2 border-b border-zinc-50">
                    <div className="shrink-0 w-16 sm:w-20" />
                    {faithItemSlots.map((slot) => (
                      <div key={`header-${slot.key}`} className="flex-1 flex flex-col items-center text-center">
                        <span className="text-base sm:text-lg font-bold text-[#4A6741] leading-none">{slot.label}</span>
                        {!slot.item && <span className="text-[0.7em] text-zinc-300 mt-1">미설정</span>}
                      </div>
                    ))}
                  </div>

                  {/* 날짜 행 */}
                  <div className="space-y-0 px-0 sm:px-2 pt-2">
                    {weekDates.map((date) => {
                      const dt = parseISO(date);
                      const isToday = isSameDay(dt, new Date());
                      const isHoliday = KOREAN_HOLIDAYS[date];
                      const isSunday = dt.getDay() === 0;
                      const isSaturday = dt.getDay() === 6;
                      const isRed = isSunday || isHoliday;
                      return (
                        <div key={date} className={`flex items-center py-3 rounded-2xl transition-colors ${isToday ? "bg-[#4A6741]/20" : ""}`}>
                          <div className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center">
                            <span className={`text-base base:text-sm font-bold leading-none ${isToday ? "text-[#4A6741]" : isRed ? "text-rose-500" : isSaturday ? "text-blue-500" : "text-zinc-500"} text-center`}>
                              {dt.getDate()}({dt.toLocaleDateString("ko-KR", { weekday: "short" })})
                            </span>
                            {isHoliday && <span className="text-[0.65em] leading-tight text-rose-500 font-bold max-w-full truncate px-0.5 mt-1" style={{ transform: "scale(0.95)" }}>{isHoliday}</span>}
                          </div>
                          {faithItemSlots.map((slot) => {
                            const item = slot.item;
                            const val = (weeklyRecords[date]?.[item?.id ?? ""] ?? 0) as number;
                            const disabled = !item;
                            const done = val > 0;
                            return (
                              <div key={`${slot.key}-${date}`} className="flex-1 flex justify-center px-1">
                                <button
                                  onClick={() => item && void handleFaithToggleForDate(item, date)}
                                  disabled={disabled}
                                  className={`w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[18px] flex items-center justify-center transition-all shrink-0
                                       ${disabled
                                      ? "opacity-25 cursor-not-allowed bg-zinc-50"
                                      : done
                                        ? "bg-[#4A6741] text-white shadow-sm" // 배경을 진하게, 글자를 흰색으로 수정
                                        : "bg-zinc-50 border border-zinc-100/80 text-zinc-300"
                                    }`}
                                >
                                  <Check
                                    size={20}
                                    strokeWidth={done ? 4 : 2.5} // 완료 시 더 두껍게, 미완료 시 더 얇게 표현
                                    className={done ? "opacity-100" : "opacity-40"} // 미완료 시 아이콘을 더 흐리게
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {faithItemSlots.some((slot) => !slot.item) && (
                <div className="px-5 pb-4 text-xs text-zinc-400">
                  ⚠ 일부 항목이 설정되지 않았습니다. 관리자/리더가 관리 메뉴에서 준비해주세요.
                </div>
              )}
            </div>

            {/* ── 관리자: 전체 멤버 현황 ── */}
            {isManager && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-zinc-100/50">
                <div className="px-5 pt-5 pb-4 border-b border-zinc-50">
                  <p className="text-sm font-black text-zinc-900">주간 현황</p>
                </div>
                {faithBoardLoading ? (
                  <div className="py-10 text-sm text-zinc-400 text-center">현황 불러오는 중...</div>
                ) : faithBoardRows.length === 0 ? (
                  <div className="py-10 text-sm text-zinc-400 text-center">조회된 기록이 없습니다.</div>
                ) : (
                  <div className="w-full text-sm pb-4">
                    <div className="flex items-center pt-3 pb-3 px-4 sm:px-8 border-b border-zinc-50 bg-zinc-50/30">
                      <div className="shrink-0 w-16 sm:w-20 font-bold text-zinc-400 text-[13px] text-center">멤버</div>
                      {faithItemSlots.filter((slot) => slot.item).map((slot) => (
                        <div key={slot.key} className="flex-1 flex justify-center font-bold text-zinc-400 text-[13px] text-center">
                          {slot.label}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-0 px-4 sm:px-8">
                      {faithBoardRows.map((row, idx) => (
                        <div key={row.user_id} className={`flex items-center py-4 border-b border-zinc-50 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                          <div className="shrink-0 w-16 sm:w-20 font-bold text-zinc-800 text-[13px] whitespace-nowrap text-center">{row.name}</div>
                          {faithItemSlots.filter((slot) => slot.item).map((slot) => {
                            const count = row.values[slot.item!.id] ?? 0;
                            return (
                              <div key={slot.key} className="flex-1 flex justify-center relative">
                                {count > 0 ? (
                                  <span className="font-black text-[#4A6741] text-[15px]">{count}</span>
                                ) : (
                                  <span className="text-zinc-300 font-bold text-[15px]">—</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        )}

        {activeTab === "social" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid gap-4">
              {posts.map((post) => {
                const author = authorMap[post.author_id];
                const authorName = author?.nickname || author?.username || "이름 없음";
                const canDelete = isManager || post.author_id === user.id;
                const displayTitle = post.title?.trim() || "";
                const isNotice = post.post_type === "notice";

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl shadow-sm border border-zinc-100/60 flex flex-col py-5 px-0"
                  >
                    <div className="flex items-center justify-between mb-2 mx-4 border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2">
                        {isNotice && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-black rounded-sm tracking-tight">공지</span>}
                        {displayTitle && <h3 className="font-black text-zinc-900 text-[17px] leading-tight break-all">{displayTitle}</h3>}
                        {!displayTitle && !isNotice && <h3 className="font-black text-zinc-900 text-[17px] leading-tight break-all">교제나눔</h3>}
                      </div>
                      <div className="w-4" />
                    </div>

                    {post.content && (
                      <div className="text-zinc-800 text-[15px] leading-relaxed whitespace-pre-wrap mb-2 px-5 pb-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {post.content}
                      </div>
                    )}

                    {post.image_urls && post.image_urls.length > 0 && (
                      <PostImageCarousel
                        urls={post.image_urls}
                        onImageClick={(index) => {
                          setModalImages(post.image_urls ?? []);
                          setModalIndex(index);
                          setShowImageModal(true);
                        }}
                      />
                    )}

                    <div className="flex items-center justify-between gap-2.5 mt-2 pt-3 mx-4 border-t border-zinc-100">
                      <div className="flex items-center gap-2.5">
                        {author?.avatar_url ? (
                          <img src={author.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="avatar" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center text-zinc-400 shrink-0">
                            <User size={15} />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 text-[14px] leading-tight">{authorName}</span>
                          <span className="text-[12px] text-zinc-400 leading-tight mt-0.5">{formatDateTime(post.created_at)}</span>
                        </div>
                      </div>

                      {canDelete && (
                        <div className="flex items-center gap-0.5 opacity-60">
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setPostType(post.post_type);
                              setPostTitle(post.title || "");
                              setPostContent(post.content || "");
                              setPostImagePreviews([]);
                              setPostImageFiles([]);
                              setPostExistingImages([...(post.image_urls || [])]);
                              setShowPostComposerModal(true);
                            }}
                            className="p-1.5 hover:text-[#4A6741] transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => removePost(post)} className="p-1.5 hover:text-rose-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {posts.length === 0 && (
                <div className="bg-[#F6F7F8] px-4 py-5 text-base text-zinc-500 text-center border-b border-zinc-200">
                  아직 게시글이 없습니다.
                </div>
              )}
            </div>
            <button
              onClick={() => { setPostType("post"); setEditingPost(null); setPostTitle(""); setPostContent(""); setPostExistingImages([]); setPostImageFiles([]); setPostImagePreviews([]); setShowPostComposerModal(true); }}
              className="fixed right-5 bottom-24 z-[90] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors"
              aria-label="글 작성"
            >
              <MessageSquare size={24} />
            </button>
          </motion.div>
        )}

        {activeTab === "schedule" && (
          <GroupScheduleTab groupId={group.id} user={user} isManager={isManager} />
        )}

        {activeTab === "members" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="">
            {isManager && (
              <div className="bg-[#F6F7F8] p-2 mb-20">
                <h3 className="font-bold text-[#4A6741] mb-2 text-base flex items-center gap-2">
                  <Shield size={16} /> 가입 요청
                </h3>
                {joinRequests.length === 0 ? (
                  <div className="text-sm ml-7 item-center justify-center text-zinc-500">대기 중인 요청이 없습니다.</div>
                ) : (
                  <div className="space-y-4">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="bg-white rounded-2xl p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="text-base font-bold text-zinc-900">
                          {request.profile?.nickname || request.profile?.username || "이름 없음"}
                        </div>
                        <div className="text-sm text-zinc-500 flex flex-col mt-1 gap-y-1">
                          <div className="before:content-['|'] before:mr-2 before:text-zinc-300">신청 일시 : {formatDateTime(request.created_at)}</div>
                          {request.message && <div className="before:content-['|'] before:mr-2 before:text-zinc-300">신청 내용 : {request.message}</div>}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => resolveJoinRequest(request.id, true)}
                            className="px-4 py-1 rounded-full bg-[#4A6741]/90 text-white text-sm font-bold"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => resolveJoinRequest(request.id, false)}
                            className="px-4 py-1 rounded-full bg-zinc-200 text-zinc-700 text-sm font-bold"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#F6F7F8] p-2">
              <h3 className="font-bold text-[#4A6741] mb-2 text-base flex items-center gap-2">
                <Users size={16} /> 회원 목록
              </h3>
              <div className="space-y-4">
                {members.map((member) => {
                  const isOwner = member.role === "owner";
                  const canPromoteDemote = role === "owner" && !isOwner;
                  const canKick = isManager && !isOwner;
                  const name = member.profile?.nickname || member.profile?.username || "이름 없음";

                  return (
                    <div
                      key={`${member.user_id}-${member.id}`}
                      className="bg-white rounded-2xl p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* 상단 라인: 이름 + 역할배지 + 버튼들 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* 이름 */}
                          <div className="font-bold text-zinc-900">{name}</div>

                          {/* 역할 배지 */}
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                            member.role === 'leader' ? 'bg-blue-100 text-blue-700' :
                              'bg-zinc-200 text-zinc-600'
                            }`}>
                            {toLabel(member.role)}
                          </span>

                          {/* 권한 변경 버튼을 이름 라인으로 이동 */}
                          <div className="flex items-center gap-1.5 ml-1">
                            {canPromoteDemote && member.role === "member" && (
                              <button
                                onClick={() => changeMemberRole(member.user_id, "leader")}
                                className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition-colors"
                              >
                                리더권한 부여
                              </button>
                            )}
                            {canPromoteDemote && member.role === "leader" && (
                              <button
                                onClick={() => changeMemberRole(member.user_id, "member")}
                                className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
                              >
                                일반멤버 전환
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 강퇴 버튼 (맨 오른쪽 유지) */}
                        {canKick && member.user_id !== user.id && (
                          <button
                            onClick={() => removeMember(member.user_id)}
                            className="w-7 h-7 rounded-full bg-transparent text-rose-500 flex items-center justify-center"
                            title="강퇴"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>

                      {/* 하단 라인: 나머지 정보 */}
                      <div className="text-sm text-zinc-500 mt-1 flex flex-col gap-y-1">
                        <span className="before:content-['|'] before:mr-2 before:text-zinc-300">회원 아이디 : {member.profile?.username || "-"}</span>
                        <span className="before:content-['|'] before:mr-2 before:text-zinc-300">
                          가입 일시 : {formatJoinedAt(member.joined_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(
              <button
                onClick={() => setShowInviteModal(true)}
                className="fixed right-6 bottom-28 z-[120] w-12 h-12 rounded-full bg-[#4A6741] opacity-90 text-white shadow-2xl flex items-center justify-center"
                aria-label="회원 초대"
              >
                <UserPlus size={24} />
              </button>
            )}

            <div className="bg-[#F6F7F8] p-2">
              {role !== "owner" && (
                <button
                  onClick={leaveGroup}
                  className="w-full py-3 rounded-2xl bg-white border border-rose-200 text-rose-600 font-bold text-base shadow-sm hover:shadow-md transition-all duration-200"
                >
                  모임 탈퇴하기
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "admin" && isManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 px-2 pb-6 mt-4">
            {/* 관리자 서브 탭 메뉴 */}
            <div className="flex bg-white rounded-2xl shadow-sm p-1">
              <button
                onClick={() => setAdminTab("info")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${adminTab === "info" ? "bg-[#4A6741] text-white shadow-sm" : "bg-transparent text-zinc-500 hover:bg-zinc-50"
                  }`}
              >
                기본 정보
              </button>
              <button
                onClick={() => setAdminTab("menu")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${adminTab === "menu" ? "bg-[#4A6741] text-white shadow-sm" : "bg-transparent text-zinc-500 hover:bg-zinc-50"
                  }`}
              >
                메뉴 설정
              </button>
              <button
                onClick={() => setAdminTab("manage")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${adminTab === "manage" ? "bg-[#4A6741] text-white shadow-sm" : "bg-transparent text-zinc-500 hover:bg-zinc-50"
                  }`}
              >
                모임 관리
              </button>
            </div>

            {/* 기본 정보 탭 */}
            {adminTab === "info" && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
                <h3 className="font-black text-zinc-900 text-lg mb-2">모임 기본 정보</h3>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 이름</div>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all"
                    placeholder="모임 이름"
                    value={groupEditName}
                    onChange={(e) => setGroupEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 아이디</div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all"
                      placeholder="모임 아이디"
                      value={groupEditSlug}
                      onChange={(e) => {
                        setGroupEditSlug(e.target.value);
                        setSlugCheckState("idle");
                      }}
                    />
                    <button
                      onClick={checkSlugDuplicate}
                      className="px-4 py-2 bg-zinc-700 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors whitespace-nowrap min-w-[80px]"
                      type="button"
                    >
                      {slugCheckState === "checking" ? "확인중" : "중복확인"}
                    </button>
                  </div>
                  {slugCheckState === "available" && <p className="text-sm text-emerald-600 ml-1">사용 가능한 모임 아이디입니다.</p>}
                  {slugCheckState === "taken" && <p className="text-sm text-red-500 ml-1">이미 사용 중인 모임 아이디입니다.</p>}
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 유형</div>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all"
                    value={groupEditType}
                    onChange={(e) => setGroupEditType(e.target.value)}
                  >
                    <option value="church">교회 모임</option>
                    <option value="school">학교 모임</option>
                    <option value="work">직장 모임</option>
                    <option value="family">가족 모임</option>
                    <option value="etc">기타 모임</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 비밀번호</div>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all"
                    placeholder="새 비밀번호(선택)"
                    type="password"
                    value={groupEditPassword}
                    onChange={(e) => setGroupEditPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 소개</div>
                  <textarea
                    className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all resize-none"
                    placeholder="모임 소개"
                    value={groupEditDescription}
                    onChange={(e) => setGroupEditDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-zinc-700 ml-1">모임 대표 이미지</div>
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold cursor-pointer hover:bg-zinc-800 transition-colors inline-flex items-center gap-2">
                        <ImagePlus size={16} />
                        이미지 선택
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleGroupImageSelect}
                        />
                      </label>
                      {groupEditImageFile && <span className="text-sm text-zinc-600 truncate max-w-[150px]">{groupEditImageFile.name}</span>}
                    </div>
                    <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white">
                      <img
                        src={groupEditImageFile ? URL.createObjectURL(groupEditImageFile) : (ensureHttpsUrl(group?.group_image) || headerImageDraft || "/default-group.png")}
                        alt="group-image-preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={saveGroupBasicSettings}
                  disabled={groupEditSaving || groupEditImageUploading || ((groupEditSlug !== (group?.group_slug ?? "")) && slugCheckState !== "available")}
                  className="w-full py-4 mt-4 rounded-2xl bg-[#4A6741] text-white font-black text-base shadow-lg hover:bg-[#3d5535] transition-all disabled:opacity-60 active:scale-[0.98]"
                >
                  {(groupEditSaving || groupEditImageUploading) ? "업로드 및 저장 중..." : "모임 정보 저장"}
                </button>
              </motion.section>
            )}

            {/* 메뉴 설정 탭 */}
            {adminTab === "menu" && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
                <h3 className="font-black text-zinc-900 text-lg mb-2">메뉴 설정</h3>
                <p className="text-sm text-zinc-500 mb-4 px-1 leading-relaxed">
                  모임원들에게 보여줄 메뉴들을 활성화 또는 비활성화 하세요. <br />최소 1개 이상의 메뉴는 활성화 상태를 유지해야 합니다.
                </p>
                <div className="space-y-3">
                  {(["faith", "prayer", "social", "schedule"] as const).map(menuKey => {
                    const toggleMenu = async () => {
                      const cur = group.menu_settings ?? { faith: true, prayer: true, social: true, schedule: true };
                      const newVal = !(cur[menuKey] ?? true);
                      const enabledCount = Object.values(cur).filter(Boolean).length;
                      if (!newVal && enabledCount <= 1) {
                        alert("최소 1개 이상의 메뉴는 활성화해야 합니다.");
                        return;
                      }
                      const newSettings = { ...cur, [menuKey]: newVal };
                      const { error } = await supabase.from("groups").update({ menu_settings: newSettings }).eq("id", group.id);
                      if (!error) {
                        setGroup({ ...group, menu_settings: newSettings });
                      } else {
                        alert("설정 변경에 실패했습니다.");
                      }
                    };
                    const isEnabled = group.menu_settings?.[menuKey] ?? true;
                    const labelStr = menuKey === "faith" ? "신앙생활" : menuKey === "prayer" ? "중보기도" : menuKey === "social" ? "교제나눔" : "모임일정";
                    return (
                      <div key={menuKey} className="flex justify-between items-center p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                        <span className="font-bold text-base text-zinc-900">{labelStr}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={isEnabled} onChange={toggleMenu} />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A6741]"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* 모임 관리 탭 (상위리더 등록, 하위모임 연결, 방 삭제) */}
            {adminTab === "manage" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <section className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={20} className="text-[#4A6741]" />
                    <h3 className="font-black text-zinc-900 text-lg">상위 리더 등록</h3>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">등록된 상위 리더는 현재 모임을 루트로 하위 모임 현황을 함께 조회할 수 있습니다.</p>
                  <select
                    value={scopeLeaderUserId}
                    onChange={(e) => setScopeLeaderUserId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-sm focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all font-medium"
                  >
                    <option value="">멤버 선택</option>
                    {members.map((member) => {
                      const name = member.profile?.nickname || member.profile?.username || "이름 없음";
                      return (
                        <option key={member.user_id} value={member.user_id}>
                          {name} ({toLabel(member.role)})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={registerScopeLeader}
                    disabled={!scopeLeaderUserId}
                    className="w-full py-3 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    상위 리더 등록하기
                  </button>
                </section>

                <section className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
                  <h3 className="font-black text-zinc-900 text-lg mb-2">하위 모임 연결</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">연결된 하위 모임들은 상위 리더 집계 범위에 포함되어 활동 내역이 그룹화됩니다.</p>
                  <input
                    value={childGroupCode}
                    onChange={(e) => setChildGroupCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-sm focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all font-medium"
                    placeholder="하위 모임 아이디 입력"
                  />
                  <button
                    onClick={linkChildGroup}
                    disabled={linkingChildGroup || !childGroupCode.trim()}
                    className="w-full py-3 rounded-xl bg-[#4A6741] text-white font-bold text-sm hover:bg-[#3d5535] disabled:opacity-50 transition-colors"
                  >
                    {linkingChildGroup ? "연결 중..." : "하위 모임 연결"}
                  </button>
                </section>

                <section className="bg-red-50 rounded-3xl shadow-sm p-5 space-y-4 border border-red-100">
                  <h3 className="font-black text-rose-700 text-lg">모임 삭제 (Danger Zone)</h3>
                  <p className="text-sm text-rose-600/80 font-medium">삭제된 모임 관련 데이터(게시글, 신앙활동, 사진 등)는 완벽히 제거되며 복구할 수 없습니다.</p>
                  <button
                    onClick={closeGroup}
                    disabled={closingGroup || role !== "owner"}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-black text-base shadow-lg hover:bg-rose-700 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {closingGroup ? "삭제 중..." : role !== "owner" ? "관리자만 삭제 가능" : "모임 영구 삭제하기"}
                  </button>
                </section>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {
        showPrayerLinkModal && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowPrayerLinkModal(false)}
            />
            <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-[#F6F7F8] border-b border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-zinc-900">PrayerPage 기록 연결</h3>
                <button
                  onClick={() => setShowPrayerLinkModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {personalPrayers.map((record) => (
                  <div key={record.id} className="bg-zinc-50 rounded-sm p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="font-bold text-base text-zinc-900">{record.title || "제목 없는 기도"}</div>
                      <button
                        onClick={() => linkPrayerToGroup(record)}
                        className="px-3 py-1.5 rounded-sm bg-[#4A6741] text-white text-base font-bold"
                      >
                        연결
                      </button>
                    </div>
                    <div className="text-base text-zinc-500 mb-2">{formatDateTime(record.created_at)}</div>
                    <audio controls className="w-full" src={record.audio_url} preload="none" />
                  </div>
                ))}

                {personalPrayers.length === 0 && (
                  <div className="text-base text-zinc-500 text-center py-8">연결 가능한 개인 기도 기록이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        showPrayerComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-zinc-900/95 flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-sm flex flex-col items-center">
              <h3 className="font-black text-white text-xl mb-4">
                기도하기
              </h3>

              {!isRecording && !recordedBlob && (
                <button
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-[#4A6741] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  <Mic size={32} />
                </button>
              )}

              {isRecording && (
                <div className="flex flex-col items-center mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-rose-500/50 shadow-lg mb-6"
                  >
                    <Mic size={32} />
                  </motion.div>
                  <div className="text-white text-2xl font-mono opacity-80 mb-6">
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="px-6 py-3 rounded-full bg-white/20 text-white font-bold flex items-center gap-2"
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {isPaused ? "이어서" : "일시정지"}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 rounded-full bg-white/20 text-white font-bold flex items-center gap-2"
                    >
                      <Square size={16} /> 종료
                    </button>
                  </div>
                </div>
              )}

              {recordPreviewUrl && (
                <div className="w-full flex flex-col items-center mt-6 gap-6">
                  <audio controls className="w-full max-w-xs" src={recordPreviewUrl} />
                  <div className="flex w-full gap-3 justify-center text-white">
                    <button
                      onClick={saveDirectPrayer}
                      disabled={savingPrayer}
                      className="flex-1 py-3 rounded-full bg-[#4A6741] font-bold disabled:opacity-50 max-w-xs shadow-lg flex items-center justify-center gap-2"
                    >
                      {savingPrayer ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
                      {savingPrayer ? "저장 중..." : "기도 저장"}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowPrayerComposer(false);
                  if (recordedBlob) URL.revokeObjectURL(recordPreviewUrl!);
                  setRecordedBlob(null);
                  setRecordPreviewUrl(null);
                  setRecordingTime(0);
                  if (isRecording) stopRecording();
                }}
                className="mt-12 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                title="닫기"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )
      }

      {
        showPrayerTopicModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPrayerTopicModal(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:pb-6 shadow-xl space-y-4 animate-in slide-in-from-bottom-5 max-h-[85vh] overflow-y-auto mt-auto sm:mt-0">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-zinc-900">기도제목 등록</h3>
                <button
                  onClick={() => setShowPrayerTopicModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={newPrayerTopic}
                onChange={(e) => setNewPrayerTopic(e.target.value)}
                className="w-full min-h-[120px] px-4 py-3 rounded-sm bg-zinc-50 border border-zinc-100 text-base"
                placeholder="모임원과 나눌 기도제목을 입력해주세요."
              />
              <button
                onClick={addPrayerTopic}
                disabled={!newPrayerTopic.trim()}
                className="w-full py-3 rounded-sm bg-[#4A6741] text-white font-bold text-base disabled:opacity-60"
              >
                등록하기
              </button>
            </div>
          </div>
        )
      }

      {
        showImageModal && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center pointer-events-auto">
            <div className="absolute top-4 right-4 z-[310]">
              <button onClick={() => setShowImageModal(false)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 backdrop-blur transition-colors">
                <X size={20} />
              </button>
            </div>
            {modalImages.length > 1 && (
              <div className="absolute top-6 flex w-full justify-center z-[310] pointer-events-none">
                <span className="bg-black/60 text-white font-bold text-sm px-4 py-1.5 rounded-full drop-shadow">
                  {modalIndex + 1} / {modalImages.length}
                </span>
              </div>
            )}
            <div className="w-full flex-1 flex items-center justify-center relative">
              {modalImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setModalIndex(prev => prev > 0 ? prev - 1 : prev); }}
                    className={`absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur z-[310] transition-colors ${modalIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/60'}`}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setModalIndex(prev => prev < modalImages.length - 1 ? prev + 1 : prev); }}
                    className={`absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur z-[310] transition-colors ${modalIndex === modalImages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/60'}`}
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
              {modalImages[modalIndex] && (
                <img src={modalImages[modalIndex]} alt="full" className="w-full h-full max-h-screen object-contain mx-auto" />
              )}
            </div>
          </div>
        )
      }

      {
        showPostComposerModal && (
          <div className="fixed inset-0 z-[220] p-0 sm:p-4 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPostComposerModal(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl flex flex-col space-y-4 animate-in slide-in-from-bottom-5 max-h-[85vh] mt-auto sm:mt-0">
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="font-black text-zinc-900">{editingPost ? "글 수정" : "글 작성"}</h3>
                  <button
                    onClick={() => setShowPostComposerModal(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPostType("post")}
                      className={`px-3 py-2 rounded-sm text-base font-bold ${postType === "post" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                    >
                      일반글
                    </button>
                    <button
                      onClick={() => setPostType("notice")}
                      disabled={!isManager}
                      className={`px-3 py-2 rounded-sm text-base font-bold ${postType === "notice" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                        } ${!isManager ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      공지
                    </button>
                  </div>

                  <input
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-sm bg-zinc-50 border border-zinc-100 text-base"
                    placeholder="제목"
                  />
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full min-h-[140px] px-4 py-3 rounded-sm bg-zinc-50 border border-zinc-100 text-base"
                    placeholder="모임 내부 공유 글을 작성하세요."
                  />

                  <div className="rounded-sm bg-zinc-50 border border-zinc-100 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-600">사진 첨부 (최대 10장)</span>
                      <label className="px-3 py-1.5 rounded-sm bg-zinc-900 text-white text-base font-bold cursor-pointer inline-flex items-center gap-1">
                        <ImagePlus size={13} />
                        사진 선택
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handlePostImageSelect(e.target.files)}
                        />
                      </label>
                    </div>

                    {(postExistingImages.length > 0 || postImagePreviews.length > 0) && (
                      <div className="grid grid-cols-3 gap-2">
                        {postExistingImages.map((preview, index) => (
                          <div key={`exist-${index}`} className="relative rounded-sm overflow-hidden bg-zinc-100">
                            <img src={preview} alt={`exist-${index}`} className="w-full h-20 object-cover" />
                            <button
                              onClick={() => setPostExistingImages(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {postImagePreviews.map((preview, index) => (
                          <div key={`preview-${index}`} className="relative rounded-sm overflow-hidden bg-zinc-100">
                            <img src={preview} alt={`preview-${index}`} className="w-full h-20 object-cover" />
                            <button
                              onClick={() => removePostImage(index)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={addPost}
                    className="w-full py-4 mt-2 mb-2 rounded-2xl bg-[#4A6741] text-white font-black text-base shadow-lg hover:bg-[#3d5535] transition-all"
                  >
                    {editingPost ? "수정완료" : "등록완료"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showInviteModal && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowInviteModal(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-lg bg-white border border-zinc-100 p-6 space-y-4 rounded-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-zinc-900 text-lg">회원 초대</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-5 space-y-4 text-sm border border-zinc-100/50">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-bold text-zinc-400">모임 정보</div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-zinc-900 text-base">{group.name}</span>
                    <span className="text-zinc-400">|</span>
                    <span className="text-zinc-600 font-medium">{group.group_slug || "-"}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs font-bold text-zinc-400">초대 링크</div>
                  <div className="break-all font-bold text-[#4A6741] bg-white p-3 rounded-xl border border-zinc-100 select-all">
                    {buildInviteUrl()}
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  위 링크를 받은 사용자는 회원가입 후 즉시 모임에 자동 가입됩니다. <br />
                  초대하고 싶은 분들께 공유해 보세요!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                <button
                  onClick={() => void shareInviteMessage()}
                  className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black text-base shadow-lg hover:bg-[#3d5535] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <SendHorizontal size={18} />
                  카카오톡으로 초대장 보내기
                </button>
                <button
                  onClick={() => void copyInviteMessage()}
                  className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-black text-base hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                  초대장 복사하기
                </button>
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showHeaderEditModal && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowHeaderEditModal(false)} />
            <div className="relative w-full max-w-xl bg-[#F6F7F8] border-b border-zinc-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-zinc-900">헤더 설정</h3>
                <button
                  onClick={() => setShowHeaderEditModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <div>
                <label className="text-base text-zinc-500">헤더 색상 팔레트</label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {HEADER_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => setHeaderColorDraft(color)}
                      className={`w-8 h-8 rounded-full border-2 ${headerColorDraft === color ? "border-black scale-110" : "border-white"
                        }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-base text-zinc-500">헤더 이미지 업로드</label>
                <div className="mt-2 rounded-sm border border-zinc-100 bg-zinc-50 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 rounded-sm bg-zinc-900 text-white text-base font-bold cursor-pointer inline-flex items-center gap-1">
                      <ImagePlus size={13} />
                      이미지 선택
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setHeaderImageFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {headerImageFile && <span className="text-base text-zinc-600 truncate">{headerImageFile.name}</span>}
                  </div>
                  <button
                    onClick={uploadHeaderImage}
                    disabled={!headerImageFile || headerImageUploading}
                    className="w-full py-2.5 rounded-sm bg-zinc-900 text-white text-base font-bold disabled:opacity-60"
                  >
                    {headerImageUploading ? "업로드 중..." : "이미지 업로드"}
                  </button>
                  {headerImageDraft && (
                    <div className="rounded-sm overflow-hidden border border-zinc-200 bg-zinc-100">
                      <img src={headerImageDraft} alt="header-preview" className="w-full h-28 object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={saveHeaderSettings}
                className="w-full py-3 rounded-sm bg-[#4A6741] text-white font-bold text-base"
              >
                저장
              </button>
            </div>
          </div>
        )
      }

      {
        showFaithLinkModal && selectedFaithItem && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFaithLinkModal(false)} />
            <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-[#F6F7F8] border-b border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-zinc-900">
                  외부 활동 연결 - {selectedFaithItem.name}
                </h3>
                <button
                  onClick={() => setShowFaithLinkModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {availableActivities.map((activity) => (
                  <div key={activity.id} className="bg-zinc-50 rounded-sm p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-base text-zinc-900">{getActivityTitle(activity)}</div>
                        <div className="text-base text-zinc-500 mt-1">{formatDateTime(activity.occurred_at)}</div>
                      </div>
                      <button
                        onClick={() => linkActivityToFaith(activity)}
                        disabled={linkingActivityId === activity.id}
                        className="px-3 py-1.5 rounded-sm bg-[#4A6741] text-white text-base font-bold disabled:opacity-60"
                      >
                        {linkingActivityId === activity.id ? "연결 중..." : "연결"}
                      </button>
                    </div>
                  </div>
                ))}

                {availableActivities.length === 0 && (
                  <div className="text-base text-zinc-500 text-center py-8">
                    연결 가능한 외부 활동이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* 이미지 크롭 모달 */}
      {
        cropModalOpen && cropImageSrc && (
          <div className="fixed inset-0 z-[260] bg-black p-4 flex flex-col">
            <div className="flex items-center justify-between pb-4">
              <h3 className="font-black text-white text-lg">대표 이미지 설정</h3>
              <button
                onClick={() => {
                  setCropModalOpen(false);
                  setCropImageSrc(null);
                  setGroupEditImageFile(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative flex-1 w-full bg-zinc-900 rounded-2xl overflow-hidden mt-2 mb-6">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={0.1}
                maxZoom={3}
                restrictPosition={false}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="vertical-cover"
              />
            </div>

            <div className="bg-zinc-900 p-5 rounded-3xl space-y-4 mb-4">
              <div className="px-2">
                <label className="text-xs font-bold text-zinc-400 block mb-3">이미지 확대/축소</label>
                <input
                  type="range"
                  value={zoom}
                  min={0.1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#4A6741]"
                />
              </div>
              <button
                onClick={processCrop}
                className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black text-base shadow-lg hover:bg-[#3d5535] transition-all active:scale-[0.98]"
              >
                영역 선택 완료
              </button>
            </div>
          </div>
        )
      }

    </div >
  );
}
