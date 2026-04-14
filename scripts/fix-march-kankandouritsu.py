#!/usr/bin/env python3
"""MARCH + 関関同立のデータ修正"""
import json

def fix_march():
    path = 'src/data/universities/march.json'
    data = json.load(open(path, 'r', encoding='utf-8'))

    for u in data:
        # === 明治大学 ===
        if u['id'] == 'meiji-u':
            cap_map = {'letters': 42, 'agriculture': 49, 'science-eng': 22, 'math-science': 10,
                       'political-economy': 30, 'commerce': 60, 'international-japan': 12, 'law': 5}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]

        # === 青山学院大学 ===
        elif u['id'] == 'aoyama-u':
            # 自己推薦がある学部のみ残す
            keep_ids = {'letters', 'global-community', 'community-human', 'science-eng'}
            u['faculties'] = [f for f in u['faculties'] if f['id'] in keep_ids]
            cap_map = {'letters': 51, 'global-community': 31, 'community-human': 12, 'science-eng': 20}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]
            print(f"  青山学院: {len(u['faculties'])} faculties (removed non-sogo)")

        # === 立教大学 ===
        elif u['id'] == 'rikkyo-u':
            cap_map = {'letters': 95, 'letters-2': 20, 'economics': 60, 'business': 70,
                       'science': 48, 'sociology': 15, 'law': 24, 'tourism': 18,
                       'community-welfare': 28, 'modern-psychology': 30, 'sports-wellness': 30,
                       'environment': 30, 'glap': 12}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]

        # === 中央大学 ===
        elif u['id'] == 'chuo-u':
            cap_map = {'law': 90, 'economics': 60, 'commerce': 10, 'letters': 60,
                       'international-business': 25, 'international-info': 10, 'policy': 10,
                       'science-eng': 20}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]

        # === 法政大学 ===
        elif u['id'] == 'hosei-u':
            # 総合型がない可能性のある学部を削除
            remove_ids = {'social', 'design-eng', 'bioscience'}
            u['faculties'] = [f for f in u['faculties'] if f['id'] not in remove_ids]
            cap_map = {'letters': 38, 'law': 5, 'business': 5, 'international-culture': 40,
                       'human-environment': 20, 'modern-welfare': 14, 'career-design': 25,
                       'gis': 40, 'sports-health': 40, 'info-science': 10, 'science-eng': 12,
                       'economics': 5}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]
            print(f"  法政: {len(u['faculties'])} faculties")

    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("Saved march.json")

def fix_kankandouritsu():
    path = 'src/data/universities/kankandouritsu.json'
    data = json.load(open(path, 'r', encoding='utf-8'))

    for u in data:
        # === 同志社大学 ===
        if u['id'] == 'doshisha-u':
            cap_map = {'theology': 6, 'letters': 27, 'law': 20, 'economics': 10, 'commerce': 10,
                       'policy': 10, 'culture-info': 22, 'psychology': 4, 'global-comm': 20,
                       'globalregionalletters': 20, 'social': 5, 'science-eng': 10,
                       'life-medical': 2, 'sports-health': 4, 'international': 5}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]

        # === 立命館大学 ===
        elif u['id'] == 'ritsumeikan-u':
            # 法学部を削除（AO未実施）
            u['faculties'] = [f for f in u['faculties'] if f['id'] != 'law']
            cap_map = {'industrial-social': 54, 'international': 73, 'letters': 63,
                       'business': 17, 'film': 25, 'economics': 24, 'food-management': 25,
                       'science-eng': 36, 'info-science-eng': 30, 'life-science': 18,
                       'pharmacy': 9, 'sports-health': 15, 'policy': 25, 'psychology': 14,
                       'global-liberal-arts': 12}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]
            print(f"  立命館: {len(u['faculties'])} faculties (removed law)")

        # === 関西大学 ===
        elif u['id'] == 'kansai-u':
            cap_map = {'law': 25, 'letters': 10, 'economics': 5, 'commerce': 5, 'social': 10,
                       'policy': 5, 'foreign-languages': 15, 'human-health': 10,
                       'general-info': 10, 'social-safety': 5, 'business-data-science': 29,
                       'system-science-eng': 10, 'environment-urban-eng': 8, 'chemistry-life-eng': 11}
            gpa_map = {'social-safety': 3.5, 'human-health': 3.5, 'business-data-science': 3.8}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]
                if fac['id'] in gpa_map:
                    if 'requirements' not in fac:
                        fac['requirements'] = {}
                    fac['requirements']['gpa'] = gpa_map[fac['id']]

        # === 関西学院大学 ===
        elif u['id'] == 'kwansei-u':
            cap_map = {'theology': 10, 'letters': 5, 'economics': 13, 'commerce': 15,
                       'human-welfare': 10, 'international': 5, 'education': 40,
                       'general-policy': 15, 'science': 13, 'engineering': 16,
                       'life-environment': 15, 'architecture': 7, 'social': 5, 'law': 5}
            for fac in u['faculties']:
                fac['selectionType'] = 'comprehensive'
                if fac['id'] in cap_map:
                    fac['capacity'] = cap_map[fac['id']]
                # 選考方法がdocumentsのみの場合、多段階に修正
                methods = fac.get('selectionMethods', [])
                if len(methods) == 1 and methods[0].get('type') == 'documents':
                    fac['selectionMethods'] = [
                        {"type": "documents", "description": "志願理由書・活動報告書・調査書"},
                        {"type": "essay", "description": "筆記試験（小論文等）"},
                        {"type": "interview", "description": "面接・口頭試問"},
                    ]

    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("Saved kankandouritsu.json")

if __name__ == '__main__':
    fix_march()
    fix_kankandouritsu()
    print("\nDone!")
