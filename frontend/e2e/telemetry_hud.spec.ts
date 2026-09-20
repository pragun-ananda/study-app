import { test, expect } from '@playwright/test';

test.describe('Telemetry HUD & User Controls (FRO-9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('Displays full telemetry status, concept counters, and mastery gauges', async ({ page }) => {
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible();
    await expect(page.getByText(/MASTERY:/i)).toBeVisible();

    // Expand left sidebar to verify concepts
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();
    await expect(page.getByText(/CONCEPTS/i).first()).toBeVisible();
  });

  test('Filters concepts via real-time search and displays matching node telemetry', async ({ page }) => {
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Raft');

    // Matching topic card in search/sidebar appears
    const raftNode = page.getByTestId('sidebar-topic-card').filter({ hasText: 'Distributed Consensus (Raft)' }).first();
    await expect(raftNode).toBeVisible();
    await raftNode.click();

    // Verify Floating EXPLORE action button appears on bottom right and open inspector
    const exploreBtn = page.getByTestId('explore-topic-btn');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Telemetry Inspector opens with details
    const inspector = page.getByTestId('topic-inspector');
    await expect(inspector).toBeVisible();
    // Verify prerequisites & learn next unlock chains are listed
    await expect(inspector.getByText(/PREREQUISITES/i).first()).toBeVisible();
    await expect(inspector.getByText(/LEARN NEXT/i)).toBeVisible();
    await expect(inspector.getByText('Paxos Protocol')).toBeVisible();

    // Close Inspector
    const closeBtn = page.getByTitle('Close Inspector');
    await closeBtn.click();
  });

  test('Expands Subgraphs drawer and filters by category', async ({ page }) => {
    // Open Subgraphs drawer
    const subgraphsBtn = page.getByRole('button', { name: /SUBGRAPHS/i });
    await subgraphsBtn.click();

    // Select SYSTEMS domain filter
    const systemsCategoryBtn = page.getByRole('button', { name: 'SYSTEMS' }).first();
    await expect(systemsCategoryBtn).toBeVisible();
    await systemsCategoryBtn.click();

    // Verify filtered HUD reflects SYSTEMS domain
    await expect(page.getByText(/SYSTEMS MASTERY:/i)).toBeVisible();

    // Close panel
    const minimizeBtn = page.getByTitle('Minimize Subgraphs');
    await minimizeBtn.click();
  });

  test('Expands left sidebar, navigates CONCEPTS tab and APPLIED tab', async ({ page }) => {
    // Open sidebar
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Verify CONCEPTS tab is active initially
    const conceptsTabBtn = page.getByTestId('sidebar-tab-concepts');
    await expect(conceptsTabBtn).toBeVisible();
    await expect(conceptsTabBtn).toHaveText(/CONCEPTS \(\d+\)/);

    // Verify TASKS tab is absent
    await expect(page.getByRole('button', { name: /TASKS/i })).not.toBeVisible();

    // Switch to APPLIED tab
    const appliedTabBtn = page.getByTestId('sidebar-tab-applications');
    await expect(appliedTabBtn).toBeVisible();
    await appliedTabBtn.click();
    await expect(page.getByText(/REAL-WORLD SCENARIOS/i)).toBeVisible();

    // Switch back to CONCEPTS tab
    await conceptsTabBtn.click();
    await expect(page.getByTestId('sidebar-add-node-btn')).toBeVisible();
  });

  test('Handles Slash (/) to open search & sidebar, and Escape to dismiss', async ({ page }) => {
    // 1. Press '/' to open search input and expand left sidebar
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();
    await expect(page.getByText(/CONCEPTS/i).first()).toBeVisible();

    // Type search query
    await searchInput.fill('Backpropagation');
    await expect(page.getByText('Neural Network Backpropagation').first()).toBeVisible();

    // 2. Press 'Escape' to dismiss search and collapse sidebar
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
    await expect(page.getByText(/CONCEPTS/i).first()).not.toBeVisible();
  });

  test('Toggles light mode and dark mode via button and keyboard shortcut', async ({ page }) => {
    const themeBtn = page.getByTestId('theme-toggle-btn');
    await expect(themeBtn).toBeVisible();

    const initialTheme = ((await page.locator('html').getAttribute('data-theme')) || 'dark') as 'dark' | 'light';
    const toggledTheme = initialTheme === 'dark' ? 'light' : 'dark';

    // Click theme toggle button to switch to opposite mode
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', toggledTheme);
    await expect(page.locator('html')).toHaveClass(new RegExp(toggledTheme));

    // Toggle back via keyboard shortcut 't'
    await page.keyboard.press('t');
    await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme);
    await expect(page.locator('html')).toHaveClass(new RegExp(initialTheme));
  });
});


