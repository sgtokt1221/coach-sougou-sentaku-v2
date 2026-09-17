import assert from "node:assert/strict";
import { essayThemes } from "@/data/essay-themes";
import { PAST_QUESTIONS } from "@/data/essay-past-questions";
import { buildTedLectureInfo } from "@/lib/essay/lecture-info";
import { getTedTranscript } from "@/data/ted-transcripts";

/**
 * 講義型（TED）の出題が、採点AIに渡せる形になっているかを見る。
 *
 * 採点AIに動画は見えない。書き起こしが無いと、モデルは記憶で講演の中身を
 * 決めることになり、講演が言っていないことを主張として扱ってしまう。
 * エラーは出ないので、ここで縛る。
 * 設問と講演のずれ（別の講演のリンクが貼られている）も検出したいので、
 * テーマのタイトルに講演者名が入っていることも確かめる。
 */
function validate() {
  const talks = [
    ...essayThemes.map((t) => ({ id: t.id, title: t.title, ted: t.tedTalk })),
    ...PAST_QUESTIONS.map((q) => ({
      id: q.id,
      title: q.theme,
      ted: q.tedTalk,
    })),
  ];

  for (const theme of essayThemes) {
    if (theme.questionType !== "lecture") continue;
    assert.ok(theme.tedTalk, `講義型なのに tedTalk が無い: ${theme.id}`);
  }

  let count = 0;
  for (const { id, title, ted } of talks) {
    if (!ted) continue;
    count++;
    assert.ok(
      /^[a-z0-9_]+$/.test(ted.talkId),
      `talkId の形が不正: ${id} (${ted.talkId})`
    );
    assert.ok(ted.title.trim(), `講演タイトルが空: ${id}`);
    assert.ok(ted.speaker.trim(), `講演者が空: ${id}`);
    assert.ok(
      ted.durationMinutes > 0 && ted.durationMinutes < 60,
      `講演時間が不正(${ted.durationMinutes}): ${id}`
    );
    // 採点AIに渡す講演の中身（書き起こし）
    const transcript = getTedTranscript(ted.talkId);
    assert.ok(
      transcript,
      `書き起こしが無い（src/data/ted-transcripts/${ted.talkId}.ts を置く）: ${id}`
    );
    assert.ok(
      transcript!.length >= 2000,
      `書き起こしが短すぎる(${transcript!.length}字): ${id}`
    );
    // 設問と講演のずれ検出。別の講演に差し替えるとタイトルの講演者名と食い違う
    assert.ok(
      title.includes(ted.speaker),
      `出題タイトルに講演者名が無い（別の講演を指している可能性）: ${id}`
    );
    // 採点へ渡る文面に書き起こしが載ること
    const info = buildTedLectureInfo(ted);
    assert.ok(
      info.includes("<lecture_transcript>") && info.includes(transcript!),
      `lectureInfo に書き起こしが載っていない: ${id}`
    );
  }

  const ids = talks.filter((t) => t.ted).map((t) => t.ted!.talkId);
  assert.equal(
    new Set(ids).size,
    ids.length,
    `同じ TED 講演が複数の出題で使われている: ${ids.join(", ")}`
  );

  console.log(`[verify-ted-lectures] OK (${count}件)`);
}

validate();
