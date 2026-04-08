import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import type { StudyPlanTask, StudyPlanResponse } from "@/lib/types/study-plan";

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const authData = await verifyAuthToken(request);
    if (!authData) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
    }

    const userId = authData.uid;

    // ユーザーの学習データを取得
    const [userDoc, essaysSnapshot, interviewsSnapshot, documentsSnapshot] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .orderBy("submittedAt", "desc")
        .limit(5)
        .get(),
      adminDb
        .collection("interviews")
        .where("userId", "==", userId)
        .orderBy("startedAt", "desc")
        .limit(3)
        .get(),
      adminDb
        .collection(`users/${userId}/documents`)
        .where("status", "!=", "final")
        .get(),
    ]);

    const userData = userDoc.data();
    const essays = essaysSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const interviews = interviewsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const documents = documentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // AIで学習計画を生成（モック対応）
    let studyPlan: StudyPlanResponse;

    if (process.env.NODE_ENV === "development" || !process.env.ANTHROPIC_API_KEY) {
      // 開発環境またはAPIキー未設定：モックデータ
      studyPlan = generateMockStudyPlan(userData, essays, interviews, documents);
    } else {
      // 本番環境：Claude API呼び出し
      const prompt = buildStudyPlanPrompt(userData, essays, interviews, documents);

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        throw new Error("Claude API呼び出しに失敗しました");
      }

      const claudeData = await claudeResponse.json();
      const content = claudeData.content[0]?.text || "";

      // JSON部分を抽出
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        // モックデータにフォールバック
        studyPlan = generateMockStudyPlan(userData, essays, interviews, documents);
      } else {
        const parsed = JSON.parse(jsonMatch[1]);
        studyPlan = {
          ...parsed,
          generatedAt: new Date().toISOString(),
        };
      }
    }

    return NextResponse.json(studyPlan);

  } catch (error) {
    console.error("Study plan generation error:", error);
    return NextResponse.json(
      { error: "学習計画の生成に失敗しました" },
      { status: 500 }
    );
  }
}

function buildStudyPlanPrompt(
  userData: any,
  essays: any[],
  interviews: any[],
  documents: any[]
): string {
  const recentEssayScores = essays.map((e) => e.overallScore || 0);
  const recentInterviewScores = interviews.map((i) => i.overallScore || 0);
  const avgEssayScore = recentEssayScores.length > 0
    ? recentEssayScores.reduce((a, b) => a + b, 0) / recentEssayScores.length
    : 0;
  const avgInterviewScore = recentInterviewScores.length > 0
    ? recentInterviewScores.reduce((a, b) => a + b, 0) / recentInterviewScores.length
    : 0;

  return `あなたは総合型選抜の学習支援コーチです。生徒の現在の状況に基づいて、今日取り組むべき学習タスクを3-5件提案してください。

## 生徒の状況
志望校: ${userData?.targetUniversities?.map((u: any) => u.name).join("、") || "未設定"}
直近の小論文スコア: ${avgEssayScore.toFixed(1)}点（${recentEssayScores.length}件）
直近の面接スコア: ${avgInterviewScore.toFixed(1)}点（${recentInterviewScores.length}件）
未完成書類: ${documents.length}件
弱点分野: ${userData?.weaknesses?.slice(0, 3).join("、") || "分析中"}

## タスク生成ルール
1. スコアが低い分野を優先的に改善
2. 出願期限が近い書類を優先
3. 実行可能で具体的なタスク
4. 各タスクに適切なアプリ内リンクを設定

## 出力形式
\`\`\`json
{
  "tasks": [
    {
      "type": "essay" | "drill" | "document" | "interview" | "university",
      "title": "具体的なタスク名",
      "description": "詳細な説明",
      "link": "/student/適切なパス",
      "reason": "なぜこのタスクが重要か",
      "priority": "high" | "medium" | "low"
    }
  ],
  "encouragement": "生徒への励ましメッセージ"
}
\`\`\``;
}

function generateMockStudyPlan(
  userData: any,
  essays: any[],
  interviews: any[],
  documents: any[]
): StudyPlanResponse {
  const tasks: StudyPlanTask[] = [];

  // 小論文スコアが低い場合
  const avgEssayScore = essays.length > 0
    ? essays.reduce((sum, e) => sum + (e.overallScore || 0), 0) / essays.length
    : 50;

  if (avgEssayScore < 70) {
    tasks.push({
      type: "essay",
      title: "構成力強化の小論文練習",
      description: "論理的な構成を意識した小論文を1本書いてみましょう",
      link: "/student/essay/new",
      reason: "最近の小論文で構成力にやや課題が見られるため",
      priority: "high",
    });
  }

  // 面接スコアが低い場合
  const avgInterviewScore = interviews.length > 0
    ? interviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / interviews.length
    : 50;

  if (avgInterviewScore < 75) {
    tasks.push({
      type: "drill",
      title: "志望理由の模擬面接",
      description: "志望理由を明確に伝える練習をしましょう",
      link: "/student/interview/new",
      reason: "面接でより説得力のある志望理由を伝えるため",
      priority: "high",
    });
  }

  // 未完成書類がある場合
  if (documents.length > 0) {
    tasks.push({
      type: "document",
      title: `${documents[0]?.type || "書類"}の推敲`,
      description: "下書きをもう一度見直して、文章を改善しましょう",
      link: `/student/documents/${documents[0]?.id || ""}`,
      reason: "出願期限に向けて書類の完成度を高めるため",
      priority: "high",
    });
  }

  // デフォルトタスクを追加
  if (tasks.length < 3) {
    tasks.push({
      type: "university",
      title: "志望校の最新情報チェック",
      description: "志望校の募集要項や入試情報を確認しましょう",
      link: "/student/universities",
      reason: "入試情報の変更に対応するため",
      priority: "medium",
    });

    tasks.push({
      type: "essay",
      title: "時事問題の小論文練習",
      description: "最近の社会問題についての小論文を書いてみましょう",
      link: "/student/essay/new",
      reason: "幅広いテーマへの対応力を身につけるため",
      priority: "low",
    });
  }

  const encouragements = [
    "今日も一歩ずつ前進しましょう！",
    "継続は力なり。あなたの努力は必ず実を結びます",
    "着実に成長していますね。この調子で頑張りましょう",
    "目標に向かって一緒に歩んでいきましょう",
    "今日の積み重ねが未来を作ります",
  ];

  return {
    tasks: tasks.slice(0, 4), // 最大4つまで
    encouragement: encouragements[Math.floor(Math.random() * encouragements.length)],
    generatedAt: new Date().toISOString(),
  };
}