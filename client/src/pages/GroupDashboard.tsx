import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { PTRAwareTouchSensor } from "../lib/ptrAwareTouchSensor";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  ChartBar,
  GripVertical,
  Lock,
  MessageSquare,
  Mic,
  Pause,
  Play,
  HandHeart,
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
import { Loader2, CalendarX, CalendarPlus, User, Heart, Pencil, Search, MoreHorizontal, PenLine, Bookmark, BookmarkCheck, Handshake, Share2, Paperclip, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isBefore, isAfter, startOfDay, addMinutes, addWeeks, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "../lib/supabase";
import { sendPushToGroupMembers, sendPushToGroupUsers } from "../lib/groupPush";
import Cropper from "react-easy-crop";
import getCroppedImg from "../lib/cropImage";
import { shareContent } from "../lib/nativeShare";
import { resolveApiUrl, getPublicWebOrigin, isNativeApp } from "../lib/appUrl";
import { useRefresh } from "../lib/refreshContext";
import { useLogEvent } from "../hooks/useLogEvent";
import { isAudioOrphaned } from "../lib/audioRef";

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
  prayer_text: string | null;
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
  church?: string | null;
  rank?: string | null;
  email?: string | null;
};

function toHttps(url?: string | null) {
  if (!url) return "";
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

const URL_SPLIT_REGEX = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+\.[^\s<>"')\]]+)/g;
function Linkify({ children }: { children: string }) {
  const parts = children.split(URL_SPLIT_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>;
        }
        if (/^www\./.test(part)) {
          return <a key={i} href={`https://${part}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function AvatarImg({ url, size }: { url: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const cls = `rounded-full shrink-0`;
  const dim = { width: size, height: size };
  const src = toHttps(url);
  if (!src || failed) {
    return (
      <div style={dim} className={`${cls} bg-[#4A6741]/10 flex items-center justify-center text-[#4A6741]`}>
        <User size={Math.round(size * 0.45)} />
      </div>
    );
  }
  return (
    <img src={src} style={dim} className={`${cls} object-cover`} alt="avatar" onError={() => setFailed(true)} />
  );
}

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

type ComposerImage = { id: string; kind: "existing"; url: string } | { id: string; kind: "new"; file: File; preview: string };
type ComposerFile = { id: string; kind: "existing"; url: string; name: string } | { id: string; kind: "new"; file: File };

type GroupPostRow = {
  id: number;
  group_id: string;
  author_id: string;
  post_type: "post" | "notice";
  title: string | null;
  content: string;
  created_at: string;
  image_urls?: string[];
  file_attachments?: { url: string; name: string }[];
};

type GroupPostImageRow = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
  file_name?: string | null;
  content_type?: string | null;
};

type GroupPrayerTopic = {
  id: number;
  group_id: string;
  author_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_kind?: "image" | "file" | null;
  attachments?: GroupPrayerTopicAttachment[];
  is_active: boolean;
  created_at: string;
};

type GroupPrayerTopicAttachment = {
  id: number;
  topic_id: number;
  uploader_id: string;
  file_url: string;
  file_name: string | null;
  content_type: string | null;
  attachment_kind: "image" | "file";
  sort_order: number;
  created_at?: string;
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

type MemberFaithWeekDetail = {
  userId: string;
  name: string;
  records: Record<string, Record<string, number>>;
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
  if (role === "owner" || role === "leader") return "모임리더";
  if (role === "scope_leader") return "상위리더";
  if (role === "member") return "일반멤버";
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

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

async function deleteAudioFromR2(fileUrl: string): Promise<void> {
  const token = await getAuthToken();
  fetch(resolveApiUrl("/api/audio/delete"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ fileUrl }),
  }).catch(() => undefined);
}

async function uploadToR2(fileName: string, blob: Blob): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const token = await getAuthToken();
  const response = await fetch(resolveApiUrl("/api/audio/upload"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ fileName, audioBase64 }),
  });

  if (!response.ok) throw new Error("failed to upload audio");
  const data = await response.json();
  return data.publicUrl as string;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isImageAttachment(item?: {
  attachment_kind?: "image" | "file" | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  content_type?: string | null;
  file_name?: string | null;
  file_url?: string | null;
} | null) {
  if (!item) return false;
  const kind = item.attachment_kind;
  const mime = item.attachment_type || item.content_type;
  const name = item.attachment_name || item.file_name;
  const url = item.attachment_url || item.file_url;
  if (kind === "image") return true;
  if (mime?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(name || url || "");
}

function hasVisiblePrayerTopicContent(content?: string | null) {
  return Boolean(content && content.trim());
}

function getTopicAttachments(topic: GroupPrayerTopic): GroupPrayerTopicAttachment[] {
  if (topic.attachments && topic.attachments.length > 0) {
    return [...topic.attachments].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  if (topic.attachment_url) {
    return [{
      id: topic.id * 1000000,
      topic_id: topic.id,
      uploader_id: topic.author_id,
      file_url: topic.attachment_url,
      file_name: topic.attachment_name ?? null,
      content_type: topic.attachment_type ?? null,
      attachment_kind: topic.attachment_kind === "image" || topic.attachment_kind === "file"
        ? topic.attachment_kind
        : (isImageAttachment(topic) ? "image" : "file"),
      sort_order: 0,
      created_at: topic.created_at,
    }];
  }

  return [];
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
  const token = await getAuthToken();
  const response = await fetch(resolveApiUrl("/api/file/upload"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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
  const logEvent = useLogEvent();
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
    logEvent("group", "schedule_add");
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
        <span className="font-black text-xl tracking-tight">{format(currentMonth, "yyyy년 M월")}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronRight /></button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
        <div className="flex border-b border-zinc-100 mb-4">
          <button onClick={() => setListType("event")} className={`flex-1 pb-3 text-base font-black transition-colors border-b-2 ${listType === "event" ? "border-[#4A6741] text-[#4A6741]" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>모임 일정</button>
          <button onClick={() => setListType("unavailable")} className={`flex-1 pb-3 text-base font-black transition-colors border-b-2 ${listType === "unavailable" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>모임 불가</button>
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
              <div key={day.toISOString()} className={`relative border-r border-b border-zinc-200 px-0.5 py-1 min-h-[70px] ${!isCurMonth ? "bg-zinc-50/50" : isSameDay(day, new Date()) ? "bg-zinc-100/80" : "bg-white"} flex flex-col items-center justify-start cursor-pointer hover:bg-zinc-50 transition-colors`} onClick={() => { logEvent("group", "schedule_view"); setSelectedDateEvents({ dateStr, events: daySchedules }); }}>
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

      <button onClick={() => { setFormType("unavailable"); setShowModal(true); setFormTitle(""); }} className="fixed right-6 bottom-44 z-[90] w-12 h-12 rounded-full bg-rose-500 text-white shadow-2xl flex items-center justify-center hover:bg-rose-600 transition-colors" aria-label="불가능 일정 등록">
        <CalendarX size={20} />
      </button>
      <button onClick={() => { setFormType("event"); setShowModal(true); setFormTitle(""); }} className="fixed right-6 bottom-28 z-[90] w-12 h-12 rounded-full bg-[#4A6741]/90 text-white shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors" aria-label="모임일정 등록">
        <CalendarPlus size={20} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowModal(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) {
                setShowModal(false);
              }
            }}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
          >
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-zinc-800">{formType === "event" ? "모임 일정 등록" : "불가능한 일정 등록"}</h3>
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
          </motion.div>
        </div>
      )}

      {selectedDateEvents && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setSelectedDateEvents(null)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) {
                setSelectedDateEvents(null);
              }
            }}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
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
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

const PostImageCarousel = ({ urls, onImageClick }: { urls: string[]; onImageClick: (index: number) => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [urls.join("|")]);

  if (!urls || urls.length === 0) return null;

  return (
    <div className="w-full mt-3 mb-1 flex flex-col relative px-4">
      <div
        className="w-full overflow-hidden pb-2"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartXRef.current = touch?.clientX ?? null;
          touchStartYRef.current = touch?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          const startY = touchStartYRef.current;
          const touch = event.changedTouches[0];
          touchStartXRef.current = null;
          touchStartYRef.current = null;
          if (!touch || startX === null || startY === null) return;
          const deltaX = touch.clientX - startX;
          const deltaY = Math.abs(touch.clientY - startY);
          if (Math.abs(deltaX) < 48 || deltaY > 64) return;
          if (deltaX < 0 && activeIndex < urls.length - 1) {
            setActiveIndex((prev) => prev + 1);
          } else if (deltaX > 0 && activeIndex > 0) {
            setActiveIndex((prev) => prev - 1);
          }
        }}
      >
        <div
          className="flex items-center transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {urls.map((url, idx) => (
            <div key={idx} className="w-full shrink-0 flex justify-center cursor-pointer px-1" onClick={() => onImageClick(idx)}>
              <img src={url} alt={`img-${idx}`} className="w-full h-auto max-h-[400px] object-cover sm:object-contain rounded-2xl shadow-sm border border-black/5" />
            </div>
          ))}
        </div>
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

