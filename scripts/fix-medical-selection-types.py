"""全大学 (src/data/universities/*.json) で医療系学部の selectionType を補正する。

対象学部名パターン (正規表現):
  医学 / 歯学 / 獣医 / 薬学 / 看護 / 保健 / 医療 / リハビリ / 福祉

これらの学部は大学を問わず学校推薦型選抜 (公募推薦 / 指定校推薦) が
主要な非一般入試経路であり、データ上 comprehensive になっているものは
ほぼ誤分類とみなせる。現在 school_recommendation のものはそのまま。

対象外:
  - 大阪大学薬学部など、すでに school_recommendation 分類済みは触らない
  - 獣医学部は全 2 件が既に rec → 変更なし
  - 非医療系学部 (文・法・経・工 等) は大学ごとに事情が違うためスクリプトでは触らない
    (docs/data-audit-pending.md に記録、2026-09 予定のスクレイパーで対応)

kyutei.json は scripts/fix-kyutei-selection-types.py で既に補正済み、本スクリプトは
重複適用してもべき等 (既に rec なら変更しない)。
"""

import json
import pathlib
import re
import sys

DATA_DIR = pathlib.Path(__file__).parent.parent / "src/data/universities"

MEDICAL_PATTERN = re.compile(r"医学|歯学|獣医|薬学|看護|保健|医療|リハビリ|福祉")

# 例外: 福祉は必ずしも医療系ではない (社会福祉学部など) が、学校推薦型比率が高いため含める
# ただし「情報福祉」「経済福祉」など複合名は文系寄りの可能性があるので除外
EXCLUDE_PATTERN = re.compile(r"情報|経済|経営|法|文化|社会|スポーツ|国際|心理|教育|人間|総合")


def should_flip(name: str) -> bool:
    if not MEDICAL_PATTERN.search(name):
        return False
    # 福祉を含むが、前に「国際」「経済」「社会」など文系キーワードがある場合は除外
    if "福祉" in name and EXCLUDE_PATTERN.search(name):
        return False
    # 保健が「保健体育」「社会保健」など文系寄りの場合は除外
    if "保健" in name and EXCLUDE_PATTERN.search(name):
        return False
    return True


def main() -> int:
    files = sorted(p for p in DATA_DIR.glob("*.json") if not p.name.endswith(".bak"))
    all_changes: list[tuple[str, str, str, str]] = []
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for u in data:
            for fa in u.get("faculties", []):
                name = fa.get("name", "").strip()
                if not should_flip(name):
                    continue
                if fa.get("selectionType") == "school_recommendation":
                    continue
                before = fa.get("selectionType", "none")
                fa["selectionType"] = "school_recommendation"
                changed = True
                all_changes.append((path.name, u.get("name", "?"), name, before))
        if changed:
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"[WRITE] {path.name}")
    print()
    print(f"[DONE] {len(all_changes)} 件を school_recommendation に変更:")
    by_file: dict[str, int] = {}
    for fname, _, _, _ in all_changes:
        by_file[fname] = by_file.get(fname, 0) + 1
    for fname, n in sorted(by_file.items()):
        print(f"  {fname}: {n} 件")
    print()
    print("変更詳細 (最初の 60 件):")
    for fname, uname, fname_f, before in all_changes[:60]:
        print(f"  [{fname}] {uname} / {fname_f} : {before} -> school_recommendation")
    if len(all_changes) > 60:
        print(f"  ... 他 {len(all_changes) - 60} 件")
    return 0


if __name__ == "__main__":
    sys.exit(main())
