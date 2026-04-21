#!/usr/bin/env python3
"""
OMU の学部データを総合型選抜実施の3学部に絞り込むスクリプト。
残す: medicine (医学部医学科), engineering (工学部), general (現代システム科学域 教育福祉学類)
削除: agriculture, nursing, economics, commerce, medicine-2, letters, science, general-2, medicine-rehab, law
"""
import json
from pathlib import Path

FILE = Path("src/data/universities/national.json")
KEEP_IDS = {"medicine", "engineering", "general"}


def main():
    data = json.load(open(FILE))
    omu = None
    for u in data:
        if u.get("id") == "omu":
            omu = u
            break
    if omu is None:
        raise RuntimeError("OMU not found")

    before = len(omu["faculties"])
    kept = [f for f in omu["faculties"] if f["id"] in KEEP_IDS]
    removed = [f["id"] for f in omu["faculties"] if f["id"] not in KEEP_IDS]
    omu["faculties"] = kept

    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"学部数: {before} → {len(kept)}")
    print(f"削除: {removed}")
    print(f"残存:")
    for f in kept:
        print(f"  {f['id']:15s}: {f['name']} capacity={f['capacity']} type={f['selectionType']}")


if __name__ == "__main__":
    main()
