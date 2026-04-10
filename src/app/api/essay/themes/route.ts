import { NextRequest, NextResponse } from "next/server";
import {
  essayThemes,
  getThemesByField,
  getThemesByDifficulty,
  calculateRecommendationScore,
  EssayTheme,
  fieldLabelMap
} from "@/data/essay-themes";
import { PAST_QUESTIONS, getPastQuestionsByUniversity, isActionableQuestion } from "@/data/essay-past-questions";

// 大学のAP情報を取得する関数（モック）
async function getUniversityAPs(universityId: string): Promise<string[]> {
  // 実際の実装では、Firestoreまたはadminデータベースから取得
  const mockUniversityAPs: Record<string, string[]> = {
    "kyoto": ["地域貢献", "国際協力", "文化保護", "環境問題", "技術革新"],
    "osaka": ["経済発展", "社会課題解決", "多文化共生", "イノベーション"],
    "waseda": ["グローバル化", "社会貢献", "学術研究", "人材育成"],
    "keio": ["実学", "社会連携", "国際性", "リーダーシップ"],
    "doshisha": ["良心", "国際主義", "自由主義", "キリスト教主義"]
  };

  return mockUniversityAPs[universityId] || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field") || "";
    const difficulty = searchParams.get("difficulty");
    const universityId = searchParams.get("universityId");

    let themes = essayThemes;

    // 分野フィルタリング
    if (field && field !== "all") {
      themes = getThemesByField(field);
    }

    // 難易度フィルタリング
    if (difficulty && difficulty !== "all") {
      const difficultyNum = parseInt(difficulty) as 1 | 2 | 3;
      if (difficultyNum >= 1 && difficultyNum <= 3) {
        themes = themes.filter(theme => theme.difficulty === difficultyNum);
      }
    }

    // 大学指定時のおすすめスコア計算
    let userAPs: string[] = [];
    if (universityId) {
      userAPs = await getUniversityAPs(universityId);
    }

    // おすすめスコアを計算してテーマに追加
    const themesWithScore = themes.map(theme => ({
      ...theme,
      recommendationScore: userAPs.length > 0
        ? calculateRecommendationScore(theme, userAPs)
        : 0
    }));

    // おすすめスコアでソート（高い順）
    if (userAPs.length > 0) {
      themesWithScore.sort((a, b) => b.recommendationScore - a.recommendationScore);
    }

    // 分野情報も返却
    const fields = Object.keys(fieldLabelMap).map(key => ({
      value: key,
      label: fieldLabelMap[key]
    }));

    // 過去問データ（生徒向け: 具体的な設問のみ表示）
    let pastQuestions = PAST_QUESTIONS.filter(isActionableQuestion);
    if (universityId) {
      pastQuestions = pastQuestions.filter((pq) => pq.universityId === universityId || pq.universityId === "");
    }
    if (field && field !== "all") {
      // テーマ側の英語field → 過去問の日本語fieldに変換してマッチング
      const fieldJpMap: Record<string, string[]> = {
        society: ["社会"],
        technology: ["AI・テクノロジー"],
        environment: ["環境"],
        education: ["教育"],
        economy: ["経済"],
        medical: ["医療"],
        politics: ["政治", "法律"],
        law: ["法律"],
        international: ["国際"],
      };
      const jpFields = fieldJpMap[field] ?? [];
      pastQuestions = pastQuestions.filter(
        (pq) => pq.field === field || jpFields.includes(pq.field)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        themes: themesWithScore,
        pastQuestions,
        fields,
        totalCount: themesWithScore.length,
        pastQuestionCount: pastQuestions.length,
        filters: {
          field: field || "all",
          difficulty: difficulty || "all",
          universityId: universityId || null
        },
        hasRecommendations: userAPs.length > 0
      }
    });

  } catch (error) {
    console.error("テーマ取得エラー:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "テーマの取得に失敗しました"
      },
      { status: 500 }
    );
  }
}