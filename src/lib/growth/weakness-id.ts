/**
 * 弱点のドキュメントID。
 *
 * 弱点の area は AI が書いた自由文がそのまま入る。これを Firestore の
 * ドキュメントIDに使うと、"/" を含む文でパスが分割され、書き込みが
 * 例外になるか別のサブコレクションへ入る。例外は呼び出し側の catch に
 * 飲まれるため、その回の弱点が丸ごと保存されないまま気づけない。
 *
 * ID に使えない文字を落とし、長さも抑える。表示に使う文言は
 * ドキュメントの area フィールド側に元のまま残す。
 */
export function weaknessDocId(area: string): string {
  const cleaned = area
    .replace(/[\/\\.#$\[\]]/g, "_")
    // 予約パターン（__x__）を避ける
    .replace(/__+/g, "_")
    .trim()
    // Firestore のドキュメントIDは 1500 バイトまで。日本語で余裕を持たせて 200 文字
    .slice(0, 200);
  return cleaned.length > 0 ? cleaned : "その他";
}
