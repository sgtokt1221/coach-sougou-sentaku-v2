/**
 * 生徒詳細の「時系列」。種類をまたいで新しい順に並べる。
 * 読み込み（Firestore）は API 側、ここは合わせ方だけ（DB を使わないので検査できる）。
 * 設計: docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md §5.4・§6.1
 */
export const TIMELINE_KINDS = [
  "essay",
  "interview",
  "chocoReview",
  "summaryDrill",
  "logicDrill",
  "interviewDrill",
  "document",
  "session",
  "homework",
  "aiConversation",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  essay: "小論文",
  interview: "面接",
  chocoReview: "ちょこ添削",
  summaryDrill: "要約ドリル",
  logicDrill: "論理ドリル",
  interviewDrill: "テーマ別ドリル",
  document: "書類",
  session: "面談",
  homework: "宿題",
  aiConversation: "AI対話",
};

/** 絞り込みのチップ（ドリル3種はまとめて1つ） */
export const TIMELINE_FILTERS: {
  key: string;
  label: string;
  kinds: TimelineKind[];
}[] = [
  { key: "all", label: "すべて", kinds: [...TIMELINE_KINDS] },
  { key: "essay", label: "小論文", kinds: ["essay", "chocoReview"] },
  { key: "interview", label: "面接", kinds: ["interview", "interviewDrill"] },
  { key: "drill", label: "ドリル", kinds: ["summaryDrill", "logicDrill"] },
  { key: "document", label: "書類", kinds: ["document"] },
  { key: "session", label: "面談", kinds: ["session"] },
  { key: "homework", label: "宿題", kinds: ["homework"] },
  { key: "aiConversation", label: "AI対話", kinds: ["aiConversation"] },
];

/**
 * 担当外で「面談中（または完了後24時間以内）」の講師（hasActiveSessionAccess で
 * 通っただけの講師）に見せてよい種類。行を開いた先の API も同じ救済を持つものだけ。
 * 持たない種類を出すと、行は見えるのに開くと 403 になる（中身を出すべきでない相手でもある）。
 *
 * - essay: ✗ 行は /api/admin/students/[id]/essays/[essayId] を開く。救済なし
 *   （一覧を返す /api/admin/students/[id] には救済があるが、開く先が 403）
 * - interview: ✗ interviews/[interviewId] に救済なし
 * - chocoReview: ○ choco-reviews に救済あり
 * - summaryDrill: ○ summary-drills に救済あり
 * - logicDrill: ○ logic-drills に救済あり
 * - interviewDrill: ○ interview-drills に救済あり
 * - document: ✗ documents/[docId] に救済なし
 * - session: ✗ students/[id]/sessions に救済なし（行の開く先 /api/sessions/[id] も
 *   その面談の担当講師しか通さない）
 * - homework: ✗ homework（GET）・homework/[hwId]（確認済みの PATCH）に救済なし
 * - aiConversation: ✗ ai-conversations に救済なし
 * 各 API に救済を足したら、ここにも足す。
 */
export const SESSION_ACCESS_KINDS: readonly TimelineKind[] = [
  "chocoReview",
  "summaryDrill",
  "logicDrill",
  "interviewDrill",
];

/** 見せてよい種類に絞る。viaSessionAccess は面談の救済だけで通った講師のとき true */
export function allowedTimelineKinds(
  kinds: readonly TimelineKind[],
  viaSessionAccess: boolean
): TimelineKind[] {
  return viaSessionAccess
    ? kinds.filter((k) => SESSION_ACCESS_KINDS.includes(k))
    : [...kinds];
}

export interface TimelineItem {
  kind: TimelineKind;
  id: string;
  /** 並べる日時（ISO） */
  at: string;
  title: string;
  /** 題の下に添える1行（大学名・状態など）。無ければ省く */
  subtitle?: string;
  score?: { value: number; max: number };
  /** 開く先がページ遷移のときだけ */
  href?: string;
  /** 行の中で操作するための値（宿題の「確認済み」ボタンを出すかの判定） */
  meta?: { homeworkStatus?: string };
}

export interface TimelinePage {
  items: TimelineItem[];
  /** 続きを読むときに before に渡す値。これ以上無ければ null */
  nextBefore: string | null;
  /** 読み込めなかった種類（黙って欠かさず画面に出す） */
  failedKinds: TimelineKind[];
}

/**
 * 種類ごとに「before より古いものを新しい順に最大 limit 件」読んだ結果を合わせる。
 * 同じ日時の行は kind・id の順で並べて、ページをまたいで順番が揺れないようにする。
 * nextBefore は返した最後の行の日時。同じ日時の行がページ境界で割れないよう、
 * 最後の行と同じ日時の行は次のページへ回す（この日時の行が limit 件を超える場合を除く）。
 */
export function mergeTimeline(
  perKind: Partial<Record<TimelineKind, TimelineItem[]>>,
  limit: number,
  failedKinds: TimelineKind[] = []
): TimelinePage {
  const all = Object.values(perKind)
    .flat()
    .filter((x): x is TimelineItem => !!x && !Number.isNaN(Date.parse(x.at)))
    .sort(
      (a, b) =>
        Date.parse(b.at) - Date.parse(a.at) ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id)
    );
  if (all.length <= limit) {
    return { items: all, nextBefore: null, failedKinds };
  }
  let items = all.slice(0, limit);
  const lastAt = items[items.length - 1].at;
  // 境界の日時を持つ行が slice の外にもあるときだけ割る（無いなら最後の行はそのまま残す）
  const splitAtBoundary =
    all.filter((x) => x.at === lastAt).length >
    items.filter((x) => x.at === lastAt).length;
  if (splitAtBoundary) {
    const trimmed = items.filter((x) => x.at !== lastAt);
    // 全部が同じ日時なら割るしかない（極端な場合）
    if (trimmed.length > 0) items = trimmed;
  }
  return {
    items,
    nextBefore: items[items.length - 1].at,
    failedKinds,
  };
}

/** 直近 days 日の日ごとの件数（活動量の棒）。日付は日本時間の YYYY-MM-DD */
export function dailyActivity(
  items: Pick<TimelineItem, "at">[],
  days: number,
  now: Date = new Date()
): { date: string; count: number }[] {
  const toJstDate = (ms: number) =>
    new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (const x of items) {
    const d = toJstDate(Date.parse(x.at));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = toJstDate(now.getTime() - i * 86400000);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}
