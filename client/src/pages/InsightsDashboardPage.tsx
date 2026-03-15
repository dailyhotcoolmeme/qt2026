import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHashLocation } from "wouter/use-hash-location";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronRight,
  Crown,
  Flame,
  LayoutDashboard,
  Menu,
  Network,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useAuth } from "../hooks/use-auth";
import {
  fetchDashboardAccessProfile,
  fetchDashboardGroupKpis,
  fetchDashboardGroupTimeline,
  fetchPersonalDashboardData,
  type DashboardRole,
  type DashboardScope,
} from "../lib/dashboard";
import { cn } from "../lib/utils";
import { useDashboardShellStore, type DashboardSection } from "../stores/dashboard-shell-store";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";

const PERSONAL_CHART_CONFIG = {
  qt: { label: "QT", color: "#4A6741" },
  prayer: { label: "기도", color: "#D97706" },
  reading: { label: "성경읽기", color: "#2563EB" },
  bookmark: { label: "말씀저장", color: "#8B5CF6" },
};

const NETWORK_CHART_CONFIG = {
  linked_activities: { label: "연결 활동", color: "#4A6741" },
  prayer_records: { label: "음성기도", color: "#0F766E" },
  faith_records: { label: "신앙기록", color: "#CA8A04" },
  post_count: { label: "교제나눔", color: "#7C3AED" },
};

const MIX_COLORS = ["#4A6741", "#D97706", "#2563EB", "#8B5CF6"];

type NavItem = {
  id: DashboardSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  helper: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "개요", icon: LayoutDashboard, helper: "핵심 지표와 한눈 요약" },
  { id: "personal", label: "개인 활동", icon: Activity, helper: "QT·기도·읽기 리듬" },
  { id: "groups", label: "조직 현황", icon: Network, helper: "모임/네트워크 흐름" },
  { id: "access", label: "권한 보기", icon: Shield, helper: "역할과 접근 범위" },
];

function getRoleLabel(role: DashboardRole) {
  if (role === "scope_leader") return "상위리더용";
  if (role === "leader") return "모임 리더용";
  return "일반 회원용";
}

function getRoleHeadline(role: DashboardRole) {
  if (role === "scope_leader") {
    return "여러 모임의 건강도를 한 화면에서 확인하는 네트워크 대시보드";
  }
  if (role === "leader") {
    return "모임 운영 흐름과 구성원 활동을 빠르게 파악하는 리더 대시보드";
  }
  return "나의 신앙 루틴과 참여 흐름을 한눈에 보는 개인 대시보드";
}

