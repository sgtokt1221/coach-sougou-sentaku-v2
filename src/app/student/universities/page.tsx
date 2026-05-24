import { redirect } from "next/navigation";

/**
 * 旧 AI 志望校マッチング ページの跡地。 機能廃止により、 入試スケジュール
 * (`/student/universities/schedule`) にリダイレクトする。 既存ブックマーク救済用。
 */
export default function UniversitiesIndexPage() {
  redirect("/student/universities/schedule");
}
