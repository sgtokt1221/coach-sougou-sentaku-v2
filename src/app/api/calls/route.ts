import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { isLiveKitConfigured } from "@/lib/livekit/config";
import { buildParticipantUids, type CandidateUser } from "@/lib/livekit/authz";
import {
  CALL_MAX_PARTICIPANTS,
  buildRoomName,
  type Call,
  type CallParticipant,
  type CallParticipantRole,
} from "@/lib/types/call";
import { sendFcmToUser } from "@/lib/chat/conversation";

/**
 * 通話を作る。
 *
 * 参加者の認可は participantUids を正本にする。既存の group_review セッションの
 * participantIds には権限チェックが無いため、そこには相乗りしない。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "ビデオ通話が設定されていません" },
      { status: 503 }
    );
  }

  let body: { participantUids?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }

  const requested = Array.isArray(body.participantUids)
    ? body.participantUids.filter((v): v is string => typeof v === "string")
    : [];
  if (requested.length === 0) {
    return NextResponse.json(
      { error: "相手を1人以上選んでください" },
      { status: 400 }
    );
  }
  // 明らかに多すぎる指定は Firestore を引く前に落とす
  if (requested.length >= CALL_MAX_PARTICIPANTS * 2) {
    return NextResponse.json(
      { error: `通話は${CALL_MAX_PARTICIPANTS}人までです` },
      { status: 400 }
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 発信者と参加者候補をまとめて引く
  const uidsToLoad = Array.from(new Set([auth.uid, ...requested]));
  const snaps = await adminDb.getAll(
    ...uidsToLoad.map((uid) => adminDb.doc(`users/${uid}`))
  );
  const byUid = new Map<string, { data: FirebaseFirestore.DocumentData }>();
  for (const snap of snaps) {
    if (snap.exists) byUid.set(snap.id, { data: snap.data() ?? {} });
  }

  const hostDoc = byUid.get(auth.uid);
  if (!hostDoc) {
    return NextResponse.json(
      { error: "発信者が見つかりません" },
      { status: 404 }
    );
  }

  const host: CandidateUser = {
    uid: auth.uid,
    organizationId: hostDoc.data.organizationId ?? null,
    role: auth.role,
  };
  const candidates: CandidateUser[] = [];
  for (const uid of requested) {
    const doc = byUid.get(uid);
    if (!doc) {
      return NextResponse.json(
        { error: "招待できない利用者が含まれています" },
        { status: 403 }
      );
    }
    candidates.push({
      uid,
      organizationId: doc.data.organizationId ?? null,
      role: doc.data.role ?? "student",
    });
  }

  const built = buildParticipantUids(host, candidates);
  if (!built.ok) {
    return NextResponse.json({ error: built.reason }, { status: built.code });
  }

  const hostName =
    (hostDoc.data.displayName as string) ||
    (hostDoc.data.name as string) ||
    "スタッフ";
  const participants: CallParticipant[] = built.uids.map((uid) => {
    const d = byUid.get(uid)?.data ?? {};
    return {
      uid,
      name: (d.displayName as string) || (d.name as string) || "参加者",
      role: ((d.role as CallParticipantRole) ??
        "student") as CallParticipantRole,
    };
  });

  const now = new Date().toISOString();
  const ref = adminDb.collection("calls").doc();
  const call: Omit<Call, "id"> = {
    hostUid: auth.uid,
    hostName,
    organizationId: host.organizationId as string,
    status: "ringing",
    participantUids: built.uids,
    participants,
    roomName: buildRoomName(ref.id),
    declinedUids: [],
    createdAt: now,
    ...(typeof body.sessionId === "string"
      ? { sessionId: body.sessionId }
      : {}),
  };
  await ref.set(call);

  // 呼び出しを相手のチャットに配る。失敗しても通話自体は成立させる
  const invitees = built.uids.filter((uid) => uid !== auth.uid);
  await Promise.all(
    invitees.map(async (uid) => {
      try {
        await sendFcmToUser(
          uid,
          {
            title: `${hostName} から通話`,
            body: "タップして参加",
            url: `/call/${ref.id}`,
          },
          "call"
        );
      } catch (err) {
        console.warn("[calls] invite notify failed", uid, err);
      }
    })
  );

  return NextResponse.json(
    { callId: ref.id, roomName: call.roomName, participants },
    { status: 201 }
  );
}
