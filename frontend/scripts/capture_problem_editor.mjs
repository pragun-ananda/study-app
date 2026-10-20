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

  // 3. Open Trapping Rain Water problem
  console.log('Opening problem...');
  const trappingCard = page.locator('[data-testid="sidebar-problem-card"]').filter({
    hasText: 'Trapping Rain Water'
  }).first();

  await trappingCard.click({ force: true });
  await page.waitForSelector('[data-testid="problem-viewer-modal"]', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // 4. Click the "Edit" button
  console.log('Clicking Edit button...');
  const editBtn = page.locator('[data-testid="problem-edit-btn"]');
  await editBtn.click({ force: true });
  await page.waitForTimeout(800);

  // 5. Capture Edit Mode for Problem Prompt & Metadata
  const shotEditPrompt = path.join(ARTIFACT_DIR, 'problem_editor_prompt.png');
  await page.screenshot({ path: shotEditPrompt });
  console.log('Saved:', shotEditPrompt);

  // 6. Switch to SOLUTION tab in Edit mode
  console.log('Switching to SOLUTION tab in Edit mode...');
  await page.locator('[data-testid="problem-tab-solution"]').click({ force: true });
  await page.waitForTimeout(800);

  const shotEditSolution = path.join(ARTIFACT_DIR, 'problem_editor_solution.png');
  await page.screenshot({ path: shotEditSolution });
  console.log('Saved:', shotEditSolution);

  await browser.close();
  console.log('Problem editor screenshots completed successfully.');
}

capture().catch((err) => {
  console.error('Error capturing problem editor screenshots:', err);
  process.exit(1);
});
