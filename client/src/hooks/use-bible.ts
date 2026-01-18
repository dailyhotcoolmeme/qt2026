import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertMeditation, type InsertWordShare } from "@shared/schema";

// --- HOOKS ---

export function useDailyVerses() {
  return useQuery({
    queryKey: [api.verses.getDaily.path],
    queryFn: async () => {
      const res = await fetch(api.verses.getDaily.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily verses");
      return api.verses.getDaily.responses[200].parse(await res.json());
    },
  });
}

export function useShares() {
  return useQuery({
    queryKey: [api.shares.list.path],
    queryFn: async () => {
      const res = await fetch(api.shares.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shares");
      return api.shares.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertWordShare, "userId">) => {
      // Validate input manually since hook doesn't do it automatically before fetch
      // In a real app, we might check zod schema here too
      
      const res = await fetch(api.shares.create.path, {
        method: api.shares.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (res.status === 401) throw new Error("Please log in to share");
      if (!res.ok) throw new Error("Failed to create share");
      
      return api.shares.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shares.list.path] });
    },
  });
}

export function useMeditations() {
  return useQuery({
    queryKey: [api.meditations.list.path],
    queryFn: async () => {
      const res = await fetch(api.meditations.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch meditations");
      return api.meditations.list.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useCreateMeditation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertMeditation, "userId">) => {
      const res = await fetch(api.meditations.create.path, {
        method: api.meditations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (res.status === 401) throw new Error("Please log in to save meditation");
      if (!res.ok) throw new Error("Failed to create meditation");
      
      return api.meditations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.meditations.list.path] });
    },
  });
}
