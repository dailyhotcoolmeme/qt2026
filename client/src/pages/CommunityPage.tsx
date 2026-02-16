import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ChevronRight, Plus, Shield, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { LoginModal } from "../components/LoginModal";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  group_image: string | null;
  group_slug: string | null;
  password: string | null;
  owner_id: string | null;
  created_at: string | null;
};

type MemberRole = "owner" | "leader" | "member";

type JoinedGroup = {
  group: GroupRow;
  role: MemberRole;
};

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"list" | "create" | "join">("list");
  const [groups, setGroups] = useState<JoinedGroup[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasLeadershipScope, setHasLeadershipScope] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    password: "",
    description: "",
  });
  const [joinForm, setJoinForm] = useState({
    slug: "",
    password: "",
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
      setGroups([]);
      setLoading(false);
      return;
    }
    loadGroups();
    loadLeadershipScope();
  }, [user]);

  const loadLeadershipScope = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("group_scope_leaders")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (error) {
      setHasLeadershipScope(false);
      return;
    }
    setHasLeadershipScope((data?.length ?? 0) > 0);
  };

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, role, groups(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Failed to load groups:", error);
      setLoading(false);
      return;
    }

    const mapped: JoinedGroup[] = (data ?? [])
      .map((row: any) => {
        const g = row.groups as GroupRow | null;
        if (!g) return null;
        const role: MemberRole = g.owner_id === user.id ? "owner" : (row.role ?? "member");
        return { group: g, role };
      })
      .filter(Boolean) as JoinedGroup[];

    setGroups(mapped);
    setLoading(false);
  };

  const leadingGroups = useMemo(() => {
    return groups.filter((g) => g.role === "owner" || g.role === "leader");
  }, [groups]);

  const participatingGroups = useMemo(() => {
    return groups.filter((g) => g.role === "member");
  }, [groups]);

  const handleCreate = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!createForm.name.trim() || !createForm.slug.trim()) {
      alert("모임명과 모임코드를 입력해주세요.");
      return;
    }

    setSaving(true);

    const slug = createForm.slug.trim().toLowerCase();
    const { data: dupe } = await supabase
      .from("groups")
      .select("id")
      .eq("group_slug", slug)
      .maybeSingle();

    if (dupe) {
      setSaving(false);
      alert("이미 사용 중인 모임코드입니다.");
      return;
    }

    const { data: group, error: createError } = await supabase
      .from("groups")
      .insert({
        name: createForm.name.trim(),
        group_slug: slug,
        password: createForm.password.trim() || null,
        description: createForm.description.trim() || null,
        owner_id: user.id,
        is_open: false,
      })
      .select("*")
      .single();

    if (createError || !group) {
      setSaving(false);
      alert("모임 생성에 실패했습니다.");
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "leader",
    });

    if (memberError) {
      setSaving(false);
      alert("모임 멤버 등록에 실패했습니다.");
      return;
    }

    setSaving(false);
    setCreateForm({ name: "", slug: "", password: "", description: "" });
    setTab("list");
    await loadGroups();
    setLocation(`/group/${group.id}`);
  };

  const handleJoin = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!joinForm.slug.trim()) {
      alert("모임코드를 입력해주세요.");
      return;
    }

    setSaving(true);

    const slug = joinForm.slug.trim().toLowerCase();
    const { data: group, error } = await supabase
      .from("groups")
      .select("*")
      .eq("group_slug", slug)
      .maybeSingle();

    if (error || !group) {
      setSaving(false);
      alert("해당 모임을 찾을 수 없습니다.");
      return;
    }

    if (group.password && group.password !== joinForm.password.trim()) {
      setSaving(false);
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      setSaving(false);
      setLocation(`/group/${group.id}`);
      return;
    }

    const { error: requestErr } = await supabase.from("group_join_requests").insert({
      group_id: group.id,
      user_id: user.id,
      message: null,
      status: "pending",
    });

    if (requestErr) {
      setSaving(false);
      if (requestErr.code === "23505") {
        alert("이미 가입 요청이 대기 중입니다.");
        return;
      }
      alert("가입 요청에 실패했습니다.");
      return;
    }

    setSaving(false);
    setJoinForm({ slug: "", password: "" });
    setTab("list");
    alert("가입 요청을 보냈습니다. 리더 승인 후 참여할 수 있습니다.");
  };

  const GroupCard = ({ item }: { item: JoinedGroup }) => {
    return (
      <button
        onClick={() => setLocation(`/group/${item.group.id}`)}
        className="w-full bg-white border border-zinc-100 rounded-3xl p-4 flex items-center gap-3 text-left shadow-sm"
      >
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400">
          {item.group.group_image ? (
            <img src={item.group.group_image} className="w-full h-full object-cover" />
          ) : (
            <Users size={22} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{item.group.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold">
              {item.role}
            </span>
          </div>
          <div className="text-xs text-zinc-500 truncate mt-1">코드: {item.group.group_slug ?? "-"}</div>
        </div>

        <ChevronRight size={18} className="text-zinc-300" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] pt-24 pb-28 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-zinc-900">나의 모임</h1>
          {hasLeadershipScope && (
            <button
              onClick={() => setLocation("/leadership")}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#4A6741] text-white flex items-center gap-1"
            >
              <Shield size={14} /> 리더십
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-white p-1 rounded-2xl border border-zinc-100 mb-4">
          <button
            onClick={() => setTab("list")}
            className={`py-2 rounded-xl text-sm font-bold ${tab === "list" ? "bg-[#4A6741] text-white" : "text-zinc-500"}`}
          >
            내 모임
          </button>
          <button
            onClick={() => setTab("create")}
            className={`py-2 rounded-xl text-sm font-bold ${tab === "create" ? "bg-[#4A6741] text-white" : "text-zinc-500"}`}
          >
            생성
          </button>
          <button
            onClick={() => setTab("join")}
            className={`py-2 rounded-xl text-sm font-bold ${tab === "join" ? "bg-[#4A6741] text-white" : "text-zinc-500"}`}
          >
            가입
          </button>
        </div>

        {tab === "list" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {!user && (
              <div className="bg-white rounded-3xl p-6 border border-zinc-100 text-center">
                <p className="text-sm text-zinc-600 font-bold">로그인 후 모임을 생성하거나 가입할 수 있습니다.</p>
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
                  <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-black">내가 리드하는 모임</h2>
                  {leadingGroups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3 text-sm text-zinc-500">아직 없습니다.</div>
                  ) : (
                    leadingGroups.map((g) => <GroupCard key={g.group.id} item={g} />)
                  )}
                </section>

                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-black">참여 중인 모임</h2>
                  {participatingGroups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3 text-sm text-zinc-500">아직 없습니다.</div>
                  ) : (
                    participatingGroups.map((g) => <GroupCard key={g.group.id} item={g} />)
                  )}
                </section>
              </>
            )}
          </motion.div>
        )}

        {tab === "create" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-zinc-100 rounded-3xl p-5 space-y-3">
            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임 이름"
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임 코드 (예: district-a)"
              value={createForm.slug}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="가입 비밀번호 (선택)"
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
              onClick={handleCreate}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? "생성 중..." : <><Plus size={16} /> 모임 생성하기</>}
            </button>
          </motion.div>
        )}

        {tab === "join" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-zinc-100 rounded-3xl p-5 space-y-3">
            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="모임 코드"
              value={joinForm.slug}
              onChange={(e) => setJoinForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm"
              placeholder="비밀번호 (필요한 모임만)"
              value={joinForm.password}
              onChange={(e) => setJoinForm((prev) => ({ ...prev, password: e.target.value }))}
            />

            <button
              onClick={handleJoin}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? "처리 중..." : <><Check size={16} /> 가입 요청 보내기</>}
            </button>
          </motion.div>
        )}
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        returnTo={`${window.location.origin}/#/community`}
      />
    </div>
  );
}
