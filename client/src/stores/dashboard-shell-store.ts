import { create } from "zustand";
import type { DashboardScope, TimeframeDays } from "../lib/dashboard";

export type DashboardSection = "overview" | "personal" | "groups" | "access";

type DashboardShellState = {
  mobileMenuOpen: boolean;
  activeSection: DashboardSection;
  timeframe: TimeframeDays;
  groupScope: DashboardScope;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveSection: (section: DashboardSection) => void;
  setTimeframe: (timeframe: TimeframeDays) => void;
  setGroupScope: (scope: DashboardScope) => void;
};

export const useDashboardShellStore = create<DashboardShellState>((set) => ({
  mobileMenuOpen: false,
  activeSection: "overview",
  timeframe: 30,
  groupScope: "managed",
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setGroupScope: (scope) => set({ groupScope: scope }),
}));
