import { redirect } from "next/navigation";

/**
 * 旧 AI 志望校マッチング/入試スケジュール ページの跡地。
 * 志望校探索 (`/student/universities/explore`) にリダイレクトする。既存ブックマーク救済用。
 */
export default function UniversitiesIndexPage() {
  redirect("/student/universities/explore");
}
