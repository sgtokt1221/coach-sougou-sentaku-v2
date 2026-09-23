import { redirect } from "next/navigation";

/** スキルチェックは 2026-09-23 に廃止。古いリンクはダッシュボードへ */
export default function Page() {
  redirect("/student/dashboard");
}
