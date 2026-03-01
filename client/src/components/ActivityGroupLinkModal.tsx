import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";

export type ActivityType = "qt" | "prayer" | "reading";

interface ActivityGroupLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: { id: string } | null;
    activityType: ActivityType;
    activityDate: Date;
    onSuccess?: () => void;
}

export function ActivityGroupLinkModal({
    open,
    onOpenChange,
    user,
    activityType,
    activityDate,
    onSuccess,
}: ActivityGroupLinkModalProps) {
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && user) {
            loadData();
        } else {
            setActivities([]);
            setGroups([]);
            setSelectedGroups([]);
        }
    }, [open, user, activityDate, activityType]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        // 1. Fetch activities for the date
        const todayStart = new Date(activityDate);
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);

        const { data: logsData } = await supabase
            .from("activity_logs")
            .select("id, payload, occurred_at")
            .eq("user_id", user.id)
            .eq("source_kind", "personal")
            .eq("activity_type", activityType)
            .gte("occurred_at", todayStart.toISOString())
            .lt("occurred_at", tomorrowStart.toISOString())
            .order("occurred_at", { ascending: false });

        // 2. Fetch user's groups and their faith items
        const { data: userGroups } = await supabase
            .from("group_members")
            .select("group_id, groups(id, name, group_faith_items(id, name, item_type, linked_feature))")
            .eq("user_id", user.id);

        const validGroups: any[] = [];
        if (userGroups) {
            userGroups.forEach((gm: any) => {
                const group = gm.groups;
                if (!group) return;
                const items = group.group_faith_items || [];

                let targetItem = null;
                for (const item of items) {
                    let linkedFeature = item.linked_feature;
                    if (linkedFeature === "none") {
                        const name = (item.name || "").toLowerCase();
                        if (name.includes("qt") || name.includes("묵상")) linkedFeature = "qt";
                        else if (name.includes("기도") || name.includes("prayer")) linkedFeature = "prayer";
                        else if (name.includes("성경") || name.includes("읽기") || name.includes("reading")) linkedFeature = "reading";
                    }

                    if (linkedFeature === activityType) {
                        targetItem = item;
                        break;
                    }
                }

                if (targetItem) {
                    validGroups.push({
                        id: group.id,
                        name: group.name,
                        targetItem
                    });
                }
            });
        }

        setActivities(logsData || []);
        setGroups(validGroups);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user || activities.length === 0 || selectedGroups.length === 0) return;
        setSaving(true);

        try {
            const dateStr = format(activityDate, "yyyy-MM-dd");

            for (const groupId of selectedGroups) {
                const groupInfo = groups.find(g => g.id === groupId);
                if (!groupInfo || !groupInfo.targetItem) continue;

                const faithItem = groupInfo.targetItem;

                // Get current faith value to increment ONCE
                const { data: currentRecord } = await supabase
                    .from("group_faith_records")
                    .select("value")
                    .eq("group_id", groupId)
                    .eq("item_id", faithItem.id)
                    .eq("user_id", user.id)
                    .eq("record_date", dateStr)
                    .maybeSingle();

                let currentValue = currentRecord?.value || 0;

                // Loop over activities and link them
                for (const activity of activities) {
                    // 1. Insert activity_group_link (ignore unique constraint errors)
                    const { error: linkError } = await supabase.from("activity_group_links").insert({
                        activity_log_id: activity.id,
                        group_id: groupId,
                        linked_by: user.id
                    });

                    let isAlreadyLinked = false;
                    if (linkError) {
                        if (linkError.code === "23505") {
                            isAlreadyLinked = true;
                        } else {
                            console.error("Link Error:", linkError);
                            continue;
                        }
                    }

                    // 2. Upsert faith record ONLY if it's a new link, or if we just want to update the note text.
                    if (!isAlreadyLinked) {
                        currentValue = faithItem.item_type === "count" ? currentValue + 1 : 1;
                    }
                    const nextValue = currentValue;

                    let noteText: string | null = null;
                    if (activityType === "reading") {
                        const payload = activity.payload || {};
                        const book = payload.book_name;
                        const chapter = payload.chapter;
                        const endChapter = payload.end_chapter;
                        if (typeof book === "string" && (typeof chapter === "number" || typeof chapter === "string")) {
                            if (typeof endChapter === "number" && endChapter !== Number(chapter)) {
                                noteText = `${book} ${chapter}~${endChapter}장`;
                            } else {
                                noteText = `${book} ${chapter}장`;
                            }
                        }
                    }

                    await supabase.from("group_faith_records").upsert(
                        {
                            group_id: groupId,
                            item_id: faithItem.id,
                            user_id: user.id,
                            record_date: dateStr,
                            value: nextValue,
                            note: noteText,
                            source_type: "linked",
                            source_event_type: activityType,
                            source_event_id: String(activity.id),
                        },
                        { onConflict: "group_id,item_id,user_id,record_date" }
                    );
                }
            }

            alert("모임 연결을 완료했습니다.");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            alert("연결 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const getActivityTitleInfoLabel = () => {
        if (activityType === "qt") return "QT 기록";
        if (activityType === "prayer") return "기도 기록";
        return "성경 읽기 기록";
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40"
                        onClick={() => onOpenChange(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight">모임으로 연결하기</h3>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-10">
                                <Loader2 className="w-8 h-8 text-[#4A6741] animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-500 mb-2">오늘 기록된 내용</h4>
                                    {activities.length === 0 ? (
                                        <div className="bg-zinc-50 rounded-2xl p-4 text-center text-zinc-400 text-sm font-bold">
                                            오늘 등록한 기록이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="bg-[#4A6741]/5 rounded-2xl p-4 border border-[#4A6741]/10">
                                            <div className="text-sm font-black text-[#4A6741]">
                                                {format(activityDate, "M월 d일")} {getActivityTitleInfoLabel()}
                                            </div>
                                            <div className="text-2xl font-black text-zinc-900 mt-1">
                                                총 {activities.length}개
                                                <span className="text-base text-zinc-500 font-bold ml-1">기록됨</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {activities.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-500 mb-2">연결할 모임 선택</h4>
                                        {groups.length === 0 ? (
                                            <div className="bg-zinc-50 rounded-2xl p-4 text-center text-zinc-400 text-sm font-bold">
                                                이 활동을 연결할 수 있는 모임이 없습니다.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 pb-1">
                                                {groups.map(g => {
                                                    const isSelected = selectedGroups.includes(g.id);
                                                    return (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => {
                                                                if (isSelected) setSelectedGroups(prev => prev.filter(id => id !== g.id));
                                                                else setSelectedGroups(prev => [...prev, g.id]);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-[#4A6741] bg-[#4A6741]/5" : "border-zinc-100 hover:border-zinc-200 bg-white"
                                                                }`}
                                                        >
                                                            <span className={`font-bold ${isSelected ? "text-[#4A6741]" : "text-zinc-700"}`}>
                                                                {g.name}
                                                            </span>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-transparent"
                                                                }`}>
                                                                <Check size={14} strokeWidth={4} />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={saving || activities.length === 0 || selectedGroups.length === 0}
                                    className="w-full h-14 bg-[#4A6741] text-white rounded-2xl text-base font-black shadow-lg shadow-green-900/10 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {saving ? "연결 중..." : "선택한 모임에 연결하기"}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
