import { skillCheckGone } from "@/lib/api/gone";

export async function POST() {
  return skillCheckGone();
}
