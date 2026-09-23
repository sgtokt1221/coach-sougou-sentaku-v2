import { skillCheckGone } from "@/lib/api/gone";

export async function PATCH() {
  return skillCheckGone();
}
