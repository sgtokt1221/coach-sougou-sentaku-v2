import { redirect } from "next/navigation";

/** 旧「合格者データ」。合格者答案へ置き換えた */
export default function PassedDataRedirect() {
  redirect("/admin/passers");
}
