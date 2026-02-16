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

const LAST_GROUP_KEY = "last_group_id";

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasLeadershipScope, setHasLeadershipScope] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [groupSearchKeyword, setGroupSearchKeyword] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<GroupRow[]>([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    password: "",
    description: "",
    groupType: "etc",
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
      setGroupSearchResults([]);
      return;
    }
    void initialize(user.id);
  }, [user?.id]);

  const initialize = async (userId: string) => {
    setLoading(true);
    await Promise.all([
      loadJoinedGroups(userId),
      loadLeadershipScope(userId),
    ]);
    setLoading(false);

    // 자동 재진입을 막고 항상 모임 목록 화면을 우선 노출한다.
    // 마지막 입장 모임 캐시는 "모임 열기" 동작 시에만 사용한다.
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

  const searchGroups = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setGroupSearchResults([]);
      return;
    }

    setGroupSearchLoading(true);
    let query = supabase
      .from("groups")
      .select("id, name, description, group_image, group_slug, owner_id, group_type, created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    query = query.or(`name.ilike.%${trimmed}%,group_slug.ilike.%${trimmed}%`);

    const { data, error } = await query;
    setGroupSearchLoading(false);
    if (error) {
      console.error("Failed to search groups:", error);
      setGroupSearchResults([]);
      return;
    }

    setGroupSearchResults((data ?? []) as GroupRow[]);
  };

  const membershipMap = useMemo(() => {
    const map = new Map<string, JoinedGroup>();
    joinedGroups.forEach((item) => map.set(item.group.id, item));
    return map;
  }, [joinedGroups]);

  const filteredJoinedGroups = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return joinedGroups;
    return joinedGroups.filter((item) => {
      const name = item.group.name?.toLowerCase() ?? "";
      const slug = item.group.group_slug?.toLowerCase() ?? "";
      return name.includes(keyword) || slug.includes(keyword);
    });
  }, [joinedGroups, searchKeyword]);

  const handleCreateGroup = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const name = createForm.name.trim();
    const slug = createForm.slug.trim().toLowerCase();
    const password = createForm.password.trim();
    const description = createForm.description.trim();
    const groupType = createForm.groupType;

    if (!name || !slug) {
      alert("모임 이름과 모임 코드를 입력해주세요.");
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

      let { data: created, error: createError } = await supabase
        .from("groups")
        .insert({
          name,
          group_slug: slug,
          password: password || null,
          description: description || null,
          owner_id: user.id,
          is_open: false,
          group_type: groupType,
        })
        .select("id")
        .single();

      if (createError && createError.code === "42703") {
        const fallback = await supabase
          .from("groups")
          .insert({
            name,
            group_slug: slug,
            password: password || null,
            description: description || null,
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
      setCreateForm({ name: "", slug: "", password: "", description: "", groupType: "etc" });
      await Promise.all([loadJoinedGroups(user.id)]);
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

    return (
      <button
        onClick={() => openGroup(row.id)}
        className="w-full bg-white border border-[#F5F6F7] p-4 flex items-center gap-3 text-left"
      >
        <div className="w-14 h-14 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400">
          {row.group_image ? <img src={row.group_image} className="w-full h-full object-cover" /> : <Users size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-base font-bold">{roleText}</span>
          </div>
          <div className="text-base text-zinc-500 truncate mt-1">코드: {row.group_slug ?? "-"}</div>
          {row.description && <div className="text-base text-zinc-500 truncate mt-1">{row.description}</div>}
        </div>

        <ChevronRight size={18} className="text-zinc-300" />
      </button>
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
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="가입한 모임 검색 (모임명/모임 아이디)"
                    className="w-full pl-10 pr-3 py-3 bg-white border border-zinc-200 text-base"
                  />
                </div>
              </div>

              {joinedGroups.length === 0 ? (
                <div className="min-h-[42vh] flex items-center justify-center text-center text-zinc-500 px-6">
                  <p className="text-base font-bold">가입한 모임이 없습니다. 모임을 검색해 가입하거나 신규 모임을 생성해주세요.</p>
                </div>
              ) : filteredJoinedGroups.length === 0 ? (
                <div className="bg-white border border-[#F5F6F7] px-4 py-4 text-base text-zinc-500">검색 결과가 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {filteredJoinedGroups.map((item) => (
                    <GroupCard key={item.group.id} row={item.group} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 pt-2 border-t border-zinc-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={groupSearchKeyword}
                    onChange={(e) => setGroupSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchGroups(groupSearchKeyword);
                    }}
                    placeholder="모임 검색하기 (모임 이름/모임 아이디)"
                    className="w-full pl-10 pr-3 py-3 bg-white border border-zinc-200 text-base"
                  />
                </div>
                <button
                  onClick={() => searchGroups(groupSearchKeyword)}
                  className="px-4 py-3 bg-[#4A6741] text-white text-base font-bold"
                >
                  검색
                </button>
              </div>
              {groupSearchLoading ? (
                <div className="text-base text-zinc-500 py-2">검색 중...</div>
              ) : (
                groupSearchResults.length > 0 && (
                  <div className="space-y-2">
                    {groupSearchResults.map((group) => (
                      <GroupCard key={`search-${group.id}`} row={group} />
                    ))}
                  </div>
                )
              )}
            </section>
          </>
        )}
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
              className="relative w-full max-w-xl bg-white border border-zinc-200 p-5 text-base"
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
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                  placeholder="모임 이름"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-base"
                  placeholder="모임 아이디"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
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
                  <option value="work_school">학교,직장 모임</option>
                  <option value="family">가족 모임</option>
                  <option value="etc">기타 모임</option>
                </select>
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

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        returnTo={`${window.location.origin}/#/community`}
      />
    </div>
  );
}

