/**
 * 起動中（ログインとプロフィールの確認待ち）の全画面表示。
 * アプリのロゴ（public/logo-vertical.svg と同じ形）のマークが軽く弾み、
 * 下の影が伸び縮みする（キャンバスの A2）。色は文字色に合わせ、暗い表示でも見える。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 */
export function StartupLoader() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center"
    >
      <svg
        className="startup-bounce"
        width="96"
        height="72"
        viewBox="0 0 130 100"
        fill="none"
        aria-hidden="true"
      >
        <path d="M10 45 L60 15 L110 45 L60 75 Z" fill="currentColor" />
        <path
          d="M25 55 V85 Q60 100 95 85 V55"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <circle cx="105" cy="15" r="15" className="fill-emerald-500 dark:fill-emerald-400" />
        <path
          d="M105 5 V25 M95 15 H115"
          className="stroke-white dark:stroke-emerald-950"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <div className="startup-shadow mt-2 h-2 w-16 rounded-full bg-current" />
      <p className="mt-5 text-[32px] leading-none font-extrabold tracking-tight">coach</p>
      <p className="text-muted-foreground mt-2 text-sm font-bold tracking-[0.1em]">
        for 総合型選抜
      </p>
    </div>
  );
}
