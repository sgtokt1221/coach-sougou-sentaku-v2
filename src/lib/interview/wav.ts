/**
 * PCM16(mono) → WAV(base64) エンコーダ。
 *
 * Gemini Live のマイク取り込みで得た 16kHz mono Int16 PCM を、OpenAI 文字起こし
 * (gpt-4o-transcribe / whisper-1) が受け付ける WAV 形式にして送るために使う。
 * （プロジェクトに WAV エンコーダが無かったため新規。生 PCM は API が受け付けない）
 */

/** Int16 PCM(mono) を WAV(RIFF) にして base64 で返す。ブラウザ前提(btoa)。 */
export function encodeWav16(samples: Int16Array, sampleRate = 16000): string {
  const numSamples = samples.length;
  const blockAlign = 2; // mono(1ch) * 16bit/8
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt チャンクサイズ
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(off, samples[i], true);
    off += 2;
  }

  // ArrayBuffer → base64（大きい配列でスタックを溢れさせないようチャンク分割）
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
