#!/usr/bin/env python3
"""
早慶上智データの修正:
1. 総合型/推薦型がない学部を削除
2. selectionType追加
3. 慶應の定員・選考方法修正
4. 上智法学部のAP修正（慶應のAPが入っている）
"""
import json

path = 'src/data/universities/soukeijochi.json'
data = json.load(open(path, 'r', encoding='utf-8'))

for u in data:
    # === 上智大学 ===
    if u['id'] == 'sophia-u':
        for fac in u['faculties']:
            fac['selectionType'] = 'school_recommendation'
        # 法学部のAPが慶應のものになっている問題を修正
        for fac in u['faculties']:
            if fac['id'] == 'law':
                if '慶應義塾' in fac.get('admissionPolicy', '') or 'FIT' in fac.get('admissionPolicy', ''):
                    fac['admissionPolicy'] = "法学部では、法律学科・国際関係法学科・地球環境法学科の3学科において、法的思考力と国際的視野を備えた人材を育成します。社会の諸問題に対して論理的に分析・考察できる能力、外国語によるコミュニケーション能力、そして法と正義に対する深い関心を持つ学生を求めます。"
                    print("  Fixed 上智法学部 AP (was keio's)")
        print(f"上智大学: {len(u['faculties'])} faculties, all school_recommendation")

    # === 慶應義塾大学 ===
    elif u['id'] == 'keio-u':
        # 総合型/推薦がない学部を削除
        remove_ids = {'economics', 'commerce', 'pharmacy'}
        u['faculties'] = [f for f in u['faculties'] if f['id'] not in remove_ids]
        print(f"慶應: removed {remove_ids}")

        for fac in u['faculties']:
            # selectionType設定
            if fac['id'] in ('environment-info', 'policy', 'nursingmedicine', 'law', 'science-eng', 'medicine'):
                fac['selectionType'] = 'comprehensive'
            elif fac['id'] == 'letters':
                fac['selectionType'] = 'school_recommendation'

            # 定員修正
            if fac['id'] == 'environment-info':
                fac['capacity'] = 150
            elif fac['id'] == 'policy':
                fac['capacity'] = 150
            elif fac['id'] == 'law':
                fac['capacity'] = 80
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "志望理由書、自己推薦書、調査書"},
                    {"type": "essay", "description": "A方式: 論述力試験（45分×2）"},
                    {"type": "interview", "description": "A方式: 口頭試問 / B方式: 面接"},
                ]
            elif fac['id'] == 'science-eng':
                fac['capacity'] = 24
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "志望理由書、研究概要書、調査書"},
                    {"type": "other", "description": "総合審査（筆記・記述）"},
                    {"type": "interview", "description": "面接"},
                ]
            elif fac['id'] == 'letters':
                fac['capacity'] = 120

        print(f"慶應: {len(u['faculties'])} faculties after cleanup")

    # === 早稲田大学 ===
    elif u['id'] == 'waseda-u':
        # 総合型がない学部を削除
        remove_ids = {'commerce', 'fundamental-science-eng', 'political-economy'}
        u['faculties'] = [f for f in u['faculties'] if f['id'] not in remove_ids]
        print(f"早稲田: removed {remove_ids}")

        for fac in u['faculties']:
            fac['selectionType'] = 'comprehensive'

            # 選考方法がダミー（documentsのみ）の学部を修正
            if fac['id'] == 'international-liberal-arts':
                fac['capacity'] = 100
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "志望理由エッセイ、書類審査"},
                    {"type": "essay", "description": "Critical Writing（英語）"},
                ]
            elif fac['id'] == 'creative-science-eng':
                fac['capacity'] = 25
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "自己PR資料、志望理由書"},
                    {"type": "other", "description": "ドローイング（鉛筆デッサン・空間表現）"},
                    {"type": "interview", "description": "面接（建築学科のみ）"},
                ]
            elif fac['id'] == 'advanced-science-eng':
                fac['capacity'] = 5
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "活動実績証明書、志望理由書"},
                    {"type": "interview", "description": "面接（口頭試問含む）"},
                ]
            elif fac['id'] == 'human':
                fac['capacity'] = 10
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "志望理由書、自己推薦書"},
                    {"type": "essay", "description": "論述（120分）"},
                    {"type": "interview", "description": "面接（20分）"},
                ]
            elif fac['id'] == 'education':
                fac['capacity'] = 10
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "課題レポート、志望理由書"},
                    {"type": "other", "description": "総合試験（120分）"},
                    {"type": "test", "description": "共通テスト（300点中240点以上）"},
                ]
            elif fac['id'] == 'letters':
                fac['capacity'] = 10
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "課題レポート、志望理由書"},
                    {"type": "other", "description": "総合試験（120分）"},
                    {"type": "test", "description": "共通テスト"},
                ]
            elif fac['id'] == 'law':
                fac['capacity'] = 10
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "課題レポート、志望理由書"},
                    {"type": "other", "description": "総合試験（120分）"},
                    {"type": "test", "description": "共通テスト"},
                ]
            elif fac['id'] == 'culture-media':
                fac['capacity'] = 15
                fac['selectionMethods'] = [
                    {"type": "documents", "description": "志望理由書、活動記録報告書"},
                    {"type": "essay", "description": "Critical Writing"},
                ]

            # cap=311のダミー値を修正
            if fac.get('capacity') == 311:
                fac['capacity'] = 10  # デフォルト若干名

        print(f"早稲田: {len(u['faculties'])} faculties after cleanup")

json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"\nSaved {path}")
