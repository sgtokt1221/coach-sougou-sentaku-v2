import { NextResponse } from "next/server";

/** スキルチェックは 2026-09-23 に廃止。古い画面が開いたままでも新しい記録を作らない */
export function skillCheckGone() {
  return NextResponse.json(
    { error: "スキルチェックは終了しました" },
    { status: 410 }
  );
}
