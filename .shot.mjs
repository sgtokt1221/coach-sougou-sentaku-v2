import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-shigetaokito-Projects-coach-sougou-sentaku-v2/5bd4c8f0-60f3-474d-a405-6e15327cd57c/scratchpad';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0,160)); });
await p.goto('http://localhost:3000/login');
await p.locator('input[type=email]:visible').first().fill('student@example.com');
await p.locator('input[type=password]:visible').first().fill('password');
await p.locator('button[type=submit]:visible').first().click();
await p.waitForURL(/student/, { timeout: 40000 });
await p.goto('http://localhost:3000/student/essay/lectures/essay-basics-01');
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/open.png` });
console.log('自動再生の表示:', (await p.locator('body').innerText()).includes('自動再生') ? 'まだある' : 'なし');
// 5回進んで s4（強調付きキャプション）へ
for (let i = 0; i < 5; i++) { await p.getByRole('button', { name: /進む/ }).click(); await p.waitForTimeout(900); }
await p.screenshot({ path: `${OUT}/emph.png` });
console.log((await p.locator('body').innerText()).split('\n').filter(Boolean).slice(2,10).join(' | '));
await b.close();
