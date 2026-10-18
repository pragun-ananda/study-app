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

  test('opens and closes Sol chat drawer via click trigger and escape key', async ({ page }) => {
    const triggerBtn = page.getByTestId('sol-trigger-button');
    
    // Initially closed
    await expect(page.getByTestId('sol-chat-drawer')).not.toBeVisible();

    // Click to open
    await triggerBtn.click();
    const chatDrawer = page.getByTestId('sol-chat-drawer');
    await expect(chatDrawer).toBeVisible();

    // Contains welcome message
    await expect(page.getByText(/Hi there! I'm Sol/i)).toBeVisible();

    // Press Escape to dismiss drawer
    await page.keyboard.press('Escape');
    await expect(chatDrawer).not.toBeVisible();
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
