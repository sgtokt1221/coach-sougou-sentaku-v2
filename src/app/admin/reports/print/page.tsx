import { redirect } from "next/navigation";

/**
 * 旧 `/admin/reports/print?studentId=&reportId=` ルートを新ルートへ転送する。
 *
 * 新ルート: `/admin/reports/[studentId]/[reportId]?print=1`
 * 旧 URL をブックマークしているユーザーがいる可能性があるため、削除ではなく
 * リダイレクトファイルとして保持する。
 */
export default async function LegacyPrintRedirect({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; reportId?: string }>;
}) {
  const { studentId, reportId } = await searchParams;
  if (!studentId || !reportId) {
    redirect("/admin/reports");
  }
  redirect(`/admin/reports/${studentId}/${reportId}?print=1`);
}
