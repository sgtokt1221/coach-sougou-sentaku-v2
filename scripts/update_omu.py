#!/usr/bin/env python3
"""
大阪公立大学 (omu) の 2026年度入試情報への全面更新スクリプト。
公式サイト (omu.ac.jp) の PDF 募集要項から取得した情報を反映。
既存 AP は保持し、公式 URL・日程・募集人員・選抜方法・面接傾向を更新。
"""
import json
from pathlib import Path

FILE = Path("src/data/universities/national.json")
OFFICIAL_URL = "https://www.omu.ac.jp/"

# 2026年度入試 (2025年秋〜2026年2月実施) の情報
# 共通 URL
URL_AO_INDEX = "https://www.omu.ac.jp/admissions/ug/exam_info/special/integrate/"
URL_SR_INDEX = "https://www.omu.ac.jp/admissions/ug/exam_info/special/recommend/"
URL_POLICY = "https://www.omu.ac.jp/admissions/ug/policy/"
URL_AO_MED_PDF = "https://www.omu.ac.jp/admissions/assets/4_Sougou_SR_med2026.pdf"
URL_AO_ENG_PDF = "https://www.omu.ac.jp/admissions/assets/3_Sougou_Engineering2026.pdf"
URL_AO_SSS_PDF = "https://www.omu.ac.jp/admissions/assets/2_Sougou_SSS2026.pdf"
URL_SR_COMMON_PDF = "https://www.omu.ac.jp/admissions/assets/6_SR2026.pdf"
URL_SR_BUSINESS_PDF = "https://www.omu.ac.jp/admissions/assets/7_SR_Business_B2026.pdf"
URL_SR_URBAN_PDF = "https://www.omu.ac.jp/admissions/assets/8_SR_Engineering_Toshi2026.pdf"

# 各学部の公式ページ
URL_FAC = {
    "agriculture": "https://www.omu.ac.jp/agri/",
    "medicine": "https://www.omu.ac.jp/med/",
    "nursing": "https://www.omu.ac.jp/nurs/",
    "engineering": "https://www.omu.ac.jp/eng/",
    "economics": "https://www.omu.ac.jp/econ/",
    "commerce": "https://www.omu.ac.jp/bus/",
    "general": "https://www.omu.ac.jp/sss/",
    "medicine-2": "https://www.omu.ac.jp/vet/",
    "letters": "https://www.omu.ac.jp/lit/",
    "science": "https://www.omu.ac.jp/sci/",
    "general-2": "https://www.omu.ac.jp/hum/",
    "medicine-rehab": "https://www.omu.ac.jp/rehabilitation/",
    "law": "https://www.omu.ac.jp/law/",
}

# 学部ポリシーページ
URL_POLICY_FAC = {
    "agriculture": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_agri/",
    "medicine": "https://www.omu.ac.jp/med/admissions/undergraduate/policy/",
    "nursing": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_nurs/",
    "engineering": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_eng/",
    "economics": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_econ/",
    "commerce": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_bus/",
    "general": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_sss/",
    "medicine-2": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_vet/",
    "letters": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_lit/",
    "science": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_sci/",
    "general-2": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_hum/",
    "law": "https://www.omu.ac.jp/about/edu-data/purpose/policy_ug_law/",
}

# 各学部の 2026年度入試情報 (2025年秋〜2026年2月実施)
# schedule は「公式 PDF から読み取った 2026年度 (=令和8年度) 入試」
UPDATES = {
    "agriculture": {
        "name": "農学部",
        "capacity": 30,
        "selectionType": "school_recommendation",
        "academicField": "agriculture",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "応用生物科学科10名・生命機能化学科10名・緑地環境科学科10名 (学科単位で募集)",
                "出身学校長の推薦書が必要",
                "2026年3月卒業見込みの者",
                "大学入学共通テスト受験必須",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "調査書、推薦書、志望理由書により書類審査"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト (5教科7科目または5教科8科目)"},
            {"stage": 3, "type": "interview", "details": "緑地環境科学科のみ小論文(60分)+面接 (2025/11/22)。応用生物科学科・生命機能化学科は個別学力検査なし"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2025-11-22",
            "resultDate": "2025-12-05",
        },
        "interviewTendency": {
            "format": "個人面接",
            "duration": "15〜20分",
            "interviewers": "複数名 (学科教員)",
            "pressure": "low",
            "weight": "合否判定の一要素",
            "frequentTopics": ["志望動機", "高校での探究活動", "農学への関心", "将来像"],
            "tips": "緑地環境科学科では小論文との組み合わせ。生命機能化学科・応用生物科学科は面接なし"
        },
    },
    "medicine": {
        "name": "医学部医学科",
        "capacity": 5,
        "selectionType": "comprehensive",
        "academicField": "medicine",
        "admissionUrl": URL_AO_MED_PDF,
        "requirements": {
            "gpa": 4.3,
            "englishCert": None,
            "otherReqs": [
                "評定平均 4.3 以上 (5点満点)",
                "2024年4月以降卒業または2026年3月卒業見込み",
                "スポーツ・文化活動・ボランティア活動・海外留学等の多様な経験または特定分野で卓越した能力",
                "出身学校からの志願者評価書を提出できる者",
                "合格時に必ず入学することを確約できる者",
                "大学入学共通テスト受験必須 (指定教科科目)",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "調査書・志願者評価書・活動報告書・自己PR書による書類審査 (志願者が募集人員の3倍超の場合、書類+共通テストで第1次選考)"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト 825点 (国語150+地歴公民50+数学200+理科200+英語200+情報25)"},
            {"stage": 3, "type": "other", "details": "口述試験・面接 100点 (2026/2/8 9:05〜、阿倍野キャンパス)。論理性・読解力・思考力・判断力・表現力、医師/研究者としての適性を評価"},
        ],
        "schedule": {
            "applicationStart": "2026-01-19",
            "applicationEnd": "2026-01-22",
            "examDate": "2026-02-08",
            "resultDate": "2026-02-13",
        },
        "interviewTendency": {
            "format": "口述試験 + 個人面接",
            "duration": "30〜40分 (口述含む)",
            "interviewers": "医学部教員 複数名",
            "pressure": "medium",
            "weight": "配点100点 (+合否判定にも使用)",
            "frequentTopics": ["医師を志望した動機", "「智・仁・勇」の解釈", "医療倫理", "時事医療問題", "活動実績の深掘り"],
            "tips": "点数に関わらず、面接でアドミッション・ポリシー不適合と判断された場合は不合格。論理性と医師適性の両面を問う"
        },
    },
    "nursing": {
        "name": "看護学部",
        "capacity": 55,
        "selectionType": "school_recommendation",
        "academicField": "nursing",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "高等学校長の推薦を受けた者",
                "志望理由書・推薦書・調査書により意欲・能力・志向を評価",
                "大学入学共通テスト受験必須",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "推薦書・調査書・志望理由書による書類審査"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト (個別学力検査は課さない)"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2026-01-17",
            "resultDate": "2026-02-13",
        },
    },
    "engineering": {
        "name": "工学部",
        "capacity": 8,
        "selectionType": "comprehensive",
        "academicField": "engineering",
        "admissionUrl": URL_AO_ENG_PDF,
        "requirements": {
            "gpa": 4.0,
            "englishCert": "英検3級以上 (任意。提出時は級に応じて100点満点で評価)",
            "otherReqs": [
                "海洋システム工学科4名・都市学科4名 (総合型選抜)",
                "都市学科: 評定平均 4.0 以上、数学II・III・A・B・C・物理基礎・物理履修",
                "海洋システム: 数学II・III・A・B・C・物理基礎・物理・化学基礎・化学履修、学習成績優秀",
                "合格時に必ず入学することを確約できる者",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "調査書・志望理由書・自己アピール書による第1次選考 (合否判定)"},
            {"stage": 2, "type": "other", "details": "第2次選考: 口述試験 (海洋400点/都市1000点) + 面接 (海洋200点) + 英検 (海洋100点)。海洋は2025/10/4-5、都市は2025/10/4 実施"},
            {"stage": 3, "type": "test", "details": "都市学科は大学入学共通テスト (5教科6科目) も課される"},
        ],
        "schedule": {
            "applicationStart": "2025-09-04",
            "applicationEnd": "2025-09-08",
            "examDate": "2025-10-04",
            "resultDate": "2025-11-04",
        },
        "interviewTendency": {
            "format": "口述試験 + 個人面接 (適性検査含む)",
            "duration": "2日間 (海洋のみ、都市は1日)",
            "interviewers": "工学部教員 複数名",
            "pressure": "medium",
            "weight": "配点大 (海洋700点満点中600点+書類、都市1000点)",
            "frequentTopics": ["数学・物理の基礎学力", "研究テーマへの関心", "グループワーク (海洋)", "都市学への興味"],
            "tips": "海洋はグループワーク+適性検査あり、数学Iから数学Cまでの全範囲出題。都市は口述のみで1000点と配点が非常に大きい"
        },
    },
    "economics": {
        "name": "経済学部",
        "capacity": 60,
        "selectionType": "school_recommendation",
        "academicField": "economics",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "英語重点型38名・数学重点型22名",
                "高等学校長の推薦が必要",
                "大学入学共通テスト受験必須",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "推薦書・調査書による書類審査"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト (個別学力検査は課さない)。英語重点型は英語配点高、数学重点型は数学配点高"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2026-01-17",
            "resultDate": "2026-02-13",
        },
    },
    "commerce": {
        "name": "商学部",
        "capacity": 40,
        "selectionType": "school_recommendation",
        "academicField": "business",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "英語重点型25名・数学重点型15名",
                "商学科・公共経営学科合同募集 (学科配属は2年次後期)",
                "大学入学共通テスト受験必須",
                "商業科等対象の特別枠は別途 URL_SR_BUSINESS_PDF 参照",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "推薦書・調査書による書類審査"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト (個別学力検査は課さない)"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2026-01-17",
            "resultDate": "2026-02-13",
        },
    },
    "general": {
        "name": "現代システム科学域",
        "capacity": 6,
        "selectionType": "comprehensive",
        "academicField": "interdisciplinary",
        "admissionUrl": URL_AO_SSS_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "総合型選抜は教育福祉学類のみ (6名)。推薦型は4学類全て (知識情報システム10+環境社会20+教育福祉9+心理5)",
                "志願者を客観的に知る立場にある2名 (2親等以内の親族を除く) からの推薦",
                "合格時に必ず入学することを確約できる者",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "志望理由書・自己評価書・学習計画書による書類審査"},
            {"stage": 2, "type": "essay", "details": "小論文 200点 (90分)。日本語及び英語の文章や資料による出題で理解力・思考力・表現力を評価"},
            {"stage": 3, "type": "interview", "details": "志望理由書等に基づく面接 100点 (12:30〜)。2025/11/22 中百舌鳥キャンパス"},
        ],
        "schedule": {
            "applicationStart": "2025-10-06",
            "applicationEnd": "2025-10-09",
            "examDate": "2025-11-22",
            "resultDate": "2025-12-05",
        },
        "interviewTendency": {
            "format": "個人面接 (小論文後)",
            "duration": "15〜20分",
            "interviewers": "教育福祉学類教員",
            "pressure": "low",
            "weight": "配点100点",
            "frequentTopics": ["志望理由", "社会福祉/教育/保育への関心", "PBL経験", "志望理由書の内容深掘り"],
            "tips": "小論文と面接で合計300点。小論文は日英両文献を扱うため英語読解力も必要"
        },
    },
    "medicine-2": {
        "name": "獣医学部",
        "capacity": 5,
        "selectionType": "school_recommendation",
        "academicField": "veterinary",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": "英語4技能試験成績証明書 (任意提出、審査に利用)",
            "otherReqs": [
                "出身学校長の推薦書必須",
                "獣医師・獣医学研究者志望の意思が明確な者",
                "大学入学共通テスト受験必須",
                "産業動物獣医師地域枠特別選抜は別枠で実施",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "調査書・推薦書・志望理由書・活動報告書・英語4技能試験成績証明書による書類審査 (志願者が5倍超の場合は第1次選考実施)"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト 5教科6科目"},
            {"stage": 3, "type": "essay", "details": "小論文 (60分、2025/11/22 11:00〜12:00 中百舌鳥)"},
            {"stage": 4, "type": "interview", "details": "面接 (13:00〜)。獣医学修学の適性に欠けると判断された場合は合計点にかかわらず不合格"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2025-11-22",
            "resultDate": "2025-12-05",
        },
        "interviewTendency": {
            "format": "個人面接 (小論文後)",
            "duration": "15〜20分",
            "interviewers": "獣医学部教員 複数名",
            "pressure": "high",
            "weight": "合否判定 (適性欠落で不合格)",
            "frequentTopics": ["獣医師志望動機", "動物医療・感染症・食料安全保障", "動物倫理", "高校での生物/化学学習"],
            "tips": "獣医学への明確な志望と適性評価が重視される。合計点に関わらず適性で不合格となりうるため、動機の一貫性が重要"
        },
    },
    "letters": {
        "name": "文学部",
        "capacity": 0,
        "selectionType": "school_recommendation",
        "academicField": "humanities",
        "admissionUrl": "",
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "注意: 2026年度は総合型選抜・学校推薦型選抜ともに実施なし (一般選抜のみ)",
                "帰国生徒特別選抜・外国人留学生学士入学試験のみ特別選抜として実施",
                "2027年度以降の特別選抜実施は未発表",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "other", "details": "一般選抜 (前期日程) のみ募集。共通テスト+個別学力検査 (国語・外国語・地歴公民)"},
        ],
        "schedule": {
            "applicationStart": "",
            "applicationEnd": "",
            "examDate": "",
            "resultDate": "",
        },
    },
    "science": {
        "name": "理学部",
        "capacity": 37,
        "selectionType": "school_recommendation",
        "academicField": "science",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "物理7・化学12・生物9・地球4・生物化学5名 (学科単位で募集)",
                "出身学校長の推薦書必須",
                "学力だけでなく人物・能力において特に優れた者",
                "大学入学共通テスト受験必須",
                "物理学科2027年度は学校推薦型選抜の選抜方法変更予定",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "第1次選考: 調査書・推薦書による書類審査 (第1次選考を実施)"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト 5教科7科目"},
            {"stage": 3, "type": "essay", "details": "小論文 (物理のみ、150分、2026/2/8 9:30-12:00)"},
            {"stage": 4, "type": "interview", "details": "口述試験 (全学科、13:30〜、杉本キャンパス)。質疑応答で数学・理科の基礎学力と学習意欲を評価"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2026-02-08",
            "resultDate": "2026-02-13",
        },
        "interviewTendency": {
            "format": "口述試験 (個別)",
            "duration": "20〜30分",
            "interviewers": "学科教員 複数名",
            "pressure": "medium",
            "weight": "口述試験で知識と思考力を評価",
            "frequentTopics": ["数学・物理/化学/生物/地学/生化学の基礎学力", "研究テーマへの関心", "高校での実験・探究活動"],
            "tips": "物理学科のみ小論文も課される。口述試験では高校理科の基礎を幅広く問われる"
        },
    },
    "general-2": {
        "name": "生活科学部",
        "capacity": 44,
        "selectionType": "school_recommendation",
        "academicField": "life-science",
        "admissionUrl": URL_SR_COMMON_PDF,
        "requirements": {
            "gpa": None,
            "englishCert": None,
            "otherReqs": [
                "食栄養学科20名・居住環境学科9名 (大阪府内枠2/全国枠7)・人間福祉学科15名 (大阪府内枠2/全国枠13)",
                "出身学校長の推薦書必須",
                "食栄養学科の学校推薦型選抜(指定校対象)は別途実施",
                "大学入学共通テスト受験必須",
            ],
        },
        "selectionMethods": [
            {"stage": 1, "type": "documents", "details": "第1次選考: 調査書・推薦書・志望理由書による書類審査 (第1次選考を実施)"},
            {"stage": 2, "type": "test", "details": "大学入学共通テスト"},
            {"stage": 3, "type": "other", "details": "口述試験 (2026/2/8 13:30〜、杉本キャンパス)"},
        ],
        "schedule": {
            "applicationStart": "2025-10-24",
            "applicationEnd": "2025-11-06",
            "examDate": "2026-02-08",
            "resultDate": "2026-02-13",
        },
        "interviewTendency": {
            "format": "口述試験",
            "duration": "20〜30分",
            "interviewers": "学科教員 複数名",
            "pressure": "medium",
            "weight": "合否判定の重要要素",
            "frequentTopics": ["志望学科への関心", "食・居住・福祉それぞれの専門領域", "高校での学習経験", "将来像"],
            "tips": "居住環境・人間福祉は大阪府内枠優先選抜あり。食栄養学科は指定校推薦枠あり"
        },
    },
}

# 新規追加: 医学部リハビリテーション学科
NEW_FACULTY_REHAB = {
    "id": "medicine-rehab",
    "name": "医学部リハビリテーション学科",
    "admissionPolicy": """医学部\nリハビリテーション学科\n\n人が地域社会において健康で文化的な生活を営むためには、身体的、精神的、社会的に良好な状態で生活できることが大切である。ライフステージで生じる子育て、教育、医療、介護等の問題は複雑で多様化している。その中において保健・医療・福祉の領域では、複雑化したシステムと専門分化した知識・技術を根幹にあるべきヒューマニズムと調和、発展させることが求められている。リハビリテーション学科では、理学療法士、作業療法士として、人と社会に対する包括的視野と、人を支援する専門的でかつ協働的な実践力を身に付け、地域社会及び国際社会において人々の健康と福祉の向上に寄与する人材を養成する。\n\nしたがって、リハビリテーション学科では、次のような有能で活力ある学生を求めている。\n1. 人との関わりを大切にし、相手に対する思いやりや愛情を適切に表現できるとともに、相手の主張や気持ちを受けとめる包容力をもった人\n2. 学問に対する興味と探究心をもち、知識と技術の習得に積極的に取組む人\n3. 将来、リハビリテーションを総合的にとらえることのできる理学療法士、作業療法士として、人々の保健・医療・福祉に貢献しようとする熱意をもった人\n4. 国際的視野をもって広く社会に貢献することをめざす人\n\n≪理学療法学専攻≫\n理学療法学は、病気、けが、高齢等によって運動機能が低下した状態にある人々に対し、身体機能を科学的に評価して治療する理論と技術の体系である。理学療法学専攻では、身体の構造や機能及び疾病に関する幅広い学問を修得し、リハビリテーション医療や地域医療の最前線に立ち得る高度な専門的能力、総合判断力、研究能力を有した理学療法士を養成する。\n\n≪作業療法学専攻≫\n作業療法学は、乳幼児から高齢者までの身体や精神に障がいのある方々の主体的な日常生活能力・社会適応能力の獲得を目的とした治療、指導の理論と技術の体系である。作業療法学専攻では、人々の活動と心身機能、環境との関係、脳の働き、発達や老化等の知識に基づく実践技術と研究能力、さらに対象者(児)に寄り添う「こころ」を有し、地域社会の保健、医療、福祉及び教育分野においてリーダーシップを発揮できる作業療法士を養成する。\n\n入学者選抜の基本方針\n【学校推薦型選抜】\n理学療法学専攻/作業療法学専攻\n高等学校における教科・科目を文理ともに広く学習し、高い知識・技能を有していることを、大学入学共通テストによって評価する。思考力・判断力・表現力及び主体性・多様性・協働性を有していることを、面接及び調査書、推薦書等によって評価する。""",
    "capacity": 16,
    "requirements": {
        "gpa": None,
        "englishCert": None,
        "otherReqs": [
            "理学療法学専攻8名・作業療法学専攻8名 (専攻単位で募集)",
            "出身学校長の推薦書必須",
            "大学入学共通テスト受験必須",
        ],
    },
    "selectionMethods": [
        {"stage": 1, "type": "documents", "details": "推薦書・調査書・志望理由書による書類審査"},
        {"stage": 2, "type": "test", "details": "大学入学共通テスト"},
        {"stage": 3, "type": "interview", "details": "面接 (2025/11/22 9:30〜、森之宮キャンパス)。思考力・判断力・表現力・主体性・多様性・協働性を評価"},
    ],
    "schedule": {
        "applicationStart": "2025-10-24",
        "applicationEnd": "2025-11-06",
        "examDate": "2025-11-22",
        "resultDate": "2025-12-05",
    },
    "admissionUrl": URL_SR_COMMON_PDF,
    "selectionType": "school_recommendation",
    "academicField": "medicine",
    "interviewTendency": {
        "format": "個人面接",
        "duration": "15〜20分",
        "interviewers": "リハビリテーション学科教員",
        "pressure": "low",
        "weight": "合否判定の重要要素",
        "frequentTopics": ["理学療法/作業療法の志望動機", "人への関わり方", "リハビリテーション領域への理解", "将来像"],
        "tips": "医学科と異なりキャンパスは森之宮。人と関わる仕事への適性と思いやりが重視される"
    },
}

# 新規追加: 法学部 (特別選抜は実施なしだが、ユーザー参考情報として追加)
NEW_FACULTY_LAW = {
    "id": "law",
    "name": "法学部",
    "admissionPolicy": """法学部\n\n法学部は、ディプロマ・ポリシー及びカリキュラム・ポリシーに基づいて、本学部の掲げる教育方針を十分理解し、以下のような学生を求めています。\n\n1. 新しい問題に果敢に取り組む知的好奇心を持つ人\n2. 自分を相対化するための想像力と豊かな人間性を持つ人\n3. 相手の意見を的確に理解し、自分の意見を論理的に構成して、正確に表現・文章化する能力を持つ人\n4. 法学・政治学の専門的知識を身につけるために必要な一般教養を有する人\n\n入学者選抜の基本方針\n【一般選抜(前期日程)】共通テストで基礎学力、個別試験で「思考力・判断力・表現力などの獲得水準」を評価します。\n【一般選抜(後期日程)】共通テストと個別試験で適性能力を確認し、調査書と総合評価します。\n【私費外国人留学生特別選抜】日本留学試験と個別試験で適性を判定します。\n\n履修モデルは司法・行政・企業・国際の3つで、進路に応じた指導を行います。""",
    "capacity": 0,
    "requirements": {
        "gpa": None,
        "englishCert": None,
        "otherReqs": [
            "注意: 2026年度は総合型選抜・学校推薦型選抜ともに実施なし (一般選抜+帰国生徒+私費外国人留学生のみ)",
            "2027年度の一般選抜(前期)・編入学・学士入学試験について変更告知あり",
        ],
    },
    "selectionMethods": [
        {"stage": 1, "type": "other", "details": "一般選抜(前期/後期)のみ。共通テスト+個別試験(思考力・判断力・表現力)"},
    ],
    "schedule": {
        "applicationStart": "",
        "applicationEnd": "",
        "examDate": "",
        "resultDate": "",
    },
    "admissionUrl": "https://www.omu.ac.jp/admissions/assets/law2027.pdf",
    "selectionType": "school_recommendation",
    "academicField": "law",
}


def main():
    data = json.load(open(FILE))
    omu_idx = None
    for i, u in enumerate(data):
        if u.get("id") == "omu":
            omu_idx = i
            break
    if omu_idx is None:
        raise RuntimeError("OMU not found")

    omu = data[omu_idx]
    omu["officialUrl"] = OFFICIAL_URL
    omu["updatedAt"] = "2026-04-22T00:00:00Z"

    # 既存学部を更新
    updated_count = 0
    for fac in omu["faculties"]:
        fid = fac["id"]
        if fid in UPDATES:
            u = UPDATES[fid]
            # 既存 AP は保持、それ以外は上書き
            for key in ["name", "capacity", "requirements", "selectionMethods",
                        "schedule", "admissionUrl", "selectionType", "academicField",
                        "interviewTendency"]:
                if key in u:
                    fac[key] = u[key]
            updated_count += 1

    # 新規学部追加
    existing_ids = {f["id"] for f in omu["faculties"]}
    if "medicine-rehab" not in existing_ids:
        omu["faculties"].append(NEW_FACULTY_REHAB)
    if "law" not in existing_ids:
        omu["faculties"].append(NEW_FACULTY_LAW)

    # JSON 書き出し
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"更新完了: {updated_count} 学部を更新、{len(omu['faculties'])} 学部総数")
    for fac in omu["faculties"]:
        print(f"  {fac['id']:20s}: {fac['name']:20s} capacity={fac.get('capacity')}, type={fac.get('selectionType', '-')}")


if __name__ == "__main__":
    main()
