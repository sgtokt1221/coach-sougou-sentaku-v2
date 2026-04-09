const pptxgen = require('pptxgenjs');
const html2pptx = require('/Users/shigetaokito/.claude/skills/pptx/scripts/html2pptx');
const fs = require('fs');
const path = require('path');

const TEAL = '#0D9488';
const NAVY = '#1E3A5F';
const WHITE = '#FFFFFF';
const LIGHT = '#F0FDFA';
const GRAY = '#64748B';

function writeSlide(filename, bodyBg, content) {
  const html = `<!DOCTYPE html><html><head><style>
html{background:#fff}
body{width:720pt;height:405pt;margin:0;padding:0;background:${bodyBg};font-family:Arial,sans-serif;display:flex;flex-direction:column}
${content.css || ''}
</style></head><body>${content.body}</body></html>`;
  fs.writeFileSync(filename, html);
}

// ===== Student slides =====
const studentSlides = [
  // S1: Title
  { css: '', body: `
    <div style="position:absolute;top:0;left:0;width:720pt;height:405pt"><img src="bg-student.png" style="width:720pt;height:405pt"></div>
    <div style="position:relative;z-index:1;margin:80pt 60pt;text-align:center">
      <h1 style="color:white;font-size:36pt;margin-bottom:12pt">coach for 総合型選抜</h1>
      <h2 style="color:#99F6E4;font-size:20pt;font-weight:normal;margin-bottom:30pt">生徒用スタートガイド</h2>
      <p style="color:#CBD5E1;font-size:13pt">AI搭載の総合型選抜対策プラットフォーム</p>
    </div>`},
  // S2: Overview
  { css: `.card{background:white;border-radius:8pt;padding:18pt 20pt;margin:6pt 0;box-shadow:1px 1px 4px rgba(0,0,0,0.08)}`, body: `
    <div style="background:${NAVY};padding:18pt 40pt"><h2 style="color:white;font-size:22pt;margin:0">はじめに：できること一覧</h2></div>
    <div style="display:flex;gap:14pt;margin:16pt 30pt;flex-wrap:wrap">
      <div class="card" style="flex:1;min-width:180pt">
        <div style="display:flex;align-items:center;gap:8pt;margin-bottom:8pt"><img src="icon-brain-teal.png" style="width:22pt;height:22pt"><h3 style="color:${NAVY};font-size:13pt;margin:0">自己分析</h3></div>
        <p style="color:${GRAY};font-size:10pt">AIワークショップで自分の強み・価値観・ビジョンを整理</p>
      </div>
      <div class="card" style="flex:1;min-width:180pt">
        <div style="display:flex;align-items:center;gap:8pt;margin-bottom:8pt"><img src="icon-mic-teal.png" style="width:22pt;height:22pt"><h3 style="color:${NAVY};font-size:13pt;margin:0">面接練習</h3></div>
        <p style="color:${GRAY};font-size:10pt">AI面接官と音声で実践練習。ビデオ分析付き</p>
      </div>
      <div class="card" style="flex:1;min-width:180pt">
        <div style="display:flex;align-items:center;gap:8pt;margin-bottom:8pt"><img src="icon-pen-teal.png" style="width:22pt;height:22pt"><h3 style="color:${NAVY};font-size:13pt;margin:0">小論文添削</h3></div>
        <p style="color:${GRAY};font-size:10pt">写真を撮ってAI添削。スコアとフィードバック</p>
      </div>
      <div class="card" style="flex:1;min-width:180pt">
        <div style="display:flex;align-items:center;gap:8pt;margin-bottom:8pt"><img src="icon-search-teal.png" style="width:22pt;height:22pt"><h3 style="color:${NAVY};font-size:13pt;margin:0">志望校マッチング</h3></div>
        <p style="color:${GRAY};font-size:10pt">GPAや資格からあなたに合った大学を提案</p>
      </div>
    </div>`},
  // S3: Self Analysis
  { css: `.step{display:flex;align-items:flex-start;gap:10pt;margin:8pt 0}.num{background:${TEAL};color:white;border-radius:50%;width:24pt;height:24pt;display:flex;align-items:center;justify-content:center;font-size:12pt;font-weight:bold;flex-shrink:0}`, body: `
    <div style="background:${TEAL};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">Step 1：自己分析ワークショップ</h2></div>
    <div style="display:flex;margin:16pt 30pt;gap:20pt">
      <div style="flex:1.2">
        <p style="color:${NAVY};font-size:11pt;font-weight:bold;margin-bottom:8pt">7つのステップでAIと対話しながら自分を深掘り</p>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">1</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">価値観を見つける</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">2</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">強みを言語化する</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">3</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">課題と成長ストーリー</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">4</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">興味・関心の深掘り</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">5</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">将来ビジョン</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">6</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">アイデンティティ統合</p></div>
        <div class="step"><div class="num"><p style="color:white;font-size:11pt">7</p></div><p style="color:${GRAY};font-size:10pt;margin:2pt 0">AP接続文の作成</p></div>
      </div>
      <div style="flex:0.8;background:${LIGHT};border-radius:8pt;padding:14pt">
        <p style="color:${TEAL};font-size:11pt;font-weight:bold;margin-bottom:6pt">完了すると...</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>面接で使える「自分の軸」が明確に</li>
          <li>面接評価で個別アドバイスが出る</li>
          <li>志望理由書の土台ができる</li>
        </ul>
      </div>
    </div>`},
  // S4: Interview Practice
  { css: `.feat{background:white;border-radius:8pt;padding:10pt;margin:3pt 0;border-left:4pt solid ${TEAL}}`, body: `
    <div style="background:${TEAL};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">Step 2：AI模擬面接</h2></div>
    <div style="display:flex;margin:8pt 24pt;gap:12pt">
      <div style="flex:1">
        <p style="color:${NAVY};font-size:11pt;font-weight:bold;margin-bottom:8pt">使い方</p>
        <div class="feat"><p style="color:${NAVY};font-size:10pt"><b>1. 志望校・モードを選択</b></p></div>
        <div class="feat"><p style="color:${NAVY};font-size:10pt"><b>2. 音声モードで開始</b></p><p style="color:${GRAY};font-size:9pt">マイクONで話すだけ。無音検出で自動送信</p></div>
        <div class="feat"><p style="color:${NAVY};font-size:9pt"><b>3. 8〜10ターンの本格面接</b></p></div>
        <div class="feat"><p style="color:${NAVY};font-size:10pt"><b>4. 結果を確認</b></p><p style="color:${GRAY};font-size:9pt">4項目スコア＋個別アドバイス＋映像分析</p></div>
      </div>
      <div style="flex:0.7;background:${LIGHT};border-radius:8pt;padding:14pt">
        <p style="color:${TEAL};font-size:10pt;font-weight:bold;margin-bottom:6pt">評価される4項目</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li><b>明確さ</b>：論理的構造</li>
          <li><b>AP合致度</b>：志望校との整合性</li>
          <li><b>熱意</b>：学問への関心</li>
          <li><b>具体性</b>：エピソードの活用</li>
        </ul>
        <p style="color:${TEAL};font-size:9pt;font-weight:bold;margin-top:6pt">映像分析</p>
        <ul style="color:${GRAY};font-size:9pt">
          <li>アイコンタクト率</li>
          <li>笑顔率・表情変化</li>
          <li>姿勢安定度</li>
        </ul>
      </div>
    </div>`},
  // S5: Essay
  { css: '', body: `
    <div style="background:${TEAL};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">Step 3：小論文添削</h2></div>
    <div style="margin:20pt 40pt">
      <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:12pt">手書き小論文をカメラで撮影 → AIが読み取り＆添削</p>
      <div style="display:flex;gap:20pt">
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt;border:1pt solid #E2E8F0">
          <p style="color:${TEAL};font-size:12pt;font-weight:bold;margin-bottom:8pt">添削の流れ</p>
          <ol style="color:${GRAY};font-size:10pt">
            <li>志望校・テーマを選択</li>
            <li>小論文の写真をアップロード</li>
            <li>OCRで文字を読み取り（確認あり）</li>
            <li>AI添削＆スコア表示</li>
          </ol>
        </div>
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt;border:1pt solid #E2E8F0">
          <p style="color:${TEAL};font-size:12pt;font-weight:bold;margin-bottom:8pt">評価ポイント</p>
          <ul style="color:${GRAY};font-size:10pt">
            <li>論理的構成（序論・本論・結論）</li>
            <li>AP合致度</li>
            <li>独自性・オリジナリティ</li>
            <li>文章力・表現力</li>
            <li>弱点の自動検出＆追跡</li>
          </ul>
        </div>
      </div>
    </div>`},
  // S6: Matching
  { css: '', body: `
    <div style="background:${TEAL};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">Step 4：志望校マッチング＆スケジュール</h2></div>
    <div style="display:flex;margin:16pt 30pt;gap:16pt">
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">マッチング</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>GPA・資格・関心分野を入力</li>
          <li>23大学189学部から自動マッチング</li>
          <li>大学別AP・選考方法・日程を確認</li>
          <li>「質問で探す」機能で対話的に志望校発見</li>
        </ul>
      </div>
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">スケジュール管理</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>志望校の出願〜合格発表をタイムラインで表示</li>
          <li>カウントダウン付き</li>
          <li>月別グループ表示</li>
          <li>次の重要日程をダッシュボードに表示</li>
        </ul>
      </div>
    </div>`},
  // S7: Documents & Activities
  { css: '', body: `
    <div style="background:${TEAL};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">Step 5：出願書類＆活動実績</h2></div>
    <div style="display:flex;margin:16pt 30pt;gap:16pt">
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">出願書類エディタ</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>志望理由書・自己推薦書をオンライン作成</li>
          <li>文字数カウント＆制限表示</li>
          <li>AI添削（AP合致度・構成・独自性）</li>
          <li>バージョン履歴で推敲を管理</li>
          <li>大学別必要書類チェックリスト</li>
        </ul>
      </div>
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">活動実績</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>AIヒアリングで活動を深掘り・構造化</li>
          <li>AP別の最適な表現を自動生成</li>
          <li>カテゴリ別に整理・管理</li>
          <li>手動入力/AIヒアリング切替可能</li>
        </ul>
      </div>
    </div>`},
  // S8: Tips
  { css: `.tip{display:flex;align-items:flex-start;gap:10pt;margin:5pt 0;background:white;border-radius:6pt;padding:9pt}`, body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">効果的な使い方のコツ</h2></div>
    <div style="margin:10pt 30pt">
      <div class="tip"><img src="icon-check-teal.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">まず自己分析を完了する</b> — 面接評価で個別アドバイスが出るようになります</p></div>
      <div class="tip"><img src="icon-check-teal.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">面接は音声モードで練習</b> — 本番に近い環境で。カメラONで態度分析も</p></div>
      <div class="tip"><img src="icon-check-teal.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">繰り返し練習する</b> — 弱点が自動追跡され、成長が可視化されます</p></div>
      <div class="tip"><img src="icon-check-teal.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">小論文は毎回写真で提出</b> — 手書きの練習がそのまま記録に</p></div>
      <div class="tip"><img src="icon-check-teal.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">スケジュールを常にチェック</b> — 出願締切を見逃さない</p></div>
    </div>`},
];

// ===== Teacher slides =====
const teacherSlides = [
  // T1: Title
  { css: '', body: `
    <div style="position:absolute;top:0;left:0;width:720pt;height:405pt"><img src="bg-teacher.png" style="width:720pt;height:405pt"></div>
    <div style="position:relative;z-index:1;margin:80pt 60pt;text-align:center">
      <h1 style="color:white;font-size:36pt;margin-bottom:12pt">coach for 総合型選抜</h1>
      <h2 style="color:#99F6E4;font-size:20pt;font-weight:normal;margin-bottom:30pt">講師・管理者ガイド</h2>
      <p style="color:#CBD5E1;font-size:13pt">生徒の学習状況を管理・サポートするためのガイド</p>
    </div>`},
  // T2: System overview
  { css: '.box{background:white;border-radius:8pt;padding:14pt;border:1pt solid #E2E8F0}', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">システム概要</h2></div>
    <div style="display:flex;margin:16pt 30pt;gap:14pt">
      <div class="box" style="flex:1">
        <p style="color:${TEAL};font-size:12pt;font-weight:bold;margin-bottom:6pt">生徒ポータル</p>
        <ul style="color:${GRAY};font-size:9pt">
          <li>自己分析ワークショップ</li>
          <li>AI模擬面接（音声＋映像）</li>
          <li>小論文添削（OCR＋AI）</li>
          <li>志望校マッチング</li>
          <li>出願書類エディタ</li>
          <li>活動実績管理</li>
          <li>成長トラッキング</li>
        </ul>
      </div>
      <div class="box" style="flex:1">
        <p style="color:${TEAL};font-size:12pt;font-weight:bold;margin-bottom:6pt">管理者ポータル</p>
        <ul style="color:${GRAY};font-size:9pt">
          <li>生徒一覧＆詳細</li>
          <li>要注意生徒アラート</li>
          <li>面談セッション管理</li>
          <li>大学データ編集</li>
          <li>分析ダッシュボード</li>
          <li>合格者データ収集</li>
        </ul>
      </div>
      <div class="box" style="flex:1">
        <p style="color:${TEAL};font-size:12pt;font-weight:bold;margin-bottom:6pt">Superadmin</p>
        <ul style="color:${GRAY};font-size:9pt">
          <li>管理者アカウント管理</li>
          <li>生徒の担当割り当て</li>
          <li>全体統計ダッシュボード</li>
          <li>ロールベースアクセス制御</li>
        </ul>
      </div>
    </div>`},
  // T3: Student management
  { css: '', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">生徒管理</h2></div>
    <div style="margin:10pt 24pt">
      <div style="display:flex;gap:16pt">
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
          <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">生徒一覧（/admin/students）</p>
          <ul style="color:${GRAY};font-size:10pt">
            <li>名前・志望校で検索</li>
            <li>ステータスBadge表示</li>
            <li>スコア推移でソート</li>
            <li>アラートフラグ自動算出</li>
          </ul>
        </div>
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
          <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">生徒詳細（/admin/students/[id]）</p>
          <ul style="color:${GRAY};font-size:10pt">
            <li>プロフィール＆志望校</li>
            <li>面接・小論文スコア推移グラフ</li>
            <li>弱点一覧テーブル</li>
            <li>添削・面接履歴</li>
          </ul>
        </div>
      </div>
      <div style="background:${LIGHT};border-radius:8pt;padding:14pt;margin-top:12pt">
        <p style="color:${TEAL};font-size:11pt;font-weight:bold">担当生徒スコーピング</p>
        <p style="color:${GRAY};font-size:10pt">admin/teacherは自分の担当生徒のみ表示。superadminは全生徒を閲覧可能。</p>
      </div>
    </div>`},
  // T4: Alerts
  { css: '.alert{border-radius:6pt;padding:9pt;margin:4pt 0}', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">要注意生徒アラート</h2></div>
    <div style="margin:10pt 24pt">
      <p style="color:${NAVY};font-size:11pt;font-weight:bold;margin-bottom:10pt">AIが自動検出するアラート条件</p>
      <div class="alert" style="background:#FEF2F2;border-left:3pt solid #EF4444"><p style="color:#991B1B;font-size:10pt"><b>提出停滞</b>：7日以上添削・面接の提出がない生徒</p></div>
      <div class="alert" style="background:#FFFBEB;border-left:3pt solid #F59E0B"><p style="color:#92400E;font-size:10pt"><b>スコア低下</b>：直近3回のスコアが連続で下降している生徒</p></div>
      <div class="alert" style="background:#FEF2F2;border-left:3pt solid #EF4444"><p style="color:#991B1B;font-size:10pt"><b>弱点固定化</b>：同じ弱点が5回以上指摘されている生徒</p></div>
      <div class="alert" style="background:#FFFBEB;border-left:3pt solid #F59E0B"><p style="color:#92400E;font-size:10pt"><b>出願期限接近</b>：出願締切まで14日以内の生徒</p></div>
      <div style="background:${LIGHT};border-radius:8pt;padding:12pt;margin-top:10pt">
        <p style="color:${TEAL};font-size:10pt"><b>ダッシュボードに自動表示</b>：要注意生徒はログイン時にすぐ確認できます</p>
      </div>
    </div>`},
  // T5: Sessions
  { css: '', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">面談セッション管理</h2></div>
    <div style="margin:16pt 30pt;display:flex;gap:16pt">
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">セッション作成</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>対面/オンライン（Google Meet）選択</li>
          <li>Meetリンク手動入力</li>
          <li>日時・生徒・タイプ設定</li>
          <li>ステータス管理（予定→進行中→完了）</li>
        </ul>
      </div>
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">Claude自動サマリー</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>セッション内容からAI要約を自動生成</li>
          <li>指導報告書テンプレート形式</li>
          <li>アクションアイテム抽出</li>
          <li>生徒にもサマリーを共有可能</li>
        </ul>
      </div>
    </div>`},
  // T6: University data
  { css: '', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">大学データ管理</h2></div>
    <div style="margin:10pt 24pt">
      <div style="display:flex;gap:16pt">
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
          <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">対応大学（23校・189学部）</p>
          <ul style="color:${GRAY};font-size:10pt">
            <li>旧帝大7校</li>
            <li>早慶上智3校</li>
            <li>関関同立4校</li>
            <li>MARCH5校</li>
            <li>産近甲龍4校</li>
          </ul>
        </div>
        <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
          <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">編集可能データ</p>
          <ul style="color:${GRAY};font-size:10pt">
            <li>基本情報（名称・URL）</li>
            <li>学部ごとのAP</li>
            <li>選考方法・日程</li>
            <li>面接傾向（形式・雰囲気・頻出テーマ）</li>
            <li>出願要件（GPA・資格）</li>
          </ul>
        </div>
      </div>
      <div style="background:#FEF3C7;border-radius:8pt;padding:12pt;margin-top:10pt">
        <p style="color:#92400E;font-size:10pt"><b>毎年更新が必要</b>：募集要項は毎年変わるため、年度切替時にデータ更新をお願いします</p>
      </div>
    </div>`},
  // T7: Analytics
  { css: '', body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">分析・レポート</h2></div>
    <div style="margin:16pt 30pt;display:flex;gap:16pt">
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">ダッシュボード統計</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>総生徒数・アクティブ率</li>
          <li>平均面接スコア推移</li>
          <li>小論文提出頻度</li>
          <li>弱点パターン分析</li>
          <li>要注意生徒リスト</li>
        </ul>
      </div>
      <div style="flex:1;background:white;border-radius:8pt;padding:16pt">
        <p style="color:${NAVY};font-size:12pt;font-weight:bold;margin-bottom:8pt">成長レポート</p>
        <ul style="color:${GRAY};font-size:10pt">
          <li>生徒個別の成長曲線</li>
          <li>弱点の改善・固定化トラッキング</li>
          <li>面接スコア4項目の推移</li>
          <li>合格者データとの比較</li>
          <li>保護者向けレポート出力</li>
        </ul>
      </div>
    </div>`},
  // T8: Tips
  { css: `.tip{display:flex;align-items:flex-start;gap:10pt;margin:5pt 0;background:white;border-radius:6pt;padding:9pt}`, body: `
    <div style="background:${NAVY};padding:16pt 40pt"><h2 style="color:white;font-size:20pt;margin:0">運用のポイント</h2></div>
    <div style="margin:10pt 30pt">
      <div class="tip"><img src="icon-check-navy.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">生徒にまず自己分析を完了させる</b> — 面接フィードバックの質が大幅に向上します</p></div>
      <div class="tip"><img src="icon-check-navy.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">週1回はダッシュボードを確認</b> — アラートを見逃さず早期対応</p></div>
      <div class="tip"><img src="icon-check-navy.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">面談後はセッションサマリーを生成</b> — 指導記録の自動化で工数削減</p></div>
      <div class="tip"><img src="icon-check-navy.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">大学データは年度始めに更新</b> — AP・日程・選考方法の最新化</p></div>
      <div class="tip"><img src="icon-check-navy.png" style="width:18pt;height:18pt;margin-top:2pt"><p style="color:${GRAY};font-size:10pt"><b style="color:${NAVY}">合格者データを蓄積する</b> — 年度ごとに合格者のスコアデータを登録し、後輩の目標設定に活用</p></div>
    </div>`},
];

async function createPptx(slides, title, author, filename) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = title;
  pptx.author = author;

  for (let i = 0; i < slides.length; i++) {
    const htmlFile = `${filename}-slide${i+1}.html`;
    writeSlide(htmlFile, i === 0 ? 'transparent' : '#F8FAFC', slides[i]);
    await html2pptx(path.resolve(htmlFile), pptx);
  }

  await pptx.writeFile({ fileName: filename });
  console.log(`Created: ${filename}`);
}

async function main() {
  await createPptx(studentSlides, 'coach for 総合型選抜 - 生徒ガイド', 'coach for 総合型選抜', 'guide-student.pptx');
  await createPptx(teacherSlides, 'coach for 総合型選抜 - 講師ガイド', 'coach for 総合型選抜', 'guide-teacher.pptx');
}

main().catch(console.error);
