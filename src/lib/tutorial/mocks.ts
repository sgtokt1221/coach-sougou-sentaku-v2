/**
 * チュートリアル（/tour/*）モードで実 API を叩かずに返すモックレスポンス集。
 *
 * - キーは useAuthSWR / authFetch に渡される URL 文字列（クエリ含む完全一致）
 * - フォールバックとして、クエリを除いたパスでもマッチを試みる
 * - 本物の API レスポンス形式に合わせて作成（実画面の型期待を満たすため）
 */

const sessionDay2 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2); // 2 日後
const sessionDay9 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 9); // 9 日後
const sessionDay16 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 16); // 16 日後

const tourSessionPrimary = {
  id: "tour-session-1",
  studentId: "tour-demo-user",
  teacherId: "tour-teacher-1",
  teacherName: "コーチ田中",
  type: "coaching",
  scheduledAt: sessionDay2.toISOString(),
  duration: 60,
  meetLink: "https://meet.example.com/demo-1",
  status: "scheduled",
  sharedWithStudent: true,
};

const tourSessionSecondary = {
  id: "tour-session-2",
  studentId: "tour-demo-user",
  teacherId: "tour-teacher-1",
  teacherName: "コーチ田中",
  type: "mock_interview",
  scheduledAt: sessionDay9.toISOString(),
  duration: 45,
  status: "scheduled",
  sharedWithStudent: true,
};

const tourSessionTertiary = {
  id: "tour-session-3",
  studentId: "tour-demo-user",
  teacherId: "tour-teacher-1",
  teacherName: "コーチ田中",
  type: "essay_review",
  scheduledAt: sessionDay16.toISOString(),
  duration: 45,
  status: "scheduled",
  sharedWithStudent: true,
};

export const TUTORIAL_MOCK_API: Record<string, unknown> = {
  // ── ダッシュボード ──
  "/api/student/sessions/upcoming": {
    sessions: [tourSessionPrimary, tourSessionSecondary, tourSessionTertiary],
    session: tourSessionPrimary, // 後方互換
  },

  "/api/self-analysis?userId=me": {
    userId: "tour-demo-user",
    completedSteps: 3,
    isComplete: false,
    values: {
      summary: "人の役に立つこと、チームで何かを成し遂げること、誠実であること",
      examples: ["文化祭実行委員長として住民連携イベントを企画", "部活動で後輩指導"],
    },
    strengths: {
      summary: "論理的思考、リーダーシップ、粘り強さ",
      evidence: "文化祭で来場者を前年比 150% に増やした",
    },
    weaknesses: {
      summary: "プレゼンの緊張、時間管理",
      improvement: "週次で発表練習を継続",
    },
    interests: {},
    vision: {},
    identity: {},
    chatHistory: [],
    updatedAt: new Date().toISOString(),
  },

  "/api/skill-check/status": {
    needsRefresh: false,
    daysSinceLast: 5,
    currentCategory: "social-science",
    latestResult: {
      id: "tour-skill-1",
      rank: "B",
      category: "social-science",
      scores: { total: 38, logic: 9, structure: 8, expression: 8, ap: 8, depth: 5 },
      takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    history: [
      {
        id: "tour-skill-1",
        rank: "B",
        category: "social-science",
        scores: { total: 38, logic: 9, structure: 8, expression: 8, ap: 8, depth: 5 },
        takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: "tour-skill-2",
        rank: "C",
        category: "social-science",
        scores: { total: 32, logic: 7, structure: 7, expression: 7, ap: 6, depth: 5 },
        takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
      },
      {
        id: "tour-skill-3",
        rank: "C",
        category: "social-science",
        scores: { total: 28, logic: 6, structure: 6, expression: 6, ap: 5, depth: 5 },
        takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65).toISOString(),
      },
    ],
    aggregate: {
      attempts: 3,
      bestRank: "B",
      averageTotal: 36,
    },
  },

  "/api/interview-skill-check/status": {
    needsRefresh: false,
    daysSinceLast: 7,
    latestResult: {
      id: "tour-iv-skill-1",
      rank: "B",
      scores: { total: 30, clarity: 8, ap: 8, passion: 7, specificity: 7 },
      takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    history: [
      {
        id: "tour-iv-skill-1",
        rank: "B",
        scores: { total: 30, clarity: 8, ap: 8, passion: 7, specificity: 7 },
        takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: "tour-iv-skill-2",
        rank: "C",
        scores: { total: 24, clarity: 6, ap: 6, passion: 6, specificity: 6 },
        takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 38).toISOString(),
      },
    ],
    aggregate: {
      attempts: 2,
      bestRank: "B",
      averageTotal: 28,
    },
  },

  "/api/essay/history?userId=current": {
    essays: [
      {
        id: "tour-essay-3",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        scores: { total: 80 },
        topic: "地域社会における若者の役割",
      },
      {
        id: "tour-essay-2",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        scores: { total: 74 },
        topic: "AIと雇用の未来",
      },
      {
        id: "tour-essay-1",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
        scores: { total: 68 },
        topic: "グローバル化と地域文化",
      },
    ],
  },

  "/api/interview/history?userId=current": {
    interviews: [
      {
        id: "tour-iv-2",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        scores: { total: 32 },
      },
      {
        id: "tour-iv-1",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        scores: { total: 26 },
      },
    ],
  },

  "/api/growth/weaknesses?context=dashboard": {
    weaknesses: [
      {
        id: "w1",
        area: "結論の弱さ",
        count: 3,
        source: "essay",
        severity: "warning",
        firstOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        lastOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        resolved: false,
      },
      {
        id: "w2",
        area: "具体例の不足",
        count: 2,
        source: "interview",
        severity: "new",
        firstOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        lastOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        resolved: false,
      },
      {
        id: "w3",
        area: "時間配分",
        count: 1,
        source: "interview",
        severity: "new",
        firstOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        lastOccurred: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        resolved: true,
      },
    ],
  },

  // 通知未読バッジ等
  "/api/student/feedback?countOnly=true": { count: 1 },
  "/api/student/feedback": { feedbacks: [] },
};

/**
 * URL に対するモックレスポンスを返す。
 * 完全一致 → クエリ除外の path 一致 の順で探す。
 * 見つからなければ null（呼び出し側でフォールバック処理）。
 */
export function getTutorialMock(url: string): unknown | null {
  if (url in TUTORIAL_MOCK_API) return TUTORIAL_MOCK_API[url];
  // クエリを外して再検索
  const path = url.split("?")[0];
  if (path in TUTORIAL_MOCK_API) return TUTORIAL_MOCK_API[path];
  return null;
}

/**
 * SSR セーフに「現在チュートリアルモードか」を返す。
 * 条件: localStorage.tutorialActive === "true" かつ パスが /tour/* で始まる。
 * /tour/* 外では一切モック化しないので、サイドバーや戻るボタンで離脱した
 * 瞬間に本物のプロフィール・データに復帰できる。
 */
export function isTutorialActive(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem("tutorialActive") !== "true") return false;
  return window.location.pathname.startsWith("/tour");
}
