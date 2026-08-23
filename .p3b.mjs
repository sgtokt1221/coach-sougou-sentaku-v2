import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-shigetaokito-Projects-coach-sougou-sentaku-v2/5bd4c8f0-60f3-474d-a405-6e15327cd57c/scratchpad';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 1200 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0,160)); });
await p.goto('http://localhost:3000/login');
await p.locator('input[type=email]:visible').first().fill('student@example.com');
await p.locator('input[type=password]:visible').first().fill('password');
await p.locator('button[type=submit]:visible').first().click();
await p.waitForURL(/student/, { timeout: 40000 });

async function toExercise(id, label, shot) {
  await p.goto(`http://localhost:3000/student/essay/lectures/${id}`);
  await p.waitForTimeout(1300);
  const body0 = await p.locator('body').innerText();
  const n = Number(body0.match(/シーン \d+ \/ (\d+)/)?.[1] ?? 0);
  if (!n) { console.log(`${label}: アニメなし`); return; }
  await p.getByText('自動再生を止める').click();
  for (let i = 0; i < n - 1; i++) { await p.getByRole('button', { name: /進む/ }).click(); await p.waitForTimeout(180); }
  const btn = await p.getByRole('button', { name: /ドリルへ進む|この講義の問題を解く|課題へ進む/ }).innerText();
  if (btn.includes('ドリル')) {
    await p.getByRole('button', { name: /ドリルへ進む/ }).click();
    await p.waitForTimeout(700);
    for (let q = 0; q < 5; q++) {
      const list = await p.locator('ul li button').all();
      await list[1].click(); await p.waitForTimeout(300);
      await p.getByRole('button', { name: /次の問題|課題へ進む/ }).click(); await p.waitForTimeout(400);
    }
  } else {
    await p.getByRole('button', { name: /この講義の問題を解く|課題へ進む/ }).click();
  }
  await p.waitForTimeout(1200);
  if (shot) await p.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  const t = (await p.locator('body').innerText()).split('\n').filter(Boolean).slice(2, 20).join(' | ');
  console.log(`--- ${label} ---\n${t.slice(0, 700)}\n`);
}

await toExercise('essay-basics-17', '第16講 課題文型（課題文）', 'p3-ex16');
await toExercise('essay-basics-18', '第17講 資料型（資料）', 'p3-ex17');
await toExercise('essay-basics-20', '第20講 時間配分（タイマー）', 'p3-ex20');
await b.close();
