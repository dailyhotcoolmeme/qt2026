import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Plus, Search, Shield, Users, X } from "lucide-react";
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

type SlugCheckState = "idle" | "checking" | "available" | "taken";

const LAST_GROUP_KEY = "last_group_id";

function sanitizeFileName(name: string) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
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
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
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
      return;
    }
    void initialize(user.id);
  }, [user?.id]);

  const initialize = async (userId: string) => {
    setLoading(true);
    await Promise.all([loadJoinedGroups(userId), loadLeadershipScope(userId)]);
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

  const loadMemberCountsForGroupIds = async (groupIds: string[]) => {
    if (groupIds.length === 0) return;
    const uniqueGroupIds = Array.from(new Set(groupIds));
    const { data, error } = await supabase.from("group_members").select("group_id").in("group_id", uniqueGroupIds);
    if (error) return;

    const nextCounts: Record<string, number> = {};
    uniqueGroupIds.forEach((id) => {
      nextCounts[id] = 0;
    });
    (data ?? []).forEach((row: any) => {
      const key = String(row.group_id);
      nextCounts[key] = (nextCounts[key] ?? 0) + 1;
    });

    setMemberCounts((prev) => ({ ...prev, ...nextCounts }));
  };

  const loadJoinedGroups = async (userId: string): Promise<JoinedGroup[]> => {
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, role, groups(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Failed to load joined groups:", error);
      setJoinedGroups([]);
      return [];
    }

    const mapped: JoinedGroup[] = (data ?? [])
      .map((row: any) => {
        const g = row.groups as GroupRow | null;
        if (!g) return null;
        const role: MemberRole = g.owner_id === userId ? "owner" : (row.role ?? "member");
        return { group: g, role };
      })
      .filter(Boolean) as JoinedGroup[];

    setJoinedGroups(mapped);
    await loadMemberCountsForGroupIds(mapped.map((item) => item.group.id));
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
    await loadMemberCountsForGroupIds(rows.map((row) => row.id));
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
    return data.publicUrl as string;
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
    localStorage.setItem(LAST_GROUP_KEY, groupId);
    setLocation(`/group/${groupId}`);
  };

  const GroupCard = ({ row }: { row: GroupRow }) => {
    const membership = membershipMap.get(row.id);
    const roleText = membership
      ? membership.role === "owner" || membership.role === "leader"
        ? "관리자"
        : "모임원"
      : "비가입";

    const count = memberCounts[row.id] ?? 0;

    return (
      <div className="w-full bg-white border border-[#F5F6F7] p-4 flex items-center gap-3">
        <div className="w-14 h-14 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-sm">
          {row.group_image ? <img src={row.group_image} className="w-full h-full object-cover" alt="group" /> : <Users size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
            <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[11px] font-semibold rounded-sm">{roleText}</span>
          </div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 아이디 : {row.group_slug ?? "-"}</div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 멤버수 : {count}명</div>
        </div>

        <button
          onClick={() => openGroup(row.id)}
          className="w-9 h-9 bg-[#4A6741] text-white rounded-sm flex items-center justify-center"
          aria-label="입장"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] pt-24 pb-28 px-4 text-base">
      <div className="max-w-2xl mx-auto space-y-4">
        {hasLeadershipScope && (
          <div className="flex justify-end">
            <button
              onClick={() => setLocation("/leadership")}
              className="text-base font-bold px-3 py-2 bg-[#4A6741] text-white flex items-center gap-1"
            >
              <Shield size={14} /> 상위 리더 현황
            </button>
          </div>
        )}

        {!user && (
          <div className="bg-white p-6 border border-[#F5F6F7] text-center">
            <p className="text-base text-zinc-600 font-bold">로그인 후 모임 생성/가입/활동이 가능합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="mt-4 px-4 py-2 bg-[#4A6741] text-white text-base font-bold"
            >
              로그인
            </button>
          </div>
        )}

        {user && loading && <div className="text-center text-base text-zinc-500 py-8">불러오는 중...</div>}

        {user && !loading && (
          <section className="space-y-3">
            {joinedGroups.length === 0 ? (
              <div className="min-h-[42vh] flex items-center justify-center text-center text-zinc-500 px-6">
                <p className="text-base font-bold">가입한 모임이 없습니다. 모임 검색 또는 신규 생성을 진행해주세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {joinedGroups.map((item) => (
                  <GroupCard key={item.group.id} row={item.group} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {user && (
        <>
          <button
            onClick={() => setShowSearchModal(true)}
            className="fixed right-6 bottom-44 z-[120] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center"
            aria-label="모임 검색"
          >
            <Search size={22} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed right-6 bottom-28 z-[120] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center"
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
              className="relative w-full max-w-xl bg-white border border-zinc-200 p-5 text-base"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">모임 검색</h3>
                <button onClick={() => setShowSearchModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={groupSearchKeyword}
                    onChange={(e) => setGroupSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchGroups(groupSearchKeyword);
                    }}
                    placeholder="모임 이름/모임 아이디 검색"
                    className="w-full pl-10 pr-3 py-3 bg-zinc-50 border border-zinc-200 text-base"
                  />
                </div>
                <button onClick={() => searchGroups(groupSearchKeyword)} className="px-4 py-3 bg-[#4A6741] text-white text-base font-bold">
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
              className="relative w-full max-w-xl bg-white border border-zinc-200 p-5 text-base max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">모임 생성</h3>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                  placeholder="모임 이름"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                    placeholder="모임 아이디"
                    value={createForm.slug}
                    onChange={(e) => {
                      setCreateForm((prev) => ({ ...prev, slug: e.target.value }));
                      setSlugCheckState("idle");
                    }}
                  />
                  <button
                    onClick={checkSlugDuplicate}
                    className="px-3 py-2 bg-zinc-900 text-white text-sm font-bold"
                    type="button"
                  >
                    {slugCheckState === "checking" ? "확인중" : "중복확인"}
                  </button>
                </div>
                {slugCheckState === "available" && <p className="text-sm text-emerald-600">사용 가능한 모임 아이디입니다.</p>}
                {slugCheckState === "taken" && <p className="text-sm text-red-500">이미 사용 중인 모임 아이디입니다.</p>}

                <input
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                  placeholder="모임 비밀번호 (선택)"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                />

                <select
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
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
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                    placeholder="기타 모임명 입력"
                    value={createForm.customGroupType}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, customGroupType: e.target.value }))}
                  />
                )}

                <div className="border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                  <label className="text-sm font-semibold text-zinc-600">모임 대표이미지</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setGroupImageFile(file);
                      if (file) setGroupImagePreview(URL.createObjectURL(file));
                      else setGroupImagePreview("");
                    }}
                    className="w-full text-sm"
                  />
                  {groupImagePreview && (
                    <div className="overflow-hidden border border-zinc-200 bg-zinc-100 inline-block">
                      <img src={groupImagePreview} className="w-20 h-20 object-cover" alt="group-preview" />
                    </div>
                  )}
                </div>

                <textarea
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base min-h-[96px]"
                  placeholder="모임 소개"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                />

                <button
                  onClick={handleCreateGroup}
                  disabled={saving}
                  className="w-full py-3 bg-[#4A6741] text-white font-bold text-base disabled:opacity-60"
                >
                  {saving ? "생성 중..." : "모임 생성하기"}
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
