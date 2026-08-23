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

await p.goto('http://localhost:3000/student/essay/lectures');
await p.waitForTimeout(2500);
const t = await p.locator('body').innerText();
console.log('講数:', t.match(/全\d+講/)?.[0]);
console.log('Phase:', t.split('\n').filter(l => ['導入','型を組む','中身の質','読む・分析','型を変形する','仕上げる'].includes(l.trim())).join(' / '));
await p.screenshot({ path: `${OUT}/p3-list.png`, fullPage: true });

// 15講: 図解シーン（字数配分）を探す
await p.goto('http://localhost:3000/student/essay/lectures/essay-basics-16');
await p.waitForTimeout(1500);
await p.getByText('自動再生を止める').click();
for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: /進む/ }).click(); await p.waitForTimeout(700); }
await p.screenshot({ path: `${OUT}/p3-diagram.png` });
console.log('--- 15講 s4 ---');
console.log((await p.locator('body').innerText()).split('\n').filter(Boolean).slice(3,16).join(' | '));
await b.close();
