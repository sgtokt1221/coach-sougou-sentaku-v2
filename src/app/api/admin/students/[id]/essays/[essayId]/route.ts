import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { applyTeacherScores, withTeacherEdits } from "@/lib/essay/teacher-edits";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
import { NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { recordSubmissionViewed } from "@/lib/api/viewed-submissions";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { loadRetryComparison } from "@/lib/essay/load-retry-comparison";
import type {
  Essay,
  EssayAttemptSummary,
  EssayFeedback,
  EssayScores,
  TeacherEdits,
  TeacherScoreEdit,
} from "@/lib/types/essay";
import { FieldValue } from "firebase-admin/firestore";
import { listFeedbackItems } from "@/lib/essay/feedback-anchors";
import { isLegacyEssayScores } from "@/lib/essay/score-axes";
import { refreshEssayAggregateCache } from "@/lib/skill-check/aggregate";
import type { CoachThread, LinkedCoachThread } from "@/lib/types/essay-coach";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { id: studentId, essayId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
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

    await recordSubmissionViewed(auth.uid, "essay", essayId, studentId);

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
      oralExam?: import("@/lib/types/essay").OralExamQuestionSet | null;
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
                    (y.updatedAt?.toDate?.()?.getTime?.() ?? 0) - submittedMs
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
        const uniDoc = await adminDb!
          .doc(`universities/${data.targetUniversity}`)
          .get();
        if (uniDoc.exists) {
          const u = uniDoc.data()!;
          uniName = (u.name as string) ?? uniName;
          const fac = (
            u.faculties as { id: string; name: string }[] | undefined
          )?.find((f) => f.id === data.targetFaculty);
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
      data.coachThreadId as string | undefined
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
      // 後から付けた1文ずつの点検と判定欄の弱点を合流させる（弱点DBと添削結果を揃える）
      feedback: data.feedback
        ? withTeacherEdits(
            feedbackWithDerivedIssues(data.feedback, data.sentenceCheck, {
              partial: isPartialEssay(data),
            }),
            data.teacherEdits
          )
        : undefined,
      inlineComments: data.inlineComments || [],
    };

    // 書き直しなら前回比（生徒の結果画面と同じ比べ方）
    const parentEssayId: string | null = data.parentEssayId ?? null;
    const retryComparison = await loadRetryComparison(adminDb, parentEssayId, {
      scores: essay.scores,
      feedback: essay.feedback,
    });

    // 同じ題の書き直しの系列（1回目から今回より後まで）。等号2つなので複合インデックスは要らない
    const rootEssayId: string = data.rootEssayId ?? essayDoc.id;
    let attempts: EssayAttemptSummary[] = [];
    try {
      const snap = await adminDb
        .collection("essays")
        .where("userId", "==", studentId)
        .where("rootEssayId", "==", rootEssayId)
        .select("attemptNumber", "submittedAt", "scores", "feedback.scoreMaximum", "ocrText")
        .get();
      attempts = snap.docs
        .map((d) => ({
          id: d.id,
          attemptNumber:
            typeof d.get("attemptNumber") === "number" ? d.get("attemptNumber") : 1,
          submittedAt:
            d.get("submittedAt")?.toDate?.()?.toISOString?.() ?? null,
          total:
            typeof d.get("scores")?.total === "number" ? d.get("scores").total : null,
          scoreMaximum: d.get("feedback.scoreMaximum") ?? 50,
          ocrText: (d.get("ocrText") as string) ?? "",
        }))
        .sort(
          (a, b) =>
            a.attemptNumber - b.attemptNumber ||
            (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")
        );
    } catch (err) {
      console.warn("[admin/essay] attempts fetch failed:", err);
    }

    return NextResponse.json({
      ...essay,
      attempts: attempts.length > 1 ? attempts : [],
      teacherEdits: data.teacherEdits ?? null,
      attemptNumber:
        typeof data.attemptNumber === "number" ? data.attemptNumber : 1,
      rootEssayId,
      parentEssayId,
      ...(retryComparison ? { retryComparison } : {}),
      coachThreads,
      topicEstimated,
      // 指摘を本文に結び付けた結果（生徒と同じ見え方で出すため）。無ければ画面が /anchors で作る
      feedbackAnchors: data.feedbackAnchors ?? null,
      questionContext: {
        questionType: ctx.questionType ?? null,
        wordLimit: ctx.wordLimit ?? null,
        sourceText: ctx.sourceText ?? null,
        chartDataSummary: ctx.chartDataSummary ?? null,
        lectureInfo: ctx.lectureInfo ?? null,
        // 口頭試問型の小問集合。ここに足さないと、保存されていても
        // 講師の画面に設問が出ない（許可リスト漏れは沈黙失敗になる）
        oralExam: ctx.oralExam ?? null,
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
  linkedThreadId: string | undefined
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
          submittedMs && tMs
            ? Math.abs(tMs - submittedMs)
            : Number.POSITIVE_INFINITY;
        const threadTopic = normalizeTopic(t.topic);
        const byTopic = wantTopic.length > 0 && threadTopic === wantTopic;
        // 両方にお題があって食い違うなら、時間が近くても別の問題の会話。
        // これが無いと「5時間後に始めた別テーマの会話」を拾ってしまう。
        const topicConflict =
          wantTopic.length > 0 &&
          threadTopic.length > 0 &&
          threadTopic !== wantTopic;
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
      a.byTopic !== b.byTopic ? (a.byTopic ? -1 : 1) : a.distance - b.distance
    );
    return scored.slice(0, 3).map((x) => x.thread);
  } catch (err) {
    console.warn("[admin/essay] coach threads fetch failed:", err);
    return [];
  }
}

type PatchBody =
  | { action: "hide"; key: string }
  | { action: "unhide"; key: string; text: string }
  | { action: "scores"; scores: Record<string, unknown>; reason?: string }
  | { action: "resetScores" };

/**
 * PATCH /api/admin/students/[id]/essays/[essayId]
 * 先生の手直し。指摘を外す・戻す、点を直す・AIの点に戻す。
 * 点を直したら scores を上書きする（ランク・平均・グラフ・アラートが全部そのまま追従する）。
 * 最初の AI の点は teacherEdits.score.aiScores に残し、何度直しても上書きしない。
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id: studentId, essayId } = await params;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const db = adminDb;

  // 答案詳細の GET と同じゲート
  const scopeDoc = await db.doc(`users/${studentId}`).get();
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

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }
  const callerDoc = await db.doc(`users/${auth.uid}`).get();
  const byName = (callerDoc.data()?.displayName as string) ?? "担当者";
  const now = new Date().toISOString();
  const ref = db.doc(`essays/${essayId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (!data || data.userId !== studentId) {
        return { status: 404, error: "答案が見つかりません" } as const;
      }
      const edits = (data.teacherEdits ?? {}) as TeacherEdits;

      if (body.action === "hide" || body.action === "unhide") {
        const hidden = [...(edits.hidden ?? [])];
        if (body.action === "hide") {
          // 文面はサーバーで引き直す（画面から送られた文面は信用しない）
          const feedback = feedbackWithDerivedIssues(
            (data.feedback ?? {}) as EssayFeedback,
            data.sentenceCheck,
            { partial: isPartialEssay(data) }
          );
          const item = listFeedbackItems(feedback).find(
            (i) => i.key === body.key
          );
          if (!item) {
            return { status: 404, error: "その指摘が見つかりません" } as const;
          }
          if (!hidden.some((h) => h.key === item.key && h.text === item.text)) {
            hidden.push({
              key: item.key,
              text: item.text,
              by: auth.uid,
              byName,
              at: now,
            });
          }
        } else {
          const i = hidden.findIndex(
            (h) => h.key === body.key && h.text === body.text
          );
          if (i >= 0) hidden.splice(i, 1);
        }
        tx.update(ref, { "teacherEdits.hidden": hidden });
        return { status: 200 } as const;
      }

      const scores = data.scores as EssayScores | undefined;
      if (!scores) {
        return { status: 400, error: "点数のない答案です" } as const;
      }

      if (body.action === "resetScores") {
        if (!edits.score) return { status: 200 } as const;
        tx.update(ref, {
          scores: edits.score.aiScores,
          "teacherEdits.score": FieldValue.delete(),
        });
        return { status: 200, rank: true } as const;
      }

      if (body.action === "scores") {
        // 旧採点（独自性の軸）と満点40の答案は、今の計算で合計を出し直せないので直させない
        const max = (data.feedback?.scoreMaximum as number | undefined) ?? 50;
        if (isLegacyEssayScores(scores) || (max !== 50 && max !== 60)) {
          return {
            status: 400,
            error: "この答案は採点方式が古いため、点を直せません",
          } as const;
        }
        const next = applyTeacherScores(scores, body.scores ?? {});
        const scoreEdit: TeacherScoreEdit = {
          aiScores: edits.score?.aiScores ?? scores,
          by: auth.uid,
          byName,
          at: now,
          reason: String(body.reason ?? "").slice(0, 500),
        };
        tx.update(ref, { scores: next, "teacherEdits.score": scoreEdit });
        return { status: 200, rank: true } as const;
      }
      return { status: 400, error: "不明な操作です" } as const;
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { error: "error" in result ? result.error : "失敗しました" },
        { status: result.status }
      );
    }
    // ランク（users.currentSkillRank）は提出時にしか作り直されないので、ここで作り直す
    if ("rank" in result && result.rank) {
      await refreshEssayAggregateCache(studentId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/essay] patch failed:", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
