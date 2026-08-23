/**
 * 講義の語りの中で、覚えてほしい語だけを強調して描く。
 *
 * 文章がすべて同じ太さだと、どこが要点か分からないまま流れていく。
 * データ側は `**問いに正対する**` のように書き、ここで色と太さを付ける。
 * マークダウン全体を通すのではなく、この記法1つだけを扱う
 * （講義データに自由なHTMLを持ち込ませない）。
 */
export function Emphasized({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        // 奇数番目が ** で挟まれた部分
        i % 2 === 1 ? (
          <strong key={i} className="text-primary font-semibold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
