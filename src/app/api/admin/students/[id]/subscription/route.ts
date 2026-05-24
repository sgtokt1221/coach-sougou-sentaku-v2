import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getFeaturesByPlan } from "@/lib/stripe/plans";
import type {
  StandardSubscription,
  DocumentPackage,
  FeatureFlags,
} from "@/lib/types/subscription";

/**
 * 管理者から生徒のサブスクリプション機能 (standard / document_package) を
 * 手動付与・剥奪する API。
 *
 * 設計メモ:
 * - Firestore の `plan` フィールドは別途「コーチプラン (self/coach)」で利用されているため、
 *   ここでは触らない。代わりに `features` を直接書き込み、`subscriptionPlan` という
 *   別フィールドにスタンダード加入状態を記録する。requireFeature は features を最優先で
 *   読むため、403 解消には features の書き込みのみで十分。
 * - 手動付与時は standardSubscription.manual / documentPackage.manual に true を立て、
 *   付与者 uid と日時を記録する (Stripe 由来と区別)。
 * - Stripe 連携済みユーザー (stripeSubscriptionId あり) でも上書きは許可。
 *   UI 側で警告表示する想定。
 */

interface PatchBody {
  /** true = standard 付与, false = 剥奪 */
  standard?: boolean;
  /** true = document_package 付与, false = 剥奪 */
  documentPackage?: boolean;
  /**
   * 機能別の個別 ON/OFF (admin が機能単位でカスタム制御)。
   * 指定されたキーだけ既存 features に merge する。プラン側は変えない。
   */
  features?: Partial<FeatureFlags>;
  /**
   * 音声面接の無制限利用フラグ (rate-limit ロジック側で読まれる別フィールド)。
   * true なら 7 日 cooldown を無視、 false / undefined なら通常制限。
   */
  realtimeUnlocked?: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    if (
      body.standard === undefined &&
      body.documentPackage === undefined &&
      body.realtimeUnlocked === undefined &&
      (!body.features || Object.keys(body.features).length === 0)
    ) {
      return NextResponse.json(
        { error: "standard / documentPackage / features / realtimeUnlocked のいずれかを指定してください" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const userRef = adminDb.doc(`users/${id}`);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data() ?? {};

    // managedBy スコーピング (superadmin は全生徒可)
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;
    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    // 既存状態を取得
    const currentStandard = userData.standardSubscription as
      | StandardSubscription
      | undefined;
    const currentDocPackage = (userData.documentPackage as DocumentPackage | undefined) ?? {
      purchased: false,
    };

    // 次の standardSubscription を決定
    let nextStandard: StandardSubscription | null | "unchanged" = "unchanged";
    if (body.standard === true) {
      // 手動付与: 期限を遠い未来 (10年) に設定。manual フラグで識別
      nextStandard = {
        status: "active",
        currentPeriodEnd: new Date(
          Date.now() + 10 * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        cancelAtPeriodEnd: false,
        manual: true,
        grantedBy: uid,
        grantedAt: nowIso,
      };
    } else if (body.standard === false) {
      // 剥奪: canceled ステータスに
      if (currentStandard) {
        nextStandard = {
          ...currentStandard,
          status: "canceled",
          cancelAtPeriodEnd: true,
        };
      } else {
        nextStandard = null;
      }
    }

    // 次の documentPackage を決定
    let nextDocPackage: DocumentPackage | "unchanged" = "unchanged";
    if (body.documentPackage === true) {
      nextDocPackage = {
        purchased: true,
        purchasedAt: nowIso,
        manual: true,
        grantedBy: uid,
        grantedAt: nowIso,
      };
    } else if (body.documentPackage === false) {
      nextDocPackage = { ...currentDocPackage, purchased: false };
    }

    // 確定状態から features を再計算 (plan ベースの基本セット)
    const isStandardActive =
      nextStandard === "unchanged"
        ? currentStandard?.status === "active"
        : nextStandard !== null && nextStandard.status === "active";
    const hasDocPackage =
      nextDocPackage === "unchanged"
        ? currentDocPackage.purchased === true
        : nextDocPackage.purchased === true;

    // 個別 features の変更がある場合は、 既存 features に merge する形にする
    // (= プラン変更時は plan ベースで再計算、 individual features 変更時は既存に上書き)
    const isPlanChange =
      body.standard !== undefined || body.documentPackage !== undefined;
    const currentFeatures = (userData.features as FeatureFlags | undefined) ?? null;
    let features: FeatureFlags;
    if (isPlanChange) {
      // プラン変更時はプランベースで再計算 (個別フラグはリセット)
      features = getFeaturesByPlan(
        isStandardActive ? "standard" : "free",
        hasDocPackage,
      );
    } else if (body.features) {
      // 個別フラグ変更時は既存 features に merge
      const baseFeatures =
        currentFeatures ??
        getFeaturesByPlan(
          isStandardActive ? "standard" : "free",
          hasDocPackage,
        );
      features = { ...baseFeatures, ...body.features };
    } else {
      features =
        currentFeatures ??
        getFeaturesByPlan(
          isStandardActive ? "standard" : "free",
          hasDocPackage,
        );
    }

    // Firestore 更新ペイロード組み立て (plan フィールドは触らない)
    const update: Record<string, unknown> = {
      features,
      subscriptionPlan: isStandardActive
        ? "standard"
        : hasDocPackage
          ? "document_package"
          : "free",
      updatedAt: new Date(),
    };
    if (nextStandard !== "unchanged") {
      update.standardSubscription = nextStandard;
    }
    if (nextDocPackage !== "unchanged") {
      update.documentPackage = nextDocPackage;
    }

    // 音声面接の無制限利用フラグ (rate-limit ロジック側で参照される独立フィールド)
    let nextRealtimeUnlocked: boolean | undefined;
    if (body.realtimeUnlocked === true) {
      const { FieldValue } = await import("firebase-admin/firestore");
      update.realtimeUnlocked = true;
      update.lastRealtimeAt = FieldValue.delete();
      nextRealtimeUnlocked = true;
    } else if (body.realtimeUnlocked === false) {
      const { FieldValue } = await import("firebase-admin/firestore");
      update.realtimeUnlocked = FieldValue.delete();
      nextRealtimeUnlocked = false;
    }

    await userRef.update(update);

    return NextResponse.json({
      ok: true,
      subscriptionPlan: update.subscriptionPlan,
      features,
      realtimeUnlocked:
        nextRealtimeUnlocked ?? userData.realtimeUnlocked === true,
      hasStripeSubscription: !!userData.stripeSubscriptionId,
    });
  } catch (error) {
    console.error("Subscription PATCH error:", error);
    return NextResponse.json(
      { error: "サブスクリプションの更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * 現在のサブスクリプション状態を取得する。
 * UI 側で初期値表示に利用。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data() ?? {};

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;
    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const standardSubscription = userData.standardSubscription as
      | StandardSubscription
      | undefined;
    const documentPackage = (userData.documentPackage as DocumentPackage | undefined) ?? {
      purchased: false,
    };
    const features = (userData.features as FeatureFlags | undefined) ?? null;
    const subscriptionPlan =
      (userData.subscriptionPlan as string | undefined) ?? "free";

    return NextResponse.json({
      subscriptionPlan,
      standardActive: standardSubscription?.status === "active",
      standardSubscription: standardSubscription ?? null,
      documentPackagePurchased: documentPackage.purchased === true,
      documentPackage,
      features,
      realtimeUnlocked: userData.realtimeUnlocked === true,
      hasStripeSubscription: !!userData.stripeSubscriptionId,
      stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
    });
  } catch (error) {
    console.error("Subscription GET error:", error);
    return NextResponse.json(
      { error: "サブスクリプション情報の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
