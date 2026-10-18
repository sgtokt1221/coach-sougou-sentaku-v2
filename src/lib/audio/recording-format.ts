/**
 * 授業録音の形式。保存するファイル名の拡張子と Content-Type を、届いた形式に合わせる。
 *
 * 以前はどの形式も `recording.webm`（audio/webm）として保存し、文字起こしにも
 * webm として渡していた。Safari の録音（audio/mp4）や取り込んだ mp3・m4a は
 * 中身と名前が食い違い、文字起こしで失敗する。
 */
const FORMATS: Array<{ prefixes: string[]; ext: string; mime: string }> = [
  { prefixes: ["audio/webm", "video/webm"], ext: "webm", mime: "audio/webm" },
  {
    prefixes: ["audio/mp4", "audio/m4a", "audio/x-m4a", "video/mp4"],
    ext: "m4a",
    mime: "audio/mp4",
  },
  { prefixes: ["audio/mpeg", "audio/mp3"], ext: "mp3", mime: "audio/mpeg" },
  {
    prefixes: ["audio/wav", "audio/x-wav", "audio/wave"],
    ext: "wav",
    mime: "audio/wav",
  },
  { prefixes: ["audio/ogg"], ext: "ogg", mime: "audio/ogg" },
];

/** 届いた Content-Type から形式を決める。対応していなければ null */
export function recordingFormatOf(
  contentType: string
): { ext: string; mime: string } | null {
  const t = contentType.toLowerCase().split(";")[0].trim();
  const f = FORMATS.find((x) => x.prefixes.includes(t));
  return f ? { ext: f.ext, mime: f.mime } : null;
}

/** 保存したパスの拡張子から形式を決める（文字起こしに渡すとき用）。不明なら webm */
export function recordingFormatOfPath(path: string): {
  ext: string;
  mime: string;
} {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const f = FORMATS.find((x) => x.ext === ext);
  return f ? { ext: f.ext, mime: f.mime } : { ext: "webm", mime: "audio/webm" };
}
