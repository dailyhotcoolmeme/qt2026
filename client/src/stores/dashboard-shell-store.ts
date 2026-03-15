import { create } from "zustand";
import type {
  DashboardContextKind,
  DashboardNetworkMode,
  TimeframeDays,
} from "../lib/dashboard";

export type DashboardSubtab =
  | "overview"
  | "reading"
  | "qt"
  | "prayer"
  | "recent"
  | "care";

type DashboardShellState = {
  mobileMenuOpen: boolean;
  timeframe: TimeframeDays;
  contextKind: DashboardContextKind;
  selectedGroupId: string | null;
  networkMode: DashboardNetworkMode;
  activeSubtab: DashboardSubtab;
  setMobileMenuOpen: (open: boolean) => void;
  setTimeframe: (timeframe: TimeframeDays) => void;
  setNetworkMode: (mode: DashboardNetworkMode) => void;
  setActiveSubtab: (tab: DashboardSubtab) => void;
  setContext: (contextKind: DashboardContextKind, groupId?: string | null) => void;
};

function defaultSubtabForContext(contextKind: DashboardContextKind): DashboardSubtab {
  if (contextKind === "network") return "overview";
  return "overview";
}

export const useDashboardShellStore = create<DashboardShellState>((set) => ({
  mobileMenuOpen: false,
  timeframe: 30,
  contextKind: "personal",
  selectedGroupId: null,
  networkMode: "managed",
  activeSubtab: "overview",
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setNetworkMode: (mode) => set({ networkMode: mode }),
  setActiveSubtab: (tab) => set({ activeSubtab: tab }),
  setContext: (contextKind, groupId = null) =>
    set({
      contextKind,
      selectedGroupId: contextKind === "group" ? groupId : null,
      activeSubtab: defaultSubtabForContext(contextKind),
    }),
}));
