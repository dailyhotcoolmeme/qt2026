import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Plus, Search, Loader2, Users, X, Check, FolderOpen, MoreVertical, Pencil, Trash2, GripVertical, ArrowUpDown } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { PTRAwareTouchSensor } from "../lib/ptrAwareTouchSensor";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../lib/supabase";
import { LoginModal } from "../components/LoginModal";
import { useRefresh } from "../lib/refreshContext";

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

type MemberRole = "owner" | "leader" | "member" | "scope_leader";

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

type UserGroupFolder = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string | null;
};

type UserGroupFolderItem = {
  folder_id: string;
  group_id: string;
  sort_order: number;
};

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


function SortableItem({ id, children }: { id: string; children: (props: { setNodeRef: (el: HTMLElement | null) => void; style: React.CSSProperties; attributes: Record<string, any>; listeners: Record<string, any> | undefined; isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}

export default function CommunityPage() {
  const [location, setLocation] = useLocation();
  const { refreshKey } = useRefresh();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 최초 로딩 상태
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [groupSearchKeyword, setGroupSearchKeyword] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<GroupRow[]>([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);

  // 그룹 폴더 상태
  const [folders, setFolders] = useState<UserGroupFolder[]>([]);
  const [folderItems, setFolderItems] = useState<UserGroupFolderItem[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showGroupNameModal, setShowGroupNameModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [dissolveTargetId, setDissolveTargetId] = useState<string | null>(null);
  const [removeFromFolderTarget, setRemoveFromFolderTarget] = useState<{ folderId: string; groupId: string; groupName: string } | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showFolderOrderModal, setShowFolderOrderModal] = useState<string | null>(null);
  const [topLevelOrder, setTopLevelOrder] = useState<string[]>([]);

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
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setUser(null);
        setIsInitialLoading(false);
        return;
      }
      setUser(data.session?.user ?? null);
      setIsInitialLoading(false); // 최초 로딩 끝
    }).catch(() => {
      setUser(null);
      setIsInitialLoading(false);
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
      setFolders([]);
      setFolderItems([]);
      return;
    }
    setLoading(true); // 로그인 후 안내 메시지 노출 방지
    void initialize(user.id);
  }, [user?.id, refreshKey]);

  const sortableSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(PTRAwareTouchSensor, { activationConstraint: { delay: 220, tolerance: 10 } })
  );

  const initialize = async (userId: string) => {
    setLoading(true);
    await Promise.all([loadJoinedGroups(userId), loadPendingRequests(userId), loadFolders(userId)]);
    setLoading(false);
  };

  // NOTE: "상위 리더 대쉬보드" 진입 버튼 및 관련 권한 체크는 현재 비활성화 상태입니다.
  // const [hasLeadershipScope, setHasLeadershipScope] = useState(false);
  // const loadLeadershipScope = async (userId: string) => {
  //   const { data, error } = await supabase.from("group_scope_leaders").select("id").eq("user_id", userId).limit(1);
  //   if (error) {
  //     setHasLeadershipScope(false);
  //     return;
  //   }
  //   setHasLeadershipScope((data?.length ?? 0) > 0);
  // };

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
    const [
      { data: memberRows, error: memberError },
      { data: ownedRows, error: ownedError },
      { data: scopeRows, error: scopeError }
    ] = await Promise.all([
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
      supabase
        .from("group_scope_leaders")
        .select("root_group_id, groups(*)")
        .eq("user_id", userId)
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

    (scopeRows ?? []).forEach((row: any) => {
      const g = row.groups as GroupRow | null;
      if (!g?.id) return;
      // 상위 리더 목록에 추가. 단, 이미 내가 일반 가입된 모임이라면 덮어쓰지 않음(혹은 권한에 맞게 표시)
      if (!map.has(g.id)) {
        map.set(g.id, { group: g, role: "scope_leader" });
      }
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

  const groupedGroupIds = useMemo(() => new Set(folderItems.map((i) => i.group_id)), [folderItems]);

  const ungroupedGroups = useMemo(
    () => joinedGroups.filter((jg) => !groupedGroupIds.has(jg.group.id)),
    [joinedGroups, groupedGroupIds]
  );

  const groupsByFolder = useMemo(() => {
    const map = new Map<string, JoinedGroup[]>();
    folders.forEach((f) => map.set(f.id, []));
    const sortedItems = [...folderItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    sortedItems.forEach((item) => {
      const jg = joinedGroups.find((j) => j.group.id === item.group_id);
      if (jg && map.has(item.folder_id)) map.get(item.folder_id)!.push(jg);
    });
    return map;
  }, [folders, folderItems, joinedGroups]);

  const topLevelOrderKey = useMemo(() => user ? `community-top-order:${user.id}` : null, [user?.id]);

  useEffect(() => {
    if (!user) { setTopLevelOrder([]); return; }
    const allIds = [
      ...folders.map(f => `folder:${f.id}`),
      ...ungroupedGroups.map(g => `group:${g.group.id}`),
    ];
    if (!allIds.length) { setTopLevelOrder([]); return; }
    let saved: string[] = [];
    if (topLevelOrderKey) {
      try {
        const raw = localStorage.getItem(topLevelOrderKey);
        saved = raw ? (JSON.parse(raw) as string[]) : [];
      } catch { saved = []; }
    }
    const next = [
      ...saved.filter(id => allIds.includes(id)),
      ...allIds.filter(id => !saved.includes(id)),
    ];
    setTopLevelOrder(prev =>
      prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
    );
  }, [folders, ungroupedGroups, topLevelOrderKey, user?.id]);

  useEffect(() => {
    if (!topLevelOrderKey || !topLevelOrder.length) return;
    localStorage.setItem(topLevelOrderKey, JSON.stringify(topLevelOrder));
  }, [topLevelOrder, topLevelOrderKey]);

  const orderedTopLevel = useMemo(() => {
    const folderMap = new Map(folders.map(f => [`folder:${f.id}`, f]));
    const groupMap = new Map(ungroupedGroups.map(g => [`group:${g.group.id}`, g]));
    return topLevelOrder
      .map(id => {
        if (id.startsWith('folder:')) {
          const f = folderMap.get(id);
          return f ? { type: 'folder' as const, folder: f } : null;
        }
        const g = groupMap.get(id);
        return g ? { type: 'group' as const, jg: g } : null;
      })
      .filter((x): x is { type: 'folder'; folder: UserGroupFolder } | { type: 'group'; jg: JoinedGroup } => x !== null);
  }, [topLevelOrder, folders, ungroupedGroups]);

  const loadFolders = async (userId: string) => {
    const [{ data: folderRows }, { data: itemRows }] = await Promise.all([
      supabase.from("user_group_folders").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("user_group_folder_items").select("folder_id,group_id,sort_order").eq("user_id", userId),
    ]);
    const loadedFolders = (folderRows ?? []) as UserGroupFolder[];
    setFolders(loadedFolders);
    setFolderItems((itemRows ?? []) as UserGroupFolderItem[]);
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      loadedFolders.forEach((f) => { if (!next.has(f.id)) next.add(f.id); });
      return next;
    });
  };

  const createFolder = async (name: string, groupIds: string[]) => {
    if (!user) return;
    const { data: folder, error } = await supabase
      .from("user_group_folders")
      .insert({ user_id: user.id, name, sort_order: folders.length })
      .select()
      .single();
    if (error || !folder) return;
    if (groupIds.length > 0) {
      await supabase.from("user_group_folder_items").insert(
        groupIds.map((gid) => ({ folder_id: folder.id, group_id: gid, user_id: user.id }))
      );
    }
    await loadFolders(user.id);
  };

  const renameFolder = async (folderId: string, name: string) => {
    if (!user) return;
    await supabase.from("user_group_folders").update({ name }).eq("id", folderId).eq("user_id", user.id);
    await loadFolders(user.id);
  };

  const dissolveFolder = async (folderId: string) => {
    if (!user) return;
    await supabase.from("user_group_folder_items").delete().eq("folder_id", folderId);
    await supabase.from("user_group_folders").delete().eq("id", folderId).eq("user_id", user.id);
    await loadFolders(user.id);
  };

  const addGroupsToFolder = async (folderId: string, groupIds: string[]) => {
    if (!user || groupIds.length === 0) return;
    await supabase.from("user_group_folder_items").upsert(
      groupIds.map((gid) => ({ folder_id: folderId, group_id: gid, user_id: user.id })),
      { onConflict: "folder_id,group_id" }
    );
    await loadFolders(user.id);
  };

  const removeGroupFromFolder = async (folderId: string, groupId: string) => {
    if (!user) return;
    await supabase.from("user_group_folder_items").delete().eq("folder_id", folderId).eq("group_id", groupId);
    await loadFolders(user.id);
  };

  const saveTopLevelOrder = async (newOrder: string[]) => {
    setTopLevelOrder(newOrder);
    if (!user) return;
    const folderEntries = newOrder
      .filter(id => id.startsWith('folder:'))
      .map((id, idx) => ({ folderId: id.slice(7), order: idx }));
    await Promise.all(
      folderEntries.map(({ folderId, order }) =>
        supabase.from("user_group_folders").update({ sort_order: order }).eq("id", folderId).eq("user_id", user.id)
      )
    );
  };

  const saveFolderItemOrder = async (folderId: string, newGroupIds: string[]) => {
    if (!user) return;
    setFolderItems(prev =>
      prev.map(item => {
        if (item.folder_id !== folderId) return item;
        const idx = newGroupIds.indexOf(item.group_id);
        return { ...item, sort_order: idx >= 0 ? idx : 999 };
      })
    );
    await Promise.all(
      newGroupIds.map((groupId, idx) =>
        supabase.from("user_group_folder_items")
          .update({ sort_order: idx })
          .eq("folder_id", folderId)
          .eq("group_id", groupId)
          .eq("user_id", user.id)
      )
    );
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const enterSelectMode = () => {
    setIsSelectMode(true);
    setSelectedGroupIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedGroupIds(new Set());
  };

  const toggleSelectGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleConfirmGroupName = async () => {
    if (!groupNameInput.trim()) return;
    setShowGroupNameModal(false);
    await createFolder(groupNameInput.trim(), Array.from(selectedGroupIds));
    exitSelectMode();
    setGroupNameInput("");
  };

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
    // 새로운 모임 진입 시 이전 탭 기록을 삭제하여 '신앙생활' 탭이 기본으로 뜨게 함
    sessionStorage.removeItem("groupDashboardTab");
    setLocation(`/group/${groupId}`);
  };

  const GroupCard = ({
    row,
    inFolder = false,
    folderId,
    onRemoveFromFolder,
  }: {
    row: GroupRow;
    inFolder?: boolean;
    folderId?: string;
    onRemoveFromFolder?: () => void;
  }) => {
    const membership = membershipMap.get(row.id);
    const roleText = membership
      ? membership.role === "owner" || membership.role === "leader"
        ? "모임리더"
        : membership.role === "scope_leader"
          ? "상위 리더"
          : "일반멤버"
      : "비가입";

    const count = memberCounts[row.id] ?? 0;
    const isSelected = selectedGroupIds.has(row.id);

    const handleClick = () => {
      if (isSelectMode) {
        toggleSelectGroup(row.id);
        return;
      }
      openGroup(row.id);
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick();
          }
        }}
        className={`w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm transition-all duration-200 text-left ${isSelectMode && isSelected ? "ring-2 ring-[#4A6741] shadow-md" : "hover:shadow-md"}`}
      >
        {isSelectMode && (
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-[#4A6741] border-[#4A6741]" : "border-zinc-300"}`}>
            {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
          </div>
        )}
        <div className="w-14 h-14 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-xl flex-shrink-0">
          {row.group_image ? <img src={ensureHttpsUrl(row.group_image) || ""} className="w-full h-full object-cover" alt="group" /> : <Users size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 truncate">{row.name}</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-md flex-shrink-0 ${membership?.role === "owner" || membership?.role === "leader" ? "bg-[#4A6741]/10 text-[#4A6741]" :
              membership?.role === "scope_leader" ? "bg-purple-100 text-purple-700" :
                membership ? "bg-zinc-100 text-zinc-600" : "bg-zinc-50 text-zinc-400"
              }`}>
              {roleText}
            </span>
          </div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 아이디 : {row.group_slug ?? "-"}</div>
          <div className="text-sm text-zinc-500 truncate mt-1">모임 멤버수 : {count}명</div>
        </div>

        {!isSelectMode && inFolder && folderId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRemoveFromFolderTarget({ folderId, groupId: row.id, groupName: row.name });
            }}
            className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors flex-shrink-0 flex items-center justify-center leading-tight text-[10px] font-bold text-center"
            aria-label="그룹에서 제외"
          >
            내보<br />내기
          </button>
        )}
        {!isSelectMode && (
          <button
            onClick={(event) => { event.stopPropagation(); openGroup(row.id); }}
            className="w-9 h-9 text-[#4A6741] rounded-full flex items-center justify-center hover:bg-[#4A6741]/10 transition-colors flex-shrink-0"
            aria-label="입장"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  const FolderCard = ({ folder }: { folder: UserGroupFolder }) => {
    const groups = groupsByFolder.get(folder.id) ?? [];
    const isExpanded = expandedFolderIds.has(folder.id);

    return (
      <div className="bg-[#4A6741]/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 bg-[#4A6741]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <FolderOpen size={19} className="text-[#4A6741]" />
          </div>
          <button
            className="flex-1 flex items-center gap-2 min-w-0 text-left"
            onClick={() => toggleFolder(folder.id)}
          >
            <span className="font-bold text-zinc-900 truncate">{folder.name}</span>
            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-md flex-shrink-0">{groups.length}개</span>
            <ChevronDown size={15} className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setFolderMenuId(folder.id)}
            className="w-8 h-8 text-zinc-400 rounded-full flex items-center justify-center hover:bg-[#4A6741]/20 transition-colors flex-shrink-0"
            aria-label="그룹 메뉴"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        <AnimatePresence>
          {isExpanded && groups.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pb-3 pt-1 space-y-2 overflow-hidden"
            >
              {groups.map((item) => (
                <GroupCard
                  key={item.group.id}
                  row={item.group}
                  inFolder
                  folderId={folder.id}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
      <div className="min-h-full bg-[#F5F6F7] pt-[var(--app-page-top)] pb-10 px-4 text-sm flex flex-col">
      <div className="max-w-2xl mx-auto space-y-4 flex-1 flex flex-col w-full">
        {/*
        상위 리더 대쉬보드 버튼 및 LeadershipPage(/leadership) 연결 비활성화
        {hasLeadershipScope && (
          <div className="flex justify-end">
            <button
              onClick={() => setLocation("/leadership")}
              className="text-sm font-bold px-3 py-2 bg-[#4A6741] rounded-lg opacity-90 text-white flex items-center gap-1"
            >
              <Shield size={14} /> 상위 리더 대쉬보드
            </button>
          </div>
        )}
        */}

        {/* 최초 로딩 중에는 아무것도 렌더링하지 않음 */}
        {isInitialLoading ? null :
          (!user && !loading ? (
            <div className="flex-1 flex items-center justify-center text-center pb-20">
              <div className="max-w-sm w-full bg-white rounded-[32px] p-10 flex flex-col items-center justify-center shadow-xl shadow-zinc-200/50 border border-zinc-100/50">
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="text-[#4A6741] opacity-40" size={32} />
                </div>
                <p className="text-[15px] text-zinc-600 font-bold mb-8 leading-relaxed">
                  로그인 후 모임 생성, 가입 및<br />활동이 가능합니다.
                </p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full h-14 bg-[#4A6741] text-white rounded-2xl text-base font-black shadow-lg shadow-green-900/10 active:scale-95 transition-all"
                >
                  로그인하기
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 w-full pb-20">
              <Loader2 size={48} className="text-zinc-200 animate-spin" strokeWidth={1.5} />
              <p className="text-zinc-400 text-sm font-medium text-center">
                모임 리스트 불러오는 중...
              </p>
            </div>
          ) : (
            <section className="space-y-3 flex-1 flex flex-col">
              {/* 그룹 / 선택모드 헤더 */}
              {joinedGroups.length >= 2 && (
                <div className="flex justify-end items-center gap-2 pt-1 pb-0.5">
                  {isSelectMode ? (
                    <>
                      <span className="text-sm font-bold text-zinc-500 mr-auto">{selectedGroupIds.size}개 선택됨</span>
                      <button
                        onClick={exitSelectMode}
                        className="text-sm font-bold text-zinc-500 px-3 py-1.5 rounded-xl bg-zinc-100 active:bg-zinc-200 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowOrderModal(true)}
                        className="text-sm font-bold text-zinc-500 px-3 py-1.5 rounded-xl bg-zinc-100 active:bg-zinc-200 transition-colors flex items-center gap-1.5"
                      >
                        <ArrowUpDown size={14} />
                        순서변경
                      </button>
                      <button
                        onClick={enterSelectMode}
                        className="text-sm font-bold text-[#4A6741] px-3 py-1.5 rounded-xl bg-[#4A6741]/10 active:bg-[#4A6741]/20 transition-colors flex items-center gap-1.5"
                      >
                        <FolderOpen size={14} />
                        그룹
                      </button>
                    </>
                  )}
                </div>
              )}

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
	                          className="w-9 h-9 text-[#4A6741] rounded-full flex items-center justify-center hover:bg-[#4A6741]/10 transition-colors"
	                          aria-label="입장"
	                        >
	                          <ChevronRight size={22} strokeWidth={2.5} />
	                        </button>
	                      </div>
	                    );
	                  })}
                </div>
              )}

              {joinedGroups.length === 0 && pendingRequests.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center pb-20">
                  <div className="max-w-sm w-full bg-white rounded-[32px] p-10 flex flex-col items-center justify-center shadow-xl shadow-zinc-200/50 border border-zinc-100/50">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6">
                      <Users className="text-[#4A6741] opacity-40" size={32} />
                    </div>
                    <p className="text-[15px] text-zinc-600 font-bold mb-8 leading-relaxed">
                      가입한 모임이 없습니다.<br />모임 검색 또는 신규 생성을 진행해주세요.
                    </p>
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={() => setShowSearchModal(true)}
                        className="w-full h-14 bg-[#4A6741] text-white rounded-2xl text-base font-black shadow-lg shadow-green-900/10 active:scale-95 transition-all"
                      >
                        모임 검색하기
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full h-14 bg-zinc-50 text-zinc-600 rounded-2xl text-base font-bold border border-zinc-100 active:scale-95 transition-all"
                      >
                        새 모임 만들기
                      </button>
                    </div>
                  </div>
                </div>
              ) : joinedGroups.length > 0 ? (
                <div className="space-y-4 pb-4">
                  {orderedTopLevel.map((item) =>
                    item.type === 'folder' ? (
                      <FolderCard key={item.folder.id} folder={item.folder} />
                    ) : (
                      <GroupCard key={item.jg.group.id} row={item.jg.group} />
                    )
                  )}
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

      {/* 순서변경 모달 - 1단계: 전체 순서 */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) setShowOrderModal(false);
              }}
              className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden max-w-lg mx-auto w-full"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 flex-shrink-0" />
              <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
                <div>
                  <h3 className="font-black text-zinc-900 text-lg">순서 변경</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    <GripVertical size={11} /> 오른쪽 손잡이를 드래그해 순서를 바꿔주세요
                  </p>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 pb-6 overflow-y-auto">
                <DndContext
                  sensors={sortableSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const oldIdx = topLevelOrder.indexOf(String(active.id));
                    const newIdx = topLevelOrder.indexOf(String(over.id));
                    if (oldIdx < 0 || newIdx < 0) return;
                    void saveTopLevelOrder(arrayMove(topLevelOrder, oldIdx, newIdx));
                  }}
                >
                  <SortableContext items={topLevelOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {orderedTopLevel.map((item) => {
                        const id = item.type === 'folder' ? `folder:${item.folder.id}` : `group:${item.jg.group.id}`;
                        const label = item.type === 'folder' ? item.folder.name : item.jg.group.name;
                        const sub = item.type === 'folder'
                          ? `${(groupsByFolder.get(item.folder.id) ?? []).length}개 모임`
                          : `모임 아이디: ${item.jg.group.group_slug ?? '-'}`;
                        return (
                          <SortableItem key={id} id={id}>
                            {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                              <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
                                <div className={`flex items-center gap-3 rounded-2xl border shadow-sm px-4 py-3 ${item.type === 'folder' ? 'bg-[#4A6741]/10 border-[#4A6741]/20' : 'bg-white border-zinc-100'}`}>
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'folder' ? 'bg-[#4A6741]/15' : 'bg-zinc-50'}`}>
                                    {item.type === 'folder'
                                      ? <FolderOpen size={17} className="text-[#4A6741]" />
                                      : <Users size={17} className="text-zinc-400" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-zinc-900 truncate">{label}</div>
                                    <div className="text-xs text-zinc-400 truncate">{sub}</div>
                                  </div>
                                  <button
                                    {...attributes}
                                    {...listeners}
                                    className="p-2 rounded-xl bg-zinc-100 text-zinc-400 touch-none flex-shrink-0 ml-1"
                                    aria-label="순서 조정"
                                    type="button"
                                  >
                                    <GripVertical size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </SortableItem>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 순서변경 모달 - 2단계: 폴더 내부 순서 */}
      <AnimatePresence>
        {showFolderOrderModal && (() => {
          const folder = folders.find(f => f.id === showFolderOrderModal);
          const items = groupsByFolder.get(showFolderOrderModal) ?? [];
          const itemIds = items.map(i => i.group.id);
          if (!folder) return null;
          return (
            <div className="fixed inset-0 z-[260] flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowFolderOrderModal(null)}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.15 }}
                onDragEnd={(_, info) => {
                  if (info.velocity.y > 500 || info.offset.y > 80) setShowFolderOrderModal(null);
                }}
                className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden max-w-lg mx-auto w-full"
              >
                <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 flex-shrink-0" />
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
                  <div>
                    <p className="text-xs text-[#4A6741] font-bold mb-0.5 truncate">{folder.name}</p>
                    <h3 className="font-black text-zinc-900 text-lg">그룹 내 순서 변경</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                      <GripVertical size={11} /> 오른쪽 손잡이를 드래그해 순서를 바꿔주세요
                    </p>
                  </div>
                  <button onClick={() => setShowFolderOrderModal(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <X size={16} />
                  </button>
                </div>
                <div className="px-4 pb-6 overflow-y-auto">
                  <DndContext
                    sensors={sortableSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (!over || active.id === over.id) return;
                      const oldIdx = itemIds.indexOf(String(active.id));
                      const newIdx = itemIds.indexOf(String(over.id));
                      if (oldIdx < 0 || newIdx < 0) return;
                      void saveFolderItemOrder(showFolderOrderModal!, arrayMove(itemIds, oldIdx, newIdx));
                    }}
                  >
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {items.map((jg) => (
                          <SortableItem key={jg.group.id} id={jg.group.id}>
                            {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                              <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
                                <div className="flex items-center gap-3 bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-3">
                                  <div className="w-9 h-9 overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-xl flex-shrink-0">
                                    {jg.group.group_image
                                      ? <img src={ensureHttpsUrl(jg.group.group_image) || ""} className="w-full h-full object-cover" alt="" />
                                      : <Users size={17} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-zinc-900 truncate">{jg.group.name}</div>
                                    <div className="text-xs text-zinc-400 truncate">모임 아이디: {jg.group.group_slug ?? '-'}</div>
                                  </div>
                                  <button
                                    {...attributes}
                                    {...listeners}
                                    className="p-2 rounded-xl bg-zinc-100 text-zinc-400 touch-none flex-shrink-0"
                                    aria-label="순서 조정"
                                    type="button"
                                  >
                                    <GripVertical size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) setShowSearchModal(false);
              }}
              className="relative w-full max-w-xl mx-auto bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-base shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
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
          <div className="fixed inset-0 z-[220] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y > 500 || info.offset.y > 80) setShowCreateModal(false);
              }}
              className="relative w-full max-w-xl mx-auto bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-base max-h-[88vh] overflow-y-auto shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
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

      {/* 선택모드 하단 액션바 */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[300] bg-white border-t border-zinc-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex gap-2 shadow-2xl"
          >
            <button
              onClick={() => {
                if (selectedGroupIds.size === 0) return;
                setGroupNameInput("");
                setShowGroupNameModal(true);
              }}
              disabled={selectedGroupIds.size === 0}
              className="flex-1 py-3 bg-[#4A6741] text-white font-bold rounded-2xl disabled:opacity-40 text-sm transition-opacity"
            >
              그룹 만들기 {selectedGroupIds.size > 0 ? `(${selectedGroupIds.size})` : ""}
            </button>
            <button
              onClick={() => {
                if (selectedGroupIds.size === 0 || folders.length === 0) return;
                setShowAddToGroupModal(true);
              }}
              disabled={selectedGroupIds.size === 0 || folders.length === 0}
              className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-2xl disabled:opacity-40 text-sm transition-opacity"
            >
              기존 그룹에 추가
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 그룹 이름 입력 모달 */}
      <AnimatePresence>
        {showGroupNameModal && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGroupNameModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-black text-zinc-900 text-base mb-4">그룹 이름 입력</h3>
              <input
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="예: 교회 모임, 직장 모임"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") void handleConfirmGroupName(); }}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowGroupNameModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-2xl text-sm">취소</button>
                <button
                  onClick={() => void handleConfirmGroupName()}
                  disabled={!groupNameInput.trim()}
                  className="flex-1 py-3 bg-[#4A6741] text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                >
                  만들기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 기존 그룹에 추가 모달 */}
      <AnimatePresence>
        {showAddToGroupModal && (
          <div className="fixed inset-0 z-[320] flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddToGroupModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => { if (info.velocity.y > 500 || info.offset.y > 80) setShowAddToGroupModal(false); }}
              className="relative w-full max-w-xl mx-auto bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
              <h3 className="font-black text-zinc-900 text-base mb-4">기존 그룹에 추가</h3>
              <div className="space-y-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={async () => {
                      await addGroupsToFolder(folder.id, Array.from(selectedGroupIds));
                      setShowAddToGroupModal(false);
                      exitSelectMode();
                    }}
                    className="w-full py-4 px-4 text-left font-bold text-zinc-800 rounded-2xl bg-zinc-50 hover:bg-[#4A6741]/10 flex items-center gap-3 transition-colors"
                  >
                    <FolderOpen size={18} className="text-[#4A6741] flex-shrink-0" />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-xs text-zinc-400 flex-shrink-0">{(groupsByFolder.get(folder.id) ?? []).length}개</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 폴더 컨텍스트 메뉴 */}
      <AnimatePresence>
        {folderMenuId && (
          <div className="fixed inset-0 z-[320] flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFolderMenuId(null)} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={(_, info) => { if (info.velocity.y > 500 || info.offset.y > 80) setFolderMenuId(null); }}
              className="relative w-full max-w-xl mx-auto bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />
              <p className="font-black text-zinc-900 text-base mb-4">
                {folders.find((f) => f.id === folderMenuId)?.name}
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    const folder = folders.find((f) => f.id === folderMenuId);
                    if (folder) { setRenameTargetId(folder.id); setRenameInput(folder.name); }
                    setFolderMenuId(null);
                  }}
                  className="w-full py-3 px-4 text-left font-bold text-zinc-700 rounded-xl hover:bg-zinc-50 flex items-center gap-3 transition-colors"
                >
                  <Pencil size={17} className="text-zinc-400" />
                  그룹 이름 수정
                </button>
                {(groupsByFolder.get(folderMenuId) ?? []).length > 1 && (
                  <button
                    onClick={() => { setShowFolderOrderModal(folderMenuId); setFolderMenuId(null); }}
                    className="w-full py-3 px-4 text-left font-bold text-zinc-700 rounded-xl hover:bg-zinc-50 flex items-center gap-3 transition-colors"
                  >
                    <ArrowUpDown size={17} className="text-zinc-400" />
                    내부순서 변경
                  </button>
                )}
                <button
                  onClick={() => { setDissolveTargetId(folderMenuId); setFolderMenuId(null); }}
                  className="w-full py-3 px-4 text-left font-bold text-red-500 rounded-xl hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <Trash2 size={17} />
                  그룹 해제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 그룹 이름 수정 모달 */}
      <AnimatePresence>
        {renameTargetId && (
          <div className="fixed inset-0 z-[330] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRenameTargetId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-black text-zinc-900 text-base mb-4">그룹 이름 수정</h3>
              <input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20 transition-all"
                autoFocus
                onKeyDown={async (e) => { if (e.key === "Enter" && renameInput.trim()) { await renameFolder(renameTargetId, renameInput.trim()); setRenameTargetId(null); } }}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setRenameTargetId(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-2xl text-sm">취소</button>
                <button
                  onClick={async () => { if (renameInput.trim()) { await renameFolder(renameTargetId, renameInput.trim()); setRenameTargetId(null); } }}
                  disabled={!renameInput.trim()}
                  className="flex-1 py-3 bg-[#4A6741] text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                >
                  저장
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 그룹에서 제외 확인 모달 */}
      <AnimatePresence>
        {removeFromFolderTarget && (() => {
          const folderCount = (groupsByFolder.get(removeFromFolderTarget.folderId) ?? []).length;
          const willDissolve = folderCount === 2;
          return (
            <div className="fixed inset-0 z-[330] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRemoveFromFolderTarget(null)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
                <h3 className="font-black text-zinc-900 text-base mb-2">
                  {willDissolve ? "그룹 해제" : "그룹에서 제외"}
                </h3>
                <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                  {willDissolve ? (
                    <>
                      <span className="font-bold text-zinc-700">{removeFromFolderTarget.groupName}</span>을 내보내면<br />
                      모임이 1개만 남아 <span className="font-bold text-zinc-700">그룹이 해제</span>됩니다.<br />
                      <span className="text-xs text-zinc-400 mt-1 block">포함된 모임들이 목록으로 돌아갑니다.</span>
                    </>
                  ) : (
                    <><span className="font-bold text-zinc-700">{removeFromFolderTarget.groupName}</span>을<br />그룹에서 제외하시겠습니까?</>
                  )}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setRemoveFromFolderTarget(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-2xl text-sm">취소</button>
                  <button
                    onClick={async () => {
                      if (willDissolve) {
                        await dissolveFolder(removeFromFolderTarget.folderId);
                      } else {
                        await removeGroupFromFolder(removeFromFolderTarget.folderId, removeFromFolderTarget.groupId);
                      }
                      setRemoveFromFolderTarget(null);
                    }}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm"
                  >
                    {willDissolve ? "그룹 해제" : "제외"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 그룹 해제 확인 모달 */}
      <AnimatePresence>
        {dissolveTargetId && (
          <div className="fixed inset-0 z-[330] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDissolveTargetId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <h3 className="font-black text-zinc-900 text-base mb-2">그룹 해제</h3>
              <p className="text-zinc-500 text-sm mb-6 leading-relaxed">그룹을 해제하면 포함된 모임들이<br />목록으로 돌아갑니다.</p>
              <div className="flex gap-2">
                <button onClick={() => setDissolveTargetId(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-2xl text-sm">취소</button>
                <button
                  onClick={async () => { await dissolveFolder(dissolveTargetId); setDissolveTargetId(null); }}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm"
                >
                  해제
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
