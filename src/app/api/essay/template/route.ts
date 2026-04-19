import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  TEMPLATE_PAGE_PT,
  TEMPLATE_GRID,
  TEMPLATE_MARGINS,
  getFiducialMarkerCoordinates,
  getGridStartCoordinates,
  getHeaderFieldCoordinates,
  getGridSize
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

    // 2. ロゴを読み込んで埋め込み (SVG → sharp で PNG 化)
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.svg');
      const svgBuffer = await readFile(logoPath);
      const pngBuffer = await sharp(svgBuffer)
        .resize({ width: 480, withoutEnlargement: false })
        .png()
        .toBuffer();
      const logoImg = await pdfDoc.embedPng(pngBuffer);
      const gridStart = getGridStartCoordinates();
      const logoHeight = 40;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      page.drawImage(logoImg, {
        x: gridStart.x,
        y: TEMPLATE_PAGE_PT.height - TEMPLATE_MARGINS.top - logoHeight,
        width: logoWidth,
        height: logoHeight
      });
    } catch (logoErr) {
      console.warn('[template] Logo embed failed, continuing without logo:', logoErr);
    }

    // 3. ヘッダーフィールド枠のみ（ラベルは印刷後に手書き。pdf-lib は日本語非対応）
    const headerFields = getHeaderFieldCoordinates();
    const fields = [headerFields.name, headerFields.school, headerFields.university, headerFields.department, headerFields.date];

    fields.forEach((field) => {
      page.drawRectangle({
        x: field.x,
        y: TEMPLATE_PAGE_PT.height - field.y - field.height,
        width: field.width,
        height: field.height,
        borderColor: veryLightGray,
        borderWidth: 1
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

    // 5. 印刷注意書き（ASCII のみ、マス目の下）
    const gridBottomY = getGridStartCoordinates().y + getGridSize().height + 20;
    page.drawText('Print on B4 at 100% scale (do not shrink to fit)', {
      x: TEMPLATE_PAGE_PT.width / 2 - 125,
      y: TEMPLATE_PAGE_PT.height - gridBottomY,
      size: 9,
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