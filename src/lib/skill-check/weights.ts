/**
 * 合成ランクの重み定数。
 *
 * Client / Server 両方から参照されるため、firebase-admin 依存の重い aggregate.ts
 * とは別ファイルに分離してある (aggregate.ts を client bundle に取り込むと
 * firebase-admin が "fs" 等を resolve できずビルド失敗する)。
 *
 * 設計: 日々の練習 (小論文添削・面接練習) を主、SC をベンチマーク補正とする方針。
 */
export const SC_WEIGHT = 0.4;
export const PRACTICE_WEIGHT = 0.6;
