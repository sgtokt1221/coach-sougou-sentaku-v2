import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-shigetaokito-Projects-coach-sougou-sentaku-v2/5bd4c8f0-60f3-474d-a405-6e15327cd57c/scratchpad';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 1200 } });
p.on('response', r => { const u = r.url(); if (u.includes('/api/essay/lecture/personal-items')) console.log('API', r.status()); });
await p.goto('http://localhost:3000/login');
await p.locator('input[type=email]:visible').first().fill('student@example.com');
await p.locator('input[type=password]:visible').first().fill('password');
await p.locator('button[type=submit]:visible').first().click();
await p.waitForURL(/student/, { timeout: 40000 });
// 2回目：素材を使い切ったので書き直しラウンドは出ないはず（4講で確認）
await p.goto('http://localhost:3000/student/essay/lectures/essay-basics-06');
await p.waitForTimeout(1500);
await p.getByText('自動再生を止める').click();
const n = Number((await p.locator('body').innerText()).match(/シーン \d+ \/ (\d+)/)?.[1] ?? 6);
for (let i = 0; i < n - 1; i++) { await p.getByRole('button', { name: /進む/ }).click(); await p.waitForTimeout(150); }
await p.getByRole('button', { name: /ドリルへ進む/ }).click();
await p.waitForTimeout(800);
for (let q = 0; q < 5; q++) {
  const list = await p.locator('ul li button').all();
  await list[1].click(); await p.waitForTimeout(250);
  await p.getByRole('button', { name: /次の問題|課題へ進む/ }).click(); await p.waitForTimeout(400);
}
await p.waitForTimeout(2500);
const t = await p.locator('body').innerText();
console.log('2回目の遷移先:', t.includes('あなたの答案から') ? '書き直しラウンド（想定外）' : '課題画面（想定どおり）');
console.log((t.split('\n').filter(Boolean).slice(2, 8).join(' | ')).slice(0, 300));
await b.close();
