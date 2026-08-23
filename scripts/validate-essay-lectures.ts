import { getAllLectures } from "../src/data/essay-lectures";
import { ESSAY_BLOCK_IDS } from "../src/lib/types/essay-block";
import { SENTENCE_DRILL_KINDS } from "../src/lib/types/sentence-drill";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[essay-lectures] ${msg}`);
  errors++;
};

const lectures = getAllLectures();
const seen = new Set<string>();

for (const l of lectures) {
  if (seen.has(l.id)) fail(`dup id: ${l.id}`);
  seen.add(l.id);

  for (const s of l.scenes ?? []) {
    if (s.caption.trim().length < 10) fail(`short caption: ${l.id}/${s.id}`);
    if (s.visual === "manuscript" && !s.manuscript?.lines.length) {
      fail(`manuscript scene without lines: ${l.id}/${s.id}`);
    }
    if (
      s.visual === "blocks" &&
      !s.blocks?.filled.length &&
      !s.blocks?.missing?.length
    ) {
      fail(`blocks scene without blocks: ${l.id}/${s.id}`);
    }
    for (const b of s.blocks?.filled ?? []) {
      if (!ESSAY_BLOCK_IDS.includes(b)) {
        fail(`unknown block: ${l.id}/${s.id}/${b}`);
      }
    }
    if (s.highlightBlock && !ESSAY_BLOCK_IDS.includes(s.highlightBlock)) {
      fail(`unknown highlightBlock: ${l.id}/${s.id}`);
    }
    if (s.visual === "compare") {
      if (!s.compare) fail(`compare scene without compare: ${l.id}/${s.id}`);
      else {
        if (s.compare.before === s.compare.after) {
          fail(`compare before/after identical: ${l.id}/${s.id}`);
        }
        // highlight は after にだけある語。before にもあると「変わった箇所」にならない
        for (const w of s.compare.highlight) {
          if (!s.compare.after.includes(w)) {
            fail(`highlight not in after: ${l.id}/${s.id}/${w}`);
          }
          if (s.compare.before.includes(w)) {
            fail(`highlight also in before: ${l.id}/${s.id}/${w}`);
          }
        }
        if (s.compare.note.trim().length < 4) {
          fail(`short compare note: ${l.id}/${s.id}`);
        }
      }
    }
    if (s.visual === "diagram") {
      if (!s.diagram?.items.length) {
        fail(`diagram scene without items: ${l.id}/${s.id}`);
      } else {
        for (const item of s.diagram.items) {
          if (item.value <= 0)
            fail(`diagram item value <= 0: ${l.id}/${s.id}/${item.label}`);
        }
      }
    }
  }

  // アニメ講は6〜10シーン（少ないと講義にならず、多いと最後まで進まない）
  if (l.scenes && (l.scenes.length < 6 || l.scenes.length > 10)) {
    fail(`scene count ${l.scenes.length} out of range: ${l.id}`);
  }

  if (l.drill && !SENTENCE_DRILL_KINDS.includes(l.drill.kind)) {
    fail(`unknown drill kind: ${l.id}`);
  }

  const bid = l.exercise.blockId;
  if (bid && !ESSAY_BLOCK_IDS.includes(bid)) {
    fail(`unknown exercise blockId: ${l.id}`);
  }
}

if (errors > 0) {
  console.error(`[essay-lectures] ${errors} error(s)`);
  process.exit(1);
}
console.log(`[essay-lectures] OK (${lectures.length} lectures)`);
