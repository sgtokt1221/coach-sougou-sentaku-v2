import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-shigetaokito-Projects-coach-sougou-sentaku-v2/5bd4c8f0-60f3-474d-a405-6e15327cd57c/scratchpad';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 1200 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0,200)); });
p.on('response', r => { const u = r.url(); if (u.includes('/api/essay/lecture/')) console.log('API', r.status(), u.split('/api')[1].split('?')[0]); });
await p.goto('http://localhost:3000/login');
await p.locator('input[type=email]:visible').first().fill('student@example.com');
await p.locator('input[type=password]:visible').first().fill('password');
await p.locator('button[type=submit]:visible').first().click();
await p.waitForURL(/student/, { timeout: 40000 });
await p.goto('http://localhost:3000/student/essay/lectures/essay-basics-05');
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
const areas = await p.locator('textarea').all();
console.log('入力欄:', areas.length);
// 1件目: きちんと直す（AIの案とは違う言い回し）
await areas[0].fill('オンライン教育には、通学の負担なく学べるという利点がある。');
// 2件目: 冗長は消えたが敬体が残る（別の問題が入った例）
await areas[1].fill('この方式なら、誰もが授業を受けられると期待されます。');
// 3件目: ほとんど直っていない
await areas[2].fill('私が一番伝えたいことは、通信環境の差をなくしたいです。');
await p.waitForTimeout(300);
await p.getByRole('button', { name: /判定する/ }).click();
console.log('判定待ち...');
await p.waitForSelector('text=/課題へ進む/', { timeout: 180000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/p2b-judge.png`, fullPage: true });
console.log('--- 判定結果 ---');
console.log((await p.locator('body').innerText()).split('\n').filter(Boolean).slice(2, 30).join('\n'));
await b.close();
