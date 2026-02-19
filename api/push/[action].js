import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const CORS_ORIGIN = "*";
const DEFAULT_TTL = 60 * 60;

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-push-server-key");
}

function getBaseEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env for push API");
  }
  return { url, serviceKey, anonKey };
}

function getSendEnv() {
  const base = getBaseEnv();
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@myamen.co.kr";
  return {
    ...base,
    vapidPublic,
    vapidPrivate,
    vapidSubject,
    hasVapid: Boolean(vapidPublic && vapidPrivate),
    pushServerKey: process.env.PUSH_SERVER_KEY || "",
  };
}

function parseBearerToken(req) {
  const raw = String(req.headers.authorization || "");
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim() || null;
}

function toUniqueIds(values) {
  const set = new Set();
  (values || []).forEach((v) => {
    const id = String(v || "").trim();
    if (id) set.add(id);
  });
  return Array.from(set);
}

function parseSubscriptionPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  const endpoint = typeof raw.endpoint === "string" ? raw.endpoint.trim() : "";
  const keys = raw.keys && typeof raw.keys === "object" ? raw.keys : null;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys?.auth === "string" ? keys.auth : "";
  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    expirationTime: raw.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
}

async function resolveAuthedUser(req, env) {
  const token = parseBearerToken(req);
  if (!token) return null;

  const authClient = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function getAction(req) {
  const raw = req.query?.action;
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]).toLowerCase();
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();

  const fallbackUrl = String(req.url || "");
  const match = fallbackUrl.match(/\/api\/push\/([^/?#]+)/i);
  if (match?.[1]) return match[1].toLowerCase();

  return "";
}

async function resolveGroupManagers(admin, groupId) {
  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("id,name,owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group?.id) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  const { data: leaderRows } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .in("role", ["leader", "owner"]);

  const managerIds = toUniqueIds([
    group.owner_id,
    ...(leaderRows ?? []).map((row) => row.user_id),
  ]);

  return {
    groupName: String(group.name || "모임"),
    managerIds,
  };
}

async function buildEventNotification(admin, actorUserId, eventType, payload) {
  if (eventType === "group_join_request_created") {
    const groupId = String(payload?.groupId || "").trim();
    if (!groupId) throw Object.assign(new Error("groupId is required"), { status: 400 });

    const { data: joinRequest } = await admin
      .from("group_join_requests")
      .select("id,group_id,user_id,status,created_at")
      .eq("group_id", groupId)
      .eq("user_id", actorUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!joinRequest?.id) {
      throw Object.assign(new Error("Pending join request not found"), { status: 404 });
    }

    const { groupName, managerIds } = await resolveGroupManagers(admin, groupId);
    const targetUserIds = managerIds.filter((id) => id !== actorUserId);
    if (targetUserIds.length === 0) {
      return null;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("username,nickname")
      .eq("id", actorUserId)
      .maybeSingle();

    const requesterName = String(profile?.nickname || profile?.username || "신청자");

    return {
      targetUserIds,
      payload: {
        title: `${groupName} 가입 신청`,
        body: `${requesterName}님의 가입 요청이 대기 중입니다.`,
        url: `/#/group/${groupId}?tab=members`,
        tag: `join-pending-${joinRequest.id}`,
        data: {
          type: "join_pending",
          groupId,
          requestId: joinRequest.id,
        },
      },
      eventDebug: {
        groupId,
        requestId: joinRequest.id,
      },
    };
  }

  if (eventType === "group_join_request_resolved") {
    const requestId = String(payload?.requestId || "").trim();
    if (!requestId) throw Object.assign(new Error("requestId is required"), { status: 400 });

    const { data: joinRequest } = await admin
      .from("group_join_requests")
      .select("id,group_id,user_id,status,resolved_at")
      .eq("id", requestId)
      .maybeSingle();

    if (!joinRequest?.id) {
      throw Object.assign(new Error("Join request not found"), { status: 404 });
    }

    const normalizedStatus = String(joinRequest.status || "").toLowerCase();
    if (normalizedStatus !== "approved" && normalizedStatus !== "rejected") {
      throw Object.assign(new Error("Join request is not resolved yet"), { status: 409 });
    }

    const { data: group } = await admin
      .from("groups")
      .select("id,name,owner_id")
      .eq("id", joinRequest.group_id)
      .maybeSingle();

    if (!group?.id) {
      throw Object.assign(new Error("Group not found"), { status: 404 });
    }

    let isManager = String(group.owner_id || "") === actorUserId;
    if (!isManager) {
      const { data: managerRow } = await admin
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", actorUserId)
        .in("role", ["leader", "owner"])
        .maybeSingle();
      isManager = Boolean(managerRow?.id);
    }

    if (!isManager) {
      throw Object.assign(new Error("Only managers can send this event"), { status: 403 });
    }

    const approved = normalizedStatus === "approved";

    return {
      targetUserIds: [joinRequest.user_id],
      payload: {
        title: `${group.name || "모임"} 가입 ${approved ? "승인" : "거절"}`,
        body: approved
          ? "가입이 승인되었습니다. 탭하여 모임으로 이동합니다."
          : "가입 요청이 거절되었습니다.",
        url: approved ? `/#/group/${group.id}` : "/#/community?list=1",
        tag: `join-decision-${joinRequest.id}-${normalizedStatus}`,
        data: {
          type: approved ? "join_approved" : "join_rejected",
          groupId: group.id,
          requestId: joinRequest.id,
          status: normalizedStatus,
        },
      },
      eventDebug: {
        groupId: group.id,
        requestId: joinRequest.id,
        status: normalizedStatus,
      },
    };
  }

  return null;
}

async function loadSubscriptions(admin, userIds) {
  if (!userIds.length) return [];
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,subscription")
    .in("user_id", userIds);

  if (error) throw new Error(error.message || "Failed to load push subscriptions");

  return (data ?? [])
    .map((row) => {
      const parsed =
        row.subscription && typeof row.subscription === "object"
          ? parseSubscriptionPayload(row.subscription)
          : parseSubscriptionPayload(null);
      if (!parsed) return null;
      return {
        id: row.id,
        user_id: row.user_id,
        endpoint: row.endpoint,
        subscription: parsed,
      };
    })
    .filter(Boolean);
}

function normalizeTargetPath(url) {
  const raw = String(url || "/").trim() || "/";
  if (raw.startsWith("/#/")) return raw.slice(2);
  if (raw.startsWith("#/")) return raw.slice(1);
  return raw;
}

async function storeAppNotifications(admin, targetUserIds, payload, eventType, eventDebug) {
  if (!targetUserIds.length) return 0;

  const notificationType =
    String(payload?.data?.type || "").trim() ||
    (eventType === "group_join_request_created"
      ? "join_pending"
      : eventType === "group_join_request_resolved"
      ? "join_approved"
      : "system");

  const rows = targetUserIds.map((userId) => ({
    user_id: userId,
    notification_type: notificationType,
    title: String(payload?.title || "알림"),
    message: String(payload?.body || ""),
    target_path: normalizeTargetPath(payload?.url),
    event_key: payload?.tag ? `${String(payload.tag)}:${String(userId)}` : null,
    payload: {
      ...(payload?.data && typeof payload.data === "object" ? payload.data : {}),
      ...(eventDebug && typeof eventDebug === "object" ? eventDebug : {}),
    },
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("app_notifications").upsert(rows, {
    onConflict: "user_id,event_key",
  });
  if (error) {
    console.error("app_notifications upsert failed:", error);
    return 0;
  }
  return rows.length;
}

async function sendWebPushBatch(admin, subscriptions, payload, ttl) {
  if (!subscriptions.length) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || undefined,
    data: payload.data || {},
  });

  let sent = 0;
  let failed = 0;
  const staleIds = [];
  const failedLogs = [];

  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, pushPayload, {
          TTL: Math.max(30, Number(ttl || DEFAULT_TTL)),
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = Number(error?.statusCode || error?.status || 0);
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(item.id);
        } else {
          failedLogs.push({ id: item.id, message: error?.message || "send failed" });
        }
      }
    })
  );

  const nowIso = new Date().toISOString();
  if (sent > 0) {
    const successIds = subscriptions.map((row) => row.id).filter((id) => !staleIds.includes(id));
    if (successIds.length) {
      await admin
        .from("push_subscriptions")
        .update({ last_success_at: nowIso, updated_at: nowIso, last_error: null })
        .in("id", successIds);
    }
  }

  if (failedLogs.length) {
    await Promise.all(
      failedLogs.map((row) =>
        admin
          .from("push_subscriptions")
          .update({ last_error: row.message.slice(0, 500), updated_at: nowIso })
          .eq("id", row.id)
      )
    );
  }

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, failed, removed: staleIds.length };
}

