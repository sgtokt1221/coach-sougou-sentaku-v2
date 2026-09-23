import { skillCheckGone } from "@/lib/api/gone";

export async function GET() {
  return skillCheckGone();
}
