import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

interface SuggestRequest {
  interests: string[];
  strengths: string[];
  activities: string[];
  futureGoal: string;
}

interface SuggestResult {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  admissionPolicy: string;
  matchScore: number;
  matchReasons: string[];
}

const INTEREST_KEYWORDS: Record<string, string[]> = {
  "法律・政治": ["法", "政治", "法律", "法学", "公共", "ガバナンス", "行政", "司法"],
  "ビジネス・経済": ["経済", "経営", "商", "ビジネス", "マーケティング", "会計", "起業", "金融", "産業"],
  "国際・異文化": ["国際", "異文化", "グローバル", "多文化", "外国語", "英語", "留学", "海外"],
  "理工・情報": ["理工", "情報", "工学", "数学", "物理", "化学", "技術", "プログラミング", "AI", "データ"],
  "社会・福祉": ["社会", "福祉", "コミュニティ", "地域", "共生", "ソーシャル", "NPO"],
  "教育": ["教育", "学習", "指導", "教員", "教師", "教職", "児童", "生涯学習"],
  "文学・人文": ["文学", "人文", "歴史", "哲学", "文化", "芸術", "言語", "思想", "表現"],
  "環境・農学": ["環境", "農", "生態", "持続可能", "SDGs", "自然", "生物"],
  "医療・健康": ["医", "健康", "看護", "保健", "スポーツ", "リハビリ", "薬"],
};

const STRENGTH_KEYWORDS: Record<string, string[]> = {
  "リーダーシップ": ["リーダー", "主体的", "牽引", "統率", "リーダーシップ", "先導"],
  "語学力": ["語学", "英語", "外国語", "バイリンガル", "英語運用", "言語"],
  "論理的思考": ["論理", "分析", "思考力", "批判的", "クリティカル", "読解力"],
  "課題解決力": ["課題解決", "問題解決", "実践的", "ソリューション", "提案"],
  "コミュニケーション力": ["コミュニケーション", "対話", "協働", "発信", "プレゼン", "表現力"],
  "創造性": ["創造", "独創", "クリエイティブ", "発想", "イノベーション", "新しい"],
  "研究力": ["研究", "探究", "学術", "調査", "フィールドワーク", "論文"],
  "協調性": ["協調", "チーム", "協力", "連携", "多様", "共同"],
};

const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  "ボランティア": ["ボランティア", "社会貢献", "奉仕", "支援活動"],
  "部活動": ["部活", "スポーツ", "大会", "選手", "競技"],
  "留学・国際交流": ["留学", "国際交流", "海外", "異文化体験", "国際バカロレア"],
  "研究・論文": ["研究", "論文", "学術", "探究活動", "科学"],
  "コンテスト・大会": ["コンテスト", "入賞", "受賞", "大会", "オリンピック"],
  "生徒会・リーダー": ["生徒会", "リーダー", "委員長", "代表", "主将"],
  "起業・ビジネス": ["起業", "ビジネス", "経営", "プラン", "商品開発"],
  "地域活動": ["地域", "まちづくり", "コミュニティ", "地方創生", "フィールドワーク"],
};

function scoreAP(ap: string, answers: SuggestRequest): { score: number; reasons: string[] } {
  const apLower = ap.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  for (const interest of answers.interests) {
    const keywords = INTEREST_KEYWORDS[interest] || [];
    const matched = keywords.filter((kw) => apLower.includes(kw));
    if (matched.length > 0) {
      score += 30 * Math.min(matched.length, 3);
      reasons.push(`関心分野「${interest}」と合致`);
    }
  }

  for (const strength of answers.strengths) {
    const keywords = STRENGTH_KEYWORDS[strength] || [];
    const matched = keywords.filter((kw) => apLower.includes(kw));
    if (matched.length > 0) {
      score += 20 * Math.min(matched.length, 2);
      reasons.push(`強み「${strength}」が求められている`);
    }
  }

  for (const activity of answers.activities) {
    const keywords = ACTIVITY_KEYWORDS[activity] || [];
    const matched = keywords.filter((kw) => apLower.includes(kw));
    if (matched.length > 0) {
      score += 15 * Math.min(matched.length, 2);
      reasons.push(`活動「${activity}」が評価される`);
    }
  }

  if (answers.futureGoal) {
    const goalWords = answers.futureGoal
      .split(/[\s、。,.\u3000]+/)
      .filter((w) => w.length >= 2);
    const goalMatched = goalWords.filter((w) => apLower.includes(w));
    if (goalMatched.length > 0) {
      score += 25 * Math.min(goalMatched.length, 3);
      reasons.push(`将来の目標とAPが一致`);
    }
  }

  return { score, reasons: [...new Set(reasons)] };
}

export async function POST(request: NextRequest) {
  const body: SuggestRequest = await request.json();

  let universities: University[] = MOCK_UNIVERSITIES;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "universities"));
      if (!snap.empty) {
        universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
      }
    } catch {
      // fall through to mock data
    }
  }

  const results: SuggestResult[] = [];

  for (const uni of universities) {
    for (const faculty of uni.faculties) {
      const { score, reasons } = scoreAP(faculty.admissionPolicy, body);
      if (score > 0) {
        results.push({
          universityId: uni.id,
          universityName: uni.name,
          facultyId: faculty.id,
          facultyName: faculty.name,
          admissionPolicy: faculty.admissionPolicy,
          matchScore: Math.min(100, score),
          matchReasons: reasons,
        });
      }
    }
  }

  results.sort((a, b) => b.matchScore - a.matchScore);

  return NextResponse.json({
    results: results.slice(0, 15),
    totalAnalyzed: universities.reduce((sum, u) => sum + u.faculties.length, 0),
  });
}
