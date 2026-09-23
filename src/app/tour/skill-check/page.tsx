import { redirect } from "next/navigation";

/** スキルチェックは 2026-09-23 に廃止。ツアーは次のステップへ進める */
export default function Page() {
  redirect("/tour/essay/new");
}
