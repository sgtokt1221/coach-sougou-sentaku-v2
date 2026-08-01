import { NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { Essay } from "@/lib/types/essay";
import type { CoachThread, LinkedCoachThread } from "@/lib/types/essay-coach";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { id: studentId, essayId } = await params;

  if (!adminDb) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  // 答案が studentId のものかを見るだけでは足りない。呼び出した管理者が
  // その生徒を見てよいかを他の生徒APIと同じゲートで判定する（他塾からの
  // ID 直打ちで答案本文が読めてしまうため）。
  const scopeDoc = await adminDb.doc(`users/${studentId}`).get();
  const denied = await scopeByOrganization({
    requesterUid: auth.uid,
    requesterRole: auth.role,
    studentUid: studentId,
    studentData: {
      managedBy: scopeDoc.data()?.managedBy,
      organizationId: scopeDoc.data()?.organizationId,
      assignedTeacherIds: getAssignedTeacherIds(scopeDoc.data()),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  try {
    const essayDoc = await adminDb.doc(`essays/${essayId}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json(
        { error: "エッセイが見つかりません" },
        { status: 404 }
      );
    }

    const data = essayDoc.data()!;

    // userId が対象生徒と一致することを確認
    if (data.userId !== studentId) {
      return NextResponse.json(
        { error: "この生徒のエッセイではありません" },
        { status: 403 }
      );
    }

    // 出題の文脈。retryContext は旧データでここに同じ情報が入っていることがあるため
    // フォールバックに使う。
    const ctx = (data.questionContext ?? data.retryContext ?? {}) as {
      questionType?: string | null;
      wordLimit?: number | null;
      sourceText?: string | null;
      chartDataSummary?: string | null;
      lectureInfo?: string | null;
      themeId?: string | null;
      pastQuestionId?: string | null;
    };

    // テーマ名が空の答案（保存していなかった時期のもの）は出題元から補う。
    let topic: string | undefined = data.topic || undefined;
    let topicEstimated = false;
    if (!topic && ctx.pastQuestionId) {
      const pq = getPastQuestionById(ctx.pastQuestionId);
      if (pq) topic = `${pq.universityName} ${pq.year}年 ${pq.theme}`;
    }
    if (!topic && ctx.themeId) {
      topic = getThemeById(ctx.themeId)?.title;
    }
    // それでも分からない答案は、提出時刻に最も近い下書きから推定する。
    // 講師がフィードバックを書くのに設問が要るため、空欄のままにはしない。
    if (!topic) {
      const submittedMs = data.submittedAt?.toDate?.()?.getTime?.() ?? 0;
      if (submittedMs) {
        try {
          const drafts = await adminDb!
            .collection(`users/${studentId}/essayDrafts`)
            .get();
          const nearest = drafts.docs
            .map((d) => {
              const y = d.data();
              return {
                themeId: y.themeId as string | undefined,
                pastQuestionId: y.pastQuestionId as string | undefined,
                diffMin:
                  Math.abs(
                    (y.updatedAt?.toDate?.()?.getTime?.() ?? 0) - submittedMs,
                  ) / 60000,
              };
            })
            .filter((y) => (y.themeId || y.pastQuestionId) && y.diffMin <= 120)
            .sort((a, b) => a.diffMin - b.diffMin)[0];
          if (nearest?.pastQuestionId) {
            const pq = getPastQuestionById(nearest.pastQuestionId);
            if (pq) {
              topic = `${pq.universityName} ${pq.year}年 ${pq.theme}`;
              topicEstimated = true;
            }
          } else if (nearest?.themeId) {
            const t = getThemeById(nearest.themeId)?.title;
            if (t) {
              topic = t;
              topicEstimated = true;
            }
          }
        } catch (err) {
          console.warn("[admin/essay] essayDrafts fetch failed:", err);
        }
      }
    }

    // 大学・学部は ID のまま返していたため、ダイアログ見出しに
    // 「kyoto-sangyo-u social」のような生の ID が出ていた。名前に解決する。
    let uniName = data.targetUniversity || "";
    let facName = data.targetFaculty || "";
    if (data.targetUniversity) {
      try {
        const uniDoc = await adminDb!.doc(`universities/${data.targetUniversity}`).get();
        if (uniDoc.exists) {
          const u = uniDoc.data()!;
          uniName = (u.name as string) ?? uniName;
          const fac = (u.faculties as { id: string; name: string }[] | undefined)?.find(
            (f) => f.id === data.targetFaculty,
          );
          if (fac) facName = fac.name;
        }
      } catch (err) {
        console.warn("[admin/essay] university resolve failed:", err);
      }
    }

    // この答案を書いていたときの AIコーチ会話を拾う。会話側に答案IDが無い
    // ため、お題の一致（表記ゆれを吸収）か、同じ大学で提出時刻に近いもので
    // 推定する。関係ない会話を出すと講師を惑わせるので、どちらの根拠で
    // 当てたかを matchedBy で返し、条件に合わないものは一切返さない。
    const coachThreads = await findCoachThreads(
      studentId,
      topic,
      data.targetUniversity as string | undefined,
      data.submittedAt?.toDate?.()?.getTime?.() ?? 0,
      data.coachThreadId as string | undefined,
    );

    const essay: Essay = {
      id: essayDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl || "",
      ocrText: data.ocrText || "",
      targetUniversity: uniName,
      targetFaculty: facName,
      topic,
      submittedAt: data.submittedAt?.toDate() || new Date(),
      status: data.status || "uploaded",
      scores: data.scores || undefined,
      feedback: data.feedback || undefined,
      inlineComments: data.inlineComments || [],
    };

    return NextResponse.json({
      ...essay,
      coachThreads,
      topicEstimated,
      questionContext: {
        questionType: ctx.questionType ?? null,
        wordLimit: ctx.wordLimit ?? null,
        sourceText: ctx.sourceText ?? null,
        chartDataSummary: ctx.chartDataSummary ?? null,
        lectureInfo: ctx.lectureInfo ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch essay:", error);
    return NextResponse.json(
      { error: "エッセイの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/** 提出時刻からこの範囲内に更新された会話を「同じ問題での会話」とみなす */
const COACH_MATCH_WINDOW_MS = 6 * 60 * 60 * 1000;
/** 1スレッドあたりの返却上限。長い会話でレスポンスが膨らむのを防ぐ */
const COACH_MAX_MESSAGES = 200;

/** 表記ゆれ（空白・大文字小文字）を吸収してお題を比べる */
function normalizeTopic(v: string | undefined): string {
  return (v ?? "").replace(/\s+/g, "").toLowerCase();
}

async function findCoachThreads(
  studentId: string,
  topic: string | undefined,
  universityId: string | undefined,
  submittedMs: number,
  linkedThreadId: string | undefined,
): Promise<LinkedCoachThread[]> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return [];
  try {
    // 提出時に記録した会話があれば推定は不要。確実にこれ。
    if (linkedThreadId) {
      const doc = await adminDb
        .doc(`users/${studentId}/essayCoachThreads/${linkedThreadId}`)
        .get();
      if (doc.exists) {
        const t = doc.data() as CoachThread;
        return [
          {
            ...t,
            id: doc.id,
            messages: Array.isArray(t.messages)
              ? t.messages.slice(0, COACH_MAX_MESSAGES)
              : [],
            matchedBy: "linked",
          },
        ];
      }
      // 記録があるのに会話が消えている場合は推定へ落とす
    }
    const snap = await adminDb
      .collection(`users/${studentId}/essayCoachThreads`)
      .get();
    const wantTopic = normalizeTopic(topic);

    const scored = snap.docs
      .map((d) => {
        const t = { ...(d.data() as CoachThread), id: d.id };
        const tMs = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
        const distance =
          submittedMs && tMs ? Math.abs(tMs - submittedMs) : Number.POSITIVE_INFINITY;
        const threadTopic = normalizeTopic(t.topic);
        const byTopic = wantTopic.length > 0 && threadTopic === wantTopic;
        // 両方にお題があって食い違うなら、時間が近くても別の問題の会話。
        // これが無いと「5時間後に始めた別テーマの会話」を拾ってしまう。
        const topicConflict =
          wantTopic.length > 0 && threadTopic.length > 0 && threadTopic !== wantTopic;
        const byTime =
          !topicConflict &&
          !!universityId &&
          t.universityId === universityId &&
          distance <= COACH_MATCH_WINDOW_MS;
        if (!byTopic && !byTime) return null;
        return {
          thread: {
            ...t,
            messages: Array.isArray(t.messages)
              ? t.messages.slice(0, COACH_MAX_MESSAGES)
              : [],
            matchedBy: byTopic ? ("topic" as const) : ("time" as const),
          },
          distance,
          byTopic,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // お題一致を優先し、同順位なら提出時刻に近いものから
    scored.sort((a, b) =>
      a.byTopic !== b.byTopic ? (a.byTopic ? -1 : 1) : a.distance - b.distance,
    );
    return scored.slice(0, 3).map((x) => x.thread);
  } catch (err) {
    console.warn("[admin/essay] coach threads fetch failed:", err);
    return [];
  }
}
