#!/usr/bin/env python3
"""河合塾 Kei-Net 2026 偏差値ランキング PDF から大学単位の偏差値を抽出する。

出典: 河合塾 Kei-Net 2026 入試難易予想一覧表（学部学科ランク）。
- 国公立: g_dai_k01.pdf 〜 g_dai_k07.pdf（7地区）
- 私立:   g_dai_s01.pdf 〜 g_dai_s07.pdf（7地区）

PDF は2段組（左右）で、列=大学名/学部/学科/偏差値。大学名は各ブロック先頭行のみ。
ページ中央x で左右に分割し、各半の最左x帯=大学名列として大学名を carry しつつ
偏差値(30〜80の小数)を大学単位で収集する（学部単位は今回スキップ）。

出力: scripts/keinet-deviations.json
  { "kokkou": { "<短大学名>": {"min":N,"max":N} }, "shiritsu": { ... } }

実行: python3 scripts/build_keinet_deviations.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

import pdfplumber

BASE_URL = "https://www.keinet.ne.jp/exam/ranking/2026/"
GROUPS = {
    "kokkou": [f"g_dai_k0{i}.pdf" for i in range(1, 8)],
    "shiritsu": [f"g_dai_s0{i}.pdf" for i in range(1, 8)],
}
CACHE = Path("/tmp/keinet")
OUT = Path(__file__).resolve().parent / "keinet-deviations.json"

DEV_RE = re.compile(r"^\d{2}(\.\d)?$")
JP_RE = re.compile(r"[一-鿿ぁ-んァ-ヶ]")
NOISE = {"大学名", "大学", "学部", "学科", "偏差値"}


def is_dev(t: str) -> bool:
    """偏差値(30〜80)の数値か"""
    if not DEV_RE.fullmatch(t):
        return False
    return 30.0 <= float(t) <= 80.0


def fetch(name: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dst = CACHE / name
    if dst.exists() and dst.stat().st_size > 1000:
        return dst
    req = urllib.request.Request(BASE_URL + name, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dst.write_bytes(r.read())
    return dst


def parse_pdf(path: Path) -> dict:
    """1 PDF を解析し {大学名: [偏差値,...]} を返す"""
    out: dict[str, list[float]] = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words(keep_blank_chars=False)
            mid = page.width / 2
            for half in (
                [w for w in words if w["x0"] < mid],
                [w for w in words if w["x0"] >= mid],
            ):
                if not half:
                    continue
                left_edge = min(w["x0"] for w in half)
                rows: dict[int, list] = {}
                for w in half:
                    rows.setdefault(round(w["top"] / 3.0), []).append(w)
                cur = None
                for k in sorted(rows):
                    toks = sorted(rows[k], key=lambda w: w["x0"])
                    # 大学名列 = 最左x帯の非数値トークン
                    name_toks = [
                        t for t in toks
                        if t["x0"] < left_edge + 10
                        and not is_dev(t["text"])
                        and not re.fullmatch(r"[（）\-–]+", t["text"])
                    ]
                    devs = [float(t["text"]) for t in toks if is_dev(t["text"])]
                    if name_toks:
                        nm = "".join(t["text"] for t in name_toks)
                        if JP_RE.search(nm) and nm not in NOISE:
                            cur = nm
                    if cur and devs:
                        out.setdefault(cur, []).extend(devs)
    return out


def main() -> None:
    result: dict[str, dict] = {}
    for grp, files in GROUPS.items():
        agg: dict[str, list[float]] = {}
        for name in files:
            path = fetch(name)
            part = parse_pdf(path)
            for uni, vals in part.items():
                agg.setdefault(uni, []).extend(vals)
            print(f"  {name}: {len(part)} 大学", file=sys.stderr)
        result[grp] = {
            uni: {"min": min(vals), "max": max(vals)}
            for uni, vals in agg.items()
            if vals
        }
        print(f"[{grp}] 合計 {len(result[grp])} 大学", file=sys.stderr)

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"-> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
