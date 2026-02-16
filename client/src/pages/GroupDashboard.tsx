import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import {
  Calendar,
  Check,
  ChevronLeft,
  Crown,
  Edit3,
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
  Shield,
  Square,
  Trash2,
  UserPlus,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type GroupRole = "owner" | "leader" | "member" | "guest";
type TabKey = "home" | "prayer" | "faith" | "social" | "members" | "admin";
type FaithType = "check" | "count" | "attendance";
type FaithSourceMode = "manual" | "linked" | "both";
type LinkedFeature = "none" | "qt" | "prayer" | "reading";
type ActivityType = "qt" | "prayer" | "reading" | "bookmark";

type GroupRow = {
  id: string;
  name: string;
  group_slug: string | null;
  description: string | null;
  owner_id: string | null;
  header_image_url?: string | null;
  header_color?: string | null;
  is_closed?: boolean | null;
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

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLabel(role: string) {
  if (role === "owner") return "생성자";
  if (role === "leader") return "리더";
  if (role === "member") return "멤버";
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

const LAST_GROUP_KEY = "last_group_id";

export default function GroupDashboard() {
  const [matched, routeParams] = useRoute("/group/:id");
  const groupId = matched ? (routeParams as { id: string }).id : null;
  const [, setLocation] = useLocation();

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [role, setRole] = useState<GroupRole>("guest");
  const [activeTab, setActiveTab] = useState<TabKey>("home");
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
  const [faithBoardDate, setFaithBoardDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [faithBoardRows, setFaithBoardRows] = useState<FaithBoardRow[]>([]);
  const [faithBoardLoading, setFaithBoardLoading] = useState(false);

  const [posts, setPosts] = useState<GroupPostRow[]>([]);
  const [postType, setPostType] = useState<"post" | "notice">("post");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [socialViewMode, setSocialViewMode] = useState<"board" | "blog">("board");
  const [showPostComposerModal, setShowPostComposerModal] = useState(false);
  const [authorMap, setAuthorMap] = useState<Record<string, ProfileLite>>({});

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
  const [headerColorDraft, setHeaderColorDraft] = useState("#4A6741");

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
    if (!groupId) return;
    void loadAll(groupId, user?.id ?? null);
  }, [groupId, user?.id]);

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
    if (!group?.id) return;
    localStorage.setItem(LAST_GROUP_KEY, group.id);
    setHeaderColorDraft(group.header_color || "#4A6741");
    setHeaderImageDraft(group.header_image_url || "");
  }, [group?.id, group?.header_color, group?.header_image_url]);

  useEffect(() => {
    if (!group?.id) return;
    if (!(role === "owner" || role === "leader")) return;
    if (members.length === 0) return;
    void loadFaithBoard(group.id, faithBoardDate);
  }, [group?.id, role, members, faithBoardDate]);

  const isManager = role === "owner" || role === "leader";

  const summary = useMemo(
    () => ({
      members: members.length,
      prayers: groupPrayers.length,
      faithDone: Object.keys(faithValues).length,
      posts: posts.length,
    }),
    [members.length, groupPrayers.length, faithValues, posts.length]
  );

  const myFaithCompletedCount = useMemo(
    () => faithItems.filter((item) => (faithValues[item.id] ?? 0) > 0).length,
    [faithItems, faithValues]
  );

  const myFaithScore = useMemo(
    () => Object.values(faithValues).reduce((sum, value) => sum + Number(value || 0), 0),
    [faithValues]
  );

  const loadAll = async (targetGroupId: string, userId: string | null) => {
    setLoading(true);

    const { data: groupData, error: groupErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", targetGroupId)
      .maybeSingle();

    if (groupErr || !groupData) {
      setLoading(false);
      setLocation("/community");
      return;
    }

    setGroup({
      id: groupData.id,
      name: groupData.name,
      group_slug: groupData.group_slug ?? null,
      description: groupData.description ?? null,
      owner_id: groupData.owner_id ?? null,
      header_image_url: (groupData as any).header_image_url ?? null,
      header_color: (groupData as any).header_color ?? "#4A6741",
      is_closed: Boolean((groupData as any).is_closed),
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
      await loadFaithBoard(targetGroupId, faithBoardDate, nextMembers);
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
        .select("id, username, nickname")
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
        .select("item_id, value")
        .eq("group_id", targetGroupId)
        .eq("user_id", userId)
        .eq("record_date", today),
    ]);

    setFaithItems((items ?? []) as FaithItemRow[]);

    const nextValues: Record<string, number> = {};
    (records ?? []).forEach((record: { item_id: string; value: number | string }) => {
      nextValues[record.item_id] = Number(record.value ?? 0);
    });
    setFaithValues(nextValues);
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

    setPosts(nextPosts);

    const authorIds = Array.from(new Set(nextPosts.map((post) => post.author_id)));
    if (authorIds.length === 0) {
      setAuthorMap({});
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, nickname")
      .in("id", authorIds);

    const map: Record<string, ProfileLite> = {};
    (profiles ?? []).forEach((profile: ProfileLite) => {
      map[profile.id] = profile;
    });
    setAuthorMap((prev) => ({ ...prev, ...map }));
  };

  const loadMembers = async (targetGroupId: string, ownerId: string | null): Promise<GroupMemberRow[]> => {
    const { data } = await supabase
      .from("group_members")
      .select("id, user_id, role, joined_at")
      .eq("group_id", targetGroupId)
      .order("joined_at", { ascending: true });

    const rows = (data ?? []) as GroupMemberRow[];
    const base = [...rows];

    if (ownerId && !base.some((member) => member.user_id === ownerId)) {
      base.unshift({
        id: `owner-${ownerId}`,
        user_id: ownerId,
        role: "owner",
        joined_at: null,
      });
    }

    const userIds = Array.from(new Set(base.map((member) => member.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, nickname")
      .in("id", userIds);

    const profileMap = new Map<string, ProfileLite>();
    (profiles ?? []).forEach((profile: ProfileLite) => {
      profileMap.set(profile.id, profile);
    });

    const nextMembers = base.map((member) => {
      const fixedRole = ownerId && member.user_id === ownerId ? "owner" : member.role;
      return {
        ...member,
        role: fixedRole,
        profile: profileMap.get(member.user_id),
      };
    });
    setMembers(nextMembers);
    return nextMembers;
  };

  const loadFaithBoard = async (
    targetGroupId: string,
    date: string,
    memberRows?: GroupMemberRow[]
  ) => {
    const baseMembers = memberRows ?? members;
    if (!baseMembers.length) {
      setFaithBoardRows([]);
      return;
    }

    setFaithBoardLoading(true);
    const memberIds = Array.from(new Set(baseMembers.map((member) => member.user_id)));

    const { data, error } = await supabase
      .from("group_faith_records")
      .select("user_id, item_id, value")
      .eq("group_id", targetGroupId)
      .eq("record_date", date)
      .in("user_id", memberIds);

    if (error) {
      console.error("failed to load faith board:", error);
      setFaithBoardRows([]);
      setFaithBoardLoading(false);
      return;
    }

    const valueMap = new Map<string, Record<string, number>>();
    (data ?? []).forEach((row: { user_id: string; item_id: string; value: number | string }) => {
      const prev = valueMap.get(row.user_id) ?? {};
      prev[row.item_id] = Number(row.value ?? 0);
      valueMap.set(row.user_id, prev);
    });

    const roleOrder: Record<string, number> = { owner: 0, leader: 1, member: 2 };
    const boardRows: FaithBoardRow[] = baseMembers
      .map((member) => {
        const values = valueMap.get(member.user_id) ?? {};
        const total = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
        return {
          user_id: member.user_id,
          role: member.role,
          name: member.profile?.nickname || member.profile?.username || "이름 없음",
          values,
          total,
        };
      })
      .sort((a, b) => {
        const rankDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name, "ko");
      });

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
      .select("id, username, nickname")
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
    if (!joinPassword.trim()) {
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

  const setFaithValue = async (item: FaithItemRow, nextValue: number) => {
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
        source_type: "manual",
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
    setSelectedFaithItem(item);
    setShowFaithLinkModal(true);

    const { data, error } = await supabase
      .from("activity_logs")
      .select(
        "id, activity_type, source_kind, source_table, source_row_id, payload, occurred_at, activity_group_links(group_id)"
      )
      .eq("user_id", user.id)
      .eq("source_kind", "personal")
      .eq("activity_type", item.linked_feature)
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

      const today = new Date().toISOString().split("T")[0];
      const currentValue = faithValues[selectedFaithItem.id] ?? 0;
      const nextValue = selectedFaithItem.item_type === "count" ? currentValue + 1 : 1;

      const { error: faithError } = await supabase.from("group_faith_records").upsert(
        {
          group_id: group.id,
          item_id: selectedFaithItem.id,
          user_id: user.id,
          record_date: today,
          value: nextValue,
          source_type: "linked",
          source_event_type: activity.activity_type,
          source_event_id: String(activity.id),
        },
        { onConflict: "group_id,item_id,user_id,record_date" }
      );

      if (faithError) throw faithError;

      await loadFaith(group.id, user.id);
      setAvailableActivities((prev) => prev.filter((row) => row.id !== activity.id));
    } catch (error) {
      console.error(error);
      alert("외부 활동 연결에 실패했습니다.");
    } finally {
      setLinkingActivityId(null);
    }
  };

  const addPost = async () => {
    if (!group || !user || !postContent.trim()) return;
    if (postType === "notice" && !isManager) {
      alert("공지 작성은 리더/생성자만 가능합니다.");
      return;
    }

    let { error } = await supabase.from("group_posts").insert({
      group_id: group.id,
      author_id: user.id,
      post_type: postType,
      title: postTitle.trim() || null,
      content: postContent.trim(),
    });

    if (error && error.code === "42703") {
      const merged = postTitle.trim()
        ? `[${postTitle.trim()}]\n${postContent.trim()}`
        : postContent.trim();
      const fallback = await supabase.from("group_posts").insert({
        group_id: group.id,
        author_id: user.id,
        post_type: postType,
        content: merged,
      });
      error = fallback.error;
    }

    if (error) {
      alert("게시글 등록에 실패했습니다.");
      return;
    }

    setPostType("post");
    setPostTitle("");
    setPostContent("");
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

    const { error } = await supabase
      .from("group_members")
      .update({ role: nextRole })
      .eq("group_id", group.id)
      .eq("user_id", targetUserId);

    if (error) {
      alert("권한 변경에 실패했습니다.");
      return;
    }
    await loadMembers(group.id, group.owner_id);
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

  const resolveJoinRequest = async (requestId: string, requesterId: string, approve: boolean) => {
    if (!group || !isManager || !user) return;

    if (approve) {
      const { error: memberErr } = await supabase.from("group_members").upsert(
        {
          group_id: group.id,
          user_id: requesterId,
          role: "member",
        },
        { onConflict: "group_id,user_id" }
      );
      if (memberErr) {
        alert("승인 처리에 실패했습니다.");
        return;
      }
    }

    const { error } = await supabase
      .from("group_join_requests")
      .update({
        status: approve ? "approved" : "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", requestId);

    if (error) {
      alert("요청 처리에 실패했습니다.");
      return;
    }

    await Promise.all([loadJoinRequests(group.id), loadMembers(group.id, group.owner_id)]);
  };

  const saveHeaderSettings = async () => {
    if (!group || !isManager) return;

    const { error } = await supabase
      .from("groups")
      .update({
        header_image_url: headerImageDraft.trim() || null,
        header_color: headerColorDraft || "#4A6741",
      })
      .eq("id", group.id);

    if (error) {
      alert("헤더 설정 저장에 실패했습니다.");
      return;
    }

    setGroup((prev) =>
      prev
        ? {
            ...prev,
            header_image_url: headerImageDraft.trim() || null,
            header_color: headerColorDraft || "#4A6741",
          }
        : prev
    );
    setShowHeaderEditModal(false);
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
        alert("해당 코드의 모임을 찾지 못했습니다.");
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
    if (!group || !isManager) return;
    if (!confirm("모임을 폐쇄할까요? 신규 가입 신청이 막힙니다.")) return;

    setClosingGroup(true);
    const { error } = await supabase
      .from("groups")
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: user?.id ?? null,
      })
      .eq("id", group.id);

    setClosingGroup(false);
    if (error) {
      alert("모임 폐쇄 처리에 실패했습니다.");
      return;
    }

    setGroup((prev) => (prev ? { ...prev, is_closed: true } : prev));
    alert("모임을 폐쇄했습니다.");
  };

  const leaveGroup = async () => {
    if (!group || !user) return;
    if (role === "owner") {
      alert("생성자는 모임을 나갈 수 없습니다. 먼저 소유권을 이전하세요.");
      return;
    }
    if (!confirm("모임에서 나가시겠습니까?")) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", user.id);

    if (error) {
      alert("모임 나가기에 실패했습니다.");
      return;
    }
    setLocation("/community");
  };

  if (!groupId) return null;

  if (!authReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-4 border-[#4A6741] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  if (role === "guest") {
    return (
      <div className="min-h-screen bg-[#F6F7F8] pb-28">
        <div
          className="pt-20 pb-8"
          style={{
            background:
              group.header_image_url && group.header_image_url.trim()
                ? `linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,.45)), url(${group.header_image_url}) center/cover`
                : `linear-gradient(135deg, ${group.header_color || "#4A6741"}, #1f2937)`,
          }}
        >
          <div className="max-w-2xl mx-auto px-4">
            <button
              onClick={() => setLocation("/community")}
              className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="mt-6 text-white">
              <div className="text-2xl font-black">{group.name}</div>
              <div className="text-sm text-white/90 mt-1">{group.group_slug ? `코드: ${group.group_slug}` : ""}</div>
            </div>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 -mt-6 space-y-3">
          <div className="bg-white rounded-3xl border border-zinc-100 p-5">
            <div className="text-sm text-zinc-600 whitespace-pre-wrap">
              {group.description?.trim() || "모임 소개가 아직 등록되지 않았습니다."}
            </div>
            {group.is_closed && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                <Lock size={13} /> 현재 폐쇄된 모임입니다.
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
            <h2 className="font-black text-zinc-900">가입 신청</h2>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임 가입 비밀번호"
              disabled={!user || guestJoinPending || group.is_closed}
            />
            <textarea
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              className="w-full min-h-[96px] px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="가입 메시지 (선택)"
              disabled={!user || guestJoinPending || group.is_closed}
            />
            {!user ? (
              <button
                onClick={() => setLocation("/login")}
                className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold"
              >
                로그인 후 가입 신청
              </button>
            ) : guestJoinPending ? (
              <div className="text-sm text-emerald-700 font-bold">가입 신청이 접수되어 승인 대기 중입니다.</div>
            ) : (
              <button
                onClick={submitJoinRequest}
                disabled={joinSubmitting || group.is_closed}
                className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <SendHorizontal size={15} />
                {joinSubmitting ? "신청 중..." : "가입 신청 보내기"}
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F6F7F8] pb-28">
      <div className="sticky top-14 z-30 bg-white border-b border-zinc-100">
        <div
          className="relative overflow-hidden"
          style={{
            background:
              group.header_image_url && group.header_image_url.trim()
                ? `linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.5)), url(${group.header_image_url}) center/cover`
                : `linear-gradient(120deg, ${group.header_color || "#4A6741"}, #1f2937)`,
          }}
        >
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-7 min-h-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocation("/community")}
                className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur"
              >
                <ChevronLeft size={18} />
              </button>

              {isManager && (
                <button
                  onClick={() => setShowHeaderEditModal(true)}
                  className="px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1 backdrop-blur"
                >
                  <Edit3 size={13} />
                  헤더 편집
                </button>
              )}
            </div>

            <div className="text-white">
              <div className="text-2xl font-black truncate">{group.name}</div>
              <div className="text-[13px] text-white/90 mt-1 inline-flex items-center gap-2 flex-wrap">
                <span>{group.group_slug ? `코드: ${group.group_slug}` : ""}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">{toLabel(role)}</span>
                {group.is_closed && <span className="px-2 py-0.5 rounded-full bg-rose-500/70 font-bold">폐쇄됨</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-2 py-2 flex gap-1 overflow-x-auto no-scrollbar">
          {([
            ["home", "홈"],
            ["prayer", "기도"],
            ["faith", "신앙생활"],
            ["social", "소통"],
            ["members", "멤버"],
            ...(isManager ? [["admin", "관리"]] : []),
          ] as Array<[string, string]>).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabKey)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                activeTab === id ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {activeTab === "home" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="bg-white rounded-3xl border border-zinc-100 p-5">
              <h2 className="font-black text-zinc-900 mb-2">모임 요약</h2>
              <div className="grid grid-cols-4 gap-2 text-center">
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
                  <div className="text-lg font-black">{summary.faithDone}</div>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <div className="text-[11px] text-zinc-500">게시글</div>
                  <div className="text-lg font-black">{summary.posts}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-100 p-5">
              <h3 className="font-black text-zinc-900 mb-2 flex items-center gap-2">
                <Calendar size={16} /> 바로가기
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab("prayer")}
                  className="bg-zinc-50 rounded-2xl py-3 text-sm font-bold"
                >
                  기도 탭 이동
                </button>
                <button
                  onClick={() => setLocation("/prayer")}
                  className="bg-zinc-50 rounded-2xl py-3 text-sm font-bold"
                >
                  PrayerPage 이동
                </button>
                <button
                  onClick={() => setLocation("/qt")}
                  className="bg-zinc-50 rounded-2xl py-3 text-sm font-bold"
                >
                  QT 이동
                </button>
                <button
                  onClick={() => setLocation("/reading")}
                  className="bg-zinc-50 rounded-2xl py-3 text-sm font-bold"
                >
                  성경읽기 이동
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "prayer" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <section className="bg-white rounded-3xl border border-zinc-100 p-5">
              <h2 className="font-black text-zinc-900 mb-3">모임원 기도제목</h2>
              <div className="space-y-2">
                {groupPrayerTopics.map((topic) => {
                  const author = authorMap[topic.author_id];
                  const authorName = author?.nickname || author?.username || "모임원";
                  return (
                    <div key={topic.id} className="rounded-2xl bg-zinc-50 px-4 py-3">
                      <div className="text-sm text-zinc-900 whitespace-pre-wrap">{topic.content}</div>
                      <div className="text-[11px] text-zinc-500 mt-2">
                        {authorName} · {formatDateTime(topic.created_at)}
                      </div>
                    </div>
                  );
                })}
                {groupPrayerTopics.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center text-sm text-zinc-500">
                    아직 등록된 기도제목이 없습니다.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-6">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setShowPrayerComposer(true)}
                  className="w-28 h-28 rounded-full bg-[#4A6741] text-white shadow-lg inline-flex flex-col items-center justify-center gap-2"
                >
                  <Mic size={20} />
                  <span className="text-sm font-black">기도하기</span>
                </button>
                <button
                  onClick={() => setShowPrayerTopicModal(true)}
                  className="w-28 h-28 rounded-full bg-zinc-900 text-white shadow-lg inline-flex flex-col items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  <span className="text-sm font-black">기도제목 등록</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setShowPrayerLinkModal(true)}
                  className="py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold inline-flex items-center justify-center gap-2"
                >
                  <Link2 size={16} /> PrayerPage 기록 연결
                </button>
                <button
                  onClick={() => setLocation("/prayer")}
                  className="py-3 rounded-2xl bg-[#4A6741] text-white font-bold"
                >
                  PrayerPage 이동
                </button>
              </div>
            </section>

            <div className="space-y-2">
              <h3 className="font-black text-zinc-900 px-1">기도 저장 목록</h3>
              {groupPrayers.map((record) => (
                <div key={record.id} className="bg-white rounded-3xl border border-zinc-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-zinc-900">{record.title || "제목 없는 기도"}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatDateTime(record.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          record.source_type === "direct"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {record.source_type === "direct" ? "모임 직접" : "Prayer 연결"}
                      </span>
                      {(isManager || record.user_id === user.id) && (
                        <button
                          onClick={() => removeGroupPrayer(record)}
                          className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <audio controls className="w-full" src={record.audio_url} preload="none" />
                </div>
              ))}

              {groupPrayers.length === 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-5 text-sm text-zinc-500 text-center">
                  아직 모임 기도 기록이 없습니다.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "faith" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <section className="bg-white rounded-3xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-black text-zinc-900">오늘의 신앙생활</h2>
                {isManager && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-bold">조회일</span>
                    <input
                      type="date"
                      value={faithBoardDate}
                      onChange={(e) => setFaithBoardDate(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-[11px] text-zinc-500">내 완료 항목</div>
                  <div className="text-lg font-black text-zinc-900">
                    {myFaithCompletedCount}/{faithItems.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-[11px] text-zinc-500">내 활동 점수</div>
                  <div className="text-lg font-black text-zinc-900">{myFaithScore}</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-[11px] text-zinc-500">연동 항목 수</div>
                  <div className="text-lg font-black text-zinc-900">
                    {faithItems.filter((item) => item.linked_feature !== "none").length}
                  </div>
                </div>
              </div>
            </section>

            {isManager && (
              <section className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-3">
                <h3 className="font-black text-zinc-900 text-sm">전체 멤버 일일 현황</h3>
                {faithBoardLoading ? (
                  <div className="py-6 text-sm text-zinc-500 text-center">현황 불러오는 중...</div>
                ) : faithBoardRows.length === 0 ? (
                  <div className="py-6 text-sm text-zinc-500 text-center">조회된 기록이 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-100">
                          <th className="text-left py-2 pr-3 whitespace-nowrap">멤버</th>
                          <th className="text-left py-2 pr-3 whitespace-nowrap">권한</th>
                          {faithItems.map((item) => (
                            <th key={`head-${item.id}`} className="text-left py-2 pr-3 whitespace-nowrap">
                              {item.name}
                            </th>
                          ))}
                          <th className="text-left py-2 whitespace-nowrap">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faithBoardRows.map((row) => (
                          <tr key={`board-${row.user_id}`} className="border-b border-zinc-100/70">
                            <td className="py-2 pr-3 font-bold text-zinc-900 whitespace-nowrap">{row.name}</td>
                            <td className="py-2 pr-3 text-zinc-600 whitespace-nowrap">{toLabel(row.role)}</td>
                            {faithItems.map((item) => {
                              const value = row.values[item.id] ?? 0;
                              return (
                                <td key={`cell-${row.user_id}-${item.id}`} className="py-2 pr-3 whitespace-nowrap">
                                  {value > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                                      {value}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 font-black text-zinc-900 whitespace-nowrap">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {isManager && (
              <div className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-2">
                <h3 className="font-black text-zinc-900 text-sm">신앙생활 항목 관리</h3>
                <input
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  placeholder="새 항목 이름"
                  value={newFaithName}
                  onChange={(e) => setNewFaithName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newFaithType}
                    onChange={(e) => setNewFaithType(e.target.value as FaithType)}
                    className="px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  >
                    <option value="check">체크형</option>
                    <option value="count">횟수형</option>
                    <option value="attendance">출석형</option>
                  </select>
                  <select
                    value={newFaithSourceMode}
                    onChange={(e) => {
                      const next = e.target.value as FaithSourceMode;
                      setNewFaithSourceMode(next);
                      if (next === "manual") setNewFaithLinkedFeature("none");
                      if (next !== "manual" && newFaithLinkedFeature === "none") {
                        setNewFaithLinkedFeature("qt");
                      }
                    }}
                    className="px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  >
                    <option value="manual">직접 입력만</option>
                    <option value="linked">외부 연결만</option>
                    <option value="both">직접+외부연결</option>
                  </select>
                </div>

                {newFaithSourceMode !== "manual" && (
                  <select
                    value={newFaithLinkedFeature}
                    onChange={(e) => setNewFaithLinkedFeature(e.target.value as LinkedFeature)}
                    className="w-full px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  >
                    <option value="qt">QT 연결</option>
                    <option value="prayer">기도 연결</option>
                    <option value="reading">성경읽기 연결</option>
                  </select>
                )}

                <button
                  onClick={addFaithItem}
                  className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm inline-flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> 항목 추가
                </button>
              </div>
            )}

            {faithItems.map((item) => {
              const value = faithValues[item.id] ?? 0;
              const canLink =
                item.source_mode === "linked" || item.source_mode === "both"
                  ? item.linked_feature !== "none"
                  : false;

              return (
                <div key={item.id} className="bg-white rounded-3xl border border-zinc-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">{item.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        유형: {item.item_type} / 입력: {item.source_mode}
                        {item.linked_feature !== "none" && ` (${item.linked_feature})`}
                      </div>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => removeFaithItem(item.id)}
                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {(item.source_mode === "manual" || item.source_mode === "both") && (
                    <div className="mt-3">
                      {item.item_type === "count" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFaithValue(item, Math.max(0, value - 1))}
                            className="w-9 h-9 rounded-full bg-zinc-100 font-black"
                          >
                            -
                          </button>
                          <div className="min-w-[44px] text-center font-black text-zinc-900">{value}</div>
                          <button
                            onClick={() => setFaithValue(item, value + 1)}
                            className="w-9 h-9 rounded-full bg-zinc-100 font-black"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFaithValue(item, value > 0 ? 0 : 1)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold ${
                            value > 0 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {value > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Check size={14} /> 완료됨
                            </span>
                          ) : (
                            "완료 처리"
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {canLink && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openFaithLinkModal(item)}
                        className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <Link2 size={14} /> 외부 활동 연결
                      </button>
                      {item.linked_feature === "qt" && (
                        <button
                          onClick={() => setLocation("/qt")}
                          className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
                        >
                          QT 이동
                        </button>
                      )}
                      {item.linked_feature === "prayer" && (
                        <button
                          onClick={() => setLocation("/prayer")}
                          className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
                        >
                          Prayer 이동
                        </button>
                      )}
                      {item.linked_feature === "reading" && (
                        <button
                          onClick={() => setLocation("/reading")}
                          className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
                        >
                          성경읽기 이동
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {faithItems.length === 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-5 text-sm text-zinc-500 text-center">
                아직 등록된 신앙생활 항목이 없습니다.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "social" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="bg-white rounded-3xl border border-zinc-100 p-4 flex items-center justify-between gap-3">
              <h2 className="font-black text-zinc-900">모임 소통</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSocialViewMode("board")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${
                    socialViewMode === "board" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <LayoutList size={14} />
                  게시글형
                </button>
                <button
                  onClick={() => setSocialViewMode("blog")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${
                    socialViewMode === "blog" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <LayoutGrid size={14} />
                  블로그형
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {posts.map((post) => {
                const author = authorMap[post.author_id];
                const authorName = author?.nickname || author?.username || "이름 없음";
                const canDelete = isManager || post.author_id === user.id;
                const displayTitle = post.title?.trim() || post.content.slice(0, 40) || "제목 없음";

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-3xl border border-zinc-100 p-4 ${
                      socialViewMode === "blog" ? "shadow-sm" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              post.post_type === "notice"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {post.post_type === "notice" ? "공지" : "일반"}
                          </span>
                          <span className="text-xs text-zinc-500">{authorName}</span>
                        </div>
                        <div className="text-sm font-black text-zinc-900 mt-1">{displayTitle}</div>
                        <div className="text-xs text-zinc-500 mt-1">{formatDateTime(post.created_at)}</div>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => removePost(post)}
                          className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {socialViewMode === "board" ? (
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap">{post.content}</p>
                    ) : (
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap line-clamp-5">{post.content}</p>
                    )}
                  </div>
                );
              })}

              {posts.length === 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-5 text-sm text-zinc-500 text-center">
                  아직 게시글이 없습니다.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPostComposerModal(true)}
              className="fixed right-6 bottom-28 z-[120] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center"
              aria-label="글 작성"
            >
              <MessageSquare size={22} />
            </button>
          </motion.div>
        )}

        {activeTab === "members" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {isManager && (
              <div className="bg-white rounded-3xl border border-zinc-100 p-4">
                <h3 className="font-black text-zinc-900 mb-2 text-sm flex items-center gap-2">
                  <Shield size={14} /> 가입 요청
                </h3>
                {joinRequests.length === 0 ? (
                  <div className="text-sm text-zinc-500">대기 중인 요청이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="bg-zinc-50 rounded-2xl p-3">
                        <div className="text-sm font-bold text-zinc-900">
                          {request.profile?.nickname || request.profile?.username || "이름 없음"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{formatDateTime(request.created_at)}</div>
                        {request.message && <div className="text-sm text-zinc-700 mt-2">{request.message}</div>}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => resolveJoinRequest(request.id, request.user_id, true)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => resolveJoinRequest(request.id, request.user_id, false)}
                            className="px-3 py-2 rounded-xl bg-zinc-200 text-zinc-700 text-xs font-bold"
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

            <div className="bg-white rounded-3xl border border-zinc-100 p-4">
              <h3 className="font-black text-zinc-900 mb-3 text-sm flex items-center gap-2">
                <Users size={14} /> 멤버 목록
              </h3>
              <div className="space-y-2">
                {members.map((member) => {
                  const isOwner = member.role === "owner";
                  const canPromoteDemote = role === "owner" && !isOwner;
                  const canKick = isManager && !isOwner;
                  const name = member.profile?.nickname || member.profile?.username || "이름 없음";

                  return (
                    <div
                      key={`${member.user_id}-${member.id}`}
                      className="bg-zinc-50 rounded-2xl p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-zinc-900">{name}</div>
                        <div className="text-xs text-zinc-500">{toLabel(member.role)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canPromoteDemote && member.role === "member" && (
                          <button
                            onClick={() => changeMemberRole(member.user_id, "leader")}
                            className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold"
                          >
                            리더승급
                          </button>
                        )}
                        {canPromoteDemote && member.role === "leader" && (
                          <button
                            onClick={() => changeMemberRole(member.user_id, "member")}
                            className="px-2 py-1 rounded-lg bg-zinc-200 text-zinc-700 text-xs font-bold"
                          >
                            멤버전환
                          </button>
                        )}
                        {canKick && member.user_id !== user.id && (
                          <button
                            onClick={() => removeMember(member.user_id)}
                            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                            title="강퇴"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isManager && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="fixed right-6 bottom-28 z-[120] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center"
                aria-label="회원 초대"
              >
                <UserPlus size={22} />
              </button>
            )}

            {role !== "owner" && (
              <button
                onClick={leaveGroup}
                className="w-full py-3 rounded-2xl bg-white border border-rose-200 text-rose-600 font-bold text-sm"
              >
                모임 나가기
              </button>
            )}
          </motion.div>
        )}

        {activeTab === "admin" && isManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <section className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-2">
              <h3 className="font-black text-zinc-900 text-sm">신앙활동 항목 관리</h3>
              <input
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                placeholder="새 항목 이름"
                value={newFaithName}
                onChange={(e) => setNewFaithName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newFaithType}
                  onChange={(e) => setNewFaithType(e.target.value as FaithType)}
                  className="px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                >
                  <option value="check">체크형</option>
                  <option value="count">횟수형</option>
                  <option value="attendance">출석형</option>
                </select>
                <select
                  value={newFaithSourceMode}
                  onChange={(e) => {
                    const next = e.target.value as FaithSourceMode;
                    setNewFaithSourceMode(next);
                    if (next === "manual") setNewFaithLinkedFeature("none");
                    if (next !== "manual" && newFaithLinkedFeature === "none") setNewFaithLinkedFeature("qt");
                  }}
                  className="px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                >
                  <option value="manual">직접 입력만</option>
                  <option value="linked">외부 연결만</option>
                  <option value="both">직접+외부연결</option>
                </select>
              </div>
              {newFaithSourceMode !== "manual" && (
                <select
                  value={newFaithLinkedFeature}
                  onChange={(e) => setNewFaithLinkedFeature(e.target.value as LinkedFeature)}
                  className="w-full px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                >
                  <option value="qt">QT 연결</option>
                  <option value="prayer">기도 연결</option>
                  <option value="reading">성경읽기 연결</option>
                </select>
              )}
              <button
                onClick={addFaithItem}
                className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm inline-flex items-center justify-center gap-1"
              >
                <Plus size={14} /> 항목 추가
              </button>
            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-2">
              <h3 className="font-black text-zinc-900 text-sm inline-flex items-center gap-2">
                <Crown size={14} />
                모임 상위 리더 등록
              </h3>
              <select
                value={scopeLeaderUserId}
                onChange={(e) => setScopeLeaderUserId(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
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
                className="w-full py-3 rounded-2xl bg-zinc-900 text-white font-bold text-sm disabled:opacity-50"
              >
                상위 리더 등록
              </button>
              <p className="text-xs text-zinc-500">등록된 상위 리더는 현재 모임을 루트로 하위 모임 현황을 조회할 수 있습니다.</p>
            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-4 space-y-2">
              <h3 className="font-black text-zinc-900 text-sm">하위 모임 연결</h3>
              <input
                value={childGroupCode}
                onChange={(e) => setChildGroupCode(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                placeholder="하위 모임 코드 입력"
              />
              <button
                onClick={linkChildGroup}
                disabled={linkingChildGroup || !childGroupCode.trim()}
                className="w-full py-3 rounded-2xl bg-zinc-900 text-white font-bold text-sm disabled:opacity-60"
              >
                {linkingChildGroup ? "연결 중..." : "하위 모임 연결"}
              </button>
              <p className="text-xs text-zinc-500">여기서 연결된 하위 모임들은 상위 리더 집계 범위에 포함됩니다.</p>
            </section>

            <section className="bg-white rounded-3xl border border-rose-100 p-4 space-y-3">
              <h3 className="font-black text-rose-700 text-sm">모임 폐쇄</h3>
              <p className="text-sm text-zinc-600">폐쇄 시 신규 가입 신청이 차단됩니다. 기존 멤버 데이터는 유지됩니다.</p>
              <button
                onClick={closeGroup}
                disabled={closingGroup || group.is_closed}
                className="w-full py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm disabled:opacity-60"
              >
                {group.is_closed ? "이미 폐쇄된 모임" : closingGroup ? "처리 중..." : "모임 폐쇄하기"}
              </button>
            </section>
          </motion.div>
        )}
      </main>

      {showPrayerLinkModal && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPrayerLinkModal(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-3xl border border-zinc-100 p-4">
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
                <div key={record.id} className="bg-zinc-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="font-bold text-sm text-zinc-900">{record.title || "제목 없는 기도"}</div>
                    <button
                      onClick={() => linkPrayerToGroup(record)}
                      className="px-3 py-1.5 rounded-lg bg-[#4A6741] text-white text-xs font-bold"
                    >
                      연결
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">{formatDateTime(record.created_at)}</div>
                  <audio controls className="w-full" src={record.audio_url} preload="none" />
                </div>
              ))}

              {personalPrayers.length === 0 && (
                <div className="text-sm text-zinc-500 text-center py-8">연결 가능한 개인 기도 기록이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPrayerComposer && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPrayerComposer(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-zinc-900">기도하기</h3>
              <button
                onClick={() => setShowPrayerComposer(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="기도 제목 (선택)"
              value={recordTitle}
              onChange={(e) => setRecordTitle(e.target.value)}
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">녹음 시간</span>
              <span className="font-black text-zinc-900">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
            </div>

            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 py-3 rounded-2xl bg-[#4A6741] text-white font-bold inline-flex items-center justify-center gap-2"
                >
                  <Mic size={16} /> 녹음 시작
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeRecording}
                      className="flex-1 py-3 rounded-2xl bg-[#4A6741] text-white font-bold inline-flex items-center justify-center gap-2"
                    >
                      <Play size={16} /> 재개
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecording}
                      className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold inline-flex items-center justify-center gap-2"
                    >
                      <Pause size={16} /> 일시정지
                    </button>
                  )}
                  <button
                    onClick={stopRecording}
                    className="px-4 py-3 rounded-2xl bg-rose-600 text-white font-bold inline-flex items-center gap-2"
                  >
                    <Square size={16} /> 종료
                  </button>
                </>
              )}
            </div>

            {recordPreviewUrl && (
              <>
                <audio controls className="w-full" src={recordPreviewUrl} />
                <button
                  onClick={saveDirectPrayer}
                  disabled={savingPrayer}
                  className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold disabled:opacity-60"
                >
                  {savingPrayer ? "저장 중..." : "모임 기도 저장"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showPrayerTopicModal && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPrayerTopicModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
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
              className="w-full min-h-[120px] px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임원과 나눌 기도제목을 입력해주세요."
            />
            <button
              onClick={addPrayerTopic}
              disabled={!newPrayerTopic.trim()}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-60"
            >
              등록하기
            </button>
          </div>
        </div>
      )}

      {showPostComposerModal && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPostComposerModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-zinc-900">글 작성</h3>
              <button
                onClick={() => setShowPostComposerModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPostType("post")}
                className={`px-3 py-2 rounded-xl text-sm font-bold ${
                  postType === "post" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                일반글
              </button>
              <button
                onClick={() => setPostType("notice")}
                disabled={!isManager}
                className={`px-3 py-2 rounded-xl text-sm font-bold ${
                  postType === "notice" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-600"
                } ${!isManager ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                공지
              </button>
            </div>

            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="제목"
            />
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full min-h-[140px] px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임 내부 공유 글을 작성하세요."
            />

            <button
              onClick={addPost}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm"
            >
              글 등록
            </button>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-zinc-900">회원 초대</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 space-y-2 text-sm">
              <div>
                <div className="text-xs text-zinc-500">모임명</div>
                <div className="font-bold text-zinc-900">{group.name}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">모임 코드</div>
                <div className="font-bold text-zinc-900">{group.group_slug || "-"}</div>
              </div>
              <div className="text-xs text-zinc-500">가입 비밀번호는 별도로 전달해주세요.</div>
            </div>
            <button
              onClick={() => {
                const text = `[${group.name}] 모임 코드: ${group.group_slug || "-"}`;
                navigator.clipboard.writeText(text).then(() => alert("초대 정보가 복사되었습니다."));
              }}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm"
            >
              초대 문구 복사
            </button>
          </div>
        </div>
      )}

      {showHeaderEditModal && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHeaderEditModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-zinc-100 p-5 space-y-3">
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
              <label className="text-xs text-zinc-500">헤더 배경 색상</label>
              <input
                value={headerColorDraft}
                onChange={(e) => setHeaderColorDraft(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                placeholder="#4A6741"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">헤더 이미지 URL (선택)</label>
              <input
                value={headerImageDraft}
                onChange={(e) => setHeaderImageDraft(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                placeholder="https://..."
              />
            </div>
            <button
              onClick={saveHeaderSettings}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {showFaithLinkModal && selectedFaithItem && (
        <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFaithLinkModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-3xl border border-zinc-100 p-4">
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
                <div key={activity.id} className="bg-zinc-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-zinc-900">{getActivityTitle(activity)}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatDateTime(activity.occurred_at)}</div>
                    </div>
                    <button
                      onClick={() => linkActivityToFaith(activity)}
                      disabled={linkingActivityId === activity.id}
                      className="px-3 py-1.5 rounded-lg bg-[#4A6741] text-white text-xs font-bold disabled:opacity-60"
                    >
                      {linkingActivityId === activity.id ? "연결 중..." : "연결"}
                    </button>
                  </div>
                </div>
              ))}

              {availableActivities.length === 0 && (
                <div className="text-sm text-zinc-500 text-center py-8">
                  연결 가능한 외부 활동이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
