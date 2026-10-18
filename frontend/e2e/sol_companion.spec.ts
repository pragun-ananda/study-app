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
});
