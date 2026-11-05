import { redirect } from "next/navigation";

/** 旧「プラン」画面。使われていないので消した（決済の戻り先などの古いリンク用に設定へ移す） */
export default function PricingRedirect() {
  redirect("/student/settings");
}
