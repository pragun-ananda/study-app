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

  // 2. Click CASE STUDIES tab
  console.log('Clicking CASE STUDIES tab...');
  await page.locator('[data-testid="sidebar-tab-applications"]').click({ force: true });
  await page.waitForTimeout(1000);
  const shotCaseStudies = path.join(ARTIFACT_DIR, 'case_studies_tab.png');
  await page.screenshot({ path: shotCaseStudies });
  console.log('Saved:', shotCaseStudies);

  // 3. Click PROBLEMS tab
  console.log('Clicking PROBLEMS tab...');
  await page.locator('[data-testid="sidebar-tab-problems"]').click({ force: true });
  await page.waitForTimeout(1000);
  const shot1 = path.join(ARTIFACT_DIR, 'problem_library_tab.png');
  await page.screenshot({ path: shot1 });
  console.log('Saved:', shot1);

  // 4. Click the first problem card to open ProblemViewerModal
  console.log('Opening first problem card...');
  const firstCard = page.locator('[data-testid="sidebar-problem-card"]').first();
  await firstCard.click({ force: true });
  await page.waitForSelector('[data-testid="problem-viewer-modal"]', { timeout: 5000 });
  await page.waitForTimeout(1000);

  const shot2 = path.join(ARTIFACT_DIR, 'problem_viewer_prompt.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved:', shot2);

  // 5. Click SOLUTION tab inside ProblemViewerModal
  console.log('Switching to SOLUTION tab...');
  await page.locator('[data-testid="problem-tab-solution"]').click({ force: true });
  await page.waitForTimeout(1000);

  const shot3 = path.join(ARTIFACT_DIR, 'problem_viewer_solution.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved:', shot3);

  // 6. Click a prerequisite topic chip inside the solution
  console.log('Clicking prerequisite topic chip inside solution...');
  const prereqChip = page.locator('[data-testid^="prereq-topic-chip-"]').first();
  if (await prereqChip.isVisible()) {
    await prereqChip.click({ force: true });
    await page.waitForTimeout(1500);
    const shotInspector = path.join(ARTIFACT_DIR, 'topic_inspector_linked_problem.png');
    await page.screenshot({ path: shotInspector });
    console.log('Saved:', shotInspector);
  }

  await browser.close();
  console.log('All screenshots completed.');
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
