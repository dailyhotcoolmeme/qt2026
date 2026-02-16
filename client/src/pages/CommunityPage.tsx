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
  created_at: string | null;
};

type MemberRole = "owner" | "leader" | "member";

type JoinedGroup = {
  group: GroupRow;
  role: MemberRole;
};

const LAST_GROUP_KEY = "last_group_id";

function getHashQuery() {
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  return new URLSearchParams(query);
}

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasLeadershipScope, setHasLeadershipScope] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [browseGroups, setBrowseGroups] = useState<GroupRow[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    password: "",
    description: "",
  });

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
      void loadBrowseGroups("");
      return;
    }
    void initialize(user.id);
  }, [user?.id]);

  const initialize = async (userId: string) => {
    setLoading(true);
    const [joined] = await Promise.all([
      loadJoinedGroups(userId),
      loadLeadershipScope(userId),
      loadBrowseGroups(searchKeyword),
    ]);
    setLoading(false);

    const skipAutoOpen = getHashQuery().get("list") === "1";
    if (skipAutoOpen) return;

    const savedGroupId = localStorage.getItem(LAST_GROUP_KEY);
    if (!savedGroupId) return;

    const hasMembership = joined.some((item) => item.group.id === savedGroupId);
    if (hasMembership) {
      setLocation(`/group/${savedGroupId}`);
    }
  };

  const loadLeadershipScope = async (userId: string) => {
    const { data, error } = await supabase
      .from("group_scope_leaders")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      setHasLeadershipScope(false);
      return;
    }
    setHasLeadershipScope((data?.length ?? 0) > 0);
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
    return mapped;
  };

  const loadBrowseGroups = async (keyword: string) => {
    let query = supabase
      .from("groups")
      .select("id, name, description, group_image, group_slug, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    if (keyword.trim()) {
      const kw = keyword.trim();
      query = query.or(`name.ilike.%${kw}%,group_slug.ilike.%${kw}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load browse groups:", error);
      setBrowseGroups([]);
      return;
    }

    setBrowseGroups((data ?? []) as GroupRow[]);
  };

  const membershipMap = useMemo(() => {
    const map = new Map<string, JoinedGroup>();
    joinedGroups.forEach((item) => map.set(item.group.id, item));
    return map;
  }, [joinedGroups]);

  const leadingGroups = useMemo(
    () => joinedGroups.filter((item) => item.role === "owner" || item.role === "leader"),
    [joinedGroups]
  );
  const memberGroups = useMemo(() => joinedGroups.filter((item) => item.role === "member"), [joinedGroups]);

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
      alert("모임 이름과 모임 코드를 입력해주세요.");
      return;
    }

    if (!password) {
      alert("가입 비밀번호는 필수입니다.");
      return;
    }

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
        alert("이미 사용 중인 모임 코드입니다.");
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("groups")
        .insert({
          name,
          group_slug: slug,
          password,
          description: description || null,
          owner_id: user.id,
          is_open: false,
        })
        .select("id")
        .single();

      if (createError || !created) {
        throw createError ?? new Error("모임 생성 실패");
      }

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: created.id,
        user_id: user.id,
        role: "leader",
      });

      if (memberError) throw memberError;

      localStorage.setItem(LAST_GROUP_KEY, created.id);
      setShowCreateModal(false);
      setCreateForm({ name: "", slug: "", password: "", description: "" });
      await Promise.all([loadJoinedGroups(user.id), loadBrowseGroups(searchKeyword)]);
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
      ? membership.role === "owner"
        ? "생성자"
        : membership.role === "leader"
        ? "리더"
        : "멤버"
      : "비멤버";

    return (
      <button
        onClick={() => openGroup(row.id)}
        className="w-full bg-white border border-zinc-100 rounded-3xl p-4 flex items-center gap-3 text-left shadow-sm"
      >
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400">
          {row.group_image ? <img src={row.group_image} className="w-full h-full object-cover" /> : <Users size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold">{roleText}</span>
          </div>
          <div className="text-xs text-zinc-500 truncate mt-1">코드: {row.group_slug ?? "-"}</div>
          {row.description && <div className="text-xs text-zinc-500 truncate mt-1">{row.description}</div>}
        </div>

        <ChevronRight size={18} className="text-zinc-300" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] pt-24 pb-28 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-zinc-900">중보모임</h1>
          {hasLeadershipScope && (
            <button
              onClick={() => setLocation("/leadership")}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#4A6741] text-white flex items-center gap-1"
            >
              <Shield size={14} /> 상위 리더 현황
            </button>
          )}
        </div>

        {!user && (
          <div className="bg-white rounded-3xl p-6 border border-zinc-100 text-center">
            <p className="text-sm text-zinc-600 font-bold">로그인 후 모임 생성/가입/활동이 가능합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#4A6741] text-white text-sm font-bold"
            >
              로그인
            </button>
          </div>
        )}

        {user && loading && <div className="text-center text-sm text-zinc-500 py-8">불러오는 중...</div>}

        {user && !loading && (
          <>
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-black">리드 중인 모임</h2>
              {leadingGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3 text-sm text-zinc-500">없습니다.</div>
              ) : (
                leadingGroups.map((item) => <GroupCard key={item.group.id} row={item.group} />)
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-black">참여 중인 모임</h2>
              {memberGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3 text-sm text-zinc-500">없습니다.</div>
              ) : (
                memberGroups.map((item) => <GroupCard key={item.group.id} row={item.group} />)
              )}
            </section>
          </>
        )}

        <section className="bg-white border border-zinc-100 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-zinc-900 text-sm">모임 둘러보기</h2>
            <button
              onClick={() => loadBrowseGroups(searchKeyword)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold"
            >
              새로고침
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadBrowseGroups(searchKeyword);
                }}
                placeholder="모임명 또는 모임코드 검색"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm"
              />
            </div>
            <button
              onClick={() => loadBrowseGroups(searchKeyword)}
              className="px-3 py-2 rounded-xl bg-[#4A6741] text-white text-sm font-bold"
            >
              검색
            </button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {browseGroups.map((group) => (
              <GroupCard key={group.id} row={group} />
            ))}
            {browseGroups.length === 0 && (
              <div className="text-sm text-zinc-500 text-center py-6">검색 결과가 없습니다.</div>
            )}
          </div>
        </section>
      </div>

      {user && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed right-6 bottom-28 z-[120] w-14 h-14 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center"
          aria-label="모임 생성"
        >
          <Plus size={24} />
        </button>
      )}

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
              className="relative w-full max-w-xl bg-white rounded-3xl border border-zinc-100 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">모임 생성</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  placeholder="모임 이름"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  placeholder="모임 코드 (영문/숫자 추천)"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
                <input
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
                  placeholder="가입 비밀번호 (필수)"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <textarea
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm min-h-[96px]"
                  placeholder="모임 소개"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                />

                <button
                  onClick={handleCreateGroup}
                  disabled={saving}
                  className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-60"
                >
                  {saving ? "생성 중..." : "모임 생성하기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        returnTo={`${window.location.origin}/#/community`}
      />
    </div>
  );
}
