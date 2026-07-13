/**
 * ルート別の表示モード（スクロール所有者・モバイルヘッダー表示）。
 * 業務ロジックは持たない純粋な判定のみ。
 */
export type AppLayoutMode = {
  /** 縦スクロールの所有者。"main" = 共通 main、"page" = ページ内部が所有する没入画面 */
  scrollOwner: "main" | "page";
  /** モバイルで共通 Header を隠す（内部ヘッダーを使う画面用）。PC では常に表示 */
  hideMobileHeader?: boolean;
};

/**
 * pathname から表示モードを判定する。
 * NOTE: page モード（没入画面: 面接セッション/チャット詳細）は、対象ページを
 * FullHeightPage 化し内部戻る導線を整備する P0（Task 6/7）で有効化する。
 * それまでは全ルート main を返し、Foundation 単独でも既存スクロール挙動を壊さない。
 *
 * @param pathname - `usePathname()` が返す現在のパス
 * @returns スクロール所有者とモバイルヘッダー表示の設定
 */
export function getAppLayoutMode(pathname: string): AppLayoutMode {
  // 純チャット2ページ（Task 7）は内部スクロール（page モード）に変換済み。
  // 生徒フィードバック / 管理者メッセージ詳細
  if (pathname === "/student/feedback") return { scrollOwner: "page" };
  if (/^\/admin\/messages\/[^/]+$/.test(pathname)) return { scrollOwner: "page" };
  // P0 残り（ページ変換後にコメント解除）:
  // 面接セッション: 内部でスクロール、モバイルは共通ヘッダー非表示（内部ヘッダー使用）
  // if (/^\/student\/interview\/session\//.test(pathname)) return { scrollOwner: "page", hideMobileHeader: true };
  // 講師の生徒メッセージ詳細（複雑な詳細ページのため未変換）
  // if (/^\/teacher\/students\/[^/]+$/.test(pathname)) return { scrollOwner: "page" };
  return { scrollOwner: "main" };
}
