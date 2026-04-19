/**
 * B4 400字詰め原稿用紙テンプレートのレイアウト定数とユーティリティ
 * OCR精度向上のためのフィデューシャルマーカー対応
 */

// B4サイズ (257 × 364 mm = 728 × 1031 pt)
export const TEMPLATE_PAGE_PT = {
  width: 728,
  height: 1031
} as const;

// 20列 × 20行 = 400字詰めマス目
export const TEMPLATE_GRID = {
  cols: 20,
  rows: 20,
  cellSize: 28
} as const;

// 四隅のフィデューシャルマーカー設定
export const TEMPLATE_MARKER = {
  size: 30,  // L字の腕長
  stroke: 3  // 線の太さ
} as const;

// ヘッダー高さ
export const TEMPLATE_HEADER_HEIGHT = 60;

// マージン設定
export const TEMPLATE_MARGINS = {
  left: 40,
  right: 40,
  top: 20,
  bottom: 40
} as const;

/**
 * フィデューシャルマーカーの座標を取得
 * 各隅にL字のマーカーを配置（OCR用）
 */
export function getFiducialMarkerCoordinates() {
  const { size, stroke } = TEMPLATE_MARKER;
  const { width, height } = TEMPLATE_PAGE_PT;
  const margin = 20; // ページ端からの余白

  return {
    topLeft: {
      horizontal: { x: margin, y: margin, width: size, height: stroke },
      vertical: { x: margin, y: margin, width: stroke, height: size }
    },
    topRight: {
      horizontal: { x: width - margin - size, y: margin, width: size, height: stroke },
      vertical: { x: width - margin - stroke, y: margin, width: stroke, height: size }
    },
    bottomLeft: {
      horizontal: { x: margin, y: height - margin - stroke, width: size, height: stroke },
      vertical: { x: margin, y: height - margin - size, width: stroke, height: size }
    },
    bottomRight: {
      horizontal: { x: width - margin - size, y: height - margin - stroke, width: size, height: stroke },
      vertical: { x: width - margin - stroke, y: height - margin - size, width: stroke, height: size }
    }
  };
}

/**
 * マス目の開始座標を取得
 */
export function getGridStartCoordinates() {
  const headerHeight = TEMPLATE_HEADER_HEIGHT;
  const { left, top } = TEMPLATE_MARGINS;

  return {
    x: left,
    y: top + headerHeight + 20 // ヘッダー下に少し余白
  };
}

/**
 * ヘッダーフィールドの座標を取得
 */
export function getHeaderFieldCoordinates() {
  const { left, top } = TEMPLATE_MARGINS;
  const fieldHeight = 20;
  const fieldSpacing = 5;

  return {
    name: { x: left, y: top + 10, width: 150, height: fieldHeight },
    school: { x: left + 160, y: top + 10, width: 150, height: fieldHeight },
    university: { x: left + 320, y: top + 10, width: 120, height: fieldHeight },
    department: { x: left + 450, y: top + 10, width: 120, height: fieldHeight },
    date: { x: left + 580, y: top + 10, width: 100, height: fieldHeight }
  };
}