#!/usr/bin/env python3
"""
各大学JSONに admissionUrl を追加するスクリプト。
大学IDごとの総合型選抜ページURLを定義し、全学部に設定する。
学部個別URLがある場合はそちらを優先。
"""

import json
import glob
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'universities')

# 大学ID → 総合型選抜/入試情報ページURL
UNIVERSITY_ADMISSION_URLS = {
    # 旧帝大
    "kyushu-u": "https://www.kyushu-u.ac.jp/ja/admission/",
    "kyoto-u": "https://www.kyoto-u.ac.jp/ja/admissions/tokusyoku",
    "hokkaido-u": "https://www.hokudai.ac.jp/admission/faculty/ao/",
    "osaka-u": "https://www.osaka-u.ac.jp/ja/admissions/faculty/n4boz8",
    "tokyo-u": "https://www.u-tokyo.ac.jp/ja/admissions/undergraduate/e01_26.html",
    "tohoku-u": "https://admissions.tohoku.ac.jp/ja/entrance-info/undergraduate-info/ao/",
    "nagoya-u": "https://www.nagoya-u.ac.jp/admissions/exam/us-exam/cat3/index.html",

    # 早慶上智
    "waseda-u": "https://www.waseda.jp/inst/admission/undergraduate/system/ao/",
    "keio-u": "https://www.keio.ac.jp/ja/admissions/examinations/",
    "sophia-u": "https://adm.sophia.ac.jp/jpn/gakubu_tokubetsu_ad/koubo/",

    # MARCH
    "meiji-u": "https://www.meiji.ac.jp/exam/reference/tgansho.html",
    "aoyama-u": "https://www.aoyama.ac.jp/admission/undergraduate/examination/",
    "rikkyo-u": "https://www.rikkyo.ac.jp/admissions/undergraduate/free_selection.html",
    "chuo-u": "https://www.chuo-u.ac.jp/connect/admission/special/",
    "hosei-u": "https://nyushi.hosei.ac.jp/nyushi/",

    # 関関同立
    "kansai-u": "https://www.nyusi.kansai-u.ac.jp/admission/ao/",
    "kwansei-u": "https://www.kwansei.ac.jp/admissions/faq/comprehensive.html",
    "doshisha-u": "https://www.doshisha.ac.jp/admissions_undergrad/preferred_application/index.html",
    "ritsumeikan-u": "https://admission.ritsumei.ac.jp/",

    # 産近甲龍
    "ksu": "https://www.kyoto-su.ac.jp/admissions/exam/index.html",
    "kindai-u": "https://www.kindai.ac.jp/admissions/",
    "konan-u": "https://ch.konan-u.ac.jp/admission/other/",
    "ryukoku-u": "https://www.ryukoku.ac.jp/admission/nyushi/about/sogo.html",

    # 日東駒専
    "nihon-u": "https://www.nihon-u.ac.jp/admission_info/application/",
    "toyo-u": "https://www.toyo.ac.jp/nyushi/admission/admission-data/requirements-special/",
    "komazawa-u": "https://think.komazawa-u.ac.jp/admission/",
    "senshu-u": "https://www.senshu-u.ac.jp/admission/shikenseido/",

    # 成成明学独國武
    "seikei-u": "https://www.seikei.ac.jp/university/s-net/admissions/comprehensive/",
    "seijo-u": "https://admission.seijo.ac.jp/admission/sogo",
    "meijigakuin-u": "https://www.meijigakuin.ac.jp/admission/information/ao/",
    "meigaku-u": "https://www.meijigakuin.ac.jp/admission/information/ao/",
    "dokkyo-u": "https://nyushi.dokkyo.ac.jp/nyushi/gakubu-seido/system_other",
    "kokugakuin-u": "https://www.kokugakuin.ac.jp/admission/admissions/p2/p2",
    "musashi-u": "https://www.musashi.ac.jp/admissions/sogotokubetsu/AO.html",

    # 国立大学
    "ochanomizu-u": "https://www.ocha.ac.jp/admissions/",
    "kyutech-u": "https://www.kyutech.ac.jp/admissions/",
    "saga-u": "https://www.saga-u.ac.jp/admission/",
    "hokkaido-edu-u": "https://www.hokkyodai.ac.jp/admission/",
    "kitami-u": "https://www.kitami-it.ac.jp/admission/",
    "chiba-u": "https://www.chiba-u.ac.jp/exam/",
    "nitech-u": "https://www.nitech.ac.jp/entrance/",
    "aiu": "https://web.aiu.ac.jp/admission/",
    "saitama-u": "https://www.saitama-u.ac.jp/entrance/",
    "oita-u": "https://www.oita-u.ac.jp/admission/",
    "omu": "https://www.omu.ac.jp/admissions/",
    "utsunomiya-u": "https://www.utsunomiya-u.ac.jp/admission/",
    "muroran-u": "https://www.muroran-it.ac.jp/entrance/",
    "otaru-u": "https://www.otaru-uc.ac.jp/admission/",
    "gifu-u": "https://www.gifu-u.ac.jp/admission/",
    "okayama-u": "https://www.okayama-u.ac.jp/tp/admission/",
    "obihiro-u": "https://www.obihiro.ac.jp/admission/",
    "hiroshima-u": "https://www.hiroshima-u.ac.jp/nyushi/",
    "aichi-edu-u": "https://www.aichi-edu.ac.jp/admission/",
    "niigata-u": "https://www.niigata-u.ac.jp/admissions/",
    "asahikawa-med-u": "https://www.asahikawa-med.ac.jp/bureau/nyusi/",
    "tufs-u": "https://www.tufs.ac.jp/admission/",
    "gakugei-u": "https://www.u-gakugei.ac.jp/admissions/",
    "tumsat-u": "https://www.kaiyodai.ac.jp/entrance/",
    "tuat-u": "https://www.tuat.ac.jp/admission/",
    "yokohama-national-u": "https://www.ynu.ac.jp/admissions/",
    "yokohama-cu": "https://www.yokohama-cu.ac.jp/admissions/",
    "kumamoto-u": "https://www.kumamoto-u.ac.jp/nyuushi/",
    "fukuoka-edu-u": "https://www.fukuoka-edu.ac.jp/admission/",
    "tsukuba-u": "https://ac.tsukuba.ac.jp/",
    "gunma-u": "https://www.gunma-u.ac.jp/admission/",
    "ibaraki-u": "https://www.ibaraki.ac.jp/admission/",
    "tut-u": "https://www.tut.ac.jp/exam/",
    "nagasaki-u": "https://www.nagasaki-u.ac.jp/nyugaku/",
    "uec-u": "https://www.uec.ac.jp/admission/",
    "shizuoka-u": "https://www.shizuoka.ac.jp/admission/",
    "kagoshima-u": "https://www.kagoshima-u.ac.jp/admission/",
    "nifs-u": "https://www.nifs-k.ac.jp/admission/",

    # 公立大学
    "fun-u": "https://www.fun.ac.jp/admission/",
    "chitose-u": "https://www.chitose.ac.jp/admissions/",
    "nagoya-cu": "https://www.nagoya-cu.ac.jp/admissions/",
    "nayoro-u": "https://www.nayoro.ac.jp/admission/",
    "aichi-pu": "https://www.aichi-pu.ac.jp/admissions/",
    "aichi-fam-u": "https://www.aichi-fam-u.ac.jp/admission/",
    "asahikawa-cu": "https://www.asahikawa-u.ac.jp/admission/",
    "sapmed-u": "https://www.sapmed.ac.jp/admission/",
    "scu": "https://www.scu.ac.jp/admission/",
    "tmu": "https://www.tmu.ac.jp/entrance/",
    "kushiro-pu": "https://www.kushiro-pu.ac.jp/admission/",

    # 主要私立大学
    "chukyo-u": "https://nc.chukyo-u.ac.jp/",
    "icu": "https://www.icu.ac.jp/admissions/",
    "gakushuin-u": "https://www.univ.gakushuin.ac.jp/admissions/",
    "teikyo-u": "https://www.teikyo-u.ac.jp/admissions/",
    "aichi-u": "https://www.aichi-u.ac.jp/admission/",
    "agu": "https://navi.agu.ac.jp/admission/",
    "aitech-u": "https://www.ait.ac.jp/admission/",
    "aasa-u": "https://www.aasa.ac.jp/admission/",
    "nanzan-u": "https://www.nanzan-u.ac.jp/admission/",
    "meijo-u": "https://www.meijo-u.ac.jp/admissions/",
    "tus-u": "https://www.tus.ac.jp/admissions/",
    "tokai-u": "https://www.u-tokai.ac.jp/admissions/",
    "musashino-u": "https://www.musashino-u.ac.jp/admissions/",
    "kanagawa-u": "https://www.kanagawa-u.ac.jp/admissions/",
    "fukuoka-u": "https://www.fukuoka-u.ac.jp/admission/",
    "seinan-u": "https://www.seinan-gu.ac.jp/admission/",
    "jwu": "https://www.jwu.ac.jp/admissions/",
    "juntendo-u": "https://www.juntendo.ac.jp/admissions/",
    "twcu": "https://www.twcu.ac.jp/admissions/",
    "tsuda-u": "https://www.tsuda.ac.jp/admissions/",
    "tamagawa-u": "https://www.tamagawa.ac.jp/admissions/",
    "kinjo-u": "https://www.kinjo-u.ac.jp/admissions/",
    "hokusei-u": "https://entry.hokusei.ac.jp/",
    "hokkai-u": "https://www.hgu.jp/admissions/",
    "sapporo-u": "https://www.sapporo-u.ac.jp/admissions/",
    "sgu": "https://www.sgu.ac.jp/admission/",
    "seisen-u": "https://www.seisen-u.ac.jp/admissions/",
    "shirayuri-u": "https://www.shirayuri.ac.jp/admissions/",
    "u-sacred-heart": "https://www.u-sacred-heart.ac.jp/admissions/",
    "fuji-wu": "https://www.fujijoshi.ac.jp/admission/",
    "fujita-hu": "https://www.fujita-hu.ac.jp/admissions/",
    "chubu-u": "https://www.chubu.ac.jp/admissions/",
    "hakodate-u": "https://www.hakodate-u.ac.jp/admission/",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    modified = False
    for uni in data:
        uni_id = uni.get('id', '')
        # 大学URLが未設定なら補完
        url = UNIVERSITY_ADMISSION_URLS.get(uni_id)

        for fac in uni.get('faculties', []):
            if 'admissionUrl' not in fac:
                # 大学ごとのURLがあればそれを使用、なければ大学のofficialUrl + "/admission"
                if url:
                    fac['admissionUrl'] = url
                elif uni.get('officialUrl'):
                    fac['admissionUrl'] = uni['officialUrl']
                else:
                    # URLが全くない場合はスキップ（後で手動追加）
                    fac['admissionUrl'] = ""
                modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  Updated: {os.path.basename(filepath)}")
    else:
        print(f"  Skipped (no changes): {os.path.basename(filepath)}")

    # 統計
    total_fac = sum(len(u.get('faculties', [])) for u in data)
    with_url = sum(1 for u in data for f in u.get('faculties', []) if f.get('admissionUrl'))
    without_url = sum(1 for u in data for f in u.get('faculties', []) if not f.get('admissionUrl'))
    print(f"    {total_fac} faculties, {with_url} with URL, {without_url} without")

if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(BASE, '*.json')))
    print(f"Processing {len(files)} files...\n")
    for f in files:
        process_file(f)
    print("\nDone!")
