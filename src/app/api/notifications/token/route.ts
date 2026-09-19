import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";

/**
 * FCMトークンの持ち主を1人に保つための台帳。
 *
 * トークンは**端末（ブラウザ）**を指すもので、利用者を指さない。同じ端末で
 * 別のアカウントにログインすると、まったく同じトークンが新しい uid の下にも
 * 登録され、古い方は誰も消さなかった。その結果、本番では1つのトークンが
 * 最大3人に登録され、**A宛の通知がいまBが使っている端末に出る**状態だった
 * （2026-09-20 に実データで確認）。受け取る側は「自分宛が来ない／他人のが来る」
 * としか見えず、送信側のログは成功のままなので気づけない。
 *
 * トークンをそのまま文書IDにすると長さも文字種も扱いにくいので、SHA-256 の
 * 16進で引く。中身は uid だけ。
 */
const OWNER_COLLECTION = "fcmTokenOwners";

function ownerDocId(fcmToken: string): string {
  return createHash("sha256").update(fcmToken).digest("hex");
}

/**
 * このトークンを uid のものにし、他の利用者に残っている同じトークンを消す。
 * 台帳が壊れていても登録自体は続ける（通知が来ないより良い）。
 */
async function claimToken(fcmToken: string, uid: string): Promise<string[]> {
  const released: string[] = [];
  if (!adminDb) return released;
  const ref = adminDb.collection(OWNER_COLLECTION).doc(ownerDocId(fcmToken));
  try {
    const snap = await ref.get();
    const prevUid = snap.exists
      ? (snap.data()?.uid as string | undefined)
      : undefined;
    if (prevUid && prevUid !== uid) {
      await adminDb.doc(`users/${prevUid}/fcmTokens/${fcmToken}`).delete();
      released.push(prevUid);
      console.warn(
        `[fcm] 端末の持ち主が変わったため前の登録を解除 prev=${prevUid} next=${uid}`
      );
    }
    await ref.set({ uid, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[fcm] 持ち主台帳の更新に失敗", e);
  }
  return released;
}

/**
 * POST /api/notifications/token — FCMトークンをFirestoreに保存
 */
export async function POST(request: Request) {
  const authResult = await verifyAuthToken(request);

  if (!authResult) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ success: true, mock: true });
    }
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { fcmToken } = body as { fcmToken?: unknown };
  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json(
      { error: "fcmToken is required" },
      { status: 400 }
    );
  }
  /**
   * 端末情報はクライアントが送ってきた値を優先する。
   * リクエストヘッダの User-Agent は本番で全件 "Google" になっており、
   * どの端末のトークンかを判別できなかった。
   */
  const clientUserAgent =
    typeof (body as { userAgent?: unknown }).userAgent === "string"
      ? ((body as { userAgent: string }).userAgent as string)
      : "";
  const standalone = (body as { standalone?: unknown }).standalone === true;
  const deviceId =
    typeof (body as { deviceId?: unknown }).deviceId === "string"
      ? ((body as { deviceId: string }).deviceId as string).slice(0, 64)
      : "";

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const tokenRef = adminDb
    .collection("users")
    .doc(authResult.uid)
    .collection("fcmTokens")
    .doc(fcmToken);

  // createdAt は最初の登録時のまま残す（そのトークンがいつからのものかを見るため）
  const existing = await tokenRef.get();
  const now = new Date().toISOString();
  await tokenRef.set(
    {
      token: fcmToken,
      ...(existing.exists ? {} : { createdAt: now }),
      updatedAt: now,
      userAgent: clientUserAgent || request.headers.get("User-Agent") || "",
      /** ホーム画面に追加したPWAの中で登録したか。iOSはこれが true でないと届かない */
      standalone,
      ...(deviceId ? { deviceId } : {}),
    },
    { merge: true }
  );

  /**
   * 同じ端末の古いトークンを消す。
   * トークンは入れ替わるたびに新しい文書になるため、端末 ID で束ねないと
   * 1端末に死んだトークンが積み上がる（本番で1端末に3〜6件あった）。
   * 古い方に送っても失敗するだけで、失敗して初めて消える作りだった。
   */
  let removed = 0;
  if (deviceId) {
    const sameDevice = await adminDb
      .collection(`users/${authResult.uid}/fcmTokens`)
      .where("deviceId", "==", deviceId)
      .get();
    const batch = adminDb.batch();
    for (const d of sameDevice.docs) {
      if (d.id === fcmToken) continue;
      batch.delete(d.ref);
      removed++;
    }
    if (removed > 0) await batch.commit();
  }

  /**
   * この端末の持ち主をこの利用者にする。同じ端末で前に使っていた
   * アカウントの登録はここで消える（消さないと別人の通知がこの端末に出る）。
   */
  const released = await claimToken(fcmToken, authResult.uid);

  return NextResponse.json({
    success: true,
    removed,
    released: released.length,
  });
}

/**
 * DELETE /api/notifications/token — この端末の登録を外す。
 *
 * ログアウト時に呼ぶ。外さないと、次にこの端末を使う人の通知と混ざる。
 */
export async function DELETE(request: Request) {
  const authResult = await verifyAuthToken(request);
  if (!authResult) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { fcmToken } = body as { fcmToken?: unknown };
  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json(
      { error: "fcmToken is required" },
      { status: 400 }
    );
  }
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  await adminDb
    .doc(`users/${authResult.uid}/fcmTokens/${fcmToken}`)
    .delete()
    .catch(() => undefined);
  // 台帳も片付ける。自分のものだったときだけ消す
  try {
    const ref = adminDb.collection(OWNER_COLLECTION).doc(ownerDocId(fcmToken));
    const snap = await ref.get();
    if (snap.exists && snap.data()?.uid === authResult.uid) await ref.delete();
  } catch {
    /* 台帳の掃除に失敗しても、登録は消えているので実害はない */
  }
  return NextResponse.json({ success: true });
}
