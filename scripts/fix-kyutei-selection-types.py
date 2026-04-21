"""旧帝大 (kyutei.json) の selectionType 分類を 2026年1月時点の知識で補正する。

対象:
- 京都大学 (kyoto-u): 薬学部を除く 9 学部を school_recommendation に変更
  └ 京大「特色入試」はほぼ全学部で実施、大半が学校推薦型選抜枠
    薬学部特色入試は薬学科が総合型選抜（薬科学科は推薦型だが、今回はシンプル化のため薬学部全体を総合型のまま維持）
- 北海道大学 (hokkaido-u): 医学部 / 歯学部 / 獣医学部 を school_recommendation に変更
  └ フロンティア入試 Type I (学校推薦型) が医・歯・獣医で中心
- 九州大学 (kyushu-u): 医学部 / 歯学部 / 薬学部 を school_recommendation に変更
  └ 学校推薦型 II が医・歯・薬で設置
- 東北大学 (tohoku-u): 医学部 / 歯学部 / 薬学部 を school_recommendation に変更
  └ 医学科 / 歯学科 / 薬学科の推薦入試枠

変更しないもの:
- 東京大学: 既に全学部 school_recommendation (東大の総合型推薦は学校推薦型のみ) → 正しい
- 大阪大学: 既に学部ごとに混在分類済み → 基本的に正しい
- 名古屋大学: 2学部のみデータあり → 既に分類済み

不確実な点 (docs/data-audit-pending.md に記録):
- 各大学で実際には「総合型 + 推薦型の両方」を実施している学部が多い
- 本スクリプトは単一 selectionType の付替えのみ (Pattern α)
- 完全な分類にはエントリ分割 (Pattern β) が必要 → スクレイパー実装時に対応
"""

import json
import pathlib
import sys

DATA_PATH = pathlib.Path(__file__).parent.parent / "src/data/universities/kyutei.json"

# 各大学の「学校推薦型選抜」に変更すべき学部 id のセット
# (key = 大学 id, value = rec に変更する faculty.id の集合)
REC_TARGETS: dict[str, set[str]] = {
    # 京都大学: 薬学部 (pharmacy) 以外の全学部を推薦型に
    "kyoto-u": {
        "medicine",
        "economics",
        "law",
        "education",
        "generalhuman",
        "science",
        "letters",
        "agriculture",
        "engineering",
    },
    # 北海道大学: 医学部(医学科=medicine-2) / 歯学部 / 獣医学部(id=medicine)
    "hokkaido-u": {
        "medicine-2",
        "dentistry",
        "medicine",  # 獣医学部 (name='獣医学部 ')
    },
    # 九州大学: 医学部 / 歯学部 / 薬学部
    "kyushu-u": {
        "medicine",
        "dentistry",
        "pharmacy",
    },
    # 東北大学: 医学部 / 歯学部 / 薬学部
    "tohoku-u": {
        "medicine",
        "dentistry",
        "pharmacy",
    },
}


def main() -> int:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    changes: list[tuple[str, str, str, str, str]] = []
    for u in data:
        uid = u.get("id")
        targets = REC_TARGETS.get(uid)
        if not targets:
            continue
        for fa in u.get("faculties", []):
            fid = fa.get("id")
            if fid not in targets:
                continue
            before = fa.get("selectionType", "none")
            if before == "school_recommendation":
                continue
            fa["selectionType"] = "school_recommendation"
            changes.append((uid, u.get("name"), fid, fa.get("name"), before))
    # 書き戻し (2-space indent + 末尾改行、日本語は ensure_ascii=False)
    DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[OK] {len(changes)} 件の selectionType を 'school_recommendation' に変更:")
    for uid, uname, fid, fname, before in changes:
        print(f"  - {uname} ({uid}) / {fname} (id={fid}) : {before} -> school_recommendation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
