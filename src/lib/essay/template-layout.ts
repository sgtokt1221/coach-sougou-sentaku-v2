/**
 * B4 400字詰め原稿用紙テンプレートのレイアウト定数とユーティリティ
 * OCR精度向上のためのフィデューシャルマーカー対応
 */

// B4サイズ (257 × 364 mm = 728 × 1031 pt)
export const TEMPLATE_PAGE_PT = {
  width: 728,
  height: 1031
} as const;

// 20列 × 20行 = 400字詰めマス目 (B4用紙をできるだけ活用)
export const TEMPLATE_GRID = {
  cols: 20,
  rows: 20,
  cellSize: 33
} as const;

// 四隅のフィデューシャルマーカー設定
export const TEMPLATE_MARKER = {
  size: 30,  // L字の腕長
  stroke: 3  // 線の太さ
} as const;

// ヘッダー高さ (ロゴ + ヘッダフィールド)
export const TEMPLATE_HEADER_HEIGHT = 130;

// マージン設定 (ページ端から)
export const TEMPLATE_MARGINS = {
  top: 30,
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
 * マス目の全体幅・高さ
 */
export function getGridSize() {
  const { cols, rows, cellSize } = TEMPLATE_GRID;
  return { width: cols * cellSize, height: rows * cellSize };
}

/**
 * マス目の開始座標 (水平中央揃え + 上ヘッダ分を避けた位置)
 */
export function getGridStartCoordinates() {
  const { width: gridWidth } = getGridSize();
  return {
    x: (TEMPLATE_PAGE_PT.width - gridWidth) / 2, // 水平中央
    y: TEMPLATE_MARGINS.top + TEMPLATE_HEADER_HEIGHT
  };
}

/**
 * ヘッダーフィールドの座標 (grid と同じ左右揃え)
 */
export function getHeaderFieldCoordinates() {
  const gridStart = getGridStartCoordinates();
  const fieldHeight = 22;
  const fieldsY = TEMPLATE_MARGINS.top + 70; // ロゴ下
  const colWidth = (TEMPLATE_GRID.cols * TEMPLATE_GRID.cellSize - 4 * 8) / 5;

  return {
    name: { x: gridStart.x, y: fieldsY, width: colWidth, height: fieldHeight },
    school: { x: gridStart.x + (colWidth + 8) * 1, y: fieldsY, width: colWidth, height: fieldHeight },
    university: { x: gridStart.x + (colWidth + 8) * 2, y: fieldsY, width: colWidth, height: fieldHeight },
    department: { x: gridStart.x + (colWidth + 8) * 3, y: fieldsY, width: colWidth, height: fieldHeight },
    date: { x: gridStart.x + (colWidth + 8) * 4, y: fieldsY, width: colWidth, height: fieldHeight }
  };
}