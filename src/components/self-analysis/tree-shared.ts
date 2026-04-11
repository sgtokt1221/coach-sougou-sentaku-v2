/**
 * 自己分析の木 (2D / 3D 版共通) で使う定数とユーティリティ。
 */

/** 7 つの果実のメタデータ。順番は SELF_ANALYSIS_STEPS に対応 */
export interface FruitMeta {
  /** 2D SVG 用: viewBox 320x260 の座標 */
  x2d: number;
  y2d: number;
  /** 3D 用: ワールド座標 (y は地面から上に伸びる) */
  pos3d: [number, number, number];
  /** メインカラー (Tailwind colors の hex) */
  color: string;
  /** 薄い色 (オーラ/リング用) */
  ring: string;
}

// 3D 座標は葉群 (中心 (0, 3, 0), 半径 ~2.3) の「外側表面」に配置し、
// カメラ (+z 方向) に向かって大きめに +z を取ることで葉に埋もれないようにする。
export const FRUIT_META: FruitMeta[] = [
  // 1. 価値観 - pink - 頂点手前
  { x2d: 160, y2d: 70, pos3d: [0.0, 3.85, 1.35], color: "#f472b6", ring: "#fbcfe8" },
  // 2. 強み - orange - 左上手前
  { x2d: 102, y2d: 92, pos3d: [-1.65, 3.5, 1.05], color: "#fb923c", ring: "#fed7aa" },
  // 3. 弱み - violet - 右上手前
  { x2d: 218, y2d: 96, pos3d: [1.7, 3.4, 1.1], color: "#a78bfa", ring: "#ddd6fe" },
  // 4. 興味 - blue - 左中央
  { x2d: 76, y2d: 140, pos3d: [-2.15, 2.6, 0.8], color: "#60a5fa", ring: "#bfdbfe" },
  // 5. ビジョン - emerald - 右中央
  { x2d: 244, y2d: 146, pos3d: [2.2, 2.5, 0.9], color: "#34d399", ring: "#a7f3d0" },
  // 6. 大学接続 - amber - 左下手前
  { x2d: 132, y2d: 158, pos3d: [-0.95, 2.1, 1.55], color: "#fbbf24", ring: "#fde68a" },
  // 7. 統合 - red - 右下手前
  { x2d: 188, y2d: 170, pos3d: [1.05, 2.0, 1.5], color: "#f87171", ring: "#fecaca" },
];

/**
 * 保存された stepData (任意の形の object) をツールチップ用に整形。
 * キー = 文字列 / 配列 / ネストオブジェクト対応。
 */
export function formatStepDataForTooltip(
  data: Record<string, unknown> | undefined,
): { key: string; value: string }[] {
  if (!data || typeof data !== "object") return [];
  const entries: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === "") continue;
    let valueStr = "";
    if (Array.isArray(v)) {
      valueStr = v
        .filter(Boolean)
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join("、");
    } else if (typeof v === "object") {
      valueStr = Object.values(v as Record<string, unknown>)
        .filter((x) => x != null && x !== "")
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join("、");
    } else {
      valueStr = String(v);
    }
    if (valueStr) entries.push({ key: k, value: valueStr });
  }
  return entries.slice(0, 5);
}
