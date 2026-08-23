/**
 * 小論文の基本型（6ブロック）。
 *
 * 講義・課題・AI添削のフィードバック・弱点DBで、この名前だけを使う。
 * 呼び名がばらつくと「構成が弱い」という指摘が、生徒の中で講義とつながらない。
 * 設問タイプ別の型（テーマ型・課題文型・資料型・解決策提示型）は、この6ブロックの
 * どれが置き換わるかで説明する（Phase 4 で追加）。
 */
export const ESSAY_BLOCKS = [
  {
    id: "question",
    label: "問い",
    role: "何を論じるかを自分の言葉で確定する",
    starter: "本問が問うているのは〜である",
  },
  {
    id: "position",
    label: "立場",
    role: "問いに直接答える。一つに決める",
    starter: "私は〜と考える",
  },
  {
    id: "reason",
    label: "理由",
    role: "なぜその立場を取るのか",
    starter: "なぜなら〜だからである",
  },
  {
    id: "evidence",
    label: "根拠・具体例",
    role: "理由を支える事実・経験・データ",
    starter: "実際、〜",
  },
  {
    id: "concession",
    label: "譲歩と反論",
    role: "想定反論を受け止めてから切り返す",
    starter: "確かに〜。しかし〜",
  },
  {
    id: "conclusion",
    label: "結論",
    role: "立場を言い直して閉じる",
    starter: "したがって〜",
  },
] as const;

export type EssayBlockId = (typeof ESSAY_BLOCKS)[number]["id"];

export const ESSAY_BLOCK_IDS: EssayBlockId[] = ESSAY_BLOCKS.map((b) => b.id);

export const ESSAY_BLOCK_LABELS: Record<EssayBlockId, string> =
  Object.fromEntries(ESSAY_BLOCKS.map((b) => [b.id, b.label])) as Record<
    EssayBlockId,
    string
  >;

/** id から1ブロック取得（未知のIDは undefined）。 */
export function getEssayBlock(
  id: string
): (typeof ESSAY_BLOCKS)[number] | undefined {
  return ESSAY_BLOCKS.find((b) => b.id === id);
}
