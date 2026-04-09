const { chromium } = require('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // Login setup
  await page.goto('http://localhost:3000/login', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('devRole', 'student');
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('targetUniversities', JSON.stringify(['doshisha-u:global-communications']));
  });
  await page.screenshot({ path: 'screenshots/15-login.png' });
  console.log('Captured: 15-login');

  const studentScreens = [
    { url: '/student/dashboard', name: '01-dashboard', wait: 4000 },
    { url: '/student/self-analysis', name: '02-self-analysis', wait: 3000 },
    { url: '/student/self-analysis/result', name: '03-self-analysis-result', wait: 3000 },
    { url: '/student/interview/new', name: '04-interview-new', wait: 3000 },
    { url: '/student/essay/new', name: '07-essay-new', wait: 3000 },
    { url: '/student/universities', name: '09-universities', wait: 3000 },
    { url: '/student/documents', name: '10-documents', wait: 3000 },
    { url: '/student/activities', name: '10b-activities', wait: 3000 },
    { url: '/student/growth', name: '11-growth', wait: 3000 },
  ];

  for (const s of studentScreens) {
    try {
      await page.goto(`http://localhost:3000${s.url}`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(s.wait);
      await page.screenshot({ path: `screenshots/${s.name}.png` });
      console.log(`Captured: ${s.name}`);
    } catch (e) {
      console.log(`Failed: ${s.name} - ${e.message.split('\n')[0]}`);
    }
  }

  // Switch to admin
  await page.evaluate(() => localStorage.setItem('devRole', 'admin'));
  const adminScreens = [
    { url: '/admin/dashboard', name: '12-admin-dashboard', wait: 3000 },
    { url: '/admin/students', name: '13-admin-students', wait: 3000 },
  ];

  for (const s of adminScreens) {
    try {
      await page.goto(`http://localhost:3000${s.url}`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(s.wait);
      await page.screenshot({ path: `screenshots/${s.name}.png` });
      console.log(`Captured: ${s.name}`);
    } catch (e) {
      console.log(`Failed: ${s.name} - ${e.message.split('\n')[0]}`);
    }
  }

  await browser.close();
  console.log('All done!');
}

capture().catch(console.error);
