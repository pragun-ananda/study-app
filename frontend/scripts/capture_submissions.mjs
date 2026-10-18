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
  await page.waitForTimeout(2000);

  // 1. Expand sidebar if collapsed
  const sidebarTabProblems = page.locator('[data-testid="sidebar-tab-problems"]');
  if (!(await sidebarTabProblems.isVisible().catch(() => false))) {
    const expandBtn = page.locator('button[aria-label="Toggle study panel"]');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // 2. Click PROBLEMS tab
  console.log('Opening Problems tab...');
  await page.locator('[data-testid="sidebar-tab-problems"]').click({ force: true });
  await page.waitForTimeout(800);

  // 3. Open Trapping Rain Water
  console.log('Opening Trapping Rain Water...');
  const trappingCard = page.locator('[data-testid="sidebar-problem-card"]').filter({
    hasText: 'Trapping Rain Water'
  }).first();
  await trappingCard.click({ force: true });
  await page.waitForSelector('[data-testid="problem-viewer-modal"]', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // 4. Submit starter code (Wrong Answer)
  console.log('Submitting starter code to produce Wrong Answer...');
  const submitBtn = page.locator('[data-testid="submit-solution-btn"]');
  await submitBtn.click();
  await page.waitForSelector('[data-testid="submission-result-modal"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Capture Wrong Answer screenshot
  const shotWrongAnswer = path.join(ARTIFACT_DIR, 'submission_result_wrong_answer.png');
  await page.screenshot({ path: shotWrongAnswer });
  console.log('Saved:', shotWrongAnswer);

  // 5. Close modal via Back to Code
  console.log('Closing submission modal via Back to Code...');
  await page.locator('[data-testid="back-to-code-btn"]').click();
  await page.waitForTimeout(600);

  // 6. Switch to TypeScript for Accepted solution
  console.log('Selecting TypeScript workbench tab...');
  await page.locator('[data-testid="workbench-lang-tab-typescript"]').click();
  await page.waitForTimeout(600);

  const solutionCode = `export function trap(height: number[]): number {
  if (!height || height.length === 0) return 0;
  let left = 0, right = height.length - 1;
  let leftMax = height[left], rightMax = height[right];
  let water = 0;
  while (left < right) {
    if (leftMax < rightMax) {
      left++;
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
    } else {
      right--;
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
    }
  }
  return water;
}`;

  console.log('Setting optimal TypeScript solution into Monaco editor...');
  await page.evaluate((code) => {
    // @ts-ignore
    const models = window.monaco?.editor?.getModels();
    if (models && models.length > 0) {
      models[models.length - 1].setValue(code);
    }
  }, solutionCode);
  await page.waitForTimeout(800);

  // Submit optimal solution (Accepted)
  console.log('Submitting optimal solution...');
  await submitBtn.click();
  await page.waitForSelector('[data-testid="submission-result-modal"]', { timeout: 10000 });
  await page.waitForTimeout(1200);

  // Capture Accepted screenshot
  const shotAccepted = path.join(ARTIFACT_DIR, 'submission_result_accepted.png');
  await page.screenshot({ path: shotAccepted });
  console.log('Saved:', shotAccepted);

  // 7. Click View All Submissions
  console.log('Navigating to Submissions history tab...');
  await page.locator('[data-testid="view-all-submissions-btn"]').click();
  await page.waitForSelector('[data-testid="submissions-table"]', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Capture Submissions History Tab screenshot
  const shotHistory = path.join(ARTIFACT_DIR, 'submission_history_tab.png');
  await page.screenshot({ path: shotHistory });
  console.log('Saved:', shotHistory);

  await browser.close();
  console.log('All submission screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
