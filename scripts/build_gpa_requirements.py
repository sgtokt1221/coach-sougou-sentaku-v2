#!/usr/bin/env python3
"""大学の要求評定(requirements.gpa)を実際の入試要項から「学部単位」で抽出する。

ソース: 各大学の admissionUrl（総合型/学校推薦の募集ページ）の HTML ＋ リンク先募集要項 PDF。
bbbot は使わない。捏造しない（要項に明記された「評定平均 X.X 以上」のみ採用）。

抽出方針（精度優先）:
- 「全体の評定平均値/全体の学習成績の状況 が X.X 以上」= 出願資格の総合評定のみ採用。
  科目別（英語の評定平均値 等）は除外（誤検出防止）。
- 1 大学のページ＋PDF群から得た総合評定の distinct 値がちょうど1つのときのみ確定し、
  その大学の対象学部(gpa null)全てに適用。0=なし、複数=曖昧(スキップ)。

対象: 主要グループ かつ requirements.gpa が null の学部。
出力: scripts/gpa-requirements.json  { "<uniId>": { "gpa": N, "sourceUrl": "..." } }

実行: python3 scripts/build_gpa_requirements.py
"""
import json
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parent.parent
UNI_DIR = ROOT / "src" / "data" / "universities"
OUT = Path(__file__).resolve().parent / "gpa-requirements.json"

TARGET_GROUPS = {
    "kyutei", "soukeijochi", "march", "kankandouritsu",
    "sankinkohryu", "nittoukomasen", "seiseimeidoku", "sesshintsuitou",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en;q=0.9",
}

# 評定平均/学習成績の状況 が X.X 以上（「全体の」有無どちらも）。科目別は SUBJECT_RE で除外。
OVERALL_RE = re.compile(
    r"(?:評定平均値?|学習成績の状況)[^0-9]{0,10}([0-9](?:\.[0-9])?)\s*以上"
)
# マッチ直前(~12文字)にこれらがあれば科目別（総合評定でない）として除外
SUBJECT_RE = re.compile(
    r"(英語|国語|数学|理科|地理|歴史|地歴|公民|外国語|物理|化学|生物|地学|科目|教科)"
)
PDF_HREF_RE = re.compile(r"href=[\"']([^\"']+\.pdf)", re.I)
# 総合型選抜の募集要項へ1階層深く辿るための HTML リンク優先語（公募/指定校は除外）
SUBPAGE_RE = re.compile(r"(総合型|総合選抜|自己推薦|ao|募集要項|要項|出願|nyushi|admission)", re.I)
HREF_RE = re.compile(r"href=[\"']([^\"'#]+)[\"']", re.I)
# 総合型選抜のみ（公募/指定校/学校推薦は方針1の floor を不当に下げうるので含めない）
PDF_PRIORITY = re.compile(r"(募集要項|要項|application|guide|総合型|総合選抜|自己推薦|ao)", re.I)


def fetch(url: str, timeout: int = 25) -> bytes | None:
    # 1) urllib
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception:
        pass
    # 2) curl フォールバック（ブラウザ相当ヘッダ＋圧縮対応。urllib が 403/TLS で弾かれる site 用）
    try:
        res = subprocess.run(
            [
                "curl", "-sL", "--compressed", "--max-time", str(timeout),
                "-A", HEADERS["User-Agent"],
                "-H", f"Accept: {HEADERS['Accept']}",
                "-H", f"Accept-Language: {HEADERS['Accept-Language']}",
                url,
            ],
            capture_output=True, timeout=timeout + 10,
        )
        if res.returncode == 0 and res.stdout:
            return res.stdout
    except Exception:
        pass
    return None