function SortableItem({
  id,
  disabled = false,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (args: {
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: any;
    listeners: any;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    zIndex: isDragging ? 30 : undefined,
  };

  return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}

export default function GroupDashboard() {
  const [matched, routeParams] = useRoute("/group/:id");
  const routeIdRaw = matched ? (routeParams as { id: string }).id : null;
  const groupId = routeIdRaw?.split("?")[0] || null;
  const urlTabMatch = routeIdRaw?.match(/\?tab=([^&]+)/);
  const initialTab = urlTabMatch ? urlTabMatch[1] : null;
  const [location, setLocation] = useLocation();

  const { refreshKey } = useRefresh();
  const logEvent = useLogEvent();
  const loadedGroupIdRef = useRef<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [ownProfile, setOwnProfile] = useState<{ nickname?: string; username?: string } | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [role, setRole] = useState<GroupRole>("guest");
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (initialTab) return initialTab as TabKey;
    const sessionTab = sessionStorage.getItem("groupDashboardTab");
    return (sessionTab as TabKey) || "faith";
  });


  useEffect(() => {
    sessionStorage.setItem("groupDashboardTab", activeTab);
  }, [activeTab]);
  const [loading, setLoading] = useState(true);

  const [groupPrayers, setGroupPrayers] = useState<GroupPrayerRecord[]>([]);
  const [groupPrayerTopics, setGroupPrayerTopics] = useState<GroupPrayerTopic[]>([]);
  const [personalPrayers, setPersonalPrayers] = useState<PersonalPrayerRecord[]>([]);
  const [showPrayerLinkModal, setShowPrayerLinkModal] = useState(false);
  const [showPrayerComposer, setShowPrayerComposer] = useState(false);
  const [showPrayerTopicModal, setShowPrayerTopicModal] = useState(false);
  const [showPrayerTopicOrderModal, setShowPrayerTopicOrderModal] = useState(false);
  const [showHeartPrayerHistoryModal, setShowHeartPrayerHistoryModal] = useState(false);
  const [heartPrayerHistoryTargetUserId, setHeartPrayerHistoryTargetUserId] = useState<string | null>(null);
  const [heartPrayerHistorySort, setHeartPrayerHistorySort] = useState<"latest" | "oldest" | "name">("latest");
  const [newPrayerTopic, setNewPrayerTopic] = useState("");
  const [newPrayerAttachments, setNewPrayerAttachments] = useState<File[]>([]);
  const [newPrayerAttachmentPreviews, setNewPrayerAttachmentPreviews] = useState<string[]>([]);
  const [isSubmittingPrayerTopic, setIsSubmittingPrayerTopic] = useState(false);
  const [editingPrayerTopicId, setEditingPrayerTopicId] = useState<number | null>(null);
  const [editingPrayerTopicContent, setEditingPrayerTopicContent] = useState("");
  const [editingPrayerRemovedAttachmentIds, setEditingPrayerRemovedAttachmentIds] = useState<number[]>([]);
  const [editingPrayerNewAttachments, setEditingPrayerNewAttachments] = useState<File[]>([]);
  const [editingPrayerNewAttachmentPreviews, setEditingPrayerNewAttachmentPreviews] = useState<string[]>([]);
  const [savingPrayerTopicId, setSavingPrayerTopicId] = useState<number | null>(null);
  const [prayerTopicAuthorOrder, setPrayerTopicAuthorOrder] = useState<string[]>([]);
  const [myPrayerTopicOrder, setMyPrayerTopicOrder] = useState<number[]>([]);
  const [dbPrayerOrder, setDbPrayerOrder] = useState<{ topicIds: number[]; authorIds: string[] } | null>(null);

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
  const [selectedFaithMemberDetail, setSelectedFaithMemberDetail] = useState<MemberFaithWeekDetail | null>(null);
  const [memberFaithDetailLoading, setMemberFaithDetailLoading] = useState(false);
  const [memberFaithDetailSaving, setMemberFaithDetailSaving] = useState(false);

  const [posts, setPosts] = useState<GroupPostRow[]>([]);
  const [postType, setPostType] = useState<"post" | "notice">("post");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [socialViewMode, setSocialViewMode] = useState<"board" | "blog">("board");
  const [showPostComposerModal, setShowPostComposerModal] = useState(false);
  const [editingPost, setEditingPost] = useState<GroupPostRow | null>(null);
  const [postImages, setPostImages] = useState<ComposerImage[]>([]);
  const [postFiles, setPostFiles] = useState<ComposerFile[]>([]);
  const [postLikes, setPostLikes] = useState<Record<number, any[]>>({});
  const [postComments, setPostComments] = useState<Record<number, any[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [editingComment, setEditingComment] = useState<{ postId: number; commentId: number; content: string } | null>(null);
  const [authorMap, setAuthorMap] = useState<Record<string, ProfileLite>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const imgGesture = useRef({ scale: 1, panX: 0, panY: 0, startDist: 0, startScale: 1, lastX: 0, lastY: 0, isPinching: false, tapStartX: 0, tapStartY: 0 });
  const modalImgRef = useRef<HTMLImageElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);

  // 이미지 최대보기 모달 — 뒤로가기 시 닫기
  useEffect(() => {
    if (showImageModal) {
      history.pushState({ imageModal: true }, "");
      const onPop = () => setShowImageModal(false);
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
  }, [showImageModal]);

  // 이미지 전환 or 모달 닫힐 때 줌 리셋
  useEffect(() => {
    imgGesture.current = { scale: 1, panX: 0, panY: 0, startDist: 0, startScale: 1, lastX: 0, lastY: 0, isPinching: false };
    if (modalImgRef.current) modalImgRef.current.style.transform = '';
  }, [modalIndex, showImageModal]);
  const touchStartYRef = useRef<number | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [partners, setPartners] = useState<Array<{ id: number; partner_user_id: string }>>([]);
  const [partnerRequests, setPartnerRequests] = useState<Array<{ id: number; requester_id: string; created_at: string; profile?: ProfileLite }>>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [partnerSending, setPartnerSending] = useState(false);
  const [confirmPartnerAction, setConfirmPartnerAction] = useState<{ type: 'accept' | 'reject'; requestId: number; requesterId: string; name: string } | null>(null);
  const [partnerToast, setPartnerToast] = useState<string | null>(null);
  const showPartnerToast = (msg: string) => { setPartnerToast(msg); setTimeout(() => setPartnerToast(null), 3000); };

  const [showPrayerShareModal, setShowPrayerShareModal] = useState(false);
  const [selectedShareUserIds, setSelectedShareUserIds] = useState<Set<string>>(new Set());

  const [joinPassword, setJoinPassword] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [guestJoinPending, setGuestJoinPending] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [scopeLeaderUserId, setScopeLeaderUserId] = useState("");
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
  const [leaderSearchResults, setLeaderSearchResults] = useState<ProfileLite[]>([]);
  const [isSearchingLeader, setIsSearchingLeader] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<ProfileLite | null>(null);
  const [scopeLeaders, setScopeLeaders] = useState<ProfileLite[]>([]);

  const [closingGroup, setClosingGroup] = useState(false);

  const [showHeaderEditModal, setShowHeaderEditModal] = useState(false);
  const [heartPrayerToast, setHeartPrayerToast] = useState<string | null>(null);
  const [showTextPrayerModal, setShowTextPrayerModal] = useState(false);
  const [textPrayerTargetUserId, setTextPrayerTargetUserId] = useState<string | null>(null);
  const [textPrayerContent, setTextPrayerContent] = useState("");
  const [textPrayerEditId, setTextPrayerEditId] = useState<number | null>(null);
  const [textPrayerSaving, setTextPrayerSaving] = useState(false);
  // topicId → 마지막 저장 시점의 content (수정 감지용)
  const [savedPrayerContentMap, setSavedPrayerContentMap] = useState<Map<number, string>>(new Map());
  const [prayerBoxToast, setPrayerBoxToast] = useState<string | null>(null);
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

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser ? { id: sessionUser.id } : null);
      setAuthReady(true);
    }).catch(() => {
      if (!mounted) return;
      setUser(null);
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
    if (!user?.id) { setOwnProfile(null); return; }
    supabase.from("profiles").select("nickname, username").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setOwnProfile({ nickname: data.nickname ?? undefined, username: data.username ?? undefined }); });
  }, [user?.id]);

  useEffect(() => {
    if (!authReady) return;
    if (!groupId) return;
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const queryTab = searchParams.get("tab");
    const validTabs: TabKey[] = ["faith", "prayer", "social", "members", "admin", "schedule"];

    if (queryTab && validTabs.includes(queryTab as TabKey)) {
      setActiveTab(queryTab as TabKey);
    } else {
      // url param이 없을 때는 sessionStorage를 우선하고 (새로고침 대응), 없으면 faith로 설정 (진입 시 대응)
      // 단, CommunityPage에서 진입할 때 sessionStorage를 명시적으로 비워줌으로써 '진입 시 신앙생활' 요구사항 충족
      const sessionTab = sessionStorage.getItem("groupDashboardTab") as TabKey | null;
      if (sessionTab && validTabs.includes(sessionTab)) {
        setActiveTab(sessionTab);
      } else {
        setActiveTab("faith");
      }
    }
    void loadAll(groupId, user?.id ?? null);
  }, [groupId, user?.id, location, authReady, refreshKey]);

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
    const urls = newPrayerAttachments.map((file) => URL.createObjectURL(file));
    setNewPrayerAttachmentPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPrayerAttachments]);

  useEffect(() => {
    const urls = editingPrayerNewAttachments.map((file) => URL.createObjectURL(file));
    setEditingPrayerNewAttachmentPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editingPrayerNewAttachments]);

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
  // 푸시 알림용 발신자 이름 — members 프로필 우선, 본인 profiles 테이블 폴백 (상위리더 등 비멤버 대응)
  const myDisplayName = useMemo(() => {
    if (!user) return "모임원";
    const myMember = members.find(m => m.user_id === user.id);
    return myMember?.profile?.nickname || myMember?.profile?.username ||
           ownProfile?.nickname || ownProfile?.username || "모임원";
  }, [user, members, ownProfile]);
  // 알림 발송 시점에 항상 정확한 이름 반환 — ownProfile 미로드 시 DB 직접 조회
  const getSenderName = useCallback(async (): Promise<string> => {
    if (!user) return "모임원";
    const myMember = members.find(m => m.user_id === user.id);
    const cached = myMember?.profile?.nickname || myMember?.profile?.username ||
                   ownProfile?.nickname || ownProfile?.username;
    if (cached) return cached;
    const { data } = await supabase.from("profiles").select("nickname, username").eq("id", user.id).maybeSingle();
    return data?.nickname || data?.username || "모임원";
  }, [user, members, ownProfile]);
  const faithMemberMap = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.user_id,
          member.profile?.nickname || member.profile?.username || "이름없음",
        ])
      ),
    [members]
  );

  const loadAll = async (targetGroupId: string, userId: string | null) => {
    const isInitialLoad = loadedGroupIdRef.current !== targetGroupId;
    if (isInitialLoad) setLoading(true);

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
      if (memberData?.role) {
        nextRole = memberData.role as GroupRole;
      } else {
        // 일반 멤버가 아닐 경우 상위 리더인지 확인
        const { data: scopeLeader } = await supabase
          .from("group_scope_leaders")
          .select("id")
          .eq("root_group_id", targetGroupId)
          .eq("user_id", userId)
          .maybeSingle();
        if (scopeLeader) {
          nextRole = "leader"; // 상위 리더에게 리더 권한 부여
        }
      }
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
      loadScopeLeaders(targetGroupId),
      loadSavedPrayerTopics(userId!),
      loadPartners(targetGroupId, userId!),
      loadPartnerRequests(targetGroupId, userId!),
    ]);

    if (nextRole === "owner" || nextRole === "leader") {
      await loadFaithBoard(targetGroupId, buildWeekIso(new Date()), nextMembers);
    } else {
      setFaithBoardRows([]);
    }

    loadedGroupIdRef.current = targetGroupId;
    setLoading(false);
  };

  const loadGroupPrayerTopics = async (targetGroupId: string) => {
    const { data, error } = await supabase
      .from("group_prayer_topics")
      .select("*")
      .eq("group_id", targetGroupId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setGroupPrayerTopics([]);
      return;
    }

    const topics = (data ?? []) as GroupPrayerTopic[];
    const topicIds = topics.map((topic) => topic.id);
    if (topicIds.length > 0) {
      const { data: attachmentRows, error: attachmentError } = await supabase
        .from("group_prayer_topic_attachments")
        .select("id, topic_id, uploader_id, file_url, file_name, content_type, attachment_kind, sort_order, created_at")
        .in("topic_id", topicIds)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (!attachmentError) {
        const attachmentMap = new Map<number, GroupPrayerTopicAttachment[]>();
        (attachmentRows ?? []).forEach((row) => {
          const list = attachmentMap.get(row.topic_id) ?? [];
          list.push(row as GroupPrayerTopicAttachment);
          attachmentMap.set(row.topic_id, list);
        });

        topics.forEach((topic) => {
          topic.attachments = attachmentMap.get(topic.id) ?? getTopicAttachments(topic);
        });
      }
    }
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
      .select("id, group_id, user_id, source_type, source_prayer_record_id, title, audio_url, audio_duration, prayer_text, created_at")
      .eq("group_id", targetGroupId)
      .order("created_at", { ascending: false });

    const records = (data ?? []) as GroupPrayerRecord[];
    setGroupPrayers(records);

    const authorIds = Array.from(new Set(records.map((record) => record.user_id).filter(Boolean)));
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

  const getPrayerBoxStorageKey = (userId: string) => `myamen_prayer_box_${userId}`;

  const getPrayerBoxItems = (userId: string): Array<{ topicId: number; content: string; groupName: string; savedAt: string }> => {
    try { return JSON.parse(localStorage.getItem(getPrayerBoxStorageKey(userId)) || "[]"); } catch { return []; }
  };

  const loadPartners = async (gId: string, userId: string) => {
    const { data } = await supabase
      .from("group_partners")
      .select("id, requester_id, target_id, status")
      .eq("group_id", gId)
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .eq("status", "accepted");
    (data ?? []).forEach((row: { id: number; requester_id: string; target_id: string; status: string }) => {
      const partnerId = row.requester_id === userId ? row.target_id : row.requester_id;
      setPartners(prev => [...prev.filter(p => p.partner_user_id !== partnerId), { id: row.id, partner_user_id: partnerId }]);
    });
  };

  const loadPartnerRequests = async (gId: string, userId: string) => {
    const { data } = await supabase
      .from("group_partners")
      .select("id, requester_id, created_at")
      .eq("group_id", gId)
      .eq("target_id", userId)
      .eq("status", "pending");
    if (!data?.length) { setPartnerRequests([]); return; }
    const requesterIds = data.map((r: { id: number; requester_id: string; created_at: string }) => r.requester_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, nickname, avatar_url")
      .in("id", requesterIds);
    const profileMap = new Map((profiles ?? []).map((p: ProfileLite) => [p.id, p]));
    setPartnerRequests(data.map((r: { id: number; requester_id: string; created_at: string }) => ({
      id: r.id,
      requester_id: r.requester_id,
      created_at: r.created_at,
      profile: profileMap.get(r.requester_id),
    })));
  };

  const sendPartnerRequests = async () => {
    if (!group || !user || !selectedPartnerIds.size) return;
    setPartnerSending(true);
    try {
      const rows = Array.from(selectedPartnerIds).map(tid => ({
        group_id: group.id,
        requester_id: user.id,
        target_id: tid,
        status: "pending",
      }));
      await supabase.from("group_partners").upsert(rows, { onConflict: "group_id,requester_id,target_id" });
      // 푸시 알림
      for (const tid of Array.from(selectedPartnerIds)) {
        sendPushToGroupUsers({
          groupId: group.id,
          targetUserIds: [tid],
          title: group.name,
          body: `${await getSenderName()}님이 동역자 요청을 보냈어요. 수락하면 동역자가 내 기도제목에 달린 중보기도를 확인할 수 있어요.`,
          targetPath: `/#/group/${group.id}?tab=members`,
        });
      }
      setShowPartnerModal(false);
      setSelectedPartnerIds(new Set());
      showPartnerToast(`동역자 요청을 보냈습니다. 상대방이 수락하면 알림이 옵니다.`);
    } catch (err) {
      console.error(err);
      alert("동역자 신청에 실패했습니다.");
    } finally {
      setPartnerSending(false);
    }
  };

  const resolvePartnerRequest = async (requestId: number, accept: boolean, requesterId: string) => {
    if (!group || !user) return;
    if (accept) {
      await supabase.from("group_partners").update({ status: "accepted" }).eq("id", requestId);
      setPartners(prev => [...prev, { id: requestId, partner_user_id: requesterId }]);
      // 요청자에게 수락 알림
      sendPushToGroupUsers({
        groupId: group.id,
        targetUserIds: [requesterId],
        title: group.name,
        body: `${await getSenderName()}님이 동역자 요청을 수락했어요. 동역자 기도제목에 달린 중보기도를 확인할 수 있어요.`,
        targetPath: `/#/group/${group.id}?tab=members`,
      });
    } else {
      await supabase.from("group_partners").delete().eq("id", requestId);
    }
    setPartnerRequests(prev => prev.filter(r => r.id !== requestId));
    showPartnerToast(accept ? "동역자 요청을 수락했습니다." : "동역자 요청을 거절했습니다.");
  };

  const removePartner = async (partnerId: string) => {
    if (!group || !user) return;
    if (!confirm("동역자 관계를 해지하시겠습니까?")) return;
    const row = partners.find(p => p.partner_user_id === partnerId);
    if (!row) return;
    await supabase.from("group_partners").delete().eq("id", row.id);
    setPartners(prev => prev.filter(p => p.partner_user_id !== partnerId));
  };

  const loadSavedPrayerTopics = async (userId: string) => {
    const { data } = await supabase
      .from("prayer_box_items")
      .select("source_topic_id, topic_content")
      .eq("user_id", userId)
      .eq("source_type", "group")
      .not("source_topic_id", "is", null);
    const map = new Map<number, string>();
    (data ?? []).forEach((i: { source_topic_id: number; topic_content: string }) => {
      map.set(i.source_topic_id, i.topic_content);
    });
    setSavedPrayerContentMap(map);
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

  const loadScopeLeaders = async (targetGroupId: string) => {
    const { data: scopeRoles } = await supabase
      .from("group_scope_leaders")
      .select("user_id, profiles(*)")
      .eq("root_group_id", targetGroupId);

    if (scopeRoles && scopeRoles.length > 0) {
      const leaders = scopeRoles.map(row => row.profiles as unknown as ProfileLite).filter(p => !!p);
      setScopeLeaders(leaders);
    } else {
      setScopeLeaders([]);
    }
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
    const todayLocalIso = format(new Date(), "yyyy-MM-dd");
    if (dateIso > todayLocalIso) {
      alert("미래 날짜는 입력할 수 없습니다.");
      return;
    }
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
      const todayIso = format(new Date(), "yyyy-MM-dd");
      if (dateIso === todayIso) await loadFaith(group.id, user.id);
    } catch (error) {
      console.error("failed to toggle faith record:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const loadMemberFaithWeekDetail = async (targetUserId: string) => {
    if (!group?.id || !weekDates.length) return;
    setMemberFaithDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_faith_records")
        .select("item_id, value, record_date")
        .eq("group_id", group.id)
        .eq("user_id", targetUserId)
        .in("record_date", weekDates);

      if (error) throw error;

      const records: Record<string, Record<string, number>> = {};
      (data ?? []).forEach((row: any) => {
        const date = String(row.record_date);
        records[date] = records[date] ?? {};
        records[date][String(row.item_id)] = Number(row.value ?? 0);
      });

      setSelectedFaithMemberDetail({
        userId: targetUserId,
        name: faithMemberMap.get(targetUserId) || "이름없음",
        records,
      });
    } catch (error) {
      console.error("failed to load member faith detail:", error);
      alert("멤버 주간 현황을 불러오지 못했습니다.");
    } finally {
      setMemberFaithDetailLoading(false);
    }
  };

  const handleManagerAttendanceToggle = async (dateIso: string) => {
    if (!group || !selectedFaithMemberDetail || !isManager) return;
    const attendanceItem = faithItemSlots.find((slot) => slot.key === "attendance")?.item;
    if (!attendanceItem) {
      alert("예배 항목이 설정되지 않았습니다.");
      return;
    }

    const current = selectedFaithMemberDetail.records[dateIso]?.[attendanceItem.id] ?? 0;
    setMemberFaithDetailSaving(true);
    try {
      if (current > 0) {
        await supabase
          .from("group_faith_records")
          .delete()
          .eq("group_id", group.id)
          .eq("item_id", attendanceItem.id)
          .eq("user_id", selectedFaithMemberDetail.userId)
          .eq("record_date", dateIso);
      } else {
        const { error } = await supabase.from("group_faith_records").upsert(
          {
            group_id: group.id,
            item_id: attendanceItem.id,
            user_id: selectedFaithMemberDetail.userId,
            record_date: dateIso,
            value: 1,
            note: null,
            source_type: "manual",
            source_event_type: null,
            source_event_id: null,
          },
          { onConflict: "group_id,item_id,user_id,record_date" }
        );
        if (error) throw error;
      }

      await Promise.all([
        loadMemberFaithWeekDetail(selectedFaithMemberDetail.userId),
        loadFaithBoard(group.id, buildWeekIso(faithCurrentDate), members),
      ]);
      if (selectedFaithMemberDetail.userId === user?.id) {
        await loadWeeklyFaithRecords(faithCurrentDate);
      }
    } catch (error) {
      console.error("failed to update attendance:", error);
      alert("예배 현황 수정에 실패했습니다.");
    } finally {
      setMemberFaithDetailSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedFaithMemberDetail) return;
    void loadMemberFaithWeekDetail(selectedFaithMemberDetail.userId);
  }, [selectedFaithMemberDetail?.userId, weekDates.join("|")]);

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
        .select("id, post_id, image_url, sort_order, file_name, content_type")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (!imageErr) {
        const imageMap = new Map<number, string[]>();
        const fileMap = new Map<number, { url: string; name: string }[]>();
        ((imageRows ?? []) as GroupPostImageRow[]).forEach((row) => {
          const isFile = row.content_type && !row.content_type.startsWith("image/");
          if (isFile) {
            const prev = fileMap.get(row.post_id) ?? [];
            prev.push({ url: row.image_url, name: row.file_name || "파일" });
            fileMap.set(row.post_id, prev);
          } else {
            const prev = imageMap.get(row.post_id) ?? [];
            prev.push(row.image_url);
            imageMap.set(row.post_id, prev);
          }
        });

        nextPosts = nextPosts.map((post) => ({
          ...post,
          image_urls: imageMap.get(post.id) ?? [],
          file_attachments: fileMap.get(post.id) ?? [],
        }));
      }

      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("group_post_likes").select("id, post_id, user_id").in("post_id", postIds),
        supabase.from("group_post_comments").select("id, post_id, user_id, content, created_at").in("post_id", postIds).order("created_at", { ascending: true })
      ]);
      const lMap: Record<number, any[]> = {};
      const cMap: Record<number, any[]> = {};
      (likesRes.data ?? []).forEach((l: any) => {
        if (!lMap[l.post_id]) lMap[l.post_id] = [];
        lMap[l.post_id].push(l);
      });
      (commentsRes.data ?? []).forEach((c: any) => {
        if (!cMap[c.post_id]) cMap[c.post_id] = [];
        cMap[c.post_id].push(c);
      });
      setPostLikes(lMap);
      setPostComments(cMap);
    }

    nextPosts = [...nextPosts].sort((a, b) => {
      if (a.post_type !== b.post_type) {
        return a.post_type === "notice" ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(nextPosts);

    const authorIds = Array.from(new Set([
      ...nextPosts.map((post) => post.author_id),
      ...Object.values(postComments).flatMap(arr => arr.map(c => c.user_id))
    ]));
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
        avatar_url: row.avatar_url ?? null,
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
        if (name.length > 7) name = name.substring(0, 7) + "...";

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

      // 그룹 오너에게 가입 신청 알림 (비동기, 비치명적)
      sendPushToGroupUsers({
        groupId: group.id,
        targetUserIds: [group.owner_id!],
        title: group.name,
        body: `${group.name}에 ${await getSenderName()}님이 가입 신청을 했어요.`,
        targetPath: `/#/group/${group.id}?tab=members`,
      });
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

      // 기도 대상자에게 알림 (음성기도)
      const voiceUserMatch = recordTitle.trim().match(/^\[user:([a-fA-F0-9-]+)\]/i);
      if (voiceUserMatch && voiceUserMatch[1] !== user.id) {
        sendPushToGroupUsers({
          groupId: group.id,
          targetUserIds: [voiceUserMatch[1]],
          title: group.name,
          body: `${group.name}의 내 기도제목에 ${await getSenderName()}님이 음성기도를 남겨주셨어요.`,
          targetPath: `/#/group/${group.id}?tab=prayer`,
        });
      }

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

  const deleteFileFromR2 = async (fileUrl?: string | null) => {
    if (!fileUrl) return;
    try {
      const token = await getAuthToken();
      await fetch(resolveApiUrl("/api/file/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileUrl }),
      });
    } catch {
      // Keep DB actions non-blocking even if remote cleanup fails.
    }
  };

  const uploadPrayerTopicAttachment = async (file: File) => {
    if (!group || !user) return null;
    const safeName = sanitizeFileName(file.name || "attachment");
    const isImage = file.type.startsWith("image/");
    const baseFolder = isImage ? "images/group-prayer-topics" : "files/group-prayer-topics";
    const key = `${baseFolder}/${group.id}/${user.id}/${Date.now()}_${safeName}`;

    if (isImage) {
      const optimized = await resizeImageFile(file, 1280, 0.84);
      const publicUrl = ensureHttpsUrl(await uploadFileToR2(key, optimized, optimized.type || "image/jpeg"));
      return {
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: optimized.type || file.type || "image/jpeg",
        attachment_kind: "image" as const,
      };
    }

    const publicUrl = ensureHttpsUrl(await uploadFileToR2(key, file, file.type || "application/octet-stream"));
    return {
      attachment_url: publicUrl,
      attachment_name: file.name,
      attachment_type: file.type || "application/octet-stream",
      attachment_kind: "file" as const,
    };
  };

  const uploadPrayerTopicAttachments = async (files: File[]) => {
    const uploaded = await Promise.all(files.map((file) => uploadPrayerTopicAttachment(file)));
    return uploaded.filter(Boolean) as Array<NonNullable<Awaited<ReturnType<typeof uploadPrayerTopicAttachment>>>>;
  };

  const startEditingPrayerTopic = (topic: GroupPrayerTopic) => {
    if (!user || topic.author_id !== user.id) return;
    setEditingPrayerTopicId(topic.id);
    setEditingPrayerTopicContent(topic.content);
    setEditingPrayerRemovedAttachmentIds([]);
    setEditingPrayerNewAttachments([]);
  };

  const cancelEditingPrayerTopic = () => {
    setEditingPrayerTopicId(null);
    setEditingPrayerTopicContent("");
    setEditingPrayerRemovedAttachmentIds([]);
    setEditingPrayerNewAttachments([]);
  };

  const handleNewPrayerAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) {
      setNewPrayerAttachments((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  };

  const handleEditingPrayerAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) {
      setEditingPrayerNewAttachments((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  };

  const addPrayerTopic = async () => {
    if (!group || !user || (!newPrayerTopic.trim() && newPrayerAttachments.length === 0)) return;
    logEvent("group", "prayer_add");
    setIsSubmittingPrayerTopic(true);
    const uploadedAttachmentUrls: string[] = [];
    try {
      const { data: createdTopic, error } = await supabase.from("group_prayer_topics").insert({
        group_id: group.id,
        author_id: user.id,
        content: newPrayerTopic.trim(),
        is_active: true,
      }).select("id").single();

      if (error) {
        if (error.code === "42P01" || error.code === "42703") {
          alert("기도제목 첨부 기능을 사용하려면 최신 DB 마이그레이션 적용이 필요합니다.");
          return;
        }
        throw error;
      }

      if (createdTopic?.id && newPrayerAttachments.length > 0) {
        const uploaded = await uploadPrayerTopicAttachments(newPrayerAttachments);
        uploadedAttachmentUrls.push(...uploaded.map((item) => item.attachment_url).filter(Boolean) as string[]);
        const { error: attachmentError } = await supabase.from("group_prayer_topic_attachments").insert(
          uploaded.map((item, index) => ({
            topic_id: createdTopic.id,
            uploader_id: user.id,
            file_url: item.attachment_url,
            file_name: item.attachment_name,
            content_type: item.attachment_type,
            attachment_kind: item.attachment_kind,
            sort_order: index,
          }))
        );
        if (attachmentError) {
          if (attachmentError.code === "42P01" || attachmentError.code === "42703") {
            const firstAttachment = uploaded[0];
            if (firstAttachment) {
              const { error: legacyAttachmentError } = await supabase
                .from("group_prayer_topics")
                .update({
                  attachment_url: firstAttachment.attachment_url,
                  attachment_name: firstAttachment.attachment_name,
                  attachment_type: firstAttachment.attachment_type,
                  attachment_kind: firstAttachment.attachment_kind,
                })
                .eq("id", createdTopic.id);
              if (legacyAttachmentError) throw legacyAttachmentError;
            }
          } else {
            throw attachmentError;
          }
        }
      }

      setNewPrayerTopic("");
      setNewPrayerAttachments([]);
      await loadGroupPrayerTopics(group.id);

      // 그룹 멤버 전체에게 새 기도제목 알림 (비동기, 비치명적)
      sendPushToGroupMembers({
        groupId: group.id,
        title: group.name,
        body: `${group.name}에 ${await getSenderName()}님이 새 기도제목을 등록하셨어요.`,
        targetPath: `/#/group/${group.id}?tab=prayer`,
      });
    } catch (error) {
      await Promise.all(uploadedAttachmentUrls.map((url) => deleteFileFromR2(url)));
      console.error(error);
      alert("기도제목 등록에 실패했습니다.");
    } finally {
      setIsSubmittingPrayerTopic(false);
    }
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

    if (record.source_type === "direct" && record.audio_url) {
      isAudioOrphaned(record.audio_url).then((orphaned) => {
        if (orphaned) {
          void deleteAudioFromR2(record.audio_url);
        }
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
      logEvent("group", "faith_filter", { type: linkedType });
    }
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
    if (Array.from(files).length > 0) logEvent("group", "image_attach");
    const newItems: ComposerImage[] = Array.from(files).map(file => ({
      id: `n-img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: "new" as const,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPostImages(prev => [...prev, ...newItems].slice(0, 10));
  };

  const handlePostFileSelect = (files: FileList | null) => {
    if (!files) return;
    const MAX_FILE_SIZE = 30 * 1024 * 1024;
    const valid: File[] = [];
    const oversized: string[] = [];
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) oversized.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      else valid.push(file);
    });
    if (oversized.length > 0) alert(`파일당 최대 30MB까지 첨부 가능합니다.\n용량 초과:\n${oversized.join("\n")}`);
    if (valid.length > 0) {
      const newItems: ComposerFile[] = valid.map(file => ({
        id: `n-file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "new" as const,
        file,
      }));
      setPostFiles(prev => [...prev, ...newItems].slice(0, 5));
    }
  };

  const addPost = async () => {
    if (!group || !user || (!postContent.trim() && postImages.length === 0 && postFiles.length === 0)) return;
    if (postType === "notice" && !isManager) {
      alert("공지 작성은 리더/관리자만 가능합니다.");
      return;
    }
    if (!editingPost) logEvent("group", "post_create");
    // @ts-ignore
    setShowPostComposerModal('submitting');
    setIsSubmittingPost(true);

    const uploadAttachments = async (postId: number) => {
      const rows: object[] = [];
      let idx = 0;
      for (const item of postImages) {
        if (item.kind === "existing") {
          rows.push({ post_id: postId, uploader_id: user.id, image_url: item.url, sort_order: idx++, file_name: null, content_type: "image/jpeg" });
        } else {
          const resized = await resizeImageFile(item.file, 1080, 0.82);
          const safeName = sanitizeFileName(resized.name || `image_${idx}.jpg`);
          const key = `images/group-posts/${group.id}/${user.id}/${Date.now()}_${idx}_${safeName}`;
          const url = await uploadFileToR2(key, resized, resized.type || "image/jpeg");
          rows.push({ post_id: postId, uploader_id: user.id, image_url: url, sort_order: idx++, file_name: null, content_type: "image/jpeg" });
        }
      }
      for (const item of postFiles) {
        if (item.kind === "existing") {
          rows.push({ post_id: postId, uploader_id: user.id, image_url: item.url, sort_order: idx++, file_name: item.name, content_type: "application/octet-stream" });
        } else {
          const safeName = sanitizeFileName(item.file.name || `file_${idx}`);
          const key = `files/group-posts/${group.id}/${user.id}/${Date.now()}_${idx}_${safeName}`;
          const url = await uploadFileToR2(key, item.file, item.file.type || "application/octet-stream");
          rows.push({ post_id: postId, uploader_id: user.id, image_url: url, sort_order: idx++, file_name: item.file.name, content_type: "application/octet-stream" });
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("group_post_images").insert(rows);
        if (error) throw error;
      }
    };

    const resetComposer = () => {
      setPostTitle(""); setPostContent(""); setPostImages([]); setPostFiles([]);
      setShowPostComposerModal(false);
    };

    if (editingPost) {
      const { error } = await supabase
        .from("group_posts")
        .update({ title: postTitle.trim() || null, content: postContent.trim(), post_type: postType })
        .eq("id", editingPost.id);
      if (error) { alert("게시글 수정에 실패했습니다."); setIsSubmittingPost(false); return; }

      // R2에서 제거된 첨부파일 삭제
      const keptImageUrls = new Set(postImages.filter(i => i.kind === "existing").map(i => (i as any).url as string));
      (editingPost.image_urls || []).filter(url => !keptImageUrls.has(url)).forEach(url => void deleteAudioFromR2(url));
      const keptFileUrls = new Set(postFiles.filter(f => f.kind === "existing").map(f => (f as any).url as string));
      (editingPost.file_attachments || []).filter(f => !keptFileUrls.has(f.url)).forEach(f => void deleteAudioFromR2(f.url));

      await supabase.from("group_post_images").delete().eq("post_id", editingPost.id);
      try { await uploadAttachments(editingPost.id); }
      catch (e) { console.error(e); alert("첨부파일 업로드/저장에 실패했습니다."); }

      resetComposer(); setEditingPost(null);
      await loadPosts(group.id);
      setIsSubmittingPost(false);
      return;
    }

    const payload = { group_id: group.id, author_id: user.id, post_type: postType, title: postTitle.trim() || null, content: postContent.trim() };
    let createdPostId: number | null = null;
    let { data: createdPost, error } = await supabase.from("group_posts").insert(payload).select("id").single();
    if (!error) createdPostId = createdPost?.id ?? null;

    if (error && error.code === "42703") {
      const merged = postTitle.trim() ? `[${postTitle.trim()}]\n${postContent.trim()}` : postContent.trim();
      const fallback = await supabase.from("group_posts").insert({ group_id: group.id, author_id: user.id, post_type: postType, content: merged }).select("id").single();
      error = fallback.error;
      createdPostId = fallback.data?.id ?? null;
    }
    if (error) { alert("게시글 등록에 실패했습니다."); setIsSubmittingPost(false); return; }

    if (createdPostId && (postImages.length > 0 || postFiles.length > 0)) {
      try { await uploadAttachments(createdPostId); }
      catch (e) { console.error(e); alert(`첨부파일 업로드/저장에 실패했습니다: ${e instanceof Error ? e.message : ""}`); }
    }

    setPostType("post"); resetComposer();
    await loadPosts(group.id);
    setIsSubmittingPost(false);

    // 그룹 멤버 전체에게 새 게시글 알림 (비동기, 비치명적)
    sendPushToGroupMembers({
      groupId: group.id,
      title: group.name,
      body: `${group.name}에 새 교제나눔글이 등록되었어요.`,
      targetPath: `/#/group/${group.id}?tab=social`,
    });
  };

  const removePost = async (post: GroupPostRow) => {
    if (!group || !user) return;
    if (!(isManager || post.author_id === user.id)) return;
    if (!confirm("이 게시글을 지울까요?")) return;

    if (post.image_urls && post.image_urls.length > 0) {
      for (const url of post.image_urls) {
        void deleteAudioFromR2(url);
      }
    }

    const { error } = await supabase.from("group_posts").delete().eq("id", post.id);
    if (error) {
      alert("삭제 중 오류가 발생했습니다.");
      return;
    }
    await loadPosts(group.id);
  };

  const togglePostLike = async (postId: number) => {
    if (!group || !user) return;
    const likes = postLikes[postId] || [];
    const myLike = likes.find(l => l.user_id === user.id);

    if (myLike) {
      await supabase.from("group_post_likes").delete().eq("id", myLike.id);
      setPostLikes(prev => ({ ...prev, [postId]: prev[postId].filter(l => l.id !== myLike.id) }));
    } else {
      const { data } = await supabase.from("group_post_likes").insert({ post_id: postId, user_id: user.id }).select().single();
      if (data) {
        setPostLikes(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
        const post = posts.find(p => p.id === postId);
        if (post && post.author_id !== user.id) {
          sendPushToGroupUsers({
            groupId: group.id,
            targetUserIds: [post.author_id],
            title: group.name,
            body: `${group.name}의 내 게시글에 좋아요가 달렸어요.`,
            targetPath: `/#/group/${group.id}?tab=social`,
          });
        }
      }
    }
  };

  const addComment = async (postId: number) => {
    if (!group || !user) return;
    const text = commentDrafts[postId]?.trim();
    if (!text) return;

    logEvent("group", "comment_create");
    const { data } = await supabase.from("group_post_comments").insert({ post_id: postId, user_id: user.id, content: text }).select().single();
    if (data) {
      setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
      // Ensure the user's own profile is in authorMap for immediate display
      const myProfile = authorMap[user.id];
      if (!myProfile && user.user_metadata) {
        setAuthorMap(prev => ({ ...prev, [user.id]: { id: user.id, username: user.user_metadata.username || "", nickname: user.user_metadata.nickname || "", avatar_url: user.user_metadata.avatar_url || "" } }));
      }

      // 게시물 작성자에게 댓글 알림 (본인 제외)
      const post = posts.find(p => p.id === postId);
      if (post && post.author_id !== user.id && group) {
        sendPushToGroupUsers({
          groupId: group.id,
          targetUserIds: [post.author_id],
          title: group.name,
          body: `${group.name}의 내 게시글에 댓글이 달렸어요.`,
          targetPath: `/#/group/${group.id}?tab=social`,
        });
      }
    }
  };

  const deleteComment = async (postId: number, commentId: number) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    await supabase.from("group_post_comments").delete().eq("id", commentId);
    setPostComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }));
  };

  const updateComment = async (postId: number, commentId: number, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await supabase.from("group_post_comments").update({ content: trimmed }).eq("id", commentId);
    setPostComments(prev => ({
      ...prev,
      [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content: trimmed } : c),
    }));
    setEditingComment(null);
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

  const transferGroupAuthority = async (targetUserId: string, targetName: string) => {
    if (!group || role !== "owner") return;
    if (!confirm(`[${targetName}]님에게 모임리더 권한을 양도하시겠습니까?\n양도 후 본인은 일반 멤버로 전환되며, 신규 리더가 모든 관리 권한을 갖게 됩니다.`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("transfer_group_authority", {
        p_group_id: group.id,
        p_new_owner_id: targetUserId,
      });

      if (error || !data) throw error || new Error("양도 실패");

      alert("모임리더 권한이 성공적으로 양도되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error("transfer authority failed:", err);
      alert("권한 양도 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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

    const req = joinRequests.find(r => r.id === requestId);
    await loadAll(group.id, user.id);
    if (req) {
      sendPushToGroupUsers({
        groupId: group.id,
        targetUserIds: [req.user_id],
        title: group.name,
        body: `${group.name} 가입 신청이 ${approve ? "승인" : "거절"}되었어요.`,
        targetPath: `/#/group/${group.id}`,
      });
    }
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

  const resetGroupImage = async () => {
    if (!group || !isManager) return;
    if (!confirm("모임 대표 이미지를 초기화하시겠습니까?")) return;
    try {
      setGroupEditImageUploading(true);
      const oldImages = [group.group_image, group.header_image_url].filter(Boolean) as string[];

      const { error } = await supabase.rpc("update_group_visual_settings", {
        p_group_id: group.id,
        p_group_image: null,
        p_header_image_url: null,
        p_header_color: "#4A6741"
      });

      if (error) throw error;

      // 기존 이미지 R2에서 삭제
      for (const url of oldImages) {
        void deleteAudioFromR2(url);
      }

      setGroup(prev => prev ? { ...prev, group_image: null, header_image_url: null, header_color: "#4A6741" } : prev);
      setGroupEditImageFile(null);
      alert("모임 대표 이미지가 초기화되었습니다.");
    } catch (err) {
      console.error(err);
      alert("초기화에 실패했습니다.");
    } finally {
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
    if (!group || !isManager || !selectedLeader) return;

    const { error } = await supabase.from("group_scope_leaders").upsert(
      {
        user_id: selectedLeader.id,
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
    setSelectedLeader(null);
    setLeaderSearchQuery("");
    setLeaderSearchResults([]);
    loadScopeLeaders(group.id);
  };

  const removeScopeLeader = async (leaderId: string) => {
    if (!group || !isManager) return;
    if (!confirm("해당 상위 리더의 권한을 해제하시겠습니까?")) return;

    const { error } = await supabase
      .from("group_scope_leaders")
      .delete()
      .eq("root_group_id", group.id)
      .eq("user_id", leaderId);

    if (error) {
      console.error(error);
      alert("권한 해제에 실패했습니다.");
      return;
    }

    setScopeLeaders(prev => prev.filter(leader => leader.id !== leaderId));
  };

  const searchLeaders = async () => {
    if (!leaderSearchQuery.trim()) {
      alert("검색어를 입력해주세요.");
      return;
    }
    setIsSearchingLeader(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`nickname.ilike.%${leaderSearchQuery}%,username.ilike.%${leaderSearchQuery}%,church.ilike.%${leaderSearchQuery}%`)
        .limit(20);

      if (error) throw error;
      setLeaderSearchResults(data || []);
      setSelectedLeader(null);
    } catch (error) {
      console.error(error);
      alert("리더 검색에 실패했습니다.");
    } finally {
      setIsSearchingLeader(false);
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
    // 관리자에게 탈퇴 알림
    const managerIds = members
      .filter(m => ["owner", "leader"].includes(m.role) && m.user_id !== user.id)
      .map(m => m.user_id);
    if (managerIds.length > 0) {
      sendPushToGroupUsers({
        groupId: group.id,
        targetUserIds: managerIds,
        title: group.name,
        body: `${group.name}에서 ${await getSenderName()}님이 나갔어요.`,
        targetPath: `/#/group/${group.id}?tab=members`,
      });
    }
    alert("모임에서 나갔습니다.");
    setLocation("/community?list=1");
  };

  const buildInviteUrl = () => {
    if (!group?.id) return "";
    const origin = isNativeApp() ? getPublicWebOrigin() : window.location.origin;
    return `${origin}/?${GROUP_INVITE_PARAM}=${encodeURIComponent(group.id)}`;
  };

  const buildInviteMessage = (includeUrl = true) => {
    if (!group) return "";
    const groupCode = group.group_slug || "-";
    const inviteUrl = buildInviteUrl();
    const lines = [
      "myAmen(마이아멘)",
      `${group.name}(${groupCode})에서 당신을 초대했어요.`,
      "아래 링크에서 회원가입하면 바로 모임에 입장할 수 있어요.",
    ];
    if (includeUrl) lines.push(inviteUrl);
    return lines.join("\n");
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
    const text = buildInviteMessage(true);
    try {
      const shared = await shareContent({
        title: `[마이아멘(myAmen) 모임 초대] 모임명 : ${group.name}`,
        text,
        dialogTitle: "모임 초대 공유",
      });
      if (shared) {
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

  // DB에서 기도제목 순서 로드 (앱 재설치 후에도 복원)
  useEffect(() => {
    if (!group?.id || !user?.id) { setDbPrayerOrder(null); return; }
    let alive = true;
    (async () => {
      let topicIds: number[] = [];
      let authorIds: string[] = [];
      try {
        const { data } = await supabase
          .from("user_prayer_topic_order")
          .select("ordered_topic_ids, ordered_author_ids")
          .eq("user_id", user.id)
          .eq("group_id", group.id)
          .maybeSingle();
        if (alive && data) {
          if (Array.isArray(data.ordered_topic_ids)) topicIds = data.ordered_topic_ids as number[];
          if (Array.isArray(data.ordered_author_ids)) authorIds = data.ordered_author_ids as string[];
        }
      } catch {}
      // localStorage 폴백
      if (!topicIds.length) {
        try {
          const raw = localStorage.getItem(`group-prayer-topic-item-order:${group.id}:${user.id}`);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) topicIds = parsed.filter((v): v is number => typeof v === "number");
        } catch {}
      }
      if (!authorIds.length) {
        try {
          const raw = localStorage.getItem(`group-prayer-topic-order:${group.id}:${user.id}`);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) authorIds = parsed.filter((v): v is string => typeof v === "string");
        } catch {}
      }
      if (alive) setDbPrayerOrder({ topicIds, authorIds });
    })();
    return () => { alive = false; };
  }, [group?.id, user?.id]);


  useEffect(() => {
    if (!user?.id || dbPrayerOrder === null) {
      setMyPrayerTopicOrder([]);
      return;
    }

    const topicIds = groupPrayerTopics
      .filter((topic) => topic.author_id === user.id)
      .map((topic) => topic.id);

    if (!topicIds.length) {
      setMyPrayerTopicOrder([]);
      return;
    }

    setMyPrayerTopicOrder((prev) => {
      // 현재 메모리 순서가 있으면 그걸 기준으로, 없으면 DB 순서를 초기값으로 사용
      const baseOrder = prev.length > 0 ? prev : dbPrayerOrder!.topicIds;
      const nextOrder = [
        ...baseOrder.filter((id) => topicIds.includes(id)),
        ...topicIds.filter((id) => !baseOrder.includes(id)),
      ];
      return prev.length === nextOrder.length && prev.every((value, index) => value === nextOrder[index])
        ? prev
        : nextOrder;
    });
  }, [groupPrayerTopics, dbPrayerOrder, user?.id]);

  useEffect(() => {
    if (!myPrayerTopicOrder.length || !group?.id || !user?.id) return;
    supabase.from("user_prayer_topic_order").upsert(
      { user_id: user.id, group_id: group.id, ordered_topic_ids: myPrayerTopicOrder, ordered_author_ids: prayerTopicAuthorOrder, updated_at: new Date().toISOString() },
      { onConflict: "user_id,group_id" }
    ).then();
  }, [myPrayerTopicOrder, group?.id, user?.id]);

  const orderedMyPrayerTopics = useMemo(() => {
    if (!user?.id) return [];
    const topics = groupPrayerTopics.filter((topic) => topic.author_id === user.id);
    const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
    const ordered = myPrayerTopicOrder
      .map((id) => topicMap.get(id))
      .filter((topic): topic is GroupPrayerTopic => Boolean(topic));
    const contentTopics = ordered.filter((topic) => hasVisiblePrayerTopicContent(topic.content));
    const attachmentOnlyTopics = ordered.filter((topic) => !hasVisiblePrayerTopicContent(topic.content));
    return [...contentTopics, ...attachmentOnlyTopics];
  }, [groupPrayerTopics, myPrayerTopicOrder, user?.id]);

  const orderedMyPrayerContentTopics = useMemo(
    () => orderedMyPrayerTopics.filter((topic) => hasVisiblePrayerTopicContent(topic.content)),
    [orderedMyPrayerTopics]
  );

  const orderedMyPrayerAttachmentOnlyTopics = useMemo(
    () => orderedMyPrayerTopics.filter((topic) => !hasVisiblePrayerTopicContent(topic.content)),
    [orderedMyPrayerTopics]
  );

  const sortableSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(PTRAwareTouchSensor, { activationConstraint: { delay: 220, tolerance: 10 } })
  );

  useEffect(() => {
    const authorIds = topicsByAuthor.map((item) => item.userId);
    if (!authorIds.length || dbPrayerOrder === null) {
      setPrayerTopicAuthorOrder([]);
      return;
    }

    setPrayerTopicAuthorOrder((prev) => {
      const baseOrder = prev.length > 0 ? prev : dbPrayerOrder!.authorIds;
      const nextOrder = [
        ...baseOrder.filter((id) => authorIds.includes(id)),
        ...authorIds.filter((id) => !baseOrder.includes(id)),
      ];
      return prev.length === nextOrder.length && prev.every((value, index) => value === nextOrder[index])
        ? prev
        : nextOrder;
    });
  }, [topicsByAuthor, dbPrayerOrder]);

  useEffect(() => {
    if (!prayerTopicAuthorOrder.length || !group?.id || !user?.id) return;
    supabase.from("user_prayer_topic_order").upsert(
      { user_id: user.id, group_id: group.id, ordered_author_ids: prayerTopicAuthorOrder, ordered_topic_ids: myPrayerTopicOrder, updated_at: new Date().toISOString() },
      { onConflict: "user_id,group_id" }
    ).then();
  }, [prayerTopicAuthorOrder, group?.id, user?.id]);

  const orderedTopicsByAuthor = useMemo(() => {
    const topicMap = new Map(topicsByAuthor.map((item) => [item.userId, item]));
    return prayerTopicAuthorOrder
      .map((userId) => topicMap.get(userId))
      .filter((item): item is (typeof topicsByAuthor)[number] => Boolean(item))
      .map((item) => (
        user?.id && item.userId === user.id
          ? {
            ...item,
            topics: orderedMyPrayerTopics.length > 0 ? orderedMyPrayerTopics : item.topics,
          }
          : item
      ));
  }, [topicsByAuthor, prayerTopicAuthorOrder, orderedMyPrayerTopics, user?.id]);

  const partnerIds = useMemo(() => new Set(partners.map(p => p.partner_user_id)), [partners]);

  const prayersByTargetUser = useMemo(() => {
    const map = new Map<string, typeof groupPrayers>();
    groupPrayers.forEach(record => {
      let targetUserId: string | null = null;
      const userMatch = record.title?.match(/^\[user:([a-fA-F0-9-]+)\]/i);
      if (userMatch) {
        targetUserId = userMatch[1];
      } else {
        const match = record.title?.match(/^\[topic:(\d+)\]/i);
        if (match) {
          const topicId = parseInt(match[1]);
          const t = groupPrayerTopics.find(x => x.id === topicId);
          if (t) targetUserId = t.author_id;
        }
      }
      if (targetUserId) {
        if (!map.has(targetUserId)) map.set(targetUserId, []);
        map.get(targetUserId)!.push(record);
      }
    });
    return map;
  }, [groupPrayers, groupPrayerTopics]);

  const heartPrayerHistoryRecords = useMemo(() => {
    if (!heartPrayerHistoryTargetUserId) return [];
    const records = (prayersByTargetUser.get(heartPrayerHistoryTargetUserId) || []).filter((record) => record.audio_url === "amen");
    const getPrayerUserName = (record: GroupPrayerRecord) => {
      const profile = authorMap[record.user_id];
      return (profile?.nickname || profile?.username || "모임원").trim();
    };

    return [...records].sort((a, b) => {
      if (heartPrayerHistorySort === "name") {
        const nameCompare = getPrayerUserName(a).localeCompare(getPrayerUserName(b), "ko");
        if (nameCompare !== 0) return nameCompare;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }

      const diff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return heartPrayerHistorySort === "oldest" ? diff : -diff;
    });
  }, [authorMap, heartPrayerHistorySort, heartPrayerHistoryTargetUserId, prayersByTargetUser]);

  const heartPrayerHistoryAuthor = useMemo(() => {
    if (!heartPrayerHistoryTargetUserId) return null;
    return authorMap[heartPrayerHistoryTargetUserId] || null;
  }, [authorMap, heartPrayerHistoryTargetUserId]);

  const todayFaithDateIso = format(new Date(), "yyyy-MM-dd");
  const currentFaithWeekStartMs = startOfWeek(new Date(), { weekStartsOn: 0 }).getTime();
  const selectedFaithWeekStartMs = startOfWeek(faithCurrentDate, { weekStartsOn: 0 }).getTime();
  const canMoveToNextFaithWeek = selectedFaithWeekStartMs < currentFaithWeekStartMs;

  // 1. groupId 없으면 아무것도 렌더링하지 않음
  if (!groupId) return null;

  // 2. authReady 또는 loading이 끝나기 전에는 무조건 스피너만 렌더링
  if (!authReady || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-3 w-full">
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
          className="min-h-[160px] flex flex-col justify-center pt-[var(--app-topbar-height)]"
          style={{
            background:
              ((ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)) ?? "").trim()
                ? `linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,.45)), url(${ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)}) center/cover`
                : `linear-gradient(135deg, ${group.header_color || "#4A6741"}, #1f2937)`,
          }}
        >
          <div className="max-w-2xl mx-auto px-4 w-full text-white py-8">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl sm:text-3xl font-black truncate drop-shadow-md">{group.name}</div>
              {group.is_closed && <span className="px-2 py-0.5 rounded-sm bg-rose-500/90 text-sm font-bold shadow-sm shrink-0">폐쇄됨</span>}
            </div>
            <div className="mt-3 text-sm sm:text-sm text-white/80 flex flex-col gap-1 leading-tight">
              {group.group_slug && <span>모임 아이디 : {group.group_slug}</span>}
              <span>개설일자 : {group.created_at ? new Date(group.created_at).toLocaleDateString("ko-KR").slice(0, -1).replace(/\. /g, '.') : "-"}</span>
              <span>나의 등급 : 방문자</span>
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

  const handleHeartPrayer = async (targetUserId: string) => {
    if (!group || !user) return;
    logEvent("group", "prayer_react");
    try {
      const { error } = await supabase.from("group_prayer_records").insert({
        group_id: group.id,
        user_id: user.id,
        source_type: "direct",
        title: `[user:${targetUserId}] Amen`,
        audio_url: "amen",
        audio_duration: 0,
      });
      if (error) throw error;
      await loadGroupPrayers(group.id);
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 50, 20]);
      if (targetUserId !== user.id) {
        const targetName = authorMap[targetUserId]?.nickname || authorMap[targetUserId]?.username || "상대방";
        setHeartPrayerToast(`${targetName}님에게 마음기도가 전달되었습니다.\n${targetName}님만 확인할 수 있어요`);
      }
      setTimeout(() => setHeartPrayerToast(null), 3500);
      if (targetUserId !== user.id) {
        sendPushToGroupUsers({
          groupId: group.id,
          targetUserIds: [targetUserId],
          title: group.name,
          body: `${group.name}의 내 기도제목에 ${await getSenderName()}님이 마음기도를 남겨주셨어요.`,
          targetPath: `/#/group/${group.id}?tab=prayer`,
        });
      }
    } catch (err) {
      console.error(err);
      alert("마음기도 저장에 실패했습니다.");
    }
  };

  const startVoicePrayerForUser = (targetUserId: string) => {
    setRecordTitle(`[user:${targetUserId}] 음성기도`);
    setShowPrayerComposer(true);
  };

  const openTextPrayerModal = (targetUserId: string, editRecord?: GroupPrayerRecord) => {
    setTextPrayerTargetUserId(targetUserId);
    setTextPrayerContent(editRecord?.prayer_text || "");
    setTextPrayerEditId(editRecord?.id ?? null);
    setShowTextPrayerModal(true);
  };

  const saveTextPrayer = async () => {
    if (!group || !user || !textPrayerTargetUserId) return;
    const content = textPrayerContent.trim();
    if (!content) { alert("기도 내용을 입력해 주세요."); return; }
    setTextPrayerSaving(true);
    try {
      if (textPrayerEditId) {
        const { error } = await supabase
          .from("group_prayer_records")
          .update({ prayer_text: content })
          .eq("id", textPrayerEditId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("group_prayer_records").insert({
          group_id: group.id,
          user_id: user.id,
          source_type: "direct",
          title: `[user:${textPrayerTargetUserId}] 글기도`,
          audio_url: "text",
          audio_duration: 0,
          prayer_text: content,
        });
        if (error) throw error;
        if (textPrayerTargetUserId !== user.id) {
          sendPushToGroupUsers({
            groupId: group.id,
            targetUserIds: [textPrayerTargetUserId],
            title: group.name,
            body: `${group.name}의 내 기도제목에 ${await getSenderName()}님이 글기도를 남겨주셨어요.`,
            targetPath: `/#/group/${group.id}?tab=prayer`,
          });
        }
      }
      await loadGroupPrayers(group.id);
      setShowTextPrayerModal(false);
      setTextPrayerContent("");
      setTextPrayerEditId(null);
      setTextPrayerTargetUserId(null);
    } catch (err) {
      console.error(err);
      alert("글기도 저장에 실패했습니다.");
    } finally {
      setTextPrayerSaving(false);
    }
  };

  const deleteAllPrayerTopicsByAuthor = async (authorId: string) => {
    if (!group || !user) return;
    const canDelete = isManager || authorId === user.id;
    if (!canDelete) return;

    const isMine = authorId === user.id;
    const message = isMine
      ? "정말 모든 기도제목을 삭제하시겠습니까? 등록된 기도제목 전체가 삭제됩니다."
      : "해당 멤버의 기도제목을 모두 삭제할까요? 이미 모임을 나간 멤버의 기도제목도 삭제됩니다.";
    if (!confirm(message)) return;

    try {
      const attachmentUrls = groupPrayerTopics
        .filter((topic) => topic.author_id === authorId)
        .flatMap((topic) => getTopicAttachments(topic).map((attachment) => attachment.file_url))
        .filter(Boolean);
      const { error } = await supabase
        .from("group_prayer_topics")
        .delete()
        .eq("group_id", group.id)
        .eq("author_id", authorId);
      if (error) throw error;
      await Promise.all(attachmentUrls.map((url) => deleteFileFromR2(url)));
      if (group?.id) loadGroupPrayerTopics(group.id);
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const savePrayerTopic = async (topicId: number, content: string) => {
    if (!user || !group) return;
    const topic = groupPrayerTopics.find(t => t.id === topicId);
    const authorId = topic?.author_id ?? "";
    const records = prayersByTargetUser.get(authorId) ?? [];
    const heartPrayers = records
      .filter(r => r.audio_url === "amen")
      .map(r => ({ display_name: authorMap[r.user_id]?.nickname || authorMap[r.user_id]?.username || "모임원", created_at: r.created_at }));
    const textPrayers = records
      .filter(r => r.audio_url === "text" && r.prayer_text)
      .map(r => ({ display_name: authorMap[r.user_id]?.nickname || authorMap[r.user_id]?.username || "모임원", prayer_text: r.prayer_text, created_at: r.created_at }));
    const voicePrayers = records
      .filter(r => r.audio_url && r.audio_url !== "amen" && r.audio_url !== "text")
      .map(r => ({ display_name: authorMap[r.user_id]?.nickname || authorMap[r.user_id]?.username || "모임원", audio_url: r.audio_url, audio_duration: r.audio_duration, created_at: r.created_at }));

    await supabase.from("prayer_box_items").upsert({
      user_id: user.id,
      source_type: "group",
      source_topic_id: topicId,
      group_name: group.name,
      topic_content: content,
      heart_count: heartPrayers.length,
      heart_prayers: heartPrayers,
      text_prayers: textPrayers,
      voice_prayers: voicePrayers,
      saved_at: new Date().toISOString(),
    }, { onConflict: "user_id,source_topic_id" });

    setSavedPrayerContentMap(prev => new Map(prev).set(topicId, content));
    setPrayerBoxToast("기도제목함에 보관되었습니다.");
    setTimeout(() => setPrayerBoxToast(null), 2500);
  };

  const deleteSingleTopic = async (topicId: number, authorId: string) => {
    if (!group || !user) return;
    const canDelete = isManager || authorId === user.id;
    if (!canDelete) return;
    if (!confirm("이 기도제목을 삭제할까요?")) return;
    try {
      const topic = groupPrayerTopics.find((item) => item.id === topicId) ?? null;
      let query = supabase
        .from("group_prayer_topics")
        .delete()
        .eq("id", topicId)
        .eq("group_id", group.id);
      if (!isManager) {
        query = query.eq("author_id", user.id);
      }
      const { error } = await query;
      if (error) throw error;
      await Promise.all((topic ? getTopicAttachments(topic) : []).map((attachment) => deleteFileFromR2(attachment.file_url)));
      if (editingPrayerTopicId === topicId) {
        cancelEditingPrayerTopic();
      }
      if (group?.id) loadGroupPrayerTopics(group.id);
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const editSingleTopic = async (topic: typeof groupPrayerTopics[0]) => {
    if (!group || !user || topic.author_id !== user.id) return;
    const newContent = editingPrayerTopicContent.trim();
    const remainingAttachments = getTopicAttachments(topic).filter((attachment) => !editingPrayerRemovedAttachmentIds.includes(attachment.id));
    const willHaveAttachment = remainingAttachments.length > 0 || editingPrayerNewAttachments.length > 0;
    if (newContent === "" && !willHaveAttachment) {
      alert("기도제목을 입력해주세요.");
      return;
    }
    setSavingPrayerTopicId(topic.id);
    try {
      const { error } = await supabase
        .from("group_prayer_topics")
        .update({
          content: newContent,
          attachment_url: null,
          attachment_name: null,
          attachment_type: null,
          attachment_kind: null,
        })
        .eq("id", topic.id)
        .eq("group_id", group.id);
      if (error) throw error;

      const removedAttachments = getTopicAttachments(topic).filter((attachment) => editingPrayerRemovedAttachmentIds.includes(attachment.id));
      if (removedAttachments.length > 0) {
        await supabase
          .from("group_prayer_topic_attachments")
          .delete()
          .in("id", removedAttachments.map((attachment) => attachment.id).filter((id) => id < 1000000));
        await Promise.all(removedAttachments.map((attachment) => deleteFileFromR2(attachment.file_url)));
      }

      if (editingPrayerNewAttachments.length > 0) {
        const uploaded = await uploadPrayerTopicAttachments(editingPrayerNewAttachments);
        const { error: attachmentError } = await supabase.from("group_prayer_topic_attachments").insert(
          uploaded.map((item, index) => ({
            topic_id: topic.id,
            uploader_id: user.id,
            file_url: item.attachment_url,
            file_name: item.attachment_name,
            content_type: item.attachment_type,
            attachment_kind: item.attachment_kind,
            sort_order: remainingAttachments.length + index,
          }))
        );

        if (attachmentError) {
          if (attachmentError.code === "42P01" || attachmentError.code === "42703") {
            const firstAttachment = uploaded[0];
            if (firstAttachment) {
              const { error: legacyAttachmentError } = await supabase
                .from("group_prayer_topics")
                .update({
                  attachment_url: firstAttachment.attachment_url,
                  attachment_name: firstAttachment.attachment_name,
                  attachment_type: firstAttachment.attachment_type,
                  attachment_kind: firstAttachment.attachment_kind,
                })
                .eq("id", topic.id)
                .eq("group_id", group.id);
              if (legacyAttachmentError) throw legacyAttachmentError;
            }
          } else {
            throw attachmentError;
          }
        }
      }

      cancelEditingPrayerTopic();
      if (group?.id) loadGroupPrayerTopics(group.id);
    } catch (err) {
      console.error(err);
      const message = err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42703"
        ? "기도제목 첨부 기능을 사용하려면 최신 DB 마이그레이션 적용이 필요합니다."
        : "수정에 실패했습니다.";
      alert(message);
    } finally {
      setSavingPrayerTopicId(null);
    }
  };

  const PrayerTopicAuthorCard = ({ userId, topics, author, partnerIds }: (typeof topicsByAuthor)[number] & { partnerIds: Set<string> }) => {
    const relatedPrayers = prayersByTargetUser.get(userId) || [];
    const isPartner = partnerIds.has(userId);
    const voicePrayers = relatedPrayers
      .filter((p) => p.audio_url && p.audio_url !== "amen" && p.audio_url !== "text")
      .filter((vp) => vp.user_id === user.id || userId === user.id || isPartner);
    const textPrayers = relatedPrayers
      .filter((p) => p.audio_url === "text")
      .filter((tp) => tp.user_id === user.id || userId === user.id || isPartner);
    const textTopics = topics.filter((topic) => {
      const attachments = getTopicAttachments(topic);
      return hasVisiblePrayerTopicContent(topic.content) || attachments.some((attachment) => !isImageAttachment(attachment));
    });
    const imageAttachments = topics.flatMap((topic) => getTopicAttachments(topic).filter((attachment) => isImageAttachment(attachment)));

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100/50 pt-4 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2 px-5 py-2 bg-[#F6F7F8] rounded-xl mx-3">
          <AvatarImg url={author.avatar_url} size={40} />
          {(() => {
            const anySynced = textTopics.some(t => savedPrayerContentMap.has(t.id));
            return (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`font-bold text-base truncate ${anySynced ? "text-[#4A6741]" : "text-zinc-900"}`}>{author.nickname || author.username}</span>
                  <span className={`font-bold text-base truncate ${anySynced ? "text-[#4A6741]" : "text-zinc-900"}`}>기도제목</span>
                </div>
                <div className="flex items-center gap-1 opacity-60 shrink-0 justify-end">
                  {user && (isManager || userId === user.id) && userId === user.id && (
                    <button onClick={() => setShowPrayerTopicModal(true)} className="p-1 hover:text-[#4A6741]"><Pencil size={15} /></button>
                  )}
                  {user && (
                    <button
                      onClick={() => {
                        if (!user || !group) return;
                        void Promise.all(textTopics.map(t => savePrayerTopic(t.id, t.content || "")));
                      }}
                      title={anySynced ? "기도제목함에 보관됨 (다시 저장)" : "기도제목함에 저장"}
                      className={`p-1 hover:text-amber-500 ${anySynced ? "text-amber-500" : ""}`}
                    >
                      <HandHeart size={17} />
                    </button>
                  )}
                  {user && (isManager || userId === user.id) && (
                    <button onClick={() => void deleteAllPrayerTopicsByAuthor(userId)} className="p-1 hover:text-rose-500"><Trash2 size={15} /></button>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        <div className="space-y-4 pb-5 px-5">
          {textTopics.length > 0 && (
            <div className="space-y-4">
              {textTopics.map((topic) => (
                <div key={topic.id} className="text-sm">
                  {hasVisiblePrayerTopicContent(topic.content) && (
                    <div className="font-bold text-medium text-[#4A6741]/90 whitespace-pre-wrap leading-snug">{topic.content}</div>
                  )}
                  {getTopicAttachments(topic).filter((attachment) => !isImageAttachment(attachment)).map((attachment, index) => (
                    <div key={attachment.id} className={hasVisiblePrayerTopicContent(topic.content) || index > 0 ? "mt-3" : ""}>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.file_name || undefined}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                      >
                        <Link2 size={12} />
                        <span className="max-w-[220px] truncate">{attachment.file_name || "첨부 파일"}</span>
                      </a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {imageAttachments.length > 0 && (
            <PostImageCarousel
              urls={imageAttachments.map((attachment) => attachment.file_url)}
              onImageClick={(index) => {
                setModalImages(imageAttachments.map((attachment) => attachment.file_url));
                setModalIndex(index);
                setShowImageModal(true);
              }}
            />
          )}

          <div className="flex items-center gap-2 mt-0 pt-3 border-t border-zinc-150 shrink-0">
            <button
              onClick={() => startVoicePrayerForUser(userId)}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-[#4A6741]/20 bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold transition-all active:scale-95"
            >
              <Mic size={12} /> 음성기도
            </button>
            <button
              onClick={() => openTextPrayerModal(userId)}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-500 text-xs font-bold transition-all active:scale-95"
            >
              <PenLine size={12} /> 글기도
            </button>
            <button
              onClick={() => handleHeartPrayer(userId)}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-500 text-xs font-bold transition-all active:scale-95"
            >
              <Heart size={12} fill="currentColor" className="opacity-80" /> 마음기도
            </button>
            {(userId === user.id || isPartner) && (
              <button
                onClick={() => {
                  setHeartPrayerHistoryTargetUserId(userId);
                  setHeartPrayerHistorySort("latest");
                  setShowHeartPrayerHistoryModal(true);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
                aria-label="마음기도 기록 보기"
                type="button"
              >
                <MoreHorizontal size={14} />
              </button>
            )}
          </div>

          {textPrayers.length > 0 && (
            <div className="mt-3 space-y-2">
              {textPrayers.map((tp) => {
                const prayingUser = authorMap[tp.user_id];
                const pname = prayingUser?.nickname || prayingUser?.username || "모임원";
                const canDelete = isManager || tp.user_id === user.id;
                const canEdit = tp.user_id === user.id;

                return (
                  <div key={tp.id} className="bg-blue-50 rounded-xl border border-blue-100 p-2.5 shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-blue-600">
                        <PenLine size={12} /> {pname}
                        <span className="text-[10px] text-zinc-500 font-bold ml-1">{formatDateTime(tp.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button onClick={() => openTextPrayerModal(userId, tp)} className="text-blue-400 p-1 hover:text-blue-600 rounded-full">
                            <Pencil size={12} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => removeGroupPrayer(tp)} className="text-rose-400 p-1 hover:text-rose-500 rounded-full">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-zinc-700 whitespace-pre-wrap leading-relaxed">{tp.prayer_text}</p>
                  </div>
                );
              })}
            </div>
          )}

          {voicePrayers.length > 0 && (
            <div className="mt-3 space-y-2">
              {voicePrayers.map((vp) => {
                const prayingUser = authorMap[vp.user_id];
                const pname = prayingUser?.nickname || prayingUser?.username || "모임원";
                const canDelete = isManager || vp.user_id === user.id;

                return (
                  <div key={vp.id} className="bg-[#f1f3f4] rounded-xl border border-zinc-100 p-2.5 shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
                        <Mic size={12} /> {pname}
                        <span className="text-[10px] text-zinc-500 font-bold ml-1">{formatDateTime(vp.created_at)}</span>
                      </div>
                      {canDelete && (
                        <button onClick={() => removeGroupPrayer(vp)} className="text-rose-400 p-1 hover:text-rose-500 rounded-full">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <audio controls className="w-full h-8" src={vp.audio_url} preload="metadata" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] pb-12 text-base">
      {/* 마음기도 토스트 */}
      <AnimatePresence>
        {heartPrayerToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/60 text-white px-8 py-4 rounded-2xl shadow-xl text-sm font-bold text-center whitespace-pre-line backdrop-blur-sm">
              {heartPrayerToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 기도제목함 저장 토스트 */}
      <AnimatePresence>
        {prayerBoxToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 inset-x-0 flex justify-center z-[300] pointer-events-none"
          >
            <div className="bg-amber-500 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap">
              <BookmarkCheck size={16} />
              {prayerBoxToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 동역자 토스트 */}
      <AnimatePresence>
        {partnerToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 inset-x-0 flex justify-center z-[300] pointer-events-none px-6"
          >
            <div className="bg-[#4A6741] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2">
              <Handshake size={15} />
              {partnerToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 글기도 작성 모달 */}
      <AnimatePresence>
        {showTextPrayerModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-[2px]"
              onClick={() => { setShowTextPrayerModal(false); setTextPrayerContent(""); setTextPrayerEditId(null); }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) { setShowTextPrayerModal(false); setTextPrayerContent(""); setTextPrayerEditId(null); }
              }}
              className="fixed bottom-0 left-0 right-0 z-[200] w-full max-w-lg mx-auto bg-white rounded-t-3xl px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-blue-600 font-black text-base">
                  <PenLine size={18} /> {textPrayerEditId ? "글기도 수정" : "글기도 작성"}
                </div>
                <button onClick={() => { setShowTextPrayerModal(false); setTextPrayerContent(""); setTextPrayerEditId(null); }} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              {textPrayerTargetUserId && (
                <p className="text-xs text-zinc-400 mb-3 font-medium">
                  {authorMap[textPrayerTargetUserId]?.nickname || authorMap[textPrayerTargetUserId]?.username || "상대방"}님의 기도제목을 위한 글기도 — 해당 분과 나만 볼 수 있어요
                </p>
              )}
              <textarea
                className="w-full min-h-[140px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="마음을 담아 기도를 글로 남겨보세요..."
                value={textPrayerContent}
                onChange={(e) => setTextPrayerContent(e.target.value)}
                autoFocus
              />
              <div className="mb-4" />
              <button
                onClick={saveTextPrayer}
                disabled={textPrayerSaving || !textPrayerContent.trim()}
                className="w-full h-[52px] rounded-2xl bg-blue-500 text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
              >
                {textPrayerSaving ? "저장 중..." : textPrayerEditId ? "수정 완료" : "글기도 남기기"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header
        className="relative overflow-hidden max-h-[320px] opacity-100 transition-all duration-250"
        style={{
          background:
            ((ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)) ?? "").trim()
              ? `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.52)), url(${ensureHttpsUrl(group.header_image_url) || ensureHttpsUrl(group.group_image)}) center/cover`
              : `linear-gradient(120deg, ${group.header_color || "#4A6741"}, #1f2937)`,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 min-h-[160px] flex flex-col justify-center h-full pt-[var(--app-topbar-height)]">
          <div className="text-white py-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-2xl sm:text-2xl font-black leading-tight drop-shadow-sm whitespace-normal break-words break-keep">
                  {group.name}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { logEvent("group", "member_invite"); setShowInviteModal(true); }}
                  className="px-3 py-1 rounded-full bg-white/20 text-sm sm:text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 hover:bg-white/30 transition-colors"
                  title="모임 초대"
                >
                  <UserPlus size={14} />
                  <span>초대하기</span>
                </button>
                {isManager && (
                  <button
                    onClick={() => setActiveTab("admin")}
                    className="h-7 w-7 text-white/80 hover:text-white inline-flex items-center justify-center"
                    title="모임 관리"
                  >
                    <Settings size={16} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 text-sm sm:text-sm text-white/80 flex flex-col gap-1 leading-tight">
              {group.is_closed && <span className="w-fit px-2 py-0.5 rounded-sm bg-rose-500/90 text-sm font-bold text-white shadow-sm">폐쇄됨</span>}
              {group.group_slug && <span>모임 아이디 : {group.group_slug}</span>}
              <button
                onClick={() => setActiveTab("members")}
                className="w-fit text-left hover:text-white transition-colors"
                title="회원 조회"
                type="button"
              >
                모임 회원수 : <span className="underline underline-offset-2">{members.length}명</span>
              </button>
              <span>나의 등급 : {toLabel(role)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky z-30 bg-white/95 backdrop-blur border-b border-zinc-200 transition-all overflow-x-auto hide-scrollbar top-[var(--app-topbar-height)]">
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
              {isManager && orderedTopicsByAuthor.length > 0 && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => { setSelectedShareUserIds(new Set(orderedTopicsByAuthor.map(i => i.userId))); setShowPrayerShareModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#4A6741] border border-[#4A6741]/40 rounded-full hover:bg-[#4A6741]/10 transition-colors"
                  >
                    <Share2 size={14} />
                    기도제목 공유
                  </button>
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-4">
                  {orderedTopicsByAuthor.map((item) => (
                    <PrayerTopicAuthorCard key={item.userId} {...item} partnerIds={partnerIds} />
                  ))}
                  {orderedTopicsByAuthor.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100dvh-280px)] text-zinc-400">
                      <HandHeart size={44} className="text-zinc-200" />
                      <p className="text-sm font-medium">등록된 기도제목이 없습니다.</p>
                    </div>
                  )}
                </div>

                {orderedTopicsByAuthor.length > 1 && (
                  <div className="flex justify-center pt-3">
                    <button
                      onClick={() => setShowPrayerTopicOrderModal(true)}
                      className="text-sm font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-500"
                    >
                      순서 조정
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPrayerTopicModal(true)}
                className="fixed right-6 bottom-28 z-[90] w-12 h-12 bg-[#4A6741]/90 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors"
                aria-label="내 기도제목 등록"
              >
                <HandHeart size={20} />
              </button>
            </section>
          </motion.div>
        )}

        {activeTab === "faith" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">

            <div className="flex items-center justify-between text-zinc-900 bg-transparent p-4">
              <button onClick={() => setFaithCurrentDate(subWeeks(faithCurrentDate, 1))} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronLeft /></button>
              <span className="font-black text-xl tracking-tight">{getWeekKoreanLabel(faithCurrentDate)}</span>
              <button
                onClick={() => {
                  if (!canMoveToNextFaithWeek) return;
                  setFaithCurrentDate(addWeeks(faithCurrentDate, 1));
                }}
                disabled={!canMoveToNextFaithWeek}
                className={`p-2 rounded-full transition-colors ${canMoveToNextFaithWeek ? "hover:bg-zinc-100" : "opacity-35 cursor-not-allowed"}`}
              >
                <ChevronRight />
              </button>
            </div>

            {/* ── 주간 수행 현황 카드 ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 overflow-hidden">
              <div className="w-full">
                <div className="w-full select-none pb-0">
                  {/* 헤더 항목 */}
                  <div className="flex items-center pt-1 pb-4 px-0 sm:px-2">
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
                      const isFutureDate = date > todayFaithDateIso;
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
                            const disabled = !item || isFutureDate;
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
                                        ? "bg-[#4A6741]/90 text-white shadow-sm" // 배경을 진하게, 글자를 흰색으로 수정
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
              <div className="space-y-4"> {/* 제목과 박스 사이 간격을 위해 감싸는 div 추가 */}

                {/* 1. 주간 현황 제목 (아이콘 추가 버전) */}
                <div className="px-1 pt-10">
                  <div className="flex items-center gap-2 mb-1">
                    {/* ChartBar 아이콘: 통계와 현황 느낌을 줍니다 */}
                    <ChartBar className="text-[#4A6741]" size={20} strokeWidth={2.5} />

                    <p className="text-lg lg:text-xl font-black text-[#4A6741] leading-none">
                      주간 현황
                    </p>
                  </div>
                </div>

                {/* 실제 데이터 박스 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* 기존에 제목이 있던 div(border-b)는 제거하거나 비워둡니다 */}

                  {faithBoardLoading ? (
                    <div className="py-10 text-sm text-zinc-400 text-center">현황 불러오는 중...</div>
                  ) : faithBoardRows.length === 0 ? (
                    <div className="py-10 text-sm text-zinc-400 text-center">조회된 기록이 없습니다.</div>
                  ) : (
                    <div className="w-full text-sm pb-4">

                      {/* 2. 열 제목 (멤버, 성경, QT 등 헤더) */}
                      <div className="flex items-center pt-6 pb-3 px-4 sm:px-8 bg-white">
                        {/* '닉네임' 글자 크기: text-[13px] -> text-sm sm:text-base 등으로 수정 */}
                        <div className="shrink-0 w-16 sm:w-20 font-bold text-zinc-300 text-sm sm:text-base text-center">닉네임</div>

                        {faithItemSlots.filter((slot) => slot.item).map((slot) => (
                          /* '성경, QT...' 글자 크기: text-[13px] -> text-sm sm:text-base 등으로 수정 */
                          <div key={slot.key} className="flex-1 flex justify-center font-bold text-[#4A6741] text-base base:text-lg text-center">
                            {slot.label}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-0 px-4 sm:px-8">
                        {faithBoardRows.map((row, idx) => (
                          <div key={row.user_id} className={`flex items-center py-3 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>

                            {/* 3. 행 제목 (멤버 이름) */}
                            {/* text-[13px] -> text-base sm:text-lg 등으로 수정 */}
                            <div className="shrink-0 w-16 sm:w-20 flex items-center justify-center min-h-[44px] px-1">
                              {isManager ? (
                                <button
                                  type="button"
                                  onClick={() => void loadMemberFaithWeekDetail(row.user_id)}
                                  // underline 클래스 추가
                                  className="font-bold text-zinc-700 text-base sm:text-lg text-center break-all leading-tight hover:text-[#4A6741] transition-colors underline decoration-1 underline-offset-4"
                                >
                                  {row.name}
                                </button>
                              ) : (
                                <div className="font-bold text-zinc-700 text-base sm:text-lg text-center break-all leading-tight">{row.name}</div>
                              )}
                            </div>

                            {faithItemSlots.filter((slot) => slot.item).map((slot) => {
                              const count = row.values[slot.item!.id] ?? 0;
                              return (
                                <div key={slot.key} className="flex-1 flex justify-center relative">
                                  {/* 4. 기록 숫자 크기 */}
                                  {/* text-[15px] -> text-lg sm:text-xl 등으로 수정 */}
                                  {count > 0 ? (
                                    <span className="inline-flex w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[18px] bg-[#4A6741]/90 text-white shadow-sm font-black text-lg lg:text-xl flex items-center justify-center transition-all shrink-0">
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="inline-flex w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[18px] bg-zinc-50 border border-zinc-100/80 text-zinc-300 font-black text-base sm:text-lg flex items-center justify-center transition-all shrink-0">0</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        {faithBoardRows.length > 0 && (
                          <div className="flex items-center py-3 bg-[#f3f4f6] border-t border-zinc-200 mt-2 rounded-xl">
                            <div className="shrink-0 w-16 sm:w-20 font-black text-[#4A6741] text-base sm:text-lg text-center flex items-center justify-center leading-tight px-1">합계</div>
                            {faithItemSlots.filter((slot) => slot.item).map((slot) => {
                              const sum = faithBoardRows.reduce((acc, row) => acc + (row.values[slot.item!.id] ?? 0), 0);
                              return (
                                <div key={`sum-${slot.key}`} className="flex-1 flex justify-center text-[#4A6741] font-black text-lg lg:text-xl">
                                  {sum > 0 ? sum : <span className="text-zinc-400 font-bold text-base sm:text-lg">—</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                const isCommentsOpen = !!expandedPosts[post.id];

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl shadow-sm border border-zinc-100/60 flex flex-col py-5 px-0"
                  >
                    <div className="flex items-start justify-between mb-2 mx-4 border-b border-zinc-100 pb-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {isNotice && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-black rounded-sm tracking-tight">공지</span>}
                          <h3 className="font-bold text-zinc-900 text-base leading-tight break-all">{displayTitle || "교제나눔"}</h3>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">
                          {authorName} ㅣ {formatDateTime(post.created_at).slice(0, 17).replace('T', ' ')}
                        </span>
                      </div>

                      {canDelete && (
                        <div className="flex gap-1 shrink-0 text-zinc-400">
                          {post.author_id === user.id && (
                            <button onClick={() => { setEditingPost(post); setPostType(post.post_type); setPostTitle(post.title || ""); setPostContent(post.content || ""); setPostImages((post.image_urls || []).map((url, i) => ({ id: `e-img-${i}`, kind: "existing" as const, url }))); setPostFiles((post.file_attachments || []).map((f, i) => ({ id: `e-file-${i}`, kind: "existing" as const, url: f.url, name: f.name }))); setShowPostComposerModal(true); }} className="p-1.5 hover:text-[#4A6741] transition-colors"><Pencil size={15} /></button>
                          )}
                          <button onClick={() => removePost(post)} className="p-1.5 hover:text-rose-500 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>

                    {post.content && (
                      <div className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap mb-2 px-5 pb-3 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <Linkify>{post.content}</Linkify>
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

                    {post.file_attachments && post.file_attachments.length > 0 && (
                      <div className="mx-4 mb-3 space-y-1.5">
                        {post.file_attachments.map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                            style={{ gridTemplateColumns: "auto 1fr" }}
                          >
                            <FileText size={15} className="text-zinc-400 mr-2 self-center" />
                            <span className="text-sm text-zinc-700 truncate">{f.name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* 좋아요 & 댓글 액션 */}
                    <div className="mx-4 mt-2 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex space-x-4 shrink-0">
                        <button onClick={() => togglePostLike(post.id)} className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${postLikes[post.id]?.some(l => l.user_id === user.id) ? "text-rose-500" : "text-zinc-400 hover:text-rose-500"}`}>
                          <Heart size={18} fill={postLikes[post.id]?.some(l => l.user_id === user.id) ? "currentColor" : "none"} />
                          <span>{postLikes[post.id]?.length || 0}</span>
                        </button>
                        <button
                          onClick={() => setExpandedPosts((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${isCommentsOpen ? "text-[#4A6741]" : "text-zinc-400 hover:text-zinc-600"}`}
                        >
                          <MessageSquare size={18} />
                          <span>{postComments[post.id]?.length || 0}</span>
                        </button>
                      </div>
                    </div>

                    {/* 댓글 목록 & 입력창 */}
                    {isCommentsOpen && (
                      <div className="mx-4 mt-3 flex flex-col gap-2">
                        {postComments[post.id]?.map((comment: any) => {
                          const cAuthor = authorMap[comment.user_id];
                          const cName = cAuthor?.nickname || cAuthor?.username || "모임원";
                          const canDeleteComment = isManager || comment.user_id === user.id;
                          const canEditComment = comment.user_id === user.id;
                          const isEditingThis = editingComment?.commentId === comment.id && editingComment?.postId === post.id;
                          return (
                            <div key={comment.id} className="bg-zinc-50 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-zinc-700 truncate">{cName}</span>
                                  <span className="text-[11px] text-zinc-400 shrink-0">{formatDateTime(comment.created_at).slice(0, 17).replace('T', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {canEditComment && !isEditingThis && (
                                    <button onClick={() => setEditingComment({ postId: post.id, commentId: comment.id, content: comment.content })} className="text-zinc-400 hover:text-[#4A6741]"><Pencil size={13} /></button>
                                  )}
                                  {canDeleteComment && (
                                    <button onClick={() => deleteComment(post.id, comment.id)} className="text-zinc-400 hover:text-rose-500"><Trash2 size={14} /></button>
                                  )}
                                </div>
                              </div>
                              {isEditingThis ? (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  <textarea
                                    autoFocus
                                    value={editingComment.content}
                                    onChange={e => setEditingComment(prev => prev ? { ...prev, content: e.target.value } : null)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateComment(post.id, comment.id, editingComment.content); }
                                      if (e.key === 'Escape') setEditingComment(null);
                                    }}
                                    rows={2}
                                    className="w-full bg-white border border-[#4A6741]/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4A6741] resize-none"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingComment(null)} className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1">취소</button>
                                    <button onClick={() => updateComment(post.id, comment.id, editingComment.content)} className="text-xs text-white bg-[#4A6741] hover:bg-[#3d5535] px-3 py-1 rounded-full">저장</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-zinc-600 whitespace-pre-wrap leading-snug"><Linkify>{comment.content}</Linkify></div>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 mt-1 relative">
                          <input
                            type="text"
                            value={commentDrafts[post.id] || ""}
                            onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') addComment(post.id); }}
                            placeholder="댓글 달기..."
                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#4A6741] transition-colors"
                          />
                          <button disabled={!commentDrafts[post.id]?.trim()} onClick={() => addComment(post.id)} className="absolute right-1 w-8 h-8 rounded-full bg-[#4A6741] text-white flex items-center justify-center disabled:opacity-50 disabled:bg-zinc-300">
                            <SendHorizontal size={14} className="ml-0.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {posts.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100dvh-280px)] text-zinc-400">
                  <MessageSquare size={44} className="text-zinc-200" />
                  <p className="text-sm font-medium">아직 게시글이 없습니다.</p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setPostType("post"); setEditingPost(null); setPostTitle(""); setPostContent(""); setPostExistingImages([]); setPostImageFiles([]); setPostImagePreviews([]); setShowPostComposerModal(true); }}
              className="fixed right-6 bottom-28 z-[90] w-12 h-12 rounded-full bg-[#4A6741]/90 text-white shadow-2xl flex items-center justify-center hover:bg-[#3d5535] transition-colors"
              aria-label="글 작성"
            >
              <MessageSquare size={20} />
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

            {/* 동역자 맺기 요청 */}
            {partnerRequests.length > 0 && (
              <div className="bg-[#F6F7F8] p-2 mb-4">
                <h3 className="font-bold text-[#4A6741] mb-2 text-base flex items-center gap-2">
                  <Handshake size={16} /> 동역자 맺기 요청
                </h3>
                <div className="space-y-3">
                  {partnerRequests.map((req) => {
                    const reqName = req.profile?.nickname || req.profile?.username || "모임원";
                    const reqDate = (() => {
                      try {
                        const d = new Date(req.created_at);
                        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                      } catch { return ""; }
                    })();
                    return (
                      <div key={req.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900">{reqName}</span>
                            {req.profile?.username && (
                              <span className="text-xs text-zinc-400">@{req.profile.username}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400">{reqDate}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmPartnerAction({ type: 'accept', requestId: req.id, requesterId: req.requester_id, name: reqName })}
                            className="px-4 py-1.5 rounded-full bg-[#4A6741]/90 text-white text-xs font-bold"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => setConfirmPartnerAction({ type: 'reject', requestId: req.id, requesterId: req.requester_id, name: reqName })}
                            className="px-4 py-1.5 rounded-full bg-zinc-200 text-zinc-700 text-xs font-bold"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-[#F6F7F8] p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#4A6741] text-base flex items-center gap-2">
                  <Users size={16} /> 회원 목록
                </h3>
                {user && (
                  <button
                    onClick={() => setShowPartnerModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold"
                  >
                    <Handshake size={13} /> 동역자 맺기
                  </button>
                )}
              </div>
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
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${member.role === 'owner' || member.role === 'leader' ? 'bg-[#4A6741]/10 text-[#4A6741]' :
                            'bg-zinc-200 text-zinc-600'
                            }`}>
                            {toLabel(member.role)}
                          </span>

                          {partnerIds.has(member.user_id) && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-700 flex items-center gap-1">
                              <Handshake size={11} /> 동역자
                            </span>
                          )}

                          {/* 권한 변경 버튼을 이름 라인으로 이동 */}
                          <div className="flex items-center gap-1.5 ml-1">
                            {canPromoteDemote && (member.role === "member" || member.role === "leader") && (
                              <div className="flex items-center gap-1.5">
                                {member.role === "leader" && (
                                  <button
                                    onClick={() => changeMemberRole(member.user_id, "member")}
                                    className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
                                  >
                                    일반멤버 전환
                                  </button>
                                )}
                                <button
                                  onClick={() => transferGroupAuthority(member.user_id, name)}
                                  className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
                                >
                                  권한 양도
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 동역자 해지 버튼 */}
                        {partnerIds.has(member.user_id) && (
                          <button
                            onClick={() => void removePartner(member.user_id)}
                            className="w-7 h-7 rounded-full bg-transparent text-amber-500 flex items-center justify-center relative"
                            title="동역자 해지"
                          >
                            <Handshake size={14} />
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-400 text-white flex items-center justify-center text-[9px] font-black leading-none">−</span>
                          </button>
                        )}

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
                      <button onClick={resetGroupImage} disabled={groupEditImageUploading || groupEditSaving} className="px-4 py-2.5 rounded-xl bg-zinc-200 text-zinc-700 text-sm font-bold cursor-pointer hover:bg-zinc-300 transition-colors inline-flex items-center gap-2 shrink-0 disabled:opacity-50">
                        초기화
                      </button>
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
                  <div className="flex gap-2">
                    <input
                      value={leaderSearchQuery}
                      onChange={(e) => setLeaderSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchLeaders()}
                      placeholder="이름, 아이디, 교회명 검색"
                      className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-sm focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all font-medium"
                    />
                    <button
                      onClick={searchLeaders}
                      disabled={isSearchingLeader}
                      className="px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      {isSearchingLeader ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      검색
                    </button>
                  </div>

                  {leaderSearchResults.length > 0 && (
                    <div className="mt-3 max-h-[300px] overflow-y-auto space-y-2 border border-zinc-100 p-2 rounded-xl bg-zinc-50/50">
                      {leaderSearchResults.map(profile => (
                        <div
                          key={profile.id}
                          onClick={() => setSelectedLeader(profile)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedLeader?.id === profile.id ? "border-[#4A6741] bg-green-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-bold text-zinc-900 text-base">{profile.nickname || "이름 없음"}</div>
                            <div className="text-xs text-zinc-500 font-mono">{profile.username}</div>
                          </div>
                          <div className="text-sm text-zinc-600 space-y-0.5">
                            {profile.church && <div>교회: {profile.church}</div>}
                            {profile.rank && <div>직분: {profile.rank}</div>}
                            {profile.email && <div>이메일: {profile.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedLeader && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-sm border border-emerald-100">
                      <span className="font-bold">{selectedLeader.nickname}</span> 님을 상위 리더로 등록합니다.
                    </div>
                  )}

                  <button
                    onClick={registerScopeLeader}
                    disabled={!selectedLeader}
                    className="w-full py-3 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    선택한 리더 등록하기
                  </button>

                  <div className="pt-4 border-t border-zinc-100">
                    <h4 className="font-bold text-zinc-900 mb-2">현재 등록된 상위 리더 목록</h4>
                    {scopeLeaders.length === 0 ? (
                      <p className="text-sm text-zinc-500">등록된 상위 리더가 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {scopeLeaders.map(leader => (
                          <div key={leader.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-white shadow-sm">
                            <div>
                              <div className="font-bold text-zinc-900 text-base">{leader.nickname || "이름 없음"}</div>
                              <div className="text-xs text-zinc-500 font-mono mb-1">{leader.username}</div>
                              <div className="flex items-center gap-2 text-xs text-zinc-600">
                                {leader.church && <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-500">{leader.church}</span>}
                                {leader.rank && <span>{leader.rank}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => removeScopeLeader(leader.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                              해제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>



                <section className="bg-red-50 rounded-3xl shadow-sm p-5 space-y-4 border border-red-100">
                  <h3 className="font-black text-rose-700 text-lg">모임 삭제 (Danger Zone)</h3>
                  <p className="text-sm text-rose-600/80 font-medium">삭제된 모임 관련 데이터(게시글, 신앙활동, 사진 등)는 완벽히 제거되며 복구할 수 없습니다.</p>
                  <button
                    onClick={closeGroup}
                    disabled={closingGroup || role !== "owner"}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-black text-base shadow-lg hover:bg-rose-700 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {closingGroup ? "삭제 중..." : role !== "owner" ? "모임리더만 삭제 가능" : "모임 영구 삭제하기"}
                  </button>
                </section>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {
        selectedFaithMemberDetail && (
          <div className="fixed inset-0 z-[215] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setSelectedFaithMemberDetail(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) {
                  setSelectedFaithMemberDetail(null);
                }
              }}
              className="relative w-full max-h-[88vh] max-w-2xl mx-auto overflow-y-auto bg-[#F6F7F8] rounded-t-3xl border border-zinc-200 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2"> {/* 이름과 글자를 나란히 정렬 */}
                    <h3 className="font-black text-[#4A6741] text-lg underline decoration-1 underline-offset-4">
                      {selectedFaithMemberDetail.name}
                    </h3>
                    <span className="text-lg text-zinc-900 font-black">신앙 기록</span>
                  </div>
                  <p className="text-sm text-red-400 font-bold mt-1">예배 기록은 직접 수정 가능합니다.</p>
                </div>
                <button
                  onClick={() => setSelectedFaithMemberDetail(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              {memberFaithDetailLoading ? (
                <div className="py-14 text-center text-sm text-zinc-400">현황 불러오는 중...</div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 overflow-hidden">
                  <div className="w-full">
                    <div className="w-full select-none pb-0">
                      <div className="flex items-center pt-1 pb-4 px-0 sm:px-2">
                        <div className="shrink-0 w-16 sm:w-20" />
                        {faithItemSlots.map((slot) => (
                          <div key={`detail-header-${slot.key}`} className="flex-1 flex flex-col items-center text-center">
                            <span className="text-base sm:text-lg font-bold text-[#4A6741] leading-none">{slot.label}</span>
                            {!slot.item && <span className="text-[0.7em] text-zinc-300 mt-1">미설정</span>}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-0 px-0 sm:px-2 pt-2">
                        {weekDates.map((dateIso) => {
                          const dt = parseISO(dateIso);
                          const isToday = isSameDay(dt, new Date());
                          const isFutureDate = dateIso > todayFaithDateIso;
                          const isHoliday = KOREAN_HOLIDAYS[dateIso];
                          const isSunday = dt.getDay() === 0;
                          const isSaturday = dt.getDay() === 6;
                          const isRed = isSunday || isHoliday;
                          return (
                            <div key={dateIso} className={`flex items-center py-3 rounded-2xl transition-colors ${isToday ? "bg-[#4A6741]/20" : ""}`}>
                              <div className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center">
                                <span className={`text-base base:text-sm font-bold leading-none ${isToday ? "text-[#4A6741]" : isRed ? "text-rose-500" : isSaturday ? "text-blue-500" : "text-zinc-500"} text-center`}>
                                  {dt.getDate()}({dt.toLocaleDateString("ko-KR", { weekday: "short" })})
                                </span>
                                {isHoliday && <span className="text-[0.65em] leading-tight text-rose-500 font-bold max-w-full truncate px-0.5 mt-1" style={{ transform: "scale(0.95)" }}>{isHoliday}</span>}
                              </div>
                              {faithItemSlots.map((slot) => {
                                const item = slot.item;
                                const done = !!item && (selectedFaithMemberDetail.records[dateIso]?.[item.id] ?? 0) > 0;
                                const isAttendance = slot.key === "attendance";
                                const disabled = !item || (isAttendance ? isFutureDate || memberFaithDetailSaving : true);
                                return (
                                  <div key={`${dateIso}-${slot.key}`} className="flex-1 flex justify-center px-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isAttendance && item && !disabled) {
                                          void handleManagerAttendanceToggle(dateIso);
                                        }
                                      }}
                                      disabled={disabled}
                                      className={`w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[18px] flex items-center justify-center transition-all shrink-0 ${!item
                                        ? "opacity-25 cursor-not-allowed bg-zinc-50"
                                        : done
                                          ? "bg-[#4A6741]/90 text-white shadow-sm"
                                          : "bg-zinc-50 border border-zinc-100/80 text-zinc-300"
                                        } ${isAttendance && !isFutureDate && !memberFaithDetailSaving ? "active:scale-[0.98]" : ""}`}
                                    >
                                      <Check
                                        size={20}
                                        strokeWidth={done ? 4 : 2.5}
                                        className={done ? "opacity-100" : "opacity-40"}
                                      />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {memberFaithDetailSaving && (
                    <div className="px-1 pt-4 text-xs text-zinc-400 text-right">예배 현황 저장 중...</div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )
      }

      {
        showPrayerLinkModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowPrayerLinkModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) {
                  setShowPrayerLinkModal(false);
                }
              }}
              className="relative w-full max-w-2xl mx-auto max-h-[80vh] overflow-y-auto bg-[#F6F7F8] rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />
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
            </motion.div>
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
                중보 기도
              </h3>

              {!isRecording && !recordedBlob && (
                <div className="flex w-full flex-col items-center">
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full bg-[#4A6741] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  >
                    <Mic size={32} />
                  </button>
                  <p className="mt-5 text-center text-sm leading-relaxed text-rose-200">
                    음성기도는 기도를 받은 멤버와 <br />
                    기도를 해준 멤버에게만 공개됩니다.
                  </p>
                  <button
                    onClick={() => {
                      setShowPrayerComposer(false);
                      if (recordedBlob) URL.revokeObjectURL(recordPreviewUrl!);
                      setRecordedBlob(null);
                      setRecordPreviewUrl(null);
                      setRecordingTime(0);
                      if (isRecording) stopRecording();
                    }}
                    className="mt-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    title="닫기"
                  >
                    <X size={20} />
                  </button>
                </div>
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
                      className="flex-1 py-4 rounded-full bg-[#4A6741] font-bold disabled:opacity-50 max-w-xs shadow-lg flex items-center justify-center gap-2"
                    >
                      {savingPrayer ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
                      {savingPrayer ? "저장 중..." : "기도 저장"}
                    </button>
                  </div>
                </div>
              )}

              {(isRecording || recordedBlob) && (
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
              )}
            </div>
          </motion.div>
        )
      }

      {
        showHeartPrayerHistoryModal && (
          <div className="fixed inset-0 z-[226] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => {
                setShowHeartPrayerHistoryModal(false);
                setHeartPrayerHistoryTargetUserId(null);
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) {
                  setShowHeartPrayerHistoryModal(false);
                  setHeartPrayerHistoryTargetUserId(null);
                }
              }}
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3" />
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <h3 className="font-black text-zinc-900 text-xl">마음기도 기록</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {(heartPrayerHistoryAuthor?.nickname || heartPrayerHistoryAuthor?.username || "내")} 기도제목에 마음기도를 남긴 기록입니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHeartPrayerHistoryModal(false);
                    setHeartPrayerHistoryTargetUserId(null);
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 overflow-y-auto">
                <div className="mb-4 flex items-center gap-2">
                  {[
                    { value: "latest", label: "최신순" },
                    { value: "oldest", label: "과거순" },
                    { value: "name", label: "이름순" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setHeartPrayerHistorySort(option.value as "latest" | "oldest" | "name")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                        heartPrayerHistorySort === option.value
                          ? "bg-[#4A6741] text-white"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {heartPrayerHistoryRecords.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">
                    아직 남겨진 마음기도 기록이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {heartPrayerHistoryRecords.map((record) => {
                      const prayingUser = authorMap[record.user_id];
                      const name = prayingUser?.nickname || prayingUser?.username || "모임원";

                      return (
                        <div key={record.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-zinc-800">{name}</div>
                              <div className="mt-1 text-xs text-zinc-400">{formatDateTime(record.created_at)}</div>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-500 shrink-0">
                              <Heart size={10} fill="currentColor" />
                              마음기도
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showPrayerTopicOrderModal && (
          <div className="fixed inset-0 z-[225] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowPrayerTopicOrderModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3" />
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <h3 className="font-black text-zinc-900 text-xl">순서 조정</h3>
                  <p className="inline-flex items-center gap-1 text-xs text-zinc-400 mt-1">
                    <GripVertical size={12} />
                    오른쪽 메뉴 버튼을 길게 눌러 순서를 바꿔주세요.
                  </p>
                </div>
                <button onClick={() => setShowPrayerTopicOrderModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-700">
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 overflow-y-auto">
                <DndContext
                  sensors={sortableSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    setPrayerTopicAuthorOrder((prev) => {
                      const oldIndex = prev.indexOf(String(active.id));
                      const newIndex = prev.indexOf(String(over.id));
                      if (oldIndex < 0 || newIndex < 0) return prev;
                      return arrayMove(prev, oldIndex, newIndex);
                    });
                  }}
                >
                  <SortableContext items={prayerTopicAuthorOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {orderedTopicsByAuthor.map((item) => (
                        <SortableItem key={item.userId} id={item.userId}>
                          {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                            <div ref={setNodeRef} style={style} className={`${isDragging ? "scale-[1.01]" : ""}`}>
                              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                                <AvatarImg url={item.author.avatar_url} size={44} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm text-zinc-900 truncate">{item.author.nickname || item.author.username}</div>
                                  <div className="text-xs text-zinc-400 truncate">{item.topics.length}개 기도제목</div>
                                </div>
                                <button
                                  {...attributes}
                                  {...listeners}
                                  className="relative z-10 p-2 rounded-xl bg-zinc-100 text-zinc-400 touch-none"
                                  aria-label="기도제목 박스 순서 조정"
                                  type="button"
                                >
                                  <GripVertical size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showPrayerTopicModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => { setShowPrayerTopicModal(false); cancelEditingPrayerTopic(); }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3" />
              <div className="flex items-center justify-between p-6 pb-4">
                <h3 className="font-black text-zinc-900 text-xl">나의 기도제목 관리</h3>
                <button onClick={() => { setShowPrayerTopicModal(false); cancelEditingPrayerTopic(); }} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-700">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8">
                {/* 1. 내가 등록한 기도제목 리스트 (수정/삭제 가능) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm font-bold text-zinc-700">등록된 내 기도제목</label>
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                      <GripVertical size={11} />
                      길게 눌러서 순서 조정 가능
                    </span>
                  </div>
                  {orderedMyPrayerTopics.length === 0 ? (
                    <div className="text-sm text-zinc-400 py-6 text-center bg-white rounded-xl border border-zinc-100">등록된 기도제목이 없습니다.</div>
                  ) : (
                    <div className="space-y-2">
                      <DndContext
                        sensors={sortableSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          const current = orderedMyPrayerContentTopics.map((topic) => String(topic.id));
                          const oldIndex = current.indexOf(String(active.id));
                          const newIndex = current.indexOf(String(over.id));
                          if (oldIndex < 0 || newIndex < 0) return;
                          const nextOrder = arrayMove(current, oldIndex, newIndex).map((id) => Number(id));
                          setMyPrayerTopicOrder([...nextOrder, ...orderedMyPrayerAttachmentOnlyTopics.map((topic) => topic.id)]);
                        }}
                      >
                        <SortableContext items={orderedMyPrayerContentTopics.map((topic) => String(topic.id))} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {orderedMyPrayerContentTopics.map((topic) => {
                              const attachments = getTopicAttachments(topic);
                              const visibleAttachments = attachments.filter((attachment) => !editingPrayerRemovedAttachmentIds.includes(attachment.id));
                              const imageAttachments = visibleAttachments.filter((attachment) => isImageAttachment(attachment));
                              const fileAttachments = visibleAttachments.filter((attachment) => !isImageAttachment(attachment));
                              const isEditing = editingPrayerTopicId === topic.id;

                              return (
                                <SortableItem key={topic.id} id={String(topic.id)} disabled={isEditing}>
                                  {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                                    <div ref={setNodeRef} style={style} className={`${isDragging ? "scale-[1.01]" : ""}`}>
                                      <div className="flex items-center gap-2 bg-[#EEF7EC] rounded-xl p-3 border border-[#D7E9D4] shadow-sm">
                                        <div className="flex-1 min-w-0">
                                          {isEditing ? (
                                            <div className="space-y-3">
                                              <textarea
                                                value={editingPrayerTopicContent}
                                                onChange={(e) => setEditingPrayerTopicContent(e.target.value)}
                                                className="w-full min-h-[88px] px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-800 focus:ring-2 focus:ring-[#4A6741]/20 outline-none resize-none"
                                              />

                                              {visibleAttachments.length > 0 && (
                                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                                  {fileAttachments.map((attachment) => (
                                                    <div key={attachment.id} className="flex items-center justify-between gap-2 py-1">
                                                      <div className="text-xs font-bold text-zinc-700 truncate">{attachment.file_name || "첨부 파일"}</div>
                                                      <button
                                                        onClick={() => setEditingPrayerRemovedAttachmentIds((prev) => [...prev, attachment.id])}
                                                        className="inline-flex items-center rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-100"
                                                      >
                                                        삭제
                                                      </button>
                                                    </div>
                                                  ))}
                                                  {imageAttachments.length > 0 && (
                                                    <div className="mt-2">
                                                      <div className="grid grid-cols-2 gap-2">
                                                        {imageAttachments.map((attachment, index) => (
                                                          <div key={attachment.id} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                                            <button
                                                              onClick={() => {
                                                                setModalImages(imageAttachments.map((item) => item.file_url));
                                                                setModalIndex(index);
                                                                setShowImageModal(true);
                                                              }}
                                                              className="block w-full"
                                                              type="button"
                                                            >
                                                              <img
                                                                src={attachment.file_url}
                                                                alt={attachment.file_name || "이미지"}
                                                                className="h-32 w-full object-cover"
                                                              />
                                                            </button>
                                                            <button
                                                              onClick={() => setEditingPrayerRemovedAttachmentIds((prev) => [...prev, attachment.id])}
                                                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                                                              aria-label={`${attachment.file_name || "이미지"} 삭제`}
                                                              type="button"
                                                            >
                                                              <X size={14} />
                                                            </button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              <div className="space-y-2">
                                                <label className="inline-flex cursor-pointer items-center rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200">
                                                  파일/이미지 첨부
                                                  <input type="file" className="hidden" multiple onChange={handleEditingPrayerAttachmentChange} />
                                                </label>
                                                {editingPrayerNewAttachments.length > 0 && (
                                                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                                    {editingPrayerNewAttachments.some((file) => file.type.startsWith("image/")) && (
                                                      <PostImageCarousel
                                                        urls={editingPrayerNewAttachments
                                                          .map((file, index) => file.type.startsWith("image/") ? editingPrayerNewAttachmentPreviews[index] : null)
                                                          .filter((url): url is string => Boolean(url))}
                                                        onImageClick={(index) => {
                                                          const imageUrls = editingPrayerNewAttachments
                                                            .map((file, previewIndex) => file.type.startsWith("image/") ? editingPrayerNewAttachmentPreviews[previewIndex] : null)
                                                            .filter((url): url is string => Boolean(url));
                                                          setModalImages(imageUrls);
                                                          setModalIndex(index);
                                                          setShowImageModal(true);
                                                        }}
                                                      />
                                                    )}
                                                    <div className="mt-2 space-y-2">
                                                      {editingPrayerNewAttachments.map((file, index) => (
                                                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                                                          <div className="text-sm font-bold text-zinc-700 break-all">{file.name}</div>
                                                          <button
                                                            onClick={() => setEditingPrayerNewAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                                                            className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-100"
                                                          >
                                                            첨부 삭제
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  onClick={() => void editSingleTopic(topic)}
                                                  disabled={(!editingPrayerTopicContent.trim() && visibleAttachments.length === 0 && editingPrayerNewAttachments.length === 0) || savingPrayerTopicId === topic.id}
                                                  className="inline-flex items-center rounded-lg bg-[#4A6741] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                >
                                                  {savingPrayerTopicId === topic.id ? "저장중..." : "저장"}
                                                </button>
                                                <button
                                                  onClick={cancelEditingPrayerTopic}
                                                  disabled={savingPrayerTopicId === topic.id}
                                                  className="inline-flex items-center rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
                                                >
                                                  취소
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              {hasVisiblePrayerTopicContent(topic.content) && (
                                                <div className="text-sm font-medium text-zinc-800 whitespace-pre-wrap break-words leading-snug">{topic.content}</div>
                                              )}
                                              {fileAttachments.map((attachment) => (
                                                <a
                                                  key={attachment.id}
                                                  href={attachment.file_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  download={attachment.file_name || undefined}
                                                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                                >
                                                  <Link2 size={12} />
                                                  <span className="max-w-[220px] truncate">{attachment.file_name || "첨부 파일"}</span>
                                                </a>
                                              ))}
                                              {imageAttachments.length > 0 && (
                                                <PostImageCarousel
                                                  urls={imageAttachments.map((attachment) => attachment.file_url)}
                                                  onImageClick={(index) => {
                                                    setModalImages(imageAttachments.map((attachment) => attachment.file_url));
                                                    setModalIndex(index);
                                                    setShowImageModal(true);
                                                  }}
                                                />
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {!isEditing && (
                                          <div className="flex items-center gap-1 shrink-0 self-center">
                                            <button onClick={() => startEditingPrayerTopic(topic)} className="p-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center" aria-label="기도제목 수정"><Pencil size={13} /></button>
                                            <button onClick={() => deleteSingleTopic(topic.id, topic.author_id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center" aria-label="기도제목 삭제"><Trash2 size={13} /></button>
                                            <button
                                              {...attributes}
                                              {...listeners}
                                              className="relative z-10 p-2 bg-zinc-100 text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center touch-none"
                                              aria-label="기도제목 순서 조정"
                                              type="button"
                                            >
                                              <GripVertical size={13} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </SortableItem>
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                      {orderedMyPrayerAttachmentOnlyTopics.map((topic) => {
                        const attachments = getTopicAttachments(topic);
                        const visibleAttachments = attachments.filter((attachment) => !editingPrayerRemovedAttachmentIds.includes(attachment.id));
                        const imageAttachments = visibleAttachments.filter((attachment) => isImageAttachment(attachment));
                        const fileAttachments = visibleAttachments.filter((attachment) => !isImageAttachment(attachment));
                        const isEditing = editingPrayerTopicId === topic.id;

                        return (
                          <div key={topic.id} className="bg-[#EEF7EC] rounded-xl p-3 border border-[#D7E9D4] shadow-sm">
                            {isEditing ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingPrayerTopicContent}
                                  onChange={(e) => setEditingPrayerTopicContent(e.target.value)}
                                  className="w-full min-h-[88px] px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-800 focus:ring-2 focus:ring-[#4A6741]/20 outline-none resize-none"
                                  placeholder="기도제목을 입력하지 않아도 첨부만 저장할 수 있습니다."
                                />

                                {visibleAttachments.length > 0 && (
                                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                    {fileAttachments.map((attachment) => (
                                      <div key={attachment.id} className="flex items-center justify-between gap-2 py-1">
                                        <div className="text-xs font-bold text-zinc-700 truncate">{attachment.file_name || "첨부 파일"}</div>
                                        <button
                                          onClick={() => setEditingPrayerRemovedAttachmentIds((prev) => [...prev, attachment.id])}
                                          className="inline-flex items-center rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-100"
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    ))}
                                    {imageAttachments.length > 0 && (
                                      <div className="mt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                          {imageAttachments.map((attachment, index) => (
                                            <div key={attachment.id} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                              <button
                                                onClick={() => {
                                                  setModalImages(imageAttachments.map((item) => item.file_url));
                                                  setModalIndex(index);
                                                  setShowImageModal(true);
                                                }}
                                                className="block w-full"
                                                type="button"
                                              >
                                                <img
                                                  src={attachment.file_url}
                                                  alt={attachment.file_name || "이미지"}
                                                  className="h-32 w-full object-cover"
                                                />
                                              </button>
                                              <button
                                                onClick={() => setEditingPrayerRemovedAttachmentIds((prev) => [...prev, attachment.id])}
                                                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                                                aria-label={`${attachment.file_name || "이미지"} 삭제`}
                                                type="button"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="inline-flex cursor-pointer items-center rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200">
                                    파일/이미지 첨부
                                    <input type="file" className="hidden" multiple onChange={handleEditingPrayerAttachmentChange} />
                                  </label>
                                  {editingPrayerNewAttachments.length > 0 && (
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                      {editingPrayerNewAttachments.some((file) => file.type.startsWith("image/")) && (
                                        <PostImageCarousel
                                          urls={editingPrayerNewAttachments
                                            .map((file, index) => file.type.startsWith("image/") ? editingPrayerNewAttachmentPreviews[index] : null)
                                            .filter((url): url is string => Boolean(url))}
                                          onImageClick={(index) => {
                                            const imageUrls = editingPrayerNewAttachments
                                              .map((file, previewIndex) => file.type.startsWith("image/") ? editingPrayerNewAttachmentPreviews[previewIndex] : null)
                                              .filter((url): url is string => Boolean(url));
                                            setModalImages(imageUrls);
                                            setModalIndex(index);
                                            setShowImageModal(true);
                                          }}
                                        />
                                      )}
                                      <div className="mt-2 space-y-2">
                                        {editingPrayerNewAttachments.map((file, index) => (
                                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-bold text-zinc-700 break-all">{file.name}</div>
                                            <button
                                              onClick={() => setEditingPrayerNewAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                                              className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-100"
                                            >
                                              첨부 삭제
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => void editSingleTopic(topic)}
                                    disabled={(!editingPrayerTopicContent.trim() && visibleAttachments.length === 0 && editingPrayerNewAttachments.length === 0) || savingPrayerTopicId === topic.id}
                                    className="inline-flex items-center rounded-lg bg-[#4A6741] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    {savingPrayerTopicId === topic.id ? "저장중..." : "저장"}
                                  </button>
                                  <button
                                    onClick={cancelEditingPrayerTopic}
                                    disabled={savingPrayerTopicId === topic.id}
                                    className="inline-flex items-center rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 space-y-3">
                                  {fileAttachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={attachment.file_name || undefined}
                                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                    >
                                      <Link2 size={12} />
                                      <span className="max-w-[220px] truncate">{attachment.file_name || "첨부 파일"}</span>
                                    </a>
                                  ))}
                                  {imageAttachments.length > 0 && (
                                    <PostImageCarousel
                                      urls={imageAttachments.map((attachment) => attachment.file_url)}
                                      onImageClick={(index) => {
                                        const urls = imageAttachments.map((attachment) => attachment.file_url);
                                        setModalImages(urls);
                                        setModalIndex(index);
                                        setShowImageModal(true);
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 self-start">
                                  <button onClick={() => startEditingPrayerTopic(topic)} className="p-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center" aria-label="첨부 기도제목 수정"><Pencil size={13} /></button>
                                  <button
                                    onClick={() => deleteSingleTopic(topic.id, topic.author_id)}
                                    className="p-2 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center shrink-0"
                                    aria-label="첨부 기도제목 삭제"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. 새 기도제목 입력 폼 */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-700">새 기도제목 추가</label>
                  <textarea
                    value={newPrayerTopic}
                    onChange={(e) => setNewPrayerTopic(e.target.value)}
                    className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-white border border-zinc-200 text-sm focus:ring-2 focus:ring-[#4A6741]/20 outline-none transition-all resize-none shadow-inner"
                    placeholder="기도제목을 하나씩 추가해주세요. 줄바꿈 하시면 그대로 줄바꿈으로 표시됩니다."
                  />
                  <div className="space-y-2">
                    <label className="inline-flex cursor-pointer items-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-200">
                      파일/이미지 첨부
                      <input type="file" className="hidden" multiple onChange={handleNewPrayerAttachmentChange} />
                    </label>
                    {newPrayerAttachments.length > 0 && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        {newPrayerAttachments.some((file) => file.type.startsWith("image/")) && (
                          <PostImageCarousel
                            urls={newPrayerAttachments
                              .map((file, index) => file.type.startsWith("image/") ? newPrayerAttachmentPreviews[index] : null)
                              .filter((url): url is string => Boolean(url))}
                            onImageClick={(index) => {
                              const imageUrls = newPrayerAttachments
                                .map((file, previewIndex) => file.type.startsWith("image/") ? newPrayerAttachmentPreviews[previewIndex] : null)
                                .filter((url): url is string => Boolean(url));
                              setModalImages(imageUrls);
                              setModalIndex(index);
                              setShowImageModal(true);
                            }}
                          />
                        )}
                        <div className="mt-2 space-y-2">
                          {newPrayerAttachments.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                              <div className="text-sm font-bold text-zinc-700 break-all">{file.name}</div>
                              <button
                                onClick={() => setNewPrayerAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                                className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-100"
                              >
                                첨부 삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-3">
                    <button
                      onClick={() => { setShowPrayerTopicModal(false); cancelEditingPrayerTopic(); }}
                      className="w-[48%] py-3.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-base shadow-sm transition-all hover:bg-zinc-200 active:scale-[0.98]"
                    >
                      닫기
                    </button>
                    <button
                      onClick={() => { addPrayerTopic(); }}
                      disabled={(!newPrayerTopic.trim() && newPrayerAttachments.length === 0) || isSubmittingPrayerTopic}
                      className="w-[48%] py-3.5 rounded-xl bg-[#4A6741] text-white font-bold text-base shadow-sm disabled:opacity-50 transition-all hover:bg-[#3d5535] active:scale-[0.98]"
                    >
                      {isSubmittingPrayerTopic ? "추가중..." : "추가하기"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showImageModal && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center pointer-events-auto">
            <div className="absolute top-4 right-4 z-[310]">
              <button onClick={() => history.back()} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 backdrop-blur transition-colors">
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

            <div
              className="w-full flex-1 relative overflow-hidden"
              style={{ touchAction: "none" }}
              onTouchStart={(event) => {
                if (event.touches.length === 2) {
                  const dx = event.touches[1].clientX - event.touches[0].clientX;
                  const dy = event.touches[1].clientY - event.touches[0].clientY;
                  imgGesture.current.startDist = Math.hypot(dx, dy);
                  imgGesture.current.startScale = imgGesture.current.scale;
                  imgGesture.current.isPinching = true;
                  touchStartXRef.current = null;
                  return;
                }
                imgGesture.current.isPinching = false;
                const touch = event.touches[0];
                imgGesture.current.tapStartX = touch.clientX;
                imgGesture.current.tapStartY = touch.clientY;
                if (imgGesture.current.scale > 1) {
                  imgGesture.current.lastX = touch.clientX - imgGesture.current.panX;
                  imgGesture.current.lastY = touch.clientY - imgGesture.current.panY;
                  touchStartXRef.current = null;
                } else {
                  touchStartXRef.current = touch.clientX;
                  touchStartYRef.current = touch.clientY;
                }
              }}
              onTouchMove={(event) => {
                const g = imgGesture.current;
                const el = modalImgRef.current;
                if (event.touches.length === 2 && g.isPinching) {
                  const dx = event.touches[1].clientX - event.touches[0].clientX;
                  const dy = event.touches[1].clientY - event.touches[0].clientY;
                  const dist = Math.hypot(dx, dy);
                  g.scale = Math.max(1, Math.min(5, g.startScale * (dist / g.startDist)));
                  if (el) el.style.transform = `translate(${g.panX}px, ${g.panY}px) scale(${g.scale})`;
                } else if (event.touches.length === 1 && g.scale > 1) {
                  g.panX = event.touches[0].clientX - g.lastX;
                  g.panY = event.touches[0].clientY - g.lastY;
                  if (el) el.style.transform = `translate(${g.panX}px, ${g.panY}px) scale(${g.scale})`;
                }
              }}
              onTouchEnd={(event) => {
                const g = imgGesture.current;
                const el = modalImgRef.current;
                // 핀치 중 한 손가락만 뗐을 때: 남은 손가락 기준으로 lastX/Y 재설정 후 종료
                if (event.touches.length === 1) {
                  g.isPinching = false;
                  const remaining = event.touches[0];
                  g.lastX = remaining.clientX - g.panX;
                  g.lastY = remaining.clientY - g.panY;
                  return;
                }
                g.isPinching = false;
                // 핀치 후 거의 안 당겼으면 리셋
                if (g.scale > 1 && g.scale < 1.15) {
                  g.scale = 1; g.panX = 0; g.panY = 0;
                  if (el) el.style.transform = '';
                }
                // 더블탭 감지 — 손가락이 거의 안 움직인 경우에만 탭으로 인식
                if (event.changedTouches.length === 1) {
                  const touch = event.changedTouches[0];
                  const moved = Math.hypot(touch.clientX - g.tapStartX, touch.clientY - g.tapStartY);
                  if (moved < 15) {
                    const now = Date.now();
                    if (now - lastTapRef.current < 300 && g.scale > 1) {
                      g.scale = 1; g.panX = 0; g.panY = 0;
                      if (el) { el.style.transition = 'transform 0.2s ease'; el.style.transform = ''; }
                      setTimeout(() => { if (el) el.style.transition = ''; }, 210);
                      lastTapRef.current = 0;
                      return;
                    }
                    lastTapRef.current = now;
                  }
                }
                // 줌 상태에서는 스와이프 무시
                if (g.scale > 1) return;
                const startX = touchStartXRef.current;
                const startY = touchStartYRef.current;
                const touch = event.changedTouches[0];
                touchStartXRef.current = null; touchStartYRef.current = null;
                if (!touch || startX === null || startY === null) return;
                const deltaX = touch.clientX - startX;
                const deltaY = Math.abs(touch.clientY - (startY ?? 0));
                if (Math.abs(deltaX) < 48 || deltaY > 64) return;
                if (deltaX < 0 && modalIndex < modalImages.length - 1) setModalIndex(prev => prev + 1);
                else if (deltaX > 0 && modalIndex > 0) setModalIndex(prev => prev - 1);
              }}
            >
              <div
                className="flex items-center w-full h-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${modalIndex * 100}%)` }}
              >
                {modalImages.map((src, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center p-4">
                    <img
                      ref={idx === modalIndex ? modalImgRef : undefined}
                      src={src}
                      alt="full view"
                      onClick={() => { if (imgGesture.current.scale <= 1.05) history.back(); }}
                      style={{ transformOrigin: "center center", willChange: "transform" }}
                      className="max-w-full max-h-full object-contain cursor-pointer select-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {modalImages.length > 1 && (
              <div className="absolute bottom-8 flex justify-center w-full z-[310] gap-2">
                {modalImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === modalIndex ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )
      }

      {
        showPostComposerModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowPostComposerModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-xl mx-auto bg-white rounded-t-3xl pt-3 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl flex flex-col space-y-4 max-h-[92vh]"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-2" />
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="font-black text-xl text-zinc-900">{editingPost ? "글 수정" : "글 작성"}</h3>
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
                    className="w-full min-h-[220px] px-4 py-3 rounded-sm bg-zinc-50 border border-zinc-100 text-base"
                    placeholder="모임 내부 공유 글을 작성하세요."
                  />

                  <div className="rounded-sm bg-zinc-50 border border-zinc-100 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-600">사진 첨부 (최대 10장)</span>
                      <label className="px-3 py-1.5 rounded-sm bg-zinc-900 text-white text-base font-bold cursor-pointer inline-flex items-center gap-1">
                        <ImagePlus size={13} />
                        사진 선택
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePostImageSelect(e.target.files)} />
                      </label>
                    </div>
                    {postImages.length > 0 && (
                      <DndContext sensors={sortableSensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        setPostImages(prev => arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over.id)));
                      }}>
                        <SortableContext items={postImages.map(i => i.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-3 gap-2">
                            {postImages.map((item) => (
                              <SortableItem key={item.id} id={item.id}>
                                {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                                  <div
                                    ref={setNodeRef} style={style}
                                    {...(postImages.length > 1 ? { ...attributes, ...listeners } : {})}
                                    className={`relative rounded-sm overflow-hidden bg-zinc-100 touch-none ${isDragging ? "scale-105 z-10 opacity-80" : ""}`}
                                  >
                                    <img src={item.kind === "existing" ? item.url : item.preview} alt="" className="w-full h-24 object-cover pointer-events-none" />
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => { if (item.kind === "new") URL.revokeObjectURL(item.preview); setPostImages(prev => prev.filter(i => i.id !== item.id)); }}
                                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                                      type="button"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                )}
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    {postImages.length > 1 && <p className="text-[11px] text-zinc-400">길게 눌러서 순서 조정 가능</p>}
                  </div>

                  <div className="rounded-sm bg-zinc-50 border border-zinc-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-600">파일 첨부 (최대 5개)</span>
                      <label className="px-3 py-1.5 rounded-sm bg-zinc-900 text-white text-base font-bold cursor-pointer inline-flex items-center gap-1">
                        <Paperclip size={13} />
                        파일 선택
                        <input type="file" multiple className="hidden" onChange={(e) => handlePostFileSelect(e.target.files)} />
                      </label>
                    </div>
                    {postFiles.length > 0 && (
                      <DndContext sensors={sortableSensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        setPostFiles(prev => arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over.id)));
                      }}>
                        <SortableContext items={postFiles.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1.5">
                            {postFiles.map((item) => (
                              <SortableItem key={item.id} id={item.id}>
                                {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                                  <div
                                    ref={setNodeRef} style={style}
                                    {...(postFiles.length > 1 ? { ...attributes, ...listeners } : {})}
                                    className={`grid px-3 py-2.5 rounded-xl bg-white border border-zinc-200 touch-none ${isDragging ? "scale-[1.02] opacity-80" : ""}`}
                                    style={{ gridTemplateColumns: "auto 1fr auto" }}
                                  >
                                    <FileText size={14} className="text-zinc-400 mr-2 self-center pointer-events-none" />
                                    <span className="text-sm text-zinc-700 truncate self-center pointer-events-none">{item.kind === "existing" ? item.name : item.file.name}</span>
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => setPostFiles(prev => prev.filter(i => i.id !== item.id))}
                                      className="text-zinc-400 hover:text-rose-500 p-1 shrink-0"
                                      type="button"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    {postFiles.length > 1 && <p className="text-[11px] text-zinc-400">길게 눌러서 순서 조정 가능</p>}
                  </div>

                  <button
                    onClick={addPost}
                    disabled={isSubmittingPost}
                    className="w-full py-4 mt-2 mb-2 rounded-2xl bg-[#4A6741] text-white font-black text-base shadow-lg hover:bg-[#3d5535] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingPost ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      editingPost ? "수정완료" : "저장"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showInviteModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowInviteModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) {
                  setShowInviteModal(false);
                }
              }}
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-zinc-900 text-lg">모임 초대</h3>
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
                  className="w-full py-4 rounded-2xl bg-[#FEE500] text-[#3C1E1E] font-black text-base shadow-lg hover:brightness-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <img src="/kakao-login.png" alt="카카오톡" className="h-5 w-5" />
                  카카오톡으로 초대하기
                </button>
              </div>
            </motion.div>
          </div>
        )
      }

      {
        showHeaderEditModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowHeaderEditModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) setShowHeaderEditModal(false);
              }}
              className="relative w-full max-w-xl mx-auto bg-[#F6F7F8] rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-3 shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />
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
            </motion.div>
          </div>
        )
      }

      {
        showFaithLinkModal && selectedFaithItem && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowFaithLinkModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) setShowFaithLinkModal(false);
              }}
              className="relative w-full max-w-2xl mx-auto max-h-[80vh] overflow-y-auto bg-[#F6F7F8] rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />
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
            </motion.div>
          </div>
        )
      }

      {/* 동역자 수락/거절 확인 팝업 */}
      <AnimatePresence>
        {confirmPartnerAction && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmPartnerAction(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[300px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <div className="flex justify-center mb-3">
                <Handshake size={28} className={confirmPartnerAction.type === 'accept' ? "text-[#4A6741]" : "text-zinc-400"} />
              </div>
              <h4 className="mb-2 font-bold text-zinc-900 text-base">
                {confirmPartnerAction.type === 'accept' ? '동역자 수락' : '동역자 거절'}
              </h4>
              {confirmPartnerAction.type === 'accept' ? (
                <p className="mb-6 text-zinc-500 text-sm leading-relaxed">
                  <span className="font-bold text-zinc-700">{confirmPartnerAction.name}</span>님과 동역자가 되면<br />
                  중보기도탭에서 서로의 <span className="font-bold">글기도·음성기도 내역</span>을 함께 볼 수 있습니다.
                </p>
              ) : (
                <p className="mb-6 text-zinc-500 text-sm">
                  <span className="font-bold text-zinc-700">{confirmPartnerAction.name}</span>님의<br />동역자 요청을 거절하시겠습니까?
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPartnerAction(null)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 active:scale-95 transition-transform"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const { type, requestId, requesterId } = confirmPartnerAction;
                    setConfirmPartnerAction(null);
                    void resolvePartnerRequest(requestId, type === 'accept', requesterId);
                  }}
                  className={`flex-1 rounded-xl py-3 font-bold text-white active:scale-95 transition-transform ${confirmPartnerAction.type === 'accept' ? 'bg-[#4A6741] shadow-lg shadow-green-200' : 'bg-red-500 shadow-lg shadow-red-200'}`}
                >
                  {confirmPartnerAction.type === 'accept' ? '수락' : '거절'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 동역자 맺기 모달 */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => { setShowPartnerModal(false); setSelectedPartnerIds(new Set()); }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) { setShowPartnerModal(false); setSelectedPartnerIds(new Set()); }
            }}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
          >
          <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 mb-0" />
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Handshake size={18} className="text-[#4A6741]" />
                <span className="font-bold text-zinc-900">동역자 맺기</span>
              </div>
              <button onClick={() => { setShowPartnerModal(false); setSelectedPartnerIds(new Set()); }} className="p-1 text-zinc-400"><X size={20} /></button>
            </div>
            <div className="px-6 pt-3 pb-2">
              <div className="bg-amber-50 rounded-xl p-3 flex gap-2">
                <Handshake size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  동역자끼리는 중보기도탭에서 서로의 <span className="font-bold">글기도·음성기도 내역</span>을 함께 볼 수 있습니다. 부부, 기도 파트너 등 신뢰하는 분께만 요청하세요.
                </p>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-2 space-y-2">
              {members.filter(m => m.user_id !== user?.id && !partnerIds.has(m.user_id)).map(m => {
                const mName = m.profile?.nickname || m.profile?.username || "모임원";
                const selected = selectedPartnerIds.has(m.user_id);
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setSelectedPartnerIds(prev => {
                      const next = new Set(prev);
                      if (next.has(m.user_id)) next.delete(m.user_id); else next.add(m.user_id);
                      return next;
                    })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selected ? "border-[#4A6741] bg-[#4A6741]/5" : "border-zinc-100 bg-white"}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-[#4A6741] bg-[#4A6741]" : "border-zinc-300"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-zinc-800">{mName}</span>
                    <span className="text-xs text-zinc-400 ml-auto">{toLabel(m.role)}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              <button
                onClick={() => void sendPartnerRequests()}
                disabled={partnerSending || !selectedPartnerIds.size}
                className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-40"
              >
                {partnerSending ? "신청 중..." : `신청하기 ${selectedPartnerIds.size > 0 ? `(${selectedPartnerIds.size}명)` : ""}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 기도제목 공유 모달 */}
      {showPrayerShareModal && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowPrayerShareModal(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) setShowPrayerShareModal(false);
            }}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
          >
          <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 mb-0" />
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-[#4A6741]" />
                <span className="font-bold text-zinc-900">기도제목 공유</span>
              </div>
              <button onClick={() => setShowPrayerShareModal(false)} className="p-1 text-zinc-400"><X size={20} /></button>
            </div>
            <p className="px-6 pt-3 text-xs text-zinc-400">공유할 모임원을 선택하세요.</p>
            <div className="overflow-y-auto flex-1 px-6 py-2 space-y-2">
              {orderedTopicsByAuthor.map(item => {
                const name = item.author?.nickname || item.author?.username || "모임원";
                const selected = selectedShareUserIds.has(item.userId);
                return (
                  <button
                    key={item.userId}
                    onClick={() => setSelectedShareUserIds(prev => {
                      const next = new Set(prev);
                      if (next.has(item.userId)) next.delete(item.userId); else next.add(item.userId);
                      return next;
                    })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selected ? "border-[#4A6741] bg-[#4A6741]/5" : "border-zinc-100 bg-white"}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-[#4A6741] bg-[#4A6741]" : "border-zinc-300"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-zinc-800">{name}</span>
                    <span className="text-xs text-zinc-400 ml-auto">{item.topics.length}개</span>
                  </button>
                );
              })}
            </div>
            <div className="px-6 pt-4" style={{ paddingBottom: "calc(1.25rem + var(--safe-bottom-inset))" }}>
              <button
                disabled={!selectedShareUserIds.size}
                onClick={async () => {
                  const lines: string[] = [`마이아멘 [${group?.name ?? "모임"}] 기도제목 현황\n`];
                  for (const item of orderedTopicsByAuthor) {
                    if (!selectedShareUserIds.has(item.userId)) continue;
                    const name = item.author?.nickname || item.author?.username || "모임원";
                    lines.push(`📌 ${name}`);
                    item.topics.forEach(t => {
                      const text = (t.content || "").trim();
                      if (text) lines.push(`• ${text}`);
                    });
                    lines.push("");
                  }
                  const shareText = lines.join("\n").trim();
                  const shared = await shareContent({ text: shareText });
                  if (!shared) {
                    await navigator.clipboard.writeText(shareText).catch(() => {});
                    alert("클립보드에 복사됐습니다. 카카오톡에 붙여넣기 해주세요.");
                  }
                  setShowPrayerShareModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-40"
              >
                {`공유하기${selectedShareUserIds.size > 0 ? ` (${selectedShareUserIds.size}명)` : ""}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
