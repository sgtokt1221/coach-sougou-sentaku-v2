import { ResearchSessionPanel } from "@/components/research/ResearchSessionPanel";

/**
 * 自己探究授業の「教える」セッション単体ページ。
 * 本体は ResearchSessionPanel（面談セッション画面にも埋め込む共通部品）。
 */
export default function ResearchSessionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <ResearchSessionPanel />
    </div>
  );
}
