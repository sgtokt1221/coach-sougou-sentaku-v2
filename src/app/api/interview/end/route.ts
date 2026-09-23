import { NextRequest, NextResponse } from "next/server";
import type {
  InterviewEndRequest,
  InterviewScores,
  InterviewFeedback,
} from "@/lib/types/interview";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import {
  activeWeaknesses,
  loadWeaknessRecords,
  saveWeaknessRecords,
  type LoadedWeaknesses,
} from "@/lib/growth/weakness-store";
import type { WeaknessRecord } from "@/lib/types/growth";
import { logInterviewSession } from "@/lib/bigquery/logger";
import { logActivity } from "@/lib/firebase/activity-log";
import {
  scoreInterviewCore,
  InterviewScoreParseError,
} from "@/lib/interview/score-core";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: InterviewEndRequest & {
      mode?: string;
      presentationContent?: string;
    } = await request.json();
    const {
      sessionId,
      messages,
      duration,
      transcription,
      voiceAnalysis,
      videoAnalysis,
      appearanceAnalysis,
      mode,
      presentationContent,
    } = body;

    /**
     * 誰の面接かはトークンからだけ決める。
     *
     * 以前は body.userId を優先していたため、他人の uid を入れれば
     * その生徒の弱点DBと宿題の状態を書き換えられた。
     */
    let userId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { adminAuth } = await import("@/lib/firebase/admin");
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
          userId = decoded.uid;
        }
      } catch (authErr) {
        console.warn("[interview/end] Failed to verify ID token:", authErr);
      }
    }
    // dev mode fallback
    if (!userId && process.env.NODE_ENV === "development") {
      const devRole = request.headers.get("X-Dev-Role");
      if (devRole) userId = "dev-user";
    }

    if (!sessionId || !messages || duration === undefined) {
      return NextResponse.json(
        { error: "sessionId, messages, duration は必須です" },
        { status: 400 }
      );
    }

    let existingWeaknesses: WeaknessRecord[] = [];
    /** 読めたときだけ弱点を更新する（読めずに空から更新すると、既存を回数1で上書きする） */
    let loadedWeaknesses: LoadedWeaknesses | null = null;
    let universityName = "（大学名未設定）";
    let facultyName = "（学部名未設定）";
    let admissionPolicy = "（AP未設定）";
    let selfAnalysisContext = "";
    let sessionUniversityId = "";
    let sessionFacultyId = "";
    let sessionMode = mode ?? "";
    let homeworkAssignmentIdFromSession: string | undefined;
    /** 口頭試問の出題分野（開始時に保存したもの）。採点でも同じ分野で見る */
    let sessionOralExam: { subject: string; scope?: string } | undefined;
    /** 面接の開始時刻（ISO）。BigQuery に開始時刻として入れる */
    let sessionStartedAt: string | undefined;
    /**
     * 採点に使う会話。サーバーに残っている記録を正本にする（監査 P0-3）。
     * クライアントから送られた messages をそのまま採点していたため、
     * 差し替えても欠落させても検出できなかった。
     */
    let scoringMessages = messages;
    let messageSource: "server" | "client" = "client";

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        // セッション情報から大学コンテキストを取得
        const sessionDoc = await adminDb.doc(`interviews/${sessionId}`).get();
        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data()!;
          // 他人の面接を締めて採点結果を書き込ませない
          if (
            sessionData.userId &&
            userId &&
            sessionData.userId !== userId &&
            userId !== "dev-user"
          ) {
            return NextResponse.json(
              { error: "この面接を終了する権限がありません" },
              { status: 403 }
            );
          }
          sessionUniversityId = sessionData.universityId ?? "";
          sessionFacultyId = sessionData.facultyId ?? "";
          // モードもセッション側を優先する（別モードの基準で採点させない）
          if (sessionData.mode) sessionMode = sessionData.mode;
          const stored = sessionData.messages;
          if (Array.isArray(stored) && stored.length > 0) {
            scoringMessages = stored;
            messageSource = "server";
          } else {
            // 保存前に始まったセッションはクライアントの記録で採点する
            console.warn(
              `[interview/end] ${sessionId}: サーバーに会話が無いためクライアント送信分で採点する`
            );
          }
          if (typeof sessionData.homeworkAssignmentId === "string") {
            homeworkAssignmentIdFromSession = sessionData.homeworkAssignmentId;
          }
          if (sessionData.oralExam?.subject) {
            sessionOralExam = sessionData.oralExam;
          }
          // startedAt は Timestamp。文字列で入っている古いデータにも備える
          const startedAt = sessionData.startedAt;
          sessionStartedAt =
            startedAt?.toDate?.()?.toISOString() ??
            (typeof startedAt === "string" ? startedAt : undefined);
          const ctx = sessionData.universityContext;
          if (ctx) {
            universityName = ctx.universityName ?? universityName;
            facultyName = ctx.facultyName ?? facultyName;
            admissionPolicy = ctx.admissionPolicy ?? admissionPolicy;
          }
        }

        if (userId) {
          loadedWeaknesses = await loadWeaknessRecords(adminDb, userId);
          existingWeaknesses = activeWeaknesses(loadedWeaknesses.records);

          // 自己分析データ取得
          try {
            const saDoc = await adminDb.doc(`selfAnalysis/${userId}`).get();
            if (saDoc.exists) {
              const sa = saDoc.data()!;
              const parts: string[] = [];
              if (sa.values?.coreValues)
                parts.push(`価値観: ${sa.values.coreValues.join("、")}`);
              if (sa.strengths?.strengths)
                parts.push(`強み: ${sa.strengths.strengths.join("、")}`);
              if (sa.strengths?.evidences)
                parts.push(`強みの根拠: ${sa.strengths.evidences.join(" / ")}`);
              if (sa.weaknesses?.weaknesses)
                parts.push(`課題: ${sa.weaknesses.weaknesses.join("、")}`);
              if (sa.weaknesses?.growthStories)
                parts.push(
                  `克服エピソード: ${sa.weaknesses.growthStories.join(" / ")}`
                );
              if (sa.interests?.fields)
                parts.push(`関心分野: ${sa.interests.fields.join("、")}`);
              if (sa.vision?.shortTermGoal)
                parts.push(`短期目標: ${sa.vision.shortTermGoal}`);
              if (sa.vision?.longTermVision)
                parts.push(`長期ビジョン: ${sa.vision.longTermVision}`);
              if (sa.identity?.selfStatement)
                parts.push(`自己像: ${sa.identity.selfStatement}`);
              if (sa.identity?.apConnection)
                parts.push(`AP接続: ${sa.identity.apConnection}`);
              if (parts.length > 0) {
                selfAnalysisContext = parts.join("\n");
              }
            }
          } catch {
            // 自己分析データなくても続行
          }
        }
      } catch (err) {
        console.warn("Failed to fetch data from Firestore:", err);
      }
    }

    // 面接スコアリングをコア関数経由で呼ぶ (宿題提出フローからも同じ関数を呼ぶ)
    let scores: InterviewScores;
    let feedback: InterviewFeedback;
    let conversationSummary: {
      keyWeaknesses: string[];
      strongPoints: string[];
      criticalMoments: string[];
      nextFocusAreas: string[];
    };
    try {
      /**
       * 同一モードの前回結果を渡す（監査 P1-2）。
       * 渡さないまま前回比を求めると、モデルが比較を作文する。
       */
      let previousAttempt:
        | {
            scores: {
              clarity: number;
              apAlignment: number;
              enthusiasm: number;
              specificity: number;
            };
            feedbackSummary: string[];
          }
        | undefined;
      if (adminDb && userId) {
        try {
          const prevSnap = await adminDb
            .collection("interviews")
            .where("userId", "==", userId)
            .where("status", "==", "completed")
            .get();
          const prev = prevSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
            .filter(
              (x) =>
                x.id !== sessionId &&
                (x.mode ?? "") === sessionMode &&
                x.scores != null
            )
            .sort((a, b) => {
              const ta =
                (a.completedAt as { toMillis?: () => number })?.toMillis?.() ??
                0;
              const tb =
                (b.completedAt as { toMillis?: () => number })?.toMillis?.() ??
                0;
              return tb - ta;
            })[0];
          if (prev) {
            const ps = prev.scores as Record<string, number>;
            const pf = prev.feedback as
              | { overall?: string; improvements?: string[] }
              | undefined;
            previousAttempt = {
              scores: {
                clarity: ps.clarity ?? 0,
                apAlignment: ps.apAlignment ?? 0,
                enthusiasm: ps.enthusiasm ?? 0,
                specificity: ps.specificity ?? 0,
              },
              feedbackSummary: [pf?.overall ?? "", ...(pf?.improvements ?? [])]
                .filter(Boolean)
                .slice(0, 5),
            };
          }
        } catch (err) {
          console.warn("[interview/end] 前回結果の取得に失敗:", err);
        }
      }

      const coreResult = await scoreInterviewCore({
        messages: scoringMessages,
        universityName,
        facultyName,
        admissionPolicy,
        mode: sessionMode || mode,
        presentationContent,
        ...(sessionOralExam ? { oralExam: sessionOralExam } : {}),
        selfAnalysisContext,
        videoAnalysis,
        ...(previousAttempt ? { previousAttempt } : {}),
      });
      scores = coreResult.scores;
      feedback = coreResult.feedback;
      conversationSummary = coreResult.conversationSummary;
    } catch (coreErr) {
      if (coreErr instanceof InterviewScoreParseError) {
        console.error(
          "Interview score parse failed. rawText head:",
          coreErr.rawText.slice(0, 800)
        );
        return NextResponse.json(
          {
            error: "AI評価結果のパースに失敗しました",
            rawResponse: coreErr.rawText.slice(0, 500),
          },
          { status: 500 }
        );
      }
      if (
        coreErr instanceof Error &&
        coreErr.message.includes("ANTHROPIC_API_KEY")
      ) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEYが設定されていません" },
          { status: 500 }
        );
      }
      throw coreErr;
    }

    /**
     * 弱点タグ（会話内容）。弱点として挙がったものだけを使う。
     * improvements（助言の自由文）を混ぜると、正規化の部分一致で
     * 誰にでも付く弱点に落ちる（小論文添削と同じ理由）。
     */
    const weaknessTags: string[] = feedback.repeatedIssues.map(
      (issue) => issue.area
    );

    // VideoAnalysis → 弱点タグ
    if (videoAnalysis) {
      if (videoAnalysis.eyeContactRate < 40) weaknessTags.push("視線が散漫");
      if (videoAnalysis.smileRate < 10) weaknessTags.push("表情が硬い");
      if (videoAnalysis.positionStability < 0.5)
        weaknessTags.push("姿勢が不安定");
      if (videoAnalysis.avgHeadTilt > 10) weaknessTags.push("首が傾きがち");
      if (videoAnalysis.nodRate < 2) weaknessTags.push("うなずきが少��い");
    }

    // AppearanceAnalysis → 弱点タグ（critical/warningのみ���
    if (appearanceAnalysis?.issues) {
      for (const issue of appearanceAnalysis.issues) {
        if (issue.severity === "critical" || issue.severity === "warning") {
          weaknessTags.push(`身だしなみ: ${issue.description}`);
        }
      }
    }

    // AI が出力した category を hint として伝播
    const categoryHints = new Map<
      string,
      | "structure"
      | "logic"
      | "expression"
      | "apAlignment"
      | "originality"
      | "other"
    >();
    for (const issue of feedback.repeatedIssues ?? []) {
      const cat = (issue as { category?: string }).category;
      if (
        cat === "structure" ||
        cat === "logic" ||
        cat === "expression" ||
        cat === "apAlignment" ||
        cat === "originality" ||
        cat === "other"
      ) {
        categoryHints.set(issue.area, cat);
      }
    }

    /** 弱点の具体例（「この発言がこう弱い」）。ラベルだけでは中身が分からない */
    const detailHints = new Map<string, string>();
    for (const issue of feedback.repeatedIssues ?? []) {
      const message = (issue as { message?: string }).message?.trim();
      if (message) detailHints.set(issue.area, message);
    }

    const updatedWeaknesses = updateWeaknessRecords(
      loadedWeaknesses?.records ?? [],
      weaknessTags,
      { source: "interview", categoryHints, detailHints }
    );
    const growthEvents = analyzeGrowth(
      weaknessTags,
      existingWeaknesses,
      "interview"
    );

    /**
     * 褒めイベント。
     *
     * 閾値が 40 だった（内容4軸の満点）。満点でしか出ないため実質死んでいた。
     * 結果画面が「良い」と見なす水準（32/40 = 8割）に合わせる。
     */
    if (scores.total >= 32) {
      growthEvents.unshift({
        type: "praise",
        area: "overall",
        message:
          "素晴らしい面接でした！全体的に高いレベルの回答ができています。",
      });
    }

    /**
     * 保存できたか。
     *
     * 以前は保存に失敗しても warn だけで 200 を返していた。生徒の画面には
     * 結果が出るのに履歴には残らず、status も in_progress のままになる
     * （進行中一覧に居座る）。成否を返して画面で知らせる。
     */
    let saved = false;
    if (adminDb) {
      try {
        const { FieldValue } = await import("firebase-admin/firestore");
        // update だと開始時の保存が失敗していたセッションで NOT_FOUND になり、
        // 採点結果ごと落ちる。作り直してでも残す
        await adminDb.doc(`interviews/${sessionId}`).set(
          {
            userId: userId ?? null,
            scores,
            feedback,
            conversationSummary,
            // 結果画面が再訪時にも同じ内容を出せるように、表示に使うものを保存する
            growthEvents,
            universityContext: { universityName, facultyName, admissionPolicy },
            universityName,
            facultyName,
            // 採点に使ったものをそのまま残す（後から根拠を辿れるようにする）
            messages: scoringMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            /** 採点した会話の出どころ。client は保存前に始まった古いセッション */
            scoringMessageSource: messageSource,
            weaknessTags,
            duration,
            status: "completed",
            completedAt: FieldValue.serverTimestamp(),
            ...(transcription ? { transcription } : {}),
            ...(voiceAnalysis ? { voiceAnalysis } : {}),
            ...(videoAnalysis ? { videoAnalysis } : {}),
            ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
          },
          { merge: true }
        );
        saved = true;

        // 宿題経由のセッションなら HomeworkAssignment を submitted に更新
        if (userId && homeworkAssignmentIdFromSession) {
          await adminDb
            .doc(
              `users/${userId}/homeworkAssignments/${homeworkAssignmentIdFromSession}`
            )
            .update({
              status: "submitted",
              submittedInterviewId: sessionId,
              submittedAt: FieldValue.serverTimestamp(),
            })
            .catch((e) =>
              console.warn(
                `[interview/end] homework update failed (${homeworkAssignmentIdFromSession}):`,
                e
              )
            );
        }

        if (userId && loadedWeaknesses) {
          await saveWeaknessRecords(
            adminDb,
            userId,
            loadedWeaknesses,
            updatedWeaknesses
          );
        }
      } catch (err) {
        console.error("Failed to save interview results to Firestore:", err);
      }
    }

    /**
     * スキル集計の作り直し。
     *
     * fire-and-forget にしていたが、サーバレスではレスポンス後に止められて
     * 取りこぼす（CLAUDE.md）。待ってから返す。
     */
    if (userId) {
      try {
        const { refreshInterviewAggregateCache } =
          await import("@/lib/skill-check/aggregate");
        await refreshInterviewAggregateCache(userId);
      } catch (e) {
        console.warn("[interview/end] aggregate refresh failed:", e);
      }
    }

    // BigQueryログ。fire-and-forget はレスポンス後に取りこぼすので待つ
    await logInterviewSession({
      interview_id: sessionId,
      user_id: userId ?? "unknown",
      university_id: sessionUniversityId,
      faculty_id: sessionFacultyId,
      // 開始時刻。ここで now を入れると全件が終了時刻になっていた
      started_at: sessionStartedAt ?? new Date().toISOString(),
      duration_seconds: duration,
      mode: sessionMode,
      score_clarity: scores.clarity,
      score_ap_alignment: scores.apAlignment,
      score_enthusiasm: scores.enthusiasm,
      score_specificity: scores.specificity,
      score_total: scores.total,
      score_maximum: scores.totalMax ?? 40,
      weakness_tags: weaknessTags,
      weakness_categories: weaknessTags.map(
        (tag) => categoryHints.get(tag) ?? categorizeWeakness(tag)
      ),
      // 採点に使った会話で数える（クライアント送信分とずれることがある）
      question_count: scoringMessages.filter((m) => m.role === "ai").length,
    }).catch((e) => console.warn("[interview/end] BigQuery ログ失敗:", e));

    // Activity log
    let studentDisplayName = "不明";
    if (userId) {
      try {
        const { adminDb: aDb } = await import("@/lib/firebase/admin");
        if (aDb) {
          const userDoc = await aDb.doc(`users/${userId}`).get();
          studentDisplayName = userDoc.data()?.displayName ?? "不明";
        }
      } catch {
        /* ignore */
      }
    }
    await logActivity("interview_complete", "模擬面接を完了しました", {
      studentName: studentDisplayName,
    }).catch((e) => console.warn("[interview/end] 活動ログ失敗:", e));

    return NextResponse.json({
      interviewId: sessionId,
      /** Firestore に残せたか。false なら履歴に出ない */
      saved,
      scores,
      feedback,
      conversationSummary,
      growthEvents,
      ...(voiceAnalysis ? { voiceAnalysis } : {}),
      ...(videoAnalysis ? { videoAnalysis } : {}),
      ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
      ...(transcription ? { transcription } : {}),
    });
  } catch (error) {
    console.error("Interview end error:", error);
    return NextResponse.json(
      { error: "面接終了処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
