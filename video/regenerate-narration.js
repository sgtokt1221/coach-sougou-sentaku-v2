const fs = require('fs');
const path = require('path');

const OPENAI_KEY = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8')
  .split('\n').find(l => l.startsWith('OPENAI_API_KEY=')).split('=').slice(1).join('=');

const segments = [
  { id: '01-hook', text: '総合型選抜、72%の受験生が独学で挑んでいます。専門塾は年間50万から100万円。添削が返ってくるまで1週間。この格差を、AIが変えます。' },
  { id: '02-solution', text: 'coach for 総合型選抜は、AIの専属コーチ。24時間対応、プロ講師レベルのフィードバックを、月額4,980円から提供します。' },
  { id: '03-self-analysis', text: 'まずはAI自己分析。7ステップの対話で価値観や強みを言語化。面接や志望理由書の軸が明確になります。' },
  { id: '04-interview', text: 'AI模擬面接は、音声で会話するだけ。大学別のAPに基づいた質問を生成し、スコアに加え、アイコンタクトや話速まで定量分析します。' },
  { id: '05-essay', text: '小論文は写真を撮るだけ。AIが読み取り、5項目で評価。弱点は自動追跡され、成長が可視化されます。' },
  { id: '06-matching', text: '23大学189学部からAIがベストマッチを提案。出願書類の添削、活動実績の構造化もワンストップで。' },
  { id: '07-admin', text: '塾向けには管理ダッシュボードを搭載。生徒の進捗管理、要注意アラート、面談サマリーの自動生成で、講師の工数を大幅に削減します。' },
  { id: '08-numbers', text: '189学部対応、6つのコア機能を全実装済み。総合型選抜市場は800億円。直接競合ゼロの未開拓セグメントです。' },
  { id: '09-pricing', text: 'AIプランは月額4,980円。コーチプランは面談付きで19,800円。塾向けライセンスもご用意しています。' },
  { id: '10-closing', text: 'coach for 総合型選抜。AIが変える、総合型選抜の未来。お問い合わせ、お待ちしています。' },
];

async function gen(seg) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1-hd', input: seg.text, voice: 'nova', response_format: 'mp3', speed: 1.15 }),
  });
  if (!res.ok) { console.error(`Failed ${seg.id}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`public/audio/${seg.id}.mp3`, buf);
  console.log(`${seg.id}: ${(buf.length/1024).toFixed(0)}KB`);
}

async function main() {
  for (const s of segments) await gen(s);
  console.log('Done');
}
main().catch(console.error);