function getRoleAccent(role: DashboardRole) {
  if (role === "scope_leader") {
    return {
      pill: "bg-[#1F4D4F] text-[#F4F1E8]",
      border: "border-[#1F4D4F]/20",
      surface: "from-[#F4F1E8] via-[#E7F0E3] to-[#D9E7F6]",
      icon: Crown,
    };
  }
  if (role === "leader") {
    return {
      pill: "bg-[#4A6741] text-white",
      border: "border-[#4A6741]/20",
      surface: "from-[#F5F1E8] via-[#EAF2E4] to-[#DCE9F4]",
      icon: Shield,
    };
  }
  return {
    pill: "bg-[#244A74] text-white",
    border: "border-[#244A74]/20",
    surface: "from-[#F8F5ED] via-[#EEF4F8] to-[#EAF1E1]",
    icon: Sparkles,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFriendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/get_dashboard_|PGRST202|function .* does not exist/i.test(message)) {
    return "대시보드용 Supabase 마이그레이션이 아직 적용되지 않았습니다.";
  }
  return message || "대시보드 데이터를 불러오지 못했습니다.";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-zinc-300/80 bg-white/80">
      <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold text-zinc-900">{title}</div>
          <div className="mt-1 text-sm text-zinc-500">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSidebar({
  role,
  activeSection,
  onSectionChange,
  timeframe,
  onTimeframeChange,
  groupScope,
  onGroupScopeChange,
  showScopeToggle,
}: {
  role: DashboardRole;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  timeframe: 7 | 30 | 90;
  onTimeframeChange: (timeframe: 7 | 30 | 90) => void;
  groupScope: DashboardScope;
  onGroupScopeChange: (scope: DashboardScope) => void;
  showScopeToggle: boolean;
}) {
  const accent = getRoleAccent(role);
  const AccentIcon = accent.icon;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className={cn("rounded-[28px] border bg-white/90 p-5 shadow-sm", accent.border)}>
        <div className="flex items-center gap-3">
          <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl", accent.pill)}>
            <AccentIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-zinc-900">{getRoleLabel(role)}</div>
            <div className="text-xs text-zinc-500">앱 연결형 분석 페이지 초기 버전</div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white/90 p-3 shadow-sm">
        <div className="px-3 pb-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Menu</div>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                  active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="text-sm font-black">{item.label}</div>
                  <div className={cn("mt-1 text-xs", active ? "text-white/70" : "text-zinc-400")}>{item.helper}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white/90 p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Window</div>
        <div className="mt-3 flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => onTimeframeChange(days as 7 | 30 | 90)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-black transition-colors",
                timeframe === days ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
              )}
            >
              {days}일
            </button>
          ))}
        </div>

        {showScopeToggle && (
          <div className="mt-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Scope</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onGroupScopeChange("managed")}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-black transition-colors",
                  groupScope === "managed" ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
                )}
              >
                리더 관할
              </button>
              <button
                onClick={() => onGroupScopeChange("scope")}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-black transition-colors",
                  groupScope === "scope" ? "bg-[#1F4D4F] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
                )}
              >
                상위리더 범위
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useHashLocation();
  const {
    mobileMenuOpen,
    activeSection,
    timeframe,
    groupScope,
    setMobileMenuOpen,
    setActiveSection,
    setTimeframe,
    setGroupScope,
  } = useDashboardShellStore();

  const accessQuery = useQuery({
    queryKey: ["dashboard", "access-profile", user?.id],
    queryFn: fetchDashboardAccessProfile,
    enabled: !!user,
    retry: false,
  });

  const accessProfile = accessQuery.data;
  const role = accessProfile?.role ?? "member";

  useEffect(() => {
    if (role !== "scope_leader" && groupScope !== "managed") {
      setGroupScope("managed");
    }
  }, [groupScope, role, setGroupScope]);

  const personalQuery = useQuery({
    queryKey: ["dashboard", "personal", user?.id, timeframe],
    queryFn: () => fetchPersonalDashboardData(user!.id, timeframe),
    enabled: !!user,
    retry: false,
  });

  const shouldLoadNetwork = !!user && role !== "member";
  const effectiveScope = role === "scope_leader" ? groupScope : "managed";

  const groupKpisQuery = useQuery({
    queryKey: ["dashboard", "group-kpis", user?.id, timeframe, effectiveScope],
    queryFn: () => fetchDashboardGroupKpis(effectiveScope, timeframe),
    enabled: shouldLoadNetwork,
    retry: false,
  });

  const groupTimelineQuery = useQuery({
    queryKey: ["dashboard", "group-timeline", user?.id, timeframe, effectiveScope],
    queryFn: () => fetchDashboardGroupTimeline(effectiveScope, timeframe),
    enabled: shouldLoadNetwork,
    retry: false,
  });

  const personalData = personalQuery.data;
  const groupKpis = groupKpisQuery.data ?? [];
  const groupTimeline = groupTimelineQuery.data ?? [];

  const groupSummary = useMemo(() => {
    return groupKpis.reduce(
      (acc, group) => {
        acc.memberCount += group.member_count;
        acc.pending += group.pending_requests;
        acc.prayer += group.prayer_records;
        acc.faith += group.faith_records;
        acc.posts += group.post_count;
        acc.linked += group.linked_activities;
        return acc;
      },
      { memberCount: 0, pending: 0, prayer: 0, faith: 0, posts: 0, linked: 0 },
    );
  }, [groupKpis]);

  const topGroups = useMemo(() => {
    return [...groupKpis]
      .sort((a, b) => {
        const aScore = a.linked_activities + a.prayer_records + a.faith_records + a.post_count;
        const bScore = b.linked_activities + b.prayer_records + b.faith_records + b.post_count;
        return bScore - aScore;
      })
      .slice(0, 6)
      .map((item) => ({
        ...item,
        activityScore: item.linked_activities + item.prayer_records + item.faith_records + item.post_count,
      }));
  }, [groupKpis]);

  const activityMix = useMemo(() => {
    if (!personalData) return [];
    return [
      { name: "QT", value: personalData.totals.qt, fill: MIX_COLORS[0] },
      { name: "기도", value: personalData.totals.prayer, fill: MIX_COLORS[1] },
      { name: "성경읽기", value: personalData.totals.reading, fill: MIX_COLORS[2] },
      { name: "말씀저장", value: personalData.totals.bookmark, fill: MIX_COLORS[3] },
    ].filter((item) => item.value > 0);
  }, [personalData]);

  const showScopeToggle = role === "scope_leader";
  const accent = getRoleAccent(role);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E8] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A6741] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F0E8] px-6 py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <Card className="w-full rounded-[28px] border-zinc-200 bg-white/95">
            <CardContent className="p-8 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="mt-5 font-['Noto_Serif_KR'] text-2xl font-black text-zinc-900">대시보드는 로그인 후 확인할 수 있습니다</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                앱에서 연결되는 독립형 분석 페이지라서, 먼저 인증이 필요합니다.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={() => setLocation("/auth")} className="rounded-2xl bg-zinc-900 px-5 text-white">
                  로그인
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")} className="rounded-2xl px-5">
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const accessError = accessQuery.error ? getFriendlyErrorMessage(accessQuery.error) : "";
  const networkError = groupKpisQuery.error ? getFriendlyErrorMessage(groupKpisQuery.error) : "";

  return (
    <div className="min-h-screen bg-[#EFE8DB] text-zinc-900">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", accent.surface)} />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[300px] shrink-0 border-r border-white/30 bg-white/55 px-5 py-6 backdrop-blur-xl lg:block">
          <DashboardSidebar
            role={role}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            groupScope={groupScope}
            onGroupScopeChange={setGroupScope}
            showScopeToggle={showScopeToggle}
          />
        </aside>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[88vw] border-r border-zinc-200 bg-[#F8F4EC] p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-zinc-200 px-5 py-4">
              <SheetTitle className="font-['Noto_Serif_KR'] text-xl font-black">Dashboard Menu</SheetTitle>
            </SheetHeader>
            <div className="p-5">
              <DashboardSidebar
                role={role}
                activeSection={activeSection}
                onSectionChange={(section) => {
                  setActiveSection(section);
                  setMobileMenuOpen(false);
                }}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                groupScope={groupScope}
                onGroupScopeChange={setGroupScope}
                showScopeToggle={showScopeToggle}
              />
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1180px] space-y-6">
            <header className="rounded-[32px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setLocation("/")}
                    className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 lg:inline-flex"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                      {getRoleLabel(role)}
                    </div>
                    <h1 className="mt-3 font-['Noto_Serif_KR'] text-[1.8rem] font-black leading-tight text-zinc-900 lg:text-[2.3rem]">
                      활동 기록 대시보드
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 lg:text-base">
                      {getRoleHeadline(role)}
                    </p>
                  </div>
                </div>

                <div className="hidden rounded-[28px] border border-zinc-200 bg-white/80 px-4 py-3 text-right lg:block">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Window</div>
                  <div className="mt-1 text-lg font-black text-zinc-900">{timeframe}일</div>
                  <div className="text-xs text-zinc-500">
                    {role === "scope_leader" ? (groupScope === "scope" ? "상위리더 범위" : "리더 관할 범위") : "개인 + 소속 모임 기준"}
                  </div>
                </div>
              </div>

              <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as DashboardSection)} className="mt-6">
                <TabsList className="h-auto w-full flex-wrap justify-start rounded-2xl bg-zinc-100 p-1">
                  {NAV_ITEMS.map((item) => (
                    <TabsTrigger key={item.id} value={item.id} className="rounded-xl px-4 py-2.5 text-sm font-black">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                  {accessError ? (
                    <EmptyState title="대시보드 접근 준비가 필요합니다" description={accessError} />
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="rounded-[28px] border-zinc-200/80 bg-white/90">
                          <CardHeader className="pb-3">
                            <CardDescription>활동 총량</CardDescription>
                            <CardTitle className="text-3xl font-black">{personalData?.totals.total ?? 0}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-zinc-500">선택한 기간 동안 남긴 전체 개인 활동 수</CardContent>
                        </Card>
                        <Card className="rounded-[28px] border-zinc-200/80 bg-white/90">
                          <CardHeader className="pb-3">
                            <CardDescription>연속 수행</CardDescription>
                            <CardTitle className="text-3xl font-black">{personalData?.totals.streak ?? 0}일</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-zinc-500">오늘 기준 끊기지 않고 이어진 활동 일수</CardContent>
                        </Card>
                        <Card className="rounded-[28px] border-zinc-200/80 bg-white/90">
                          <CardHeader className="pb-3">
                            <CardDescription>참여 모임</CardDescription>
                            <CardTitle className="text-3xl font-black">{accessProfile?.joined_group_count ?? 0}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-zinc-500">현재 연결된 전체 모임 수</CardContent>
                        </Card>
                        <Card className="rounded-[28px] border-zinc-200/80 bg-white/90">
                          <CardHeader className="pb-3">
                            <CardDescription>
                              {role === "scope_leader" ? "관리 범위" : role === "leader" ? "운영 모임" : "활동 밀도"}
                            </CardDescription>
                            <CardTitle className="text-3xl font-black">
                              {role === "member"
                                ? `${personalData?.totals.consistencyRate ?? 0}%`
                                : role === "scope_leader"
                                  ? accessProfile?.scope_group_count ?? 0
                                  : accessProfile?.managed_group_count ?? 0}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-zinc-500">
                            {role === "member"
                              ? "선택 기간 중 활동한 날짜 비율"
                              : role === "scope_leader"
                                ? "상위리더가 바라보는 전체 모임 수"
                                : "리더 권한으로 직접 관리 중인 모임 수"}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
                        <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                          <CardHeader>
                            <CardTitle className="text-xl font-black">개인 활동 추세</CardTitle>
                            <CardDescription>QT·기도·성경읽기·말씀저장을 날짜별로 확인합니다.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {personalData && personalData.daily.some((item) => item.total > 0) ? (
                              <ChartContainer className="h-[280px] w-full aspect-auto" config={PERSONAL_CHART_CONFIG}>
                                <AreaChart data={personalData.daily}>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                                  <ChartTooltip content={<ChartTooltipContent hideIndicator={false} />} />
                                  <ChartLegend content={<ChartLegendContent />} />
                                  <Area type="monotone" dataKey="qt" stroke="var(--color-qt)" fill="var(--color-qt)" fillOpacity={0.22} strokeWidth={2} />
                                  <Area type="monotone" dataKey="prayer" stroke="var(--color-prayer)" fill="var(--color-prayer)" fillOpacity={0.18} strokeWidth={2} />
                                  <Area type="monotone" dataKey="reading" stroke="var(--color-reading)" fill="var(--color-reading)" fillOpacity={0.16} strokeWidth={2} />
                                  <Area type="monotone" dataKey="bookmark" stroke="var(--color-bookmark)" fill="var(--color-bookmark)" fillOpacity={0.12} strokeWidth={2} />
                                </AreaChart>
                              </ChartContainer>
                            ) : (
                              <EmptyState title="표시할 개인 활동이 아직 없습니다" description="QT, 기도, 읽기, 말씀 저장을 시작하면 이곳에 흐름이 그려집니다." />
                            )}
                          </CardContent>
                        </Card>

                        <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                          <CardHeader>
                            <CardTitle className="text-xl font-black">활동 구성</CardTitle>
                            <CardDescription>무엇을 가장 자주 기록했는지 비중으로 확인합니다.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {activityMix.length > 0 ? (
                              <ChartContainer
                                className="mx-auto h-[280px] w-full max-w-[360px] aspect-auto"
                                config={{
                                  QT: { label: "QT", color: MIX_COLORS[0] },
                                  기도: { label: "기도", color: MIX_COLORS[1] },
                                  성경읽기: { label: "성경읽기", color: MIX_COLORS[2] },
                                  말씀저장: { label: "말씀저장", color: MIX_COLORS[3] },
                                }}
                              >
                                <PieChart>
                                  <Pie data={activityMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                                    {activityMix.map((entry, index) => (
                                      <Cell key={entry.name} fill={entry.fill || MIX_COLORS[index % MIX_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideIndicator />} />
                                </PieChart>
                              </ChartContainer>
                            ) : (
                              <EmptyState title="활동 분포가 아직 없습니다" description="먼저 기록을 남기면 무엇에 시간을 많이 쓰는지 보여드립니다." />
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {role !== "member" && (
                        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                          <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                            <CardHeader>
                              <CardTitle className="text-xl font-black">
                                {effectiveScope === "scope" ? "네트워크 활동 추세" : "운영 모임 활동 추세"}
                              </CardTitle>
                              <CardDescription>기도, 신앙기록, 교제나눔, 연결 활동을 날짜별로 추적합니다.</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {networkError ? (
                                <EmptyState title="조직 지표를 아직 불러올 수 없습니다" description={networkError} />
                              ) : groupTimeline.some((item) => item.prayer_records + item.faith_records + item.post_count + item.linked_activities > 0) ? (
                                <ChartContainer className="h-[300px] w-full aspect-auto" config={NETWORK_CHART_CONFIG}>
                                  <BarChart data={groupTimeline}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="linked_activities" fill="var(--color-linked_activities)" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="prayer_records" fill="var(--color-prayer_records)" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="faith_records" fill="var(--color-faith_records)" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="post_count" fill="var(--color-post_count)" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ChartContainer>
                              ) : (
                                <EmptyState title="조직 활동 추세가 아직 없습니다" description="모임 기록이 쌓이면 여기에 운영 흐름이 나타납니다." />
                              )}
                            </CardContent>
                          </Card>

                          <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                            <CardHeader>
                              <CardTitle className="text-xl font-black">조직 요약</CardTitle>
                              <CardDescription>현재 선택된 범위의 핵심 운영 숫자입니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3">
                              {[
                                { label: "모임 수", value: groupKpis.length, icon: Network },
                                { label: "총 멤버", value: groupSummary.memberCount, icon: Users },
                                { label: "대기 신청", value: groupSummary.pending, icon: Shield },
                                { label: "연결 활동", value: groupSummary.linked, icon: Activity },
                                { label: "음성기도", value: groupSummary.prayer, icon: Flame },
                                { label: "신앙기록", value: groupSummary.faith, icon: BookOpen },
                              ].map((item) => (
                                <div key={item.label} className="rounded-2xl bg-zinc-100/80 p-4">
                                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                                    <item.icon className="h-3.5 w-3.5" />
                                    {item.label}
                                  </div>
                                  <div className="mt-3 text-2xl font-black text-zinc-900">{item.value}</div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="personal" className="mt-6 space-y-6">
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-xl font-black">최근 기록</CardTitle>
                        <CardDescription>가장 최근에 남긴 활동을 빠르게 훑어봅니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {personalData?.recent.length ? (
                          personalData.recent.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-zinc-900">{item.title}</div>
                                  <div className="mt-1 text-sm leading-6 text-zinc-500">{item.description}</div>
                                </div>
                                <div className="shrink-0 text-xs font-bold text-zinc-400">{formatDateTime(item.occurredAt)}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState title="최근 기록이 없습니다" description="활동을 남기면 최근 기록 카드가 채워집니다." />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-xl font-black">개인 루틴 요약</CardTitle>
                        <CardDescription>지속성과 몰입도를 간단한 숫자로 봅니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { label: "활동한 날짜", value: `${personalData?.totals.activeDays ?? 0}일`, note: "선택한 기간 안에서 실제 활동한 날짜 수" },
                          { label: "일관성", value: `${personalData?.totals.consistencyRate ?? 0}%`, note: "기록이 없는 날을 포함한 전체 지속 비율" },
                          { label: "참여 모임", value: `${personalData?.groups.length ?? 0}개`, note: "현재 연결된 모임 수" },
                          { label: "말씀 저장", value: `${personalData?.totals.bookmark ?? 0}회`, note: "선택한 기간 동안 저장한 말씀 수" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl bg-zinc-100/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{item.label}</div>
                            <div className="mt-2 text-2xl font-black text-zinc-900">{item.value}</div>
                            <div className="mt-2 text-sm text-zinc-500">{item.note}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="mt-6 space-y-6">
                  {role === "member" ? (
                    <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-xl font-black">내가 연결된 모임</CardTitle>
                        <CardDescription>현재 참여 중인 모임을 빠르게 확인하고 이동할 수 있습니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {personalData?.groups.length ? (
                          personalData.groups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => setLocation(`/group/${group.id}`)}
                              className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left transition-colors hover:bg-zinc-50"
                            >
                              <div>
                                <div className="font-black text-zinc-900">{group.name}</div>
                                <div className="mt-1 text-sm text-zinc-500">모임 상세 화면으로 이동</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-zinc-400" />
                            </button>
                          ))
                        ) : (
                          <EmptyState title="연결된 모임이 없습니다" description="모임에 참여하면 이곳에서 바로 이동할 수 있습니다." />
                        )}
                      </CardContent>
                    </Card>
                  ) : networkError ? (
                    <EmptyState title="조직 현황을 아직 불러올 수 없습니다" description={networkError} />
                  ) : (
                    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                      <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                        <CardHeader>
                          <CardTitle className="text-xl font-black">
                            {effectiveScope === "scope" ? "상위리더 관할 모임" : "리더 운영 모임"}
                          </CardTitle>
                          <CardDescription>멤버 수, 대기 신청, 활동량을 기준으로 정리했습니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {groupKpis.length ? (
                            groupKpis.map((group) => (
                              <button
                                key={group.group_id}
                                onClick={() => setLocation(`/group/${group.group_id}`)}
                                className="w-full rounded-[24px] border border-zinc-200 bg-white px-4 py-4 text-left transition-colors hover:bg-zinc-50"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="font-black text-zinc-900">{group.group_name}</div>
                                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                                      {effectiveScope === "scope" ? `Depth ${group.depth}` : "Managed Group"}
                                    </div>
                                  </div>
                                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                                  <div className="rounded-2xl bg-zinc-100 px-3 py-2">
                                    <div className="text-[11px] text-zinc-400">멤버</div>
                                    <div className="font-black text-zinc-900">{group.member_count}</div>
                                  </div>
                                  <div className="rounded-2xl bg-zinc-100 px-3 py-2">
                                    <div className="text-[11px] text-zinc-400">대기</div>
                                    <div className="font-black text-zinc-900">{group.pending_requests}</div>
                                  </div>
                                  <div className="rounded-2xl bg-zinc-100 px-3 py-2">
                                    <div className="text-[11px] text-zinc-400">기도</div>
                                    <div className="font-black text-zinc-900">{group.prayer_records}</div>
                                  </div>
                                  <div className="rounded-2xl bg-zinc-100 px-3 py-2">
                                    <div className="text-[11px] text-zinc-400">연결</div>
                                    <div className="font-black text-zinc-900">{group.linked_activities}</div>
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <EmptyState title="표시할 조직 데이터가 없습니다" description="권한이 있는 모임이 없거나 기록이 아직 쌓이지 않았습니다." />
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                        <CardHeader>
                          <CardTitle className="text-xl font-black">활동 상위 모임</CardTitle>
                          <CardDescription>최근 {timeframe}일 기준으로 가장 활발한 모임입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {topGroups.length ? (
                            <ChartContainer
                              className="h-[360px] w-full aspect-auto"
                              config={{
                                activityScore: { label: "활동 점수", color: "#4A6741" },
                              }}
                            >
                              <BarChart data={topGroups} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="group_name" width={96} tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                                <Bar dataKey="activityScore" fill="var(--color-activityScore)" radius={8} />
                              </BarChart>
                            </ChartContainer>
                          ) : (
                            <EmptyState title="상위 모임 차트가 비어 있습니다" description="조직 활동이 쌓이면 여기에 우선순위가 나타납니다." />
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="access" className="mt-6 space-y-6">
                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-xl font-black">접근 프로필</CardTitle>
                        <CardDescription>프론트 분기와 Supabase 권한 구성을 함께 보여줍니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="rounded-2xl bg-zinc-100/80 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">현재 역할</div>
                          <div className="mt-2 text-2xl font-black text-zinc-900">{getRoleLabel(role)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-zinc-100/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">참여 모임</div>
                            <div className="mt-2 text-xl font-black text-zinc-900">{accessProfile?.joined_group_count ?? 0}</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-100/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">운영 모임</div>
                            <div className="mt-2 text-xl font-black text-zinc-900">{accessProfile?.managed_group_count ?? 0}</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-100/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">상위리더 루트</div>
                            <div className="mt-2 text-xl font-black text-zinc-900">{accessProfile?.scope_root_group_count ?? 0}</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-100/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">관할 전체 모임</div>
                            <div className="mt-2 text-xl font-black text-zinc-900">{accessProfile?.scope_group_count ?? 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[32px] border-zinc-200/80 bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-xl font-black">권한 설계 메모</CardTitle>
                        <CardDescription>초기 버전에서는 기존 RLS를 최대한 활용하고, 집계는 RPC로 분리했습니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm leading-7 text-zinc-600">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          개인 활동 데이터는 기존 `activity_logs`, `verse_bookmarks` RLS를 그대로 사용해 본인 기록만 읽습니다.
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          리더/상위리더 집계는 새 RPC에서 `auth.uid()`와 현재 역할을 체크한 뒤 모임 집계 숫자만 반환하도록 설계했습니다.
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          상위리더 범위는 기존 `get_scope_groups`, `is_scope_leader_for_group` 체계를 그대로 활용합니다.
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          추후 앱 연결 단계에서는 이 페이지를 웹뷰/외부 브라우저 진입점으로 바로 연결할 수 있게 독립 라우트로 분리해 두었습니다.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </header>
          </div>
        </main>
      </div>
    </div>
  );
}
