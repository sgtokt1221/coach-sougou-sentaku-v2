import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  TEMPLATE_PAGE_PT,
  TEMPLATE_GRID,
  getFiducialMarkerCoordinates,
  getGridStartCoordinates,
  getHeaderFieldCoordinates
} from '@/lib/essay/template-layout';

export const runtime = 'nodejs';

/**
 * B4 400字詰め原稿用紙テンプレート PDF を生成
 * GET /api/essay/template
 */
export async function GET() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([TEMPLATE_PAGE_PT.width, TEMPLATE_PAGE_PT.height]);

    // 色定義
    const lightGray = rgb(0.8, 0.8, 0.8); // 薄い罫線用
    const black = rgb(0, 0, 0);
    const veryLightGray = rgb(0.95, 0.95, 0.95); // ヘッダー枠線用

    // 1. フィデューシャルマーカー（四隅のL字）
    const markers = getFiducialMarkerCoordinates();
    Object.values(markers).forEach(marker => {
      // 水平線
      page.drawRectangle({
        x: marker.horizontal.x,
        y: TEMPLATE_PAGE_PT.height - marker.horizontal.y - marker.horizontal.height,
        width: marker.horizontal.width,
        height: marker.horizontal.height,
        color: black
      });
      // 垂直線
      page.drawRectangle({
        x: marker.vertical.x,
        y: TEMPLATE_PAGE_PT.height - marker.vertical.y - marker.vertical.height,
        width: marker.vertical.width,
        height: marker.vertical.height,
        color: black
      });
    });

    // 2. ヘッダーフィールド（氏名・学校・大学名・学部名・日付）
    const headerFields = getHeaderFieldCoordinates();
    const labels = ['氏名', '学校名', '志望大学', '学部', '日付'];
    const fields = [headerFields.name, headerFields.school, headerFields.university, headerFields.department, headerFields.date];

    fields.forEach((field, index) => {
      // フィールド枠線
      page.drawRectangle({
        x: field.x,
        y: TEMPLATE_PAGE_PT.height - field.y - field.height,
        width: field.width,
        height: field.height,
        borderColor: veryLightGray,
        borderWidth: 1
      });

      // ラベル（小さい文字で左上に配置）
      page.drawText(labels[index], {
        x: field.x + 2,
        y: TEMPLATE_PAGE_PT.height - field.y - 8,
        size: 6,
        color: lightGray
      });
    });

    // 3. 400字詰めマス目（20列 × 20行）
    const gridStart = getGridStartCoordinates();
    const { cols, rows, cellSize } = TEMPLATE_GRID;

    // 縦線
    for (let col = 0; col <= cols; col++) {
      const x = gridStart.x + (col * cellSize);
      page.drawLine({
        start: { x, y: TEMPLATE_PAGE_PT.height - gridStart.y },
        end: { x, y: TEMPLATE_PAGE_PT.height - gridStart.y - (rows * cellSize) },
        thickness: col % 5 === 0 ? 1.2 : 0.5, // 5列おきに太く
        color: lightGray
      });
    }

    // 横線
    for (let row = 0; row <= rows; row++) {
      const y = TEMPLATE_PAGE_PT.height - gridStart.y - (row * cellSize);
      page.drawLine({
        start: { x: gridStart.x, y },
        end: { x: gridStart.x + (cols * cellSize), y },
        thickness: row % 5 === 0 ? 1.2 : 0.5, // 5行おきに太く
        color: lightGray
      });
    }

    // 4. クレジット（右下）
    page.drawText('© Coach for 総合型選抜', {
      x: TEMPLATE_PAGE_PT.width - 120,
      y: 20,
      size: 8,
      color: lightGray
    });

    // 5. 印刷注意書き（フッター中央）
    page.drawText('B4原寸印刷推奨 / A4縮小印刷不可', {
      x: TEMPLATE_PAGE_PT.width / 2 - 80,
      y: 10,
      size: 8,
      color: lightGray
    });

    // PDF生成
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="essay-template-b4.pdf"',
        'Cache-Control': 'public, max-age=3600' // 1時間キャッシュ
      }
    });

  } catch (error) {
    console.error('PDF生成エラー:', error);
    return NextResponse.json(
      { error: 'PDF生成に失敗しました' },
      { status: 500 }
    );
  }
}