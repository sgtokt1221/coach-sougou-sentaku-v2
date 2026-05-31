/**
 * 高校マスタ。将来「〇〇高校 → 〇〇大学」の進学実績集計のため、
 * 生徒の出身高校を正規化して紐付けるための参照データ。
 */
export interface HighSchool {
  /** マスタ ID（例: "osaka-0001"）。生徒の schoolId が参照する */
  id: string;
  /** 正式名称（例: "大阪府立北野高等学校"） */
  name: string;
  /** 所在都道府県（例: "大阪府"） */
  prefecture: string;
  /** 設置区分。取得できた範囲で付与 */
  kind?: "public" | "private" | "national";
  /**
   * 偏差値（学科により幅があるため校の代表値=最大）。出典: みんなの高校情報。
   * マスタに無い/名称不一致の場合は未設定。
   */
  deviation?: number;
}
