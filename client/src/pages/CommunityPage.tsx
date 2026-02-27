import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Plus, Search, Shield, Loader2, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { LoginModal } from "../components/LoginModal";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  group_image: string | null;
  group_slug: string | null;
  owner_id: string | null;
  group_type?: string | null;
  created_at: string | null;
};

type MemberRole = "owner" | "leader" | "member";

type JoinedGroup = {
  group: GroupRow;
  role: MemberRole;
};

type PendingJoinRequest = {
  id: string;
  group_id: string;
  created_at: string | null;
  group: GroupRow | null;
};

type SlugCheckState = "idle" | "checking" | "available" | "taken";

const LAST_GROUP_KEY = "last_group_id";

function sanitizeFileName(name: string) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureHttpsUrl(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        resolve(String(reader.result || "").split(",")[1] || "");
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resizeImageFile(file: File, maxSize = 900, quality = 0.82): Promise<File> {
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


export default function CommunityPage() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 최초 로딩 상태
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasLeadershipScope, setHasLeadershipScope] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [groupSearchKeyword, setGroupSearchKeyword] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<GroupRow[]>([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    password: "",
    description: "",
    groupType: "church",
    customGroupType: "",
  });
  const [slugCheckState, setSlugCheckState] = useState<SlugCheckState>("idle");
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string>("");
  const pendingGroupId = useMemo(() => {
    const fromPath = new URLSearchParams(String(location || "").split("?")[1] || "").get("pending_group");
    if (fromPath) return fromPath;
    const hashQuery = String(window.location.hash || "").split("?")[1] || "";
    const fromHash = new URLSearchParams(hashQuery).get("pending_group");
    if (fromHash) return fromHash;
    return new URLSearchParams(window.location.search).get("pending_group");
  }, [location]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setIsInitialLoading(false); // 최초 로딩 끝
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setJoinedGroups([]);
      setLoading(false);
      setGroupSearchResults([]);
      setMemberCounts({});
      setPendingRequests([]);
      return;
    }
    setLoading(true); // 로그인 후 안내 메시지 노출 방지
    void initialize(user.id);
  }, [user?.id]);

  const initialize = async (userId: string) => {
    setLoading(true);
    await Promise.all([loadJoinedGroups(userId), loadLeadershipScope(userId), loadPendingRequests(userId)]);
    setLoading(false);
  };

  const loadLeadershipScope = async (userId: string) => {
    const { data, error } = await supabase.from("group_scope_leaders").select("id").eq("user_id", userId).limit(1);
    if (error) {
      setHasLeadershipScope(false);
      return;
    }
    setHasLeadershipScope((data?.length ?? 0) > 0);
  };

  const loadMemberCountsForGroups = async (groupsInput: Array<Pick<GroupRow, "id" | "owner_id">>) => {
    if (groupsInput.length === 0) return;
    const uniqueGroupIds = Array.from(new Set(groupsInput.map((row) => String(row.id))));
    const { data: rows, error } = await supabase.rpc("get_group_member_counts", {
      p_group_ids: uniqueGroupIds,
    });

    if (!error && Array.isArray(rows)) {
      const nextCounts: Record<string, number> = {};
      uniqueGroupIds.forEach((gid) => {
        nextCounts[gid] = 1;
      });
      rows.forEach((row: any) => {
        const gid = String(row.group_id || "");
        if (!gid) return;
        nextCounts[gid] = Math.max(1, Number(row.member_count || 0));
      });
      setMemberCounts((prev) => ({ ...prev, ...nextCounts }));
      return;
    }

    console.error("get_group_member_counts rpc failed:", error);

    // Fallback for environments where the RPC is not deployed yet.
    const ownerByGroup = new Map<string, string>();
    groupsInput.forEach((row) => {
      const gid = String(row.id || "");
      const ownerId = String(row.owner_id || "");
      if (gid && ownerId) ownerByGroup.set(gid, ownerId);
    });

    const [{ data: members, error: memberErr }, { data: groups }] = await Promise.all([
      supabase.from("group_members").select("group_id,user_id").in("group_id", uniqueGroupIds),
      supabase.from("groups").select("id,owner_id").in("id", uniqueGroupIds),
    ]);
    if (memberErr) return;

    const bucket = new Map<string, Set<string>>();
    uniqueGroupIds.forEach((id) => bucket.set(id, new Set<string>()));

    (members ?? []).forEach((row: any) => {
      const gid = String(row.group_id || "");
      const uid = String(row.user_id || "");
      if (gid && uid && bucket.has(gid)) bucket.get(gid)!.add(uid);
    });

    (groups ?? []).forEach((row: any) => {
      const gid = String(row.id || "");
      const ownerId = String(row.owner_id || "");
      if (gid && ownerId && bucket.has(gid)) bucket.get(gid)!.add(ownerId);
    });

    ownerByGroup.forEach((ownerId, gid) => {
      if (bucket.has(gid) && ownerId) bucket.get(gid)!.add(ownerId);
    });

    const nextCounts: Record<string, number> = {};
    bucket.forEach((set, gid) => {
      nextCounts[gid] = set.size;
    });
    setMemberCounts((prev) => ({ ...prev, ...nextCounts }));
  };

  const loadPendingRequests = async (userId: string) => {
    const { data: requestRows, error } = await supabase
      .from("group_join_requests")
      .select("id,group_id,created_at,status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load pending requests:", error);
      setPendingRequests([]);
      return;
    }

    const requests = ((requestRows ?? []) as Array<any>).map((row) => ({
      id: String(row.id),
      group_id: String(row.group_id),
      created_at: row.created_at ? String(row.created_at) : null,
    }));

    if (requests.length === 0) {
      setPendingRequests([]);
      return;
    }

    const groupIds = Array.from(new Set(requests.map((row) => row.group_id)));
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, description, group_image, group_slug, owner_id, group_type, created_at")
      .in("id", groupIds);

    const groupMap = new Map<string, GroupRow>();
    ((groups ?? []) as GroupRow[]).forEach((row) => {
      groupMap.set(String(row.id), row);
    });

    const pendingList: PendingJoinRequest[] = requests.map((row) => ({
      ...row,
      group: groupMap.get(row.group_id) ?? null,
    }));

    setPendingRequests(pendingList);
    await loadMemberCountsForGroups(
      pendingList
        .map((item) => item.group)
        .filter((group): group is GroupRow => Boolean(group))
        .map((group) => ({ id: group.id, owner_id: group.owner_id }))
    );
  };

  const loadJoinedGroups = async (userId: string): Promise<JoinedGroup[]> => {
    const [{ data: memberRows, error: memberError }, { data: ownedRows, error: ownedError }] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id, role, groups(*)")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false }),
      supabase
        .from("groups")
        .select("id, name, description, group_image, group_slug, owner_id, group_type, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (memberError) {
      console.error("Failed to load joined groups:", memberError);
      setJoinedGroups([]);
      return [];
    }

    if (ownedError) {
      console.error("Failed to load owned groups:", ownedError);
    }

    const map = new Map<string, JoinedGroup>();

    (memberRows ?? []).forEach((row: any) => {
      const g = row.groups as GroupRow | null;
      if (!g?.id) return;
      const role: MemberRole = g.owner_id === userId ? "owner" : (row.role ?? "member");
      map.set(g.id, { group: g, role });
    });

    (ownedRows ?? []).forEach((g: any) => {
      const row = g as GroupRow;
      if (!row?.id) return;
      const prev = map.get(row.id);
      map.set(row.id, { group: prev?.group || row, role: "owner" });
    });

    const mapped = Array.from(map.values()).sort((a, b) => {
      const at = new Date(a.group.created_at || 0).getTime();
      const bt = new Date(b.group.created_at || 0).getTime();
      return bt - at;
    });

    setJoinedGroups(mapped);
    await loadMemberCountsForGroups(mapped.map((item) => ({ id: item.group.id, owner_id: item.group.owner_id })));
    return mapped;
  };

  const searchGroups = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setGroupSearchResults([]);
      return;
    }

    setGroupSearchLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, group_image, group_slug, owner_id, group_type, created_at")
      .or(`name.ilike.%${trimmed}%,group_slug.ilike.%${trimmed}%`)
      .order("created_at", { ascending: false })
      .limit(60);

    setGroupSearchLoading(false);
    if (error) {
      console.error("Failed to search groups:", error);
      setGroupSearchResults([]);
      return;
    }

    const rows = (data ?? []) as GroupRow[];
    setGroupSearchResults(rows);
    await loadMemberCountsForGroups(rows.map((row) => ({ id: row.id, owner_id: row.owner_id })));
  };

  const membershipMap = useMemo(() => {
    const map = new Map<string, JoinedGroup>();
    joinedGroups.forEach((item) => map.set(item.group.id, item));
    return map;
  }, [joinedGroups]);

  const uploadGroupImageIfNeeded = async (): Promise<string | null> => {
    if (!groupImageFile || !user?.id) return null;
    const optimized = await resizeImageFile(groupImageFile);

    const safeName = sanitizeFileName(optimized.name || "group.jpg");
    const fileName = `images/group/${user.id}/${Date.now()}_${safeName}`;
    const fileBase64 = await fileToBase64(optimized);

    const response = await fetch("/api/file/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileBase64, contentType: "image/jpeg" }),
    });

    if (!response.ok) throw new Error("failed to upload group image");
    const data = await response.json();
    if (!data?.success || !data?.publicUrl) throw new Error(data?.error || "failed to upload group image");
    return ensureHttpsUrl(data.publicUrl as string);
  };

  const checkSlugDuplicate = async () => {
    const slug = createForm.slug.trim().toLowerCase();
    if (!slug) {
      setSlugCheckState("idle");
      return;
    }

    setSlugCheckState("checking");
    const { data, error } = await supabase.from("groups").select("id").eq("group_slug", slug).maybeSingle();
    if (error) {
      setSlugCheckState("idle");
      alert("중복 확인에 실패했습니다.");
      return;
    }
    setSlugCheckState(data ? "taken" : "available");
  };

  const handleCreateGroup = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const name = createForm.name.trim();
    const slug = createForm.slug.trim().toLowerCase();
    const password = createForm.password.trim();
    const description = createForm.description.trim();

    if (!name || !slug) {
      alert("모임 이름과 모임 아이디를 입력해주세요.");
      return;
    }

    if (slugCheckState !== "available") {
      alert("모임 아이디 중복 확인을 완료해주세요.");
      return;
    }

    if (createForm.groupType === "other" && !createForm.customGroupType.trim()) {
      alert("기타 모임명을 입력해주세요.");
      return;
    }

    const finalGroupType =
      createForm.groupType === "church"
        ? "church"
        : createForm.groupType === "family"
          ? "family"
          : createForm.groupType === "other"
            ? "etc"
            : "work_school";

    const descriptionWithType =
      createForm.groupType === "other" && createForm.customGroupType.trim()
        ? `[기타:${createForm.customGroupType.trim()}] ${description}`.trim()
        : description;

    setSaving(true);
    try {
      const [{ data: nameDup }, { data: slugDup }] = await Promise.all([
        supabase.from("groups").select("id").ilike("name", name).maybeSingle(),
        supabase.from("groups").select("id").eq("group_slug", slug).maybeSingle(),
      ]);

      if (nameDup) {
        alert("이미 사용 중인 모임 이름입니다.");
        return;
      }

      if (slugDup) {
        alert("이미 사용 중인 모임 아이디입니다.");
        setSlugCheckState("taken");
        return;
      }

      const groupImageUrl = await uploadGroupImageIfNeeded();

      let { data: created, error: createError } = await supabase
        .from("groups")
        .insert({
          name,
          group_slug: slug,
          password: password || null,
          description: descriptionWithType || null,
          owner_id: user.id,
          is_open: false,
          group_type: finalGroupType,
          group_image: groupImageUrl,
        })
        .select("id")
        .single();

      if (createError && (createError.code === "42703" || createError.code === "PGRST204")) {
        const fallback = await supabase
          .from("groups")
          .insert({
            name,
            group_slug: slug,
            password: password || null,
            description: descriptionWithType || null,
            owner_id: user.id,
            is_open: false,
          })
          .select("id")
          .single();
        created = fallback.data;
        createError = fallback.error;
      }

      if (createError || !created) throw createError ?? new Error("모임 생성 실패");

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: created.id,
        user_id: user.id,
        role: "leader",
      });

      if (memberError) throw memberError;

      localStorage.setItem(LAST_GROUP_KEY, created.id);
      setShowCreateModal(false);
      setCreateForm({ name: "", slug: "", password: "", description: "", groupType: "church", customGroupType: "" });
      setSlugCheckState("idle");
      setGroupImageFile(null);
      setGroupImagePreview("");
      await loadJoinedGroups(user.id);
      setLocation(`/group/${created.id}`);
    } catch (error) {
      console.error("create group error:", error);
      alert("모임 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const openGroup = (groupId: string) => {
    if (loading) return;
    localStorage.setItem(LAST_GROUP_KEY, groupId);
    setLocation(`/group/${groupId}`);
  };

  const GroupCard = ({ row }: { row: GroupRow }) => {
    const membership = membershipMap.get(row.id);
    const roleText = membership
      ? membership.role === "owner"
        ? "관리자"
        : membership.role === "leader"
          ? "리더"
          : "일반멤버"
      : "비가입";

    const count = memberCounts[row.id] ?? 0;

    return (
      <div className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="w-14 h-14 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-xl">
          {row.group_image ? <img src={ensureHttpsUrl(row.group_image) || ""} className="w-full h-full object-cover" alt="group" /> : <Users size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${membership?.role === 'owner' ? 'bg-amber-100 text-amber-700' :
              membership?.role === 'leader' ? 'bg-blue-100 text-blue-700' :
                membership ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-50 text-zinc-400'
              }`}>
              {roleText}
            </span>
          </div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 아이디 : {row.group_slug ?? "-"}</div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 멤버수 : {count}명</div>
        </div>

        <button
          onClick={() => openGroup(row.id)}
          className="w-9 h-9 bg-[#4A6741] opacity-90 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#3d5535] transition-colors"
          aria-label="입장"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] pt-20 pb-10 px-4 text-sm">
      <div className="max-w-2xl mx-auto space-y-4">
        {hasLeadershipScope && (
          <div className="flex justify-end">
            <button
              onClick={() => setLocation("/leadership")}
              className="text-sm font-bold px-3 py-2 bg-[#4A6741] opacity-90 text-white flex items-center gap-1"
            >
              <Shield size={14} /> 상위 리더 대쉬보드
            </button>
          </div>
        )}

        {/* 최초 로딩 중에는 아무것도 렌더링하지 않음 */}
        {isInitialLoading ? null :
          (!user && !loading ? (
            <div className="min-h-[60vh] flex items-center justify-center text-center">
              <div className="max-w-sm w-full bg-[#F6F7F8] rounded-none p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-zinc-600 font-bold mb-4">로그인 후 모임 생성, 가입 및 활동이 가능합니다.</p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-[#4A6741] text-white text-sm font-bold"
                >
                  로그인
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center gap-3 w-full">
              <Loader2 size={48} className="text-zinc-200 animate-spin" strokeWidth={1.5} />
              <p className="text-zinc-400 text-sm font-medium text-center">
                모임 리스트 불러오는 중...
              </p>
            </div>
          ) : (
            <section className="space-y-3">
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h2 className="px-1 text-sm font-bold text-amber-700">가입 승인 대기중</h2>
                  {pendingRequests.map((item) => {
                    const row = item.group;
                    if (!row) return null;
                    const count = memberCounts[row.id] ?? 1;
                    const isFocused = pendingGroupId === row.id;
                    return (
                      <div
                        key={`pending-${item.id}`}
                        className={`w-full bg-white p-4 flex items-center gap-3 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${isFocused ? "ring-2 ring-amber-300" : ""}`}
                      >
                        <div className="w-14 h-14 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-xl">
                          {row.group_image ? <img src={ensureHttpsUrl(row.group_image) || ""} className="w-full h-full object-cover" alt="group" /> : <Users size={22} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-md">승인대기</span>
                          </div>
                          <div className="text-sm text-zinc-500 truncate mt-1">모임 아이디 : {row.group_slug ?? "-"}</div>
                          <div className="text-sm text-zinc-500 truncate mt-1">모임 멤버수 : {count}명</div>
                        </div>
                        <button
                          onClick={() => openGroup(row.id)}
                          className="w-9 h-9 bg-[#4A6741] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#3d5535] transition-colors"
                          aria-label="입장"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {joinedGroups.length === 0 && pendingRequests.length === 0 ? (
                <div className="min-h-[42vh] flex items-center justify-center text-center text-zinc-500 px-6">
                  <p className="text-base font-bold">가입한 모임이 없습니다. <br />모임 검색 또는 신규 생성을 진행해주세요.</p>
                </div>
              ) : joinedGroups.length > 0 ? (
                <div className="space-y-4">
                  {joinedGroups.map((item) => (
                    <GroupCard key={item.group.id} row={item.group} />
                  ))}
                </div>
              ) : null}
            </section>
          ))
        }
      </div>

      {user && (
        <>
          <button
            onClick={() => setShowSearchModal(true)}
            className="fixed right-6 bottom-44 z-[120] w-12 h-12 rounded-full bg-[#4A6741] opacity-90 text-white shadow-2xl flex items-center justify-center"
            aria-label="모임 검색"
          >
            <Search size={22} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed right-6 bottom-28 z-[120] w-12 h-12 rounded-full bg-[#4A6741] opacity-90 text-white shadow-2xl flex items-center justify-center"
            aria-label="모임 생성"
          >
            <Plus size={24} />
          </button>
        </>
      )}

      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-xl bg-white border border-zinc-100 p-6 text-base rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">모임 검색</h3>
                <button onClick={() => setShowSearchModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={groupSearchKeyword}
                    onChange={(e) => setGroupSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchGroups(groupSearchKeyword);
                    }}
                    placeholder="모임 이름/모임 아이디 검색"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 focus:border-[#4A6741] transition-all"
                  />
                </div>
                <button onClick={() => searchGroups(groupSearchKeyword)} className="px-6 py-3 bg-[#4A6741] text-white text-base font-bold rounded-xl hover:bg-[#3d5535] transition-colors shadow-sm">
                  검색
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-[44vh] overflow-y-auto">
                {groupSearchLoading && <div className="text-base text-zinc-500 py-2">검색 중...</div>}
                {!groupSearchLoading && groupSearchResults.length === 0 && groupSearchKeyword.trim() && (
                  <div className="text-base text-zinc-500 py-2">검색 결과가 없습니다.</div>
                )}
                {!groupSearchLoading &&
                  groupSearchResults.map((group) => <GroupCard key={`search-${group.id}`} row={group} />)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[220] p-4 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-xl bg-white border border-zinc-100 p-6 text-base max-h-[88vh] overflow-y-auto rounded-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">모임 생성</h3>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                  placeholder="모임 이름"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                    placeholder="모임 아이디"
                    value={createForm.slug}
                    onChange={(e) => {
                      setCreateForm((prev) => ({ ...prev, slug: e.target.value }));
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
                {slugCheckState === "available" && <p className="text-sm text-emerald-600">사용 가능한 모임 아이디입니다.</p>}
                {slugCheckState === "taken" && <p className="text-sm text-red-500">이미 사용 중인 모임 아이디입니다.</p>}

                <input
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                  placeholder="모임 비밀번호 (선택)"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                />

                <select
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all appearance-none"
                  value={createForm.groupType}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, groupType: e.target.value }))}
                >
                  <option value="church">교회 모임</option>
                  <option value="school">학교 모임</option>
                  <option value="work">직장 모임</option>
                  <option value="family">가족 모임</option>
                  <option value="other">기타 모임</option>
                </select>

                {createForm.groupType === "other" && (
                  <input
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                    placeholder="기타 모임명 입력"
                    value={createForm.customGroupType}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, customGroupType: e.target.value }))}
                  />
                )}

                <div className="border border-zinc-100 bg-zinc-50 p-4 space-y-3 rounded-2xl">
                  <label className="text-sm font-bold text-zinc-600 block">모임 대표이미지</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setGroupImageFile(file);
                      if (file) setGroupImagePreview(URL.createObjectURL(file));
                      else setGroupImagePreview("");
                    }}
                    className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#4A6741]/10 file:text-[#4A6741] hover:file:bg-[#4A6741]/20 transition-all"
                  />
                  {groupImagePreview && (
                    <div className="overflow-hidden border border-zinc-100 bg-white inline-block rounded-xl shadow-sm">
                      <img src={groupImagePreview} className="w-24 h-24 object-cover" alt="group-preview" />
                    </div>
                  )}
                </div>

                <textarea
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 text-sm min-h-[120px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all resize-none"
                  placeholder="여기에 모임에 대한 간단한 소개를 남겨주세요."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                />

                <button
                  onClick={handleCreateGroup}
                  disabled={saving}
                  className="w-full py-4 bg-[#4A6741] text-white font-black text-lg rounded-2xl disabled:opacity-50 shadow-lg hover:bg-[#3d5535] transition-all active:scale-[0.98]"
                >
                  {saving ? "모임을 생성하는 중..." : "새로운 모임 시작하기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} returnTo={`${window.location.origin}/#/community`} />
    </div>
  );
}
