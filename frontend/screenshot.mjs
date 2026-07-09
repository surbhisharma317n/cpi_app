import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:\Users\SURBHI\AppData\Local\Temp\claude\c--Users-SURBHI-Desktop-Project-my-project-cpi_app\cf075fb1-256c-4046-b8a1-9ba3d8dd0ccf\scratchpad\login-page.png', fullPage: true });
  console.log('Screenshot saved');
  await browser.close();
})();
