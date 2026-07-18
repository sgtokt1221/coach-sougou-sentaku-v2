/**
 * ルート別の表示モード（スクロール所有者・モバイルヘッダー表示）。
 * 業務ロジックは持たない純粋な判定のみ。
 */
export type AppLayoutMode = {
  /** 縦スクロールの所有者。"main" = 共通 main、"page" = ページ内部が所有する没入画面 */
  scrollOwner: "main" | "page";
  /** モバイルで共通 Header を隠す（内部ヘッダーを使う画面用）。PC では常に表示 */
  hideMobileHeader?: boolean;
  /** モバイルで BottomNav を隠す（作成・編集・練習など、作業に集中する画面用） */
  hideMobileBottomNav?: boolean;
};

/**
 * モバイル下部ナビを表示しない、作業集中型のルート。
 *
 * 一覧・履歴・結果ページではナビを維持し、文字入力や提出操作が主目的の
 * 専用画面だけを明示的に列挙する。動的詳細ページは、実際に編集機能を持つ
 * 書類・活動・宿題などに限定する。
 */
const MOBILE_FOCUS_ROUTE_PATTERNS = [
  // 各ポータルの専用作成フロー
  /^\/(?:student|admin|superadmin)\/.+\/new$/,
  // 生徒の小論文・面接・スキル練習
  /^\/student\/essay\/(?:choco|logic-drill|summary-drill)$/,
  /^\/student\/essay\/lectures\/[^/]+$/,
  /^\/student\/interview\/drill$/,
  /^\/student\/interview\/session\/[^/]+$/,
  // 生徒の編集・入力ワーク
  /^\/student\/documents\/(?!checklist$|new$)[^/]+$/,
  /^\/student\/activities\/[^/]+$/,
  /^\/student\/homework\/[^/]+$/,
  /^\/student\/(?:self-analysis|mbti|story-check)$/,
  /^\/student\/research\/(?:consent|session)$/,
  /^\/student\/universities\/explore$/,
  // 管理者の専用編集画面
  /^\/admin\/universities\/[^/]+$/,
] as const;

function hidesMobileBottomNav(pathname: string): boolean {
  return MOBILE_FOCUS_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

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
  const hideMobileBottomNav = hidesMobileBottomNav(pathname);

  // チャットは会話と入力だけに高さを使う。モバイルでは共通クロームを外し、
  // ページ内の戻る導線・相手表示をヘッダーとして使う。
  if (pathname === "/student/feedback" || pathname === "/teacher/students") {
    return {
      scrollOwner: "page",
      hideMobileBottomNav: true,
    };
  }
  if (/^\/(?:admin\/messages|teacher\/students)\/[^/]+$/.test(pathname)) {
    return {
      scrollOwner: "page",
      hideMobileHeader: true,
      hideMobileBottomNav: true,
    };
  }

  // 自己分析ワークショップはキーボード表示中に会話部分だけを伸縮させるため、
  // ページ自身がスクロールを所有する没入モードにする。内部に戻る導線あり。
  if (pathname === "/student/self-analysis") {
    return {
      scrollOwner: "page",
      hideMobileHeader: true,
      hideMobileBottomNav: true,
    };
  }

  // 面接セッション: 内部でスクロール、モバイルは共通ヘッダー非表示（内部ヘッダー使用）
  if (/^\/student\/interview\/session\//.test(pathname)) {
    return {
      scrollOwner: "page",
      hideMobileHeader: true,
      hideMobileBottomNav: true,
    };
  }
  // P0 残り（ページ変換後にコメント解除）:
  // 講師の生徒メッセージ詳細（複雑な詳細ページのため未変換）
  // if (/^\/teacher\/students\/[^/]+$/.test(pathname)) return { scrollOwner: "page" };
  return { scrollOwner: "main", hideMobileBottomNav };
}
