/**
 * OCR位置座標 × 音声セグメントのアライメントエンジン
 *
 * Azure OCRのword polygon座標を読み順（縦書き: 右→左、上→下）にソートし、
 * Whisperの時系列セグメントと順序マッチングする。
 */

export interface OcrWord {
  text: string;
  polygon: number[]; // [x1,y1, x2,y2, x3,y3, x4,y4]
  confidence: number;
}

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface CharMap {
  polygon: number[];
  ocrText: string;
  spokenText: string;
  confidence: number;
  segmentIndex: number;
}

/**
 * Azure OCR wordsを縦書き読み順（右→左、上→下）にソート
 */
function sortWordsVertical(words: OcrWord[]): OcrWord[] {
  // Group into columns by X position (within threshold)
  const COLUMN_THRESHOLD = 40; // pixels
  const sorted = [...words].sort((a, b) => {
    const ax = a.polygon[0] ?? 0;
    const bx = b.polygon[0] ?? 0;
    return bx - ax; // right to left
  });

  const columns: OcrWord[][] = [];
  let currentColumn: OcrWord[] = [];
  let currentX: number | null = null;

  for (const word of sorted) {
    const x = word.polygon[0] ?? 0;
    if (currentX === null || Math.abs(x - currentX) > COLUMN_THRESHOLD) {
      if (currentColumn.length > 0) columns.push(currentColumn);
      currentColumn = [word];
      currentX = x;
    } else {
      currentColumn.push(word);
    }
  }
  if (currentColumn.length > 0) columns.push(currentColumn);

  // Sort each column top-to-bottom by Y position
  const result: OcrWord[] = [];
  for (const col of columns) {
    col.sort((a, b) => (a.polygon[1] ?? 0) - (b.polygon[1] ?? 0));
    result.push(...col);
  }
  return result;
}

/**
 * Azure OCR wordsを横書き読み順（上→下、左→右）にソート
 */
function sortWordsHorizontal(words: OcrWord[]): OcrWord[] {
  const ROW_THRESHOLD = 30;
  const sorted = [...words].sort((a, b) => {
    const ay = a.polygon[1] ?? 0;
    const by = b.polygon[1] ?? 0;
    return ay - by; // top to bottom
  });

  const rows: OcrWord[][] = [];
  let currentRow: OcrWord[] = [];
  let currentY: number | null = null;

  for (const word of sorted) {
    const y = word.polygon[1] ?? 0;
    if (currentY === null || Math.abs(y - currentY) > ROW_THRESHOLD) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [word];
      currentY = y;
    } else {
      currentRow.push(word);
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const result: OcrWord[] = [];
  for (const row of rows) {
    row.sort((a, b) => (a.polygon[0] ?? 0) - (b.polygon[0] ?? 0));
    result.push(...row);
  }
  return result;
}

/**
 * OCR words と Whisper segments をアライメント
 *
 * 方針: Whisperの各セグメント文字列に含まれるOCR wordをマッチ
 */
export function alignOcrAndSpeech(
  ocrWords: OcrWord[],
  whisperSegments: WhisperSegment[],
  direction: "vertical" | "horizontal" = "vertical"
): CharMap[] {
  const sortedWords = direction === "vertical"
    ? sortWordsVertical(ocrWords)
    : sortWordsHorizontal(ocrWords);

  const charMaps: CharMap[] = [];
  let wordIndex = 0;

  for (let segIdx = 0; segIdx < whisperSegments.length; segIdx++) {
    const seg = whisperSegments[segIdx];
    const segText = seg.text.replace(/\s/g, "");

    // Try to match OCR words to this segment
    let consumed = 0;
    while (wordIndex < sortedWords.length && consumed < segText.length) {
      const word = sortedWords[wordIndex];
      const ocrClean = word.text.replace(/\s/g, "");

      // Check if this OCR word appears in the segment text
      const matchPos = segText.indexOf(ocrClean, consumed);
      if (matchPos !== -1 && matchPos - consumed <= 3) {
        charMaps.push({
          polygon: word.polygon,
          ocrText: word.text,
          spokenText: ocrClean,
          confidence: word.confidence,
          segmentIndex: segIdx,
        });
        consumed = matchPos + ocrClean.length;
        wordIndex++;
      } else {
        // No exact match — try partial or skip
        // Map by position order (less precise but maintains alignment)
        charMaps.push({
          polygon: word.polygon,
          ocrText: word.text,
          spokenText: segText.slice(consumed, consumed + ocrClean.length) || word.text,
          confidence: Math.max(0, word.confidence - 0.3),
          segmentIndex: segIdx,
        });
        consumed += ocrClean.length;
        wordIndex++;
      }
    }
  }

  // Remaining unmatched OCR words
  while (wordIndex < sortedWords.length) {
    const word = sortedWords[wordIndex];
    charMaps.push({
      polygon: word.polygon,
      ocrText: word.text,
      spokenText: "",
      confidence: 0,
      segmentIndex: -1,
    });
    wordIndex++;
  }

  return charMaps;
}
