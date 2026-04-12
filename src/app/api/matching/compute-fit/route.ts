/**
 * 出願要件を満たす大学の中で、自己分析 + チャット希望と各大学 AP の適合度を
 * Claude に 1 回のリクエストで一括算出するエンドポイント。
 *
 * フロー:
 * 1. ユーザーの自己分析を Firestore から取得
 * 2. 全大学を取得 → matchUniversities() で要件チェック
 * 3. 要件 OK (matchScore >= 60) の学部だけ抽出
 * 4. 全学部の AP を 1 プロンプトにまとめて Claude に投げる
 * 5. JSON で [{ id, score, reason }] を返させる
 * 6. 結果を Firestore matchingCache/{uid} に保存
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { matchUniversities } from "@/lib/matching/engine";
import type { MatchingRequest } from "@/lib/types/matching";
import type { University } from "@/lib/types/university";

interface FitResultItem {
  id: string;
  score: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const { preferences } = await request.json();
  if (!preferences || typeof preferences !== "string") {
    return NextResponse.json({ error: "preferences は必須です" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API キー未設定" }, { status: 503 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 1. 自己分析取得
  let selfAnalysisSummary = "（自己分析未実施）";
  try {
    const saDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (saDoc.exists) {
      const sa = saDoc.data()!;
      const parts: string[] = [];
      if (sa.values?.coreValues?.length) parts.push(`価値観: ${sa.values.coreValues.join("、")}`);
      if (sa.strengths?.strengths?.length) parts.push(`強み: ${sa.strengths.strengths.join("、")}`);
      if (sa.interests?.fields?.length) parts.push(`興味分野: ${sa.interests.fields.join("、")}`);
      if (sa.vision?.longTermVision) parts.push(`将来像: ${sa.vision.longTermVision}`);
      if (sa.identity?.selfStatement) parts.push(`自己紹介: ${sa.identity.selfStatement}`);
      if (parts.length > 0) selfAnalysisSummary = parts.join("\n");
    }
  } catch (err) {
    console.warn("[compute-fit] selfAnalysis fetch failed", err);
  }

  // 2. ユーザープロフィール + 大学一覧
  const userDoc = await adminDb.doc(`users/${uid}`).get();
  const userData = userDoc.data() ?? {};
  const profile: MatchingRequest = {};
  if (typeof userData.gpa === "number") profile.gpa = userData.gpa;
  if (Array.isArray(userData.englishCerts) && userData.englishCerts.length > 0) {
    profile.englishCerts = userData.englishCerts;
  }

  let universities: University[] = [];
  try {
    const snap = await adminDb.collection("universities").get();
    universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
  } catch {
    const { MOCK_UNIVERSITIES } = await import("@/lib/matching/mockData");
    universities = MOCK_UNIVERSITIES;
  }

  // 3. 要件チェック → OK (matchScore >= 60) だけ抽出
  const allResults = await matchUniversities(profile, universities);
  const eligible = allResults.filter((r) => r.matchScore >= 60);

  if (eligible.length === 0) {
    return NextResponse.json({
      results: [],
      message: "出願要件を満たす大学がありません。GPA や英語資格を確認してください。",
    });
  }

  // 4. Claude に 1 回で一括判定
  const facultyList = eligible.map((r) => ({
    id: `${r.universityId}:${r.facultyId}`,
    name: `${r.universityName} ${r.facultyName}`,
    ap: r.admissionPolicy.slice(0, 300),
  }));

  const client = new Anthropic();

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    system: `あなたは大学受験の専門カウンセラーです。
受験生のプロフィール（自己分析結果と大学選びの希望）と、各大学学部のアドミッションポリシー（AP）を照合し、適合度を判定してください。

評価基準:
- 受験生の価値観・興味分野・将来像と AP の方向性がどの程度一致しているか
- 受験生のチャットで述べた希望（環境・特徴・雰囲気等）と大学の特色の一致
- 90-100: 非常に高い適合（価値観と AP がほぼ完全一致）
- 70-89: 高い適合（主要な点が一致）
- 50-69: 中程度（部分的に一致）
- 30-49: 低い適合
- 0-29: ほぼ不一致

必ず以下の JSON 配列のみを返してください（他のテキストは不要）:
[{"id":"大学ID:学部ID","score":数値,"reason":"日本語で1-2文の根拠"}]`,
    messages: [
      {
        role: "user",
        content: `## 受験生の自己分析
${selfAnalysisSummary}

## 受験生の大学選びの希望
${preferences}

## 判定対象の学部一覧 (${facultyList.length}件)
${facultyList.map((f) => `- [${f.id}] ${f.name}\nAP: ${f.ap}`).join("\n\n")}

上記の各学部について適合度を JSON 配列で返してください。`,
      },
    ],
  });

  const responseText = res.content[0].type === "text" ? res.content[0].text : "[]";

  // JSON 抽出 (コードブロックに入っている場合も対応)
  let fitResults: FitResultItem[] = [];
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      fitResults = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[compute-fit] JSON parse failed", err, responseText.slice(0, 500));
  }

  // 5. MatchResult に apFitScore を付与
  const resultsWithFit = allResults.map((r) => {
    const key = `${r.universityId}:${r.facultyId}`;
    const fit = fitResults.find((f) => f.id === key);
    const isEligible = r.matchScore >= 60;

    let fitRecommendation: "ぴったり校" | "おすすめ校" | "検討校" | "要件不足";
    if (!isEligible) {
      fitRecommendation = "要件不足";
    } else if (fit && fit.score >= 80) {
      fitRecommendation = "ぴったり校";
    } else if (fit && fit.score >= 60) {
      fitRecommendation = "おすすめ校";
    } else {
      fitRecommendation = "検討校";
    }

    return {
      ...r,
      apFitScore: fit?.score,
      apFitReason: fit?.reason,
      fitRecommendation,
    };
  });

  // apFitScore 順 (undefined は末尾)、要件不足はさらに末尾
  resultsWithFit.sort((a, b) => {
    const aEligible = a.matchScore >= 60 ? 1 : 0;
    const bEligible = b.matchScore >= 60 ? 1 : 0;
    if (aEligible !== bEligible) return bEligible - aEligible;
    return (b.apFitScore ?? -1) - (a.apFitScore ?? -1);
  });

  // 6. Firestore にキャッシュ
  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.doc(`users/${uid}/matchingCache/latest`).set({
      results: resultsWithFit,
      preferences,
      computedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn("[compute-fit] cache save failed", err);
  }

  return NextResponse.json({
    results: resultsWithFit,
    totalUniversities: universities.length,
    matchedCount: resultsWithFit.filter((r) => r.matchScore >= 60).length,
    fitComputedCount: fitResults.length,
  });
}
