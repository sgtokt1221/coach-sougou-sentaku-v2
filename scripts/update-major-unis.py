#!/usr/bin/env python3
"""
主要大学のデータを修正・補完するスクリプト
- 神戸大学: 2学部→10学部に拡張
- 一橋大学: 新規追加（5学部）
- 東京科学大学: 2学部→6学部に拡張
- 旧帝大のselectionType設定
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'universities')

def update_national():
    path = os.path.join(BASE, 'national.json')
    data = json.load(open(path, 'r', encoding='utf-8'))

    # 1. 神戸大学を更新
    kobe_faculties = [
        {
            "id": "literature", "name": "文学部",
            "admissionPolicy": "文学部では、みずみずしい感受性と想像力を持ち、言葉や文化、人間行動への幅広い関心を持つ学生を求めます。論理的思考力と読解・表現能力を備え、既成の価値観にとらわれず自ら問題を探究できる姿勢が必要です。",
            "capacity": 3, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（300点）"}, {"type": "interview", "description": "面接・小論文"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "international-human", "name": "国際人間科学部",
            "admissionPolicy": "国際人間科学部では、現代社会の問題を多面的に分析できる基礎能力を有し、異なる考え方や文化を尊重し共感をもってコミュニケーションを行う資質を持つ学生を求めます。グローバル規模で問題解決し社会貢献する意欲を持ち、グローバル共生社会実現に貢献する協働型人材を養成します。",
            "capacity": 46, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "other", "description": "総合問題・実技"}, {"type": "test", "description": "共通テスト"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2026-02-10"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "law", "name": "法学部",
            "admissionPolicy": "法学部では、優れた日本語・外国語読解力と理論的思考能力を持ち、法学・政治学の専門知識習得に意欲的な学生を求めます。国際的な領域での活躍を希望し、幅広い視野のもとで法学・政治学の専門的知識を積極的に活かそうとする学生を歓迎します。",
            "capacity": 3, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（200点）"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "science", "name": "理学部",
            "admissionPolicy": "理学部では、数学・理科分野が対象とする多彩な自然現象に対し旺盛な知識欲をもち、批判的精神と独立心に富んだ見方や考え方ができる学生を求めます。",
            "capacity": 5, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "小論文（300点）"}, {"type": "interview", "description": "面接（200点）"}],
            "schedule": {"applicationStart": "2025-10-31", "applicationEnd": "2025-11-06", "examDate": "2025-12-06", "resultDate": "2025-12-20"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "medicine", "name": "医学部医学科",
            "admissionPolicy": "医学部医学科では、生命科学・医学に強い興味を持ち、探究心と学習意欲が旺盛な学生を求めます。高い倫理観と高度な専門知識を備えた医師および研究者を育成します。",
            "capacity": 10, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "共通テスト受験必須"]},
            "selectionMethods": [{"type": "test", "description": "共通テスト（825点満点）による第1段階選抜"}, {"type": "interview", "description": "面接（100点）"}],
            "schedule": {"applicationStart": "2026-01-14", "applicationEnd": "2026-01-21", "examDate": "2026-02-08", "resultDate": "2026-02-10"},
            "admissionUrl": "https://www.med.kobe-u.ac.jp/education/sm/exam/"
        },
        {
            "id": "health-sciences", "name": "医学部保健学科",
            "admissionPolicy": "医学部保健学科では、明確な目的意識と旺盛な学習意欲を持ち、ひとに対する深い思いやりと協調性、優れたコミュニケーション能力を持った学生を求めます。",
            "capacity": 13, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（350点）"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "engineering", "name": "工学部",
            "admissionPolicy": "工学部では、旺盛な好奇心と探求心を持ち、自由な発想と批判的精神を持つ学生を求めます。持続可能な社会実現のための科学・技術を探求する技術者・研究者を育成します。",
            "capacity": 11, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役", "数Ⅱ・Ⅲ、物理・化学履修必須"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（350点）"}, {"type": "interview", "description": "面接"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "system-informatics", "name": "システム情報学部",
            "admissionPolicy": "システム情報学部では、高等学校の教育内容全般の基礎知識と理科系科目に関する優れた思考力や判断力を有する学生を求めます。社会の様々な問題の解決や新しい価値の共創を主導できる人材を育成します。",
            "capacity": 5, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.5, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（350点）"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "agriculture", "name": "農学部",
            "admissionPolicy": "農学部では、人間と自然のかかわり合いに強い関心を持ち、未知の現象の解明や独創的な技術開発に意欲的に取り組める学生を歓迎します。食料・環境・健康分野で国際社会に貢献できる人材を育成します。",
            "capacity": 12, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（350点）"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
        {
            "id": "maritime-policy", "name": "海洋政策科学部",
            "admissionPolicy": "海洋政策科学部では、海洋に関わる自然科学、科学技術および海洋政策に興味を持つ学生、また海や船に関わる社会への貢献に関心や意欲のある学生を求めます。",
            "capacity": 15, "selectionType": "comprehensive",
            "requirements": {"gpa": 4.0, "certifications": [], "otherRequirements": ["専願", "現役"]},
            "selectionMethods": [{"type": "documents", "description": "調査書、志望理由書、活動報告書"}, {"type": "essay", "description": "総合問題（175点）"}],
            "schedule": {"applicationStart": "2025-09-01", "applicationEnd": "2025-09-05", "examDate": "2025-09-27", "resultDate": "2025-11-27"},
            "admissionUrl": "https://www.kobe-u.ac.jp/ja/admissions/undergraduate/requirements/"
        },
    ]

    for u in data:
        if u['id'] == 'kobe-u':
            u['faculties'] = kobe_faculties
            u['officialUrl'] = 'https://www.kobe-u.ac.jp/'
            print(f"Updated 神戸大学: {len(kobe_faculties)} faculties")
            break

    # 2. 一橋大学を追加
    hitotsubashi_common_methods = [
        {"type": "test", "description": "共通テスト（6教科8科目）"},
        {"type": "essay", "description": "小論文"},
        {"type": "interview", "description": "面接"},
        {"type": "documents", "description": "調査書、推薦書、自己推薦書"},
    ]
    hitotsubashi_common_reqs = {
        "gpa": None,
        "certifications": ["英検1級", "TOEFL iBT 93点以上", "IELTS 6.5以上"],
        "otherRequirements": ["専願", "現役", "共通テスト6教科8科目", "英語資格または数学オリンピックAランク以上等"]
    }
    hitotsubashi_common_schedule = {
        "applicationStart": "2026-01-19", "applicationEnd": "2026-01-30",
        "examDate": "2026-02-08", "resultDate": "2026-02-10"
    }
    hitotsubashi = {
        "id": "hitotsubashi-u", "name": "一橋大学", "shortName": "一橋",
        "group": "national", "officialUrl": "https://www.hit-u.ac.jp/",
        "faculties": [
            {"id": "commerce", "name": "商学部", "selectionType": "school_recommendation",
             "admissionPolicy": "商学部では、企業や市場に関連した現象に対して進んで関心を持ち、それを深く観察することで解決すべき問題を設定し、創造的解決能力とリーダーシップを持つ人材を育成します。",
             "capacity": 15, "requirements": hitotsubashi_common_reqs, "selectionMethods": hitotsubashi_common_methods,
             "schedule": hitotsubashi_common_schedule, "admissionUrl": "https://juken.hit-u.ac.jp/admission/info/guidelines/"},
            {"id": "economics", "name": "経済学部", "selectionType": "school_recommendation",
             "admissionPolicy": "経済学部では、経済学修得に必要な知識・技能、幅広い教養、グローバルコミュニケーション能力を備えた学生を求めます。経済・社会における様々な問題に対して自ら課題を設定し、説得力のある議論に基づいて解決方法を提案する思考力を持つ学生を歓迎します。",
             "capacity": 15, "requirements": hitotsubashi_common_reqs, "selectionMethods": hitotsubashi_common_methods,
             "schedule": hitotsubashi_common_schedule, "admissionUrl": "https://juken.hit-u.ac.jp/admission/info/guidelines/"},
            {"id": "law", "name": "法学部", "selectionType": "school_recommendation",
             "admissionPolicy": "法学部では、豊かな教養と市民的公共性を備えた、構想力ある専門人、理性ある革新者、指導力ある政治経済人の育成を目指します。社会問題理解のための基礎知識・技能、論理的に思考し明晰な言葉で表現する力を求めます。",
             "capacity": 10, "requirements": hitotsubashi_common_reqs, "selectionMethods": hitotsubashi_common_methods,
             "schedule": hitotsubashi_common_schedule, "admissionUrl": "https://juken.hit-u.ac.jp/admission/info/guidelines/"},
            {"id": "sociology", "name": "社会学部", "selectionType": "school_recommendation",
             "admissionPolicy": "社会学部では、現代社会の諸問題を多角的・批判的に分析し豊かな構想力をもって実践的に解決する人材の育成を目指します。問題を多面的に把握する能力と、社会が直面する課題に関心をもつ態度を重視します。",
             "capacity": 10, "requirements": hitotsubashi_common_reqs, "selectionMethods": hitotsubashi_common_methods,
             "schedule": hitotsubashi_common_schedule, "admissionUrl": "https://juken.hit-u.ac.jp/admission/info/guidelines/"},
            {"id": "social-data-science", "name": "ソーシャル・データサイエンス学部", "selectionType": "school_recommendation",
             "admissionPolicy": "ソーシャル・データサイエンス学部では、社会に存在する課題を解決できるソーシャル・データサイエンスのゼネラリストを養成します。文系・理系を問わず、堅固な数学基礎知識、論理的思考力、日本語・英語の読解・表現力を備えた入学者を求めます。",
             "capacity": 5, "requirements": hitotsubashi_common_reqs, "selectionMethods": hitotsubashi_common_methods,
             "schedule": hitotsubashi_common_schedule, "admissionUrl": "https://juken.hit-u.ac.jp/admission/info/guidelines/"},
        ]
    }

    # 一橋が既にあるか確認
    exists = any(u['id'] == 'hitotsubashi-u' for u in data)
    if not exists:
        data.append(hitotsubashi)
        print(f"Added 一橋大学: 5 faculties")
    else:
        for u in data:
            if u['id'] == 'hitotsubashi-u':
                u['faculties'] = hitotsubashi['faculties']
                u['officialUrl'] = hitotsubashi['officialUrl']
                print(f"Updated 一橋大学: 5 faculties")
                break

    # 保存
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"Saved {path}")

def set_kyutei_selection_types():
    """旧帝大のselectionTypeを設定"""
    path = os.path.join(BASE, 'kyutei.json')
    data = json.load(open(path, 'r', encoding='utf-8'))

    # 各大学の総合型/推薦型の区分
    type_map = {
        'tokyo-u': 'school_recommendation',  # 東大は全て学校推薦型
        'kyoto-u': 'comprehensive',  # 京大特色入試は総合型相当
        'tohoku-u': 'comprehensive',  # 東北大AO入試は総合型
        'osaka-u': {  # 大阪大は混在
            'letters': 'comprehensive', 'human-sciences': 'comprehensive',
            'foreign-languages': 'comprehensive', 'law': 'comprehensive',
            'economics': 'comprehensive', 'science': 'comprehensive',
            # 残りは学校推薦型
        },
        'nagoya-u': {
            'science': 'comprehensive',  # 理学部のみ総合型
        },
        'hokkaido-u': 'comprehensive',  # フロンティア入試
        'kyushu-u': 'comprehensive',
    }

    for u in data:
        uni_type = type_map.get(u['id'])
        for fac in u.get('faculties', []):
            if isinstance(uni_type, str):
                fac['selectionType'] = uni_type
            elif isinstance(uni_type, dict):
                fac['selectionType'] = uni_type.get(fac['id'], 'school_recommendation')
            # デフォルトはcomprehensive
            if 'selectionType' not in fac:
                fac['selectionType'] = 'comprehensive'

    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("Updated kyutei.json with selectionType")

if __name__ == '__main__':
    update_national()
    set_kyutei_selection_types()
    print("\nDone!")
