import { GraduationCap } from "lucide-react";

/**
 * 起動中（ログインとプロフィールの確認待ち）の全画面表示。
 * ロゴが軽く弾み、下の影が伸び縮みする（キャンバスの A2）。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 */
export function StartupLoader() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-2.5"
    >
      <div className="startup-bounce bg-primary flex size-[72px] items-center justify-center rounded-[20px]">
        <GraduationCap className="size-10 text-white" strokeWidth={1.8} />
      </div>
      <div className="startup-shadow bg-foreground h-2 w-14 rounded-full" />
      <p className="font-heading text-foreground mt-4 text-xl font-bold">coach</p>
    </div>
  );
}
