import { supabase } from "./supabase";

export type MyGroupLite = {
  id: string;
  name: string;
};

export type LinkPersonalActivityParams = {
  userId: string;
  activityType: "qt" | "prayer" | "reading";
  sourceTable: string;
  sourceRowId: string;
  groupId: string;
};

export async function fetchMyGroups(userId: string): Promise<MyGroupLite[]> {
  const [{ data: memberships }, { data: ownerGroups }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, groups(id, name)")
      .eq("user_id", userId),
    supabase.from("groups").select("id, name").eq("owner_id", userId),
  ]);

  const map = new Map<string, MyGroupLite>();

  (memberships ?? []).forEach((row: any) => {
    const group = row.groups;
    if (group?.id && group?.name) {
      map.set(group.id, { id: group.id, name: group.name });
    }
  });

  (ownerGroups ?? []).forEach((group: any) => {
    if (group?.id && group?.name) {
      map.set(group.id, { id: group.id, name: group.name });
    }
  });

  return Array.from(map.values());
}

export async function linkPersonalActivityToGroup(params: LinkPersonalActivityParams) {
  const { userId, activityType, sourceTable, sourceRowId, groupId } = params;
  return supabase.rpc("link_personal_activity_to_group", {
    p_user_id: userId,
    p_activity_type: activityType,
    p_source_table: sourceTable,
    p_source_row_id: sourceRowId,
    p_group_id: groupId,
    p_linked_by: userId,
  });
}

