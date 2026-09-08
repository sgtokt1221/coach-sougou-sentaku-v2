/**
 * 通話の認可判定の検証。
 *
 * 別組織の生徒が同じ通話に入れてしまうと、過去に起きた「別法人の生徒を
 * 見せてしまった」事故と同じことが起きる。ここだけは静的に確かめる。
 *
 * 実行: npx tsx scripts/verify-call-authz.ts
 */

import assert from "node:assert";
import {
  buildParticipantUids,
  canDeclineCall,
  canEndCall,
  canJoinCall,
  effectiveCallStatus,
  type CandidateUser,
} from "../src/lib/livekit/authz";
import { CALL_MAX_PARTICIPANTS, buildRoomName } from "../src/lib/types/call";

const host: CandidateUser = {
  uid: "admin1",
  organizationId: "orgA",
  role: "admin",
};
const sameOrg = (uid: string): CandidateUser => ({
  uid,
  organizationId: "orgA",
  role: "student",
});

// --- buildParticipantUids ---

// 同じ組織の生徒1人。発信者が先頭に入る
{
  const r = buildParticipantUids(host, [sameOrg("s1")]);
  assert.deepEqual(r, { ok: true, uids: ["admin1", "s1"] });
}

// グループ。順番は発信者 → 指定順
{
  const r = buildParticipantUids(host, [
    sameOrg("s1"),
    sameOrg("s2"),
    sameOrg("s3"),
  ]);
  assert.ok(r.ok);
  assert.deepEqual(r.uids, ["admin1", "s1", "s2", "s3"]);
}

// 別組織が1人でも混ざったら通話ごと拒否する。除外して続行しない
{
  const other: CandidateUser = {
    uid: "s9",
    organizationId: "orgB",
    role: "student",
  };
  const r = buildParticipantUids(host, [sameOrg("s1"), other]);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.code === 403);
}

// organizationId が未設定の利用者は通さない。「未設定なら通す」にすると
// 移行途中のデータで穴が開く
{
  const noOrg: CandidateUser = {
    uid: "s9",
    organizationId: null,
    role: "student",
  };
  const r = buildParticipantUids(host, [noOrg]);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.code === 403);
}
{
  const noOrg: CandidateUser = { uid: "s9", role: "student" };
  const r = buildParticipantUids(host, [noOrg]);
  assert.equal(r.ok, false);
}

// 発信者に組織が無ければ発信させない
{
  const r = buildParticipantUids({ uid: "admin1", role: "admin" }, [
    sameOrg("s1"),
  ]);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.code === 403);
}

// 相手がゼロ、または自分だけを指定した場合
{
  assert.equal(buildParticipantUids(host, []).ok, false);
  assert.equal(buildParticipantUids(host, [{ ...host }]).ok, false);
}

// 重複指定は1人に畳む
{
  const r = buildParticipantUids(host, [sameOrg("s1"), sameOrg("s1")]);
  assert.ok(r.ok);
  assert.deepEqual(r.uids, ["admin1", "s1"]);
}

// 上限ちょうどは通る。1人超えたら弾く
{
  const just = Array.from({ length: CALL_MAX_PARTICIPANTS - 1 }, (_, i) =>
    sameOrg(`s${i}`)
  );
  const r = buildParticipantUids(host, just);
  assert.ok(r.ok);
  assert.equal(r.uids.length, CALL_MAX_PARTICIPANTS);

  const over = [...just, sameOrg("extra")];
  const r2 = buildParticipantUids(host, over);
  assert.equal(r2.ok, false);
  assert.ok(!r2.ok && r2.code === 400);
}

// --- canJoinCall ---

{
  const call = {
    participantUids: ["admin1", "s1"],
    status: "ringing" as const,
  };
  assert.equal(canJoinCall(call, "admin1"), true);
  assert.equal(canJoinCall(call, "s1"), true);
  // participantUids に居ない uid は入れない
  assert.equal(canJoinCall(call, "s2"), false);
  // 終わった通話には誰も入れない
  assert.equal(
    canJoinCall({ ...call, status: "ended" as const }, "admin1"),
    false
  );
}

// --- canEndCall ---

{
  assert.equal(canEndCall({ hostUid: "admin1" }, "admin1"), true);
  assert.equal(canEndCall({ hostUid: "admin1" }, "s1"), false);
}

// --- canDeclineCall ---

{
  const call = { hostUid: "admin1", participantUids: ["admin1", "s1"] };
  // 呼ばれた側は断れる
  assert.equal(canDeclineCall(call, "s1"), true);
  // 発信者は断れない（終了させる側）
  assert.equal(canDeclineCall(call, "admin1"), false);
  // 参加者以外は断れない
  assert.equal(canDeclineCall(call, "s2"), false);
}

// --- effectiveCallStatus ---

{
  const now = new Date("2026-09-08T12:00:00.000Z");
  // 直後は そのまま
  assert.equal(
    effectiveCallStatus(
      { status: "ringing", createdAt: "2026-09-08T11:59:00.000Z" },
      now
    ),
    "ringing"
  );
  // 6時間放置されたら終了扱い
  assert.equal(
    effectiveCallStatus(
      { status: "ringing", createdAt: "2026-09-08T05:00:00.000Z" },
      now
    ),
    "ended"
  );
  assert.equal(
    effectiveCallStatus(
      { status: "active", createdAt: "2026-09-08T05:00:00.000Z" },
      now
    ),
    "ended"
  );
  // createdAt が壊れていても落とさない
  assert.equal(
    effectiveCallStatus({ status: "ringing", createdAt: "not-a-date" }, now),
    "ringing"
  );
}

// --- buildRoomName ---

{
  assert.equal(buildRoomName("abc123"), "call-abc123");
}

console.log("verify-call-authz OK");
