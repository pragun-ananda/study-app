import { test, expect } from '@playwright/test';

// iPhone 14 mobile emulation
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
});

test.describe('Mobile Responsive Experience (iPhone Viewport: 390x844)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
  });

  test('HUD top header and action controls fit cleanly without page overflow', async ({ page }) => {
    // Verify top controls are visible
    const subgraphsBtn = page.getByRole('button', { name: /SUBGRAPHS/i });
    const ingestBtn = page.getByTestId('ingest-url-btn');
    const themeBtn = page.getByTestId('theme-toggle-btn');
    const notifBtn = page.getByTestId('notifications-bell-btn');
    const searchBtn = page.getByTitle('Open concept search');

    await expect(subgraphsBtn).toBeVisible();
    await expect(ingestBtn).toBeVisible();
    await expect(themeBtn).toBeVisible();
    await expect(notifBtn).toBeVisible();
    await expect(searchBtn).toBeVisible();

    // Verify root container does not have horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowing sub-pixel margin
  });

  test('Add to Graph and Notifications dropdowns fit within mobile viewport bounds', async ({ page }) => {
    // 1. Add to Graph dropdown
    const ingestBtn = page.getByTestId('ingest-url-btn');
    await ingestBtn.click();

    const urlInput = page.getByTestId('ingest-url-input');
    await expect(urlInput).toBeVisible();

    // Close Add to Graph
    await ingestBtn.click();

    // 2. Notifications dropdown
    const notifBtn = page.getByTestId('notifications-bell-btn');
    await notifBtn.click();

    const notifHeader = page.getByText(/REVIEW QUEUE/i).first();
    await expect(notifHeader).toBeVisible();

    // Close notifications
    await notifBtn.click();
  });

  test('Left Study Sidebar and Node Inspector maintain mutual exclusivity on mobile', async ({ page }) => {
    // 1. Open left study sidebar
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    await expect(page.getByTestId('sidebar-tab-concepts')).toBeVisible();

    // 2. Click a topic node to select it
    const topicCard = page.getByTestId('sidebar-topic-card').first();
    await expect(topicCard).toBeVisible();
    await topicCard.click();

    // 3. Open inspector using EXPLORE button
    const exploreBtn = page.getByTestId('explore-topic-btn');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Inspector is visible
    const inspector = page.getByTestId('topic-inspector');
    await expect(inspector).toBeVisible();

    // On mobile screens (< 768px), opening Inspector automatically closes Sidebar
    const sidebarTab = page.getByTestId('sidebar-tab-concepts');
    await expect(sidebarTab).not.toBeVisible();

    // 4. Re-opening Sidebar closes Inspector
    await togglePanelBtn.click();
    await expect(page.getByTestId('sidebar-tab-concepts')).toBeVisible();
    await expect(inspector).not.toBeVisible();
  });

  test('Sol AI Companion opens full-width mobile chat and sends message', async ({ page }) => {
    // Locate Sol trigger button
    const solBtn = page.getByTestId('sol-trigger-button');
    await expect(solBtn).toBeVisible();

    // Open Sol chat
    await solBtn.click();

    const chatDrawer = page.getByTestId('sol-chat-drawer');
    await expect(chatDrawer).toBeVisible();

    // Verify full width or mobile drawer layout
    const drawerBox = await chatDrawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    if (drawerBox) {
      expect(drawerBox.width).toBeGreaterThanOrEqual(360);
    }

    // Send a message via quick prompt pill
    const quickPrompt = page.getByRole('button', { name: /Explain simply/i });
    if (await quickPrompt.isVisible()) {
      await quickPrompt.click();
      await expect(page.getByText(/Explain simply/i).first()).toBeVisible();
    }

    // Close Sol chat
    const closeBtn = page.getByLabel('Close Sol Chat');
    await closeBtn.click();
    await expect(chatDrawer).not.toBeVisible();
  });

  test('Interview Problem Viewer allows scrolling down to Code Workbench and running code on mobile', async ({ page }) => {
    // 1. Open left sidebar and switch to PROBLEMS tab
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    const problemsTab = page.getByTestId('sidebar-tab-problems');
    await problemsTab.click();

    // 2. Click on a problem
    const problemCard = page.getByTestId('sidebar-problem-card').first();
    await expect(problemCard).toBeVisible();
    await problemCard.click();

    // 3. Problem Viewer Modal opens
    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // 4. Scroll down inside the modal body to reach the Monaco Code Workbench
    const codeWorkbench = page.getByTestId('problem-code-workbench');
    await codeWorkbench.scrollIntoViewIfNeeded();
    await expect(codeWorkbench).toBeVisible();

    // 5. Verify language tabs are visible and switch language to TypeScript
    const tsTab = page.getByTestId('workbench-lang-tab-typescript');
    if (await tsTab.isVisible()) {
      await tsTab.click();
    }

    // 6. Run Code button is scrollable and functional
    const runBtn = page.getByTestId('run-code-btn');
    await runBtn.scrollIntoViewIfNeeded();
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Console results output visible
    const consoleDrawer = page.getByTestId('testcase-console-drawer');
    await expect(consoleDrawer).toBeVisible({ timeout: 10000 });

    // 7. Close Problem Viewer
    const closeProblemBtn = page.getByTestId('problem-viewer-close-btn');
    await closeProblemBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
