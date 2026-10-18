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

  // 4. Capture Rust in Dark Mode
  console.log('Selecting Rust tab in Dark Mode...');
  const rustTab = page.locator('[data-testid="workbench-lang-tab-rust"]');
  await rustTab.click();
  await page.waitForTimeout(600);
  const shotRustDark = path.join(ARTIFACT_DIR, 'code_editor_rust_dark.png');
  await page.screenshot({ path: shotRustDark });
  console.log('Saved:', shotRustDark);

  // 5. Capture Protobuf in Dark Mode
  console.log('Selecting Protobuf tab in Dark Mode...');
  const protoTab = page.locator('[data-testid="workbench-lang-tab-protobuf"]');
  await protoTab.click();
  await page.waitForTimeout(600);
  const shotProtoDark = path.join(ARTIFACT_DIR, 'code_editor_protobuf_dark.png');
  await page.screenshot({ path: shotProtoDark });
  console.log('Saved:', shotProtoDark);

  // 6. Toggle to Light Mode via keyboard shortcut 't' and select C++
  console.log('Toggling to Light Mode via key "t" and selecting C++...');
  await page.keyboard.press('t');
  await page.waitForTimeout(800);

  const cppTab = page.locator('[data-testid="workbench-lang-tab-cpp"]');
  await cppTab.click();
  await page.waitForTimeout(600);
  const shotCppLight = path.join(ARTIFACT_DIR, 'code_editor_cpp_light.png');
  await page.screenshot({ path: shotCppLight });
  console.log('Saved:', shotCppLight);

  await browser.close();
  console.log('Visual capture complete!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
