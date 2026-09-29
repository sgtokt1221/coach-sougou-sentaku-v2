import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";
import { reportMaterials } from "@/data/essay-report-materials";

/**
 * 一覧に出すテーマ名を決める。テーマ選択時は topic が空のままなので、
 * 選択元（過去問・テーマ）の名前を引く。
 * 選択中はテーマ入力欄が隠れるため、topic に残った値は選択前の入力が
 * 残っただけのことがある。選択元がある下書きではそちらを優先する。
 */
export function resolveDraftTopicLabel(data: {
  topic?: string;
  themeId?: string;
  pastQuestionId?: string;
  reportMaterialId?: string;
  oralExam?: { theme?: string };
}): string | undefined {
  if (data.oralExam?.theme) return `口頭試問 / ${data.oralExam.theme}`;
  if (data.reportMaterialId) {
    const m = reportMaterials.find((x) => x.id === data.reportMaterialId);
    if (m) return `レポート / ${m.title}`;
  }
  if (data.pastQuestionId) {
    const pq = getPastQuestionById(data.pastQuestionId);
    if (pq) return `${pq.universityName} ${pq.year}年 ${pq.theme}`;
  }
  if (data.themeId) {
    const theme = getThemeById(data.themeId);
    if (theme) return theme.title;
  }
  return data.topic?.trim() || undefined;
}
