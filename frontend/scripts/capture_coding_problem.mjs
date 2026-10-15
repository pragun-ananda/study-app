import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec';

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 1. Expand sidebar if collapsed
  const sidebarTabProblems = page.locator('[data-testid="sidebar-tab-problems"]');
  const isProblemsTabVisible = await sidebarTabProblems.isVisible().catch(() => false);
  if (!isProblemsTabVisible) {
    const expandBtn = page.locator('button[aria-label="Toggle study panel"]');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // 2. Click PROBLEMS tab
  console.log('Clicking PROBLEMS tab...');
  await page.locator('[data-testid="sidebar-tab-problems"]').click({ force: true });
  await page.waitForTimeout(1000);

  // 3. Find and click the Trapping Rain Water coding problem card
  console.log('Finding Trapping Rain Water problem card...');
  const trappingCard = page.locator('[data-testid="sidebar-problem-card"]').filter({
    hasText: 'Trapping Rain Water'
  }).first();

  await trappingCard.click({ force: true });
  await page.waitForSelector('[data-testid="problem-viewer-modal"]', { timeout: 5000 });
  await page.waitForTimeout(1200);

  // 4. Capture Top of Prompt (Statement, Example, Constraints)
  const shotTop = path.join(ARTIFACT_DIR, 'coding_problem_prompt_top.png');
  await page.screenshot({ path: shotTop });
  console.log('Saved:', shotTop);

  // 5. Scroll down to Starter Code & Hints, switch to TypeScript tab, expand Hint 1
  console.log('Interacting with Starter Code & Hints...');
  const tsTab = page.locator('button').filter({ hasText: 'TYPESCRIPT' }).first();
  if (await tsTab.isVisible()) {
    await tsTab.click({ force: true });
    await page.waitForTimeout(300);
  }

  const hintToggle = page.locator('button').filter({ hasText: 'Hint 1' }).first();
  if (await hintToggle.isVisible()) {
    await hintToggle.click({ force: true });
    await page.waitForTimeout(400);
  }

  const shotStarterHints = path.join(ARTIFACT_DIR, 'coding_problem_starter_and_hints.png');
  await page.screenshot({ path: shotStarterHints });
  console.log('Saved:', shotStarterHints);

  // 6. Click SOLUTION tab and scroll to top of solution
  console.log('Switching to SOLUTION tab...');
  await page.locator('[data-testid="problem-tab-solution"]').click({ force: true });
  await page.waitForTimeout(1000);

  // Ensure scroll is at the top of modal
  await page.evaluate(() => {
    const modalBody = document.querySelector('[data-testid="problem-viewer-modal"] .overflow-y-auto');
    if (modalBody) modalBody.scrollTop = 0;
  });
  await page.waitForTimeout(500);

  const shotSolution = path.join(ARTIFACT_DIR, 'coding_problem_solution.png');
  await page.screenshot({ path: shotSolution });
  console.log('Saved:', shotSolution);

  await browser.close();
  console.log('Coding problem screenshots completed successfully.');
}

capture().catch((err) => {
  console.error('Error capturing coding problem screenshots:', err);
  process.exit(1);
});