def pdf_text(data: bytes) -> str:
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
            f.write(data)
            f.flush()
            res = subprocess.run(
                ["pdftotext", "-layout", f.name, "-"],
                capture_output=True, timeout=60,
            )
            return res.stdout.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def html_to_lines(html: str) -> str:
    t = re.sub(r"<\s*(br|/p|/tr|/div|/li|/td|/th|/h[1-6])[^>]*>", "\n", html, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    return t


def _host(u: str) -> str:
    try:
        return urlparse(u).netloc
    except Exception:
        return ""


def combined_text(url: str) -> tuple[str, str]:
    raw = fetch(url)
    if raw is None:
        return "", "blocked"
    html = raw.decode("utf-8", errors="ignore")
    parts = [html_to_lines(html)]
    pdfs = [urljoin(url, h) for h in PDF_HREF_RE.findall(html)]

    # 募集要項に1階層深く辿る（同一ホスト・優先語リンクを最大6本）。本文＋PDFを追加収集。
    host = _host(url)
    sub_candidates = []
    for h in HREF_RE.findall(html):
        absu = urljoin(url, h)
        if absu == url or absu.lower().endswith(".pdf"):
            continue
        if _host(absu) != host:
            continue
        if SUBPAGE_RE.search(absu):
            sub_candidates.append(absu)
    sub_candidates = list(dict.fromkeys(sub_candidates))
    # 具体的な語(総合型/募集要項/要項)を優先
    sub_candidates.sort(key=lambda u: 0 if re.search(r"(総合型|募集要項|要項|自己推薦|公募|学校推薦)", u) else 1)
    for su in sub_candidates[:6]:
        sraw = fetch(su, timeout=20)
        if not sraw:
            continue
        shtml = sraw.decode("utf-8", errors="ignore")
        parts.append(html_to_lines(shtml))
        pdfs += [urljoin(su, h) for h in PDF_HREF_RE.findall(shtml)]

    # PDF を収集（優先語つきを先頭、最大12本）
    pdfs = list(dict.fromkeys(pdfs))
    pdfs.sort(key=lambda u: 0 if PDF_PRIORITY.search(u) else 1)
    for purl in pdfs[:12]:
        data = fetch(purl, timeout=40)
        if not data or data[:4] != b"%PDF":
            continue
        parts.append(pdf_text(data))
    return "\n".join(parts), "ok"


def _collect(text: str) -> list:
    """総合評定の(値, 位置)一覧。科目別(英語の評定平均 等)は除外。"""
    out = []
    for m in OVERALL_RE.finditer(text):
        before = text[max(0, m.start() - 14):m.start()]
        if SUBJECT_RE.search(before):
            continue  # 科目別はスキップ
        try:
            v = float(m.group(1))
        except ValueError:
            continue
        if 2.0 <= v <= 5.0:
            out.append((v, m.start()))
    return out


def overall_values(text: str) -> set:
    """総合評定の distinct 値(2.0〜5.0)。"""
    return {v for v, _ in _collect(text)}


def faculty_keys(name: str) -> list:
    """照合キー。フル名は必須、コア名(学部除去)は3文字以上のときのみ。"""
    keys = [name]
    core = re.sub(r"(学部|学群|学域|学類|学科|部)$", "", name)
    if core and core != name and len(core) >= 3:
        keys.append(core)
    return keys


def gpa_near_faculty(text: str, name: str, window: int = 400) -> float | None:
    """学部名の出現位置の直後 window 文字以内にある総合評定を学部の評定とする(最小値)。"""
    vals = set()
    for key in faculty_keys(name):
        start = 0
        while True:
            i = text.find(key, start)
            if i < 0:
                break
            seg = text[i : i + window]
            for v, _ in _collect(seg):
                vals.add(v)
            start = i + len(key)
    return min(vals) if vals else None


def main() -> None:
    # 対象大学（uniId -> {name, url, faculties:[{id,name}]}）
    targets: dict[str, dict] = {}
    for f in sorted(UNI_DIR.glob("*.json")):
        for u in json.loads(f.read_text(encoding="utf-8")):
            if u.get("group") not in TARGET_GROUPS:
                continue
            facs = []
            url = None
            for fac in u.get("faculties", []):
                req = fac.get("requirements") or {}
                if req.get("gpa") is None:
                    facs.append({"id": fac["id"], "name": fac.get("name", "")})
                    if fac.get("admissionUrl") and not url:
                        url = fac["admissionUrl"]
            if facs and url:
                targets[u["id"]] = {"name": u["name"], "url": url, "faculties": facs}

    print(f"対象大学: {len(targets)}", flush=True)
    result: dict[str, dict] = {}
    report = {"found": [], "ambiguous": [], "none": [], "blocked": []}
    for uid, info in targets.items():
        text, status = combined_text(info["url"])
        if status == "blocked":
            report["blocked"].append(info["name"])
            print(f"  {info['name']}: blocked", flush=True)
            continue
        vals = overall_values(text)
        per_fac: dict[str, float] = {}

        # 学部別: 「同一行に 学部名 と 全体評定値(以上)」がある行のみ採用（誤紐付け回避）。
        # 例「●法学部 ●国際学部 …：全体の学習成績の状況が3.5以上」→ 列挙学部=3.5。
        # 学部ごとに最小値(=出願できる最低ライン)を採用。
        for ln in text.splitlines():
            lv = [v for v, _ in _collect(ln)]
            if not lv:
                continue
            line_min = min(lv)
            for fac in info["faculties"]:
                if any(k in ln for k in faculty_keys(fac["name"])):
                    cur = per_fac.get(fac["id"])
                    per_fac[fac["id"]] = line_min if cur is None else min(cur, line_min)

        # 方針1(floor): 学部別の明示が無い対象学部は、大学の総合型 最低評定を適用
        if vals:
            uni_floor = min(vals)
            for fac in info["faculties"]:
                per_fac.setdefault(fac["id"], uni_floor)

        if per_fac:
            result[uid] = per_fac
            uniq = sorted(set(per_fac.values()))
            report["found"].append(f"{info['name']}={uniq}({len(per_fac)}学部)")
            print(f"  {info['name']}: {len(per_fac)}学部 {uniq}", flush=True)
        elif len(vals) > 1:
            report["ambiguous"].append(f"{info['name']}={sorted(vals)}(同一行で学部紐付け不可)")
            print(f"  {info['name']}: 評定あり/同一行紐付け不可 {sorted(vals)}", flush=True)
        else:
            report["none"].append(info["name"])
            print(f"  {info['name']}: 全体評定の数値記述なし(要確認)", flush=True)

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\n=== レポート ===")
    print(f"確定(found): {len(report['found'])}  {report['found']}")
    print(f"曖昧(ambiguous): {len(report['ambiguous'])}  {report['ambiguous']}")
    print(f"評定なし: {len(report['none'])}")
    print(f"取得失敗: {len(report['blocked'])}  {report['blocked']}")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
