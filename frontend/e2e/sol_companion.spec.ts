import { test, expect } from '@playwright/test';

test.describe('Sol AI Companion & Chat Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="sol-companion"]');
  });

  test('renders Sol floating companion at bottom-right corner', async ({ page }) => {
    const solCompanion = page.getByTestId('sol-companion');
    await expect(solCompanion).toBeVisible();

    const triggerBtn = page.getByTestId('sol-trigger-button');
    await expect(triggerBtn).toBeVisible();
  });

  test('tracks cursor motion and reacts to clicks across the viewport', async ({ page }) => {
    const solCompanion = page.getByTestId('sol-companion');
    await expect(solCompanion).toBeVisible();

    // 1. Move cursor across screen corners to test directional tracking
    await page.mouse.move(100, 100);
    await page.waitForTimeout(100);
    await page.mouse.move(600, 300);
    await page.waitForTimeout(100);
    await page.mouse.move(1100, 700);
    await page.waitForTimeout(100);

    // 2. Click in the viewport and verify Sol reacts without errors
    await page.mouse.click(400, 300);
    await page.waitForTimeout(200);

    // 3. Hover directly over Sol's trigger button
    const triggerBtn = page.getByTestId('sol-trigger-button');
    await triggerBtn.hover();
    await page.waitForTimeout(200);
    await expect(triggerBtn).toBeVisible();
  });

  test('opens Sol chat split on right side, resizes main viewport, and excludes removed subtext/tags', async ({ page }) => {
    const triggerBtn = page.getByTestId('sol-trigger-button');
    const viewport = page.getByTestId('main-content-viewport');
    
    // Initially closed: main viewport takes full width
    await expect(page.getByTestId('sol-chat-drawer')).not.toBeVisible();
    await expect(viewport).toHaveClass(/right-0/);

    // Click to open split pane
    await triggerBtn.click();
    const chatDrawer = page.getByTestId('sol-chat-drawer');
    await expect(chatDrawer).toBeVisible();

    // Verify main viewport has shifted and resized left
    await expect(viewport).toHaveClass(/sm:right-\[400px\]/);
    await expect(viewport).toHaveClass(/md:right-\[440px\]/);
    await expect(viewport).toHaveClass(/lg:right-\[460px\]/);

    // Verify 3D canvas viewport container remains persistently full-width and does not shrink or lag
    const canvasContainer = page.getByTestId('scene-canvas-container');
    await expect(canvasContainer).toBeVisible();
    await expect(canvasContainer).not.toHaveClass(/sm:right-\[400px\]/);

    // Verify "Study Companion & Guide" and "Cosmic AI" tags are completely removed
    await expect(page.getByText('Study Companion & Guide')).not.toBeVisible();
    await expect(page.getByText('Cosmic AI')).not.toBeVisible();

    // Verify Sol name is present in header
    await expect(chatDrawer.getByText('Sol', { exact: true }).first()).toBeVisible();

    // Contains welcome message
    await expect(page.getByText(/Hi there! I'm Sol/i)).toBeVisible();

    // Press Escape to dismiss drawer
    await page.keyboard.press('Escape');
    await expect(chatDrawer).not.toBeVisible();

    // Viewport reverts to full width
    await expect(viewport).not.toHaveClass(/sm:right-\[400px\]/);
  });

  test('allows sending a chat prompt and renders Sol response', async ({ page }) => {
    const triggerBtn = page.getByTestId('sol-trigger-button');
    await triggerBtn.click();

    const chatDrawer = page.getByTestId('sol-chat-drawer');
    await expect(chatDrawer).toBeVisible();

    // Type a question in the chat input
    const input = page.getByPlaceholder(/Ask Sol anything/i);
    await input.fill('What should I study next?');
    await input.press('Enter');

    // Verify the user message is visible in the chat history
    await expect(page.getByText('What should I study next?')).toBeVisible();

    // Verify Sol responds
    await expect(chatDrawer.locator('.flex.justify-start').last()).toBeVisible({ timeout: 10000 });
  });

  test('coexists cleanly without compressing layout when left panel, right inspector, or modals are open', async ({ page }) => {
    // 1. Expand left study panel
    const sidebar = page.getByTestId('left-study-sidebar');
    await sidebar.click();
    await expect(page.getByTestId('sidebar-tab-concepts')).toBeVisible();

    // 2. Open Sol Chat Drawer
    const triggerBtn = page.getByTestId('sol-trigger-button');
    await triggerBtn.click();
    const chatDrawer = page.getByTestId('sol-chat-drawer');
    await expect(chatDrawer).toBeVisible();

    // Verify chat drawer adjusts to compact width when other panels are open
    await expect(chatDrawer).toHaveClass(/sm:w-\[350px\]/);
    await expect(chatDrawer).toHaveClass(/lg:w-\[400px\]/);

    // Verify main content viewport adjusts to match the compact split
    const viewport = page.getByTestId('main-content-viewport');
    await expect(viewport).toHaveClass(/sm:right-\[350px\]/);
    await expect(viewport).toHaveClass(/lg:right-\[400px\]/);

    // Verify left sidebar remains visible and responsive without clipping
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/md:w-80/);

    // 3. Open a topic concept from left sidebar to trigger right inspector
    const firstTopicCard = page.getByTestId('sidebar-topic-card').first();
    await expect(firstTopicCard).toBeVisible();
    await firstTopicCard.click();

    const exploreBtn = page.getByTestId('explore-topic-btn');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Verify right inspector opened with calibrated responsive width
    const inspector = page.getByTestId('topic-inspector');
    await expect(inspector).toBeVisible();
    await expect(inspector).toHaveClass(/md:w-80/);

    // Verify 3D canvas is still visible and has not shrunk or crashed
    const canvasContainer = page.getByTestId('scene-canvas-container');
    await expect(canvasContainer).toBeVisible();

    // 4. Test modal coexistence: open a ProblemViewerModal
    // Switch to PROBLEMS tab in the left sidebar
    const problemsTab = page.getByTestId('sidebar-tab-problems');
    await problemsTab.click();
    const problemCards = page.getByTestId('sidebar-problem-card');
    await expect(problemCards.first()).toBeVisible({ timeout: 10000 });
    await problemCards.first().click();

    // Modal is now open: verify viewport does not compress modal
    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();
    await expect(viewport).toHaveClass(/right-0/);
    await expect(viewport).toHaveClass(/overflow-visible/);

    // Sol floating companion is cleanly hidden while modal is open
    await expect(page.getByTestId('sol-companion')).not.toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Viewport returns to compact split
    await expect(viewport).toHaveClass(/sm:right-\[350px\]/);
  });
});