async function handleSubscribe(req, res) {
  const env = getBaseEnv();
  const user = await resolveAuthedUser(req, env);
  if (!user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const subscription = parseSubscriptionPayload(req.body?.subscription);
  if (!subscription) {
    return res.status(400).json({ success: false, error: "Invalid push subscription payload" });
  }

  const admin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription,
      user_agent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
      updated_at: nowIso,
      last_error: null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to save subscription" });
  }

  return res.status(200).json({ success: true });
}

async function handleUnsubscribe(req, res) {
  const env = getBaseEnv();
  const user = await resolveAuthedUser(req, env);
  if (!user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const endpoint = String(req.body?.endpoint || "").trim();
  if (!endpoint) {
    return res.status(400).json({ success: false, error: "endpoint is required" });
  }

  const admin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete subscription" });
  }

  return res.status(200).json({ success: true });
}

async function handleSend(req, res) {
  const env = getSendEnv();
  const rawServerKey = String(req.headers["x-push-server-key"] || "").trim();
  const isServerAuthorized = Boolean(env.pushServerKey) && rawServerKey === env.pushServerKey;

  const actor = isServerAuthorized ? null : await resolveAuthedUser(req, env);
  if (!isServerAuthorized && !actor?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (env.hasVapid) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublic, env.vapidPrivate);
  }

  const admin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const eventType = String(req.body?.eventType || "").trim();
  let targetUserIds = [];
  let notificationPayload = null;
  let eventDebug = null;

  if (eventType) {
    if (!actor?.id) {
      return res.status(403).json({ success: false, error: "eventType calls require user authentication" });
    }

    const eventResult = await buildEventNotification(admin, actor.id, eventType, req.body || {});
    if (!eventResult) {
      return res.status(400).json({ success: false, error: "Unsupported eventType" });
    }
    targetUserIds = toUniqueIds(eventResult.targetUserIds);
    notificationPayload = eventResult.payload;
    eventDebug = eventResult.eventDebug || null;
  } else {
    targetUserIds = toUniqueIds(
      Array.isArray(req.body?.userIds) ? req.body.userIds : req.body?.userId ? [req.body.userId] : []
    );
    notificationPayload = {
      title: String(req.body?.title || "").trim(),
      body: String(req.body?.body || "").trim(),
      url: String(req.body?.url || "").trim() || "/",
      tag: req.body?.tag ? String(req.body.tag) : undefined,
      data: req.body?.data && typeof req.body.data === "object" ? req.body.data : {},
    };

    if (!notificationPayload.title || !notificationPayload.body) {
      return res.status(400).json({ success: false, error: "title and body are required" });
    }

    if (!isServerAuthorized) {
      const actorId = String(actor.id);
      if (!targetUserIds.length) targetUserIds = [actorId];
      const notSelfTarget = targetUserIds.some((id) => id !== actorId);
      if (notSelfTarget) {
        return res.status(403).json({ success: false, error: "Only server key can send to other users" });
      }
    }
  }

  if (!targetUserIds.length) {
    return res.status(200).json({
      success: true,
      message: "No push targets",
      sent: 0,
      failed: 0,
      removed: 0,
    });
  }

  const storedCount = await storeAppNotifications(admin, targetUserIds, notificationPayload, eventType, eventDebug);

  if (!env.hasVapid) {
    return res.status(200).json({
      success: true,
      targets: targetUserIds.length,
      subscriptions: 0,
      sent: 0,
      failed: 0,
      removed: 0,
      stored: storedCount,
      skippedPush: true,
      reason: "VAPID key is not configured",
      eventType: eventType || null,
      event: eventDebug,
    });
  }

  const subscriptions = await loadSubscriptions(admin, targetUserIds);
  const result = await sendWebPushBatch(admin, subscriptions, notificationPayload, req.body?.ttl);

  return res.status(200).json({
    success: true,
    targets: targetUserIds.length,
    subscriptions: subscriptions.length,
    sent: result.sent,
    failed: result.failed,
    removed: result.removed,
    stored: storedCount,
    eventType: eventType || null,
    event: eventDebug,
  });
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const action = getAction(req);

    if (action === "subscribe") return await handleSubscribe(req, res);
    if (action === "unsubscribe") return await handleUnsubscribe(req, res);
    if (action === "send") return await handleSend(req, res);

    return res.status(404).json({ success: false, error: "Unknown push action" });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: error?.message || "Unexpected error",
    });
  }
}
