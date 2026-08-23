import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3000/login');
await p.locator('input[type=email]:visible').first().fill('student@example.com');
await p.locator('input[type=password]:visible').first().fill('password');
await p.locator('button[type=submit]:visible').first().click();
await p.waitForURL(/student/, { timeout: 40000 });
await p.goto('http://localhost:3000/student/essay/lectures/essay-basics-01');
await p.waitForTimeout(1500);
for (let i = 0; i < 4; i++) { await p.getByRole('button', { name: /進む/ }).click(); await p.waitForTimeout(600); }
const strongs = await p.locator('p strong').allInnerTexts();
console.log('ページ:', (await p.locator('body').innerText()).match(/\d \/ \d/)?.[0]);
console.log('強調された語:', JSON.stringify(strongs));
console.log('生の ** が残っていないか:', (await p.locator('body').innerText()).includes('**') ? '残っている' : 'なし');
await b.close();
