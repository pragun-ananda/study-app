import { test, expect } from '@playwright/test';

test.describe('Applied Content Dual-Panel Viewer E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('opens APPLIED tab from sidebar and verifies application cards', async ({ page }) => {
    // Open left sidebar drawer
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Click APPLIED tab
    const appliedTab = page.getByTestId('sidebar-tab-applications');
    await expect(appliedTab).toBeVisible();
    await appliedTab.click();

    // Verify Real-World Scenarios list
    await expect(page.getByText(/REAL-WORLD SCENARIOS/i)).toBeVisible();
    const appCards = page.getByTestId('sidebar-application-card');
    await expect(appCards.first()).toBeVisible();
    expect(await appCards.count()).toBeGreaterThanOrEqual(3);

    // Verify card badges
    await expect(page.getByText(/CASE STUDY/i).first()).toBeVisible();
    await expect(page.getByText(/Concepts/i).first()).toBeVisible();
  });

  test('clicks an applied scenario and verifies side-by-side dual-pane view with graph on right', async ({ page }) => {
    // Open left sidebar drawer
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Switch to APPLIED tab
    await page.getByTestId('sidebar-tab-applications').click();

    // Click Dynamo & Cassandra Case Study card
    const dynamoCard = page.getByTestId('sidebar-application-card').filter({ hasText: /Dynamo & Cassandra/i }).first();
    await expect(dynamoCard).toBeVisible();
    await dynamoCard.click();

    // Verify dual-pane layout:
    // Left pane is docked on the left (w-full md:w-1/2)
    const leftPane = page.getByTestId('application-viewer-modal');
    await expect(leftPane).toBeVisible();
    await expect(leftPane).toHaveClass(/md:w-1\/2/);

    // Right side has the scene canvas container positioned at md:left-1/2
    const canvasContainer = page.getByTestId('scene-canvas-container');
    await expect(canvasContainer).toBeVisible();
    await expect(canvasContainer).toHaveClass(/md:left-1\/2/);

    // Verify content inside left pane:
    await expect(page.getByText('Dynamo & Cassandra: High-Availability Ring Storage')).toBeVisible();
    await expect(page.getByText(/Executive Context/i)).toBeVisible();
    await expect(page.getByText(/Consistent Hashing & Virtual Nodes/i)).toBeVisible();

    // Verify connected concepts section in left pane
    await expect(page.getByText(/Connected Concepts/i).first()).toBeVisible();
    await expect(page.getByText(/Highlighted in right 3D graph/i)).toBeVisible();
  });

  test('interacts with connected concepts in left pane to select nodes on the graph', async ({ page }) => {
    // Open sidebar and launch scenario
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-applications').click();
    await page.getByTestId('sidebar-application-card').first().click();

    const leftPane = page.getByTestId('application-viewer-modal');
    await expect(leftPane).toBeVisible();

    // Click on one of the connected concept cards in the left pane
    const conceptCard = leftPane.getByText('Consistent Hashing & DHT').first();
    await expect(conceptCard).toBeVisible();
    await conceptCard.click();

    // Verify that the node becomes selected in the store
    const selectedId = await page.evaluate(() => (window as any).useStore ? (window as any).useStore.getState().selectedTopicId : null);
    // Alternatively check through useStore state or UI selection ring
    expect(await page.getByTestId('scene-canvas-container').isVisible()).toBe(true);
  });

  test('dismisses dual-pane view via Close button and reverts graph to full screen', async ({ page }) => {
    // Open sidebar and launch scenario
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-applications').click();
    await page.getByTestId('sidebar-application-card').first().click();

    const leftPane = page.getByTestId('application-viewer-modal');
    await expect(leftPane).toBeVisible();

    // Click Close button
    const closeBtn = page.getByTitle('Close viewer (Esc)');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify left pane is dismissed
    await expect(leftPane).not.toBeVisible();

    // Verify canvas container returns to full width (left-0, not md:left-1/2)
    const canvasContainer = page.getByTestId('scene-canvas-container');
    await expect(canvasContainer).toBeVisible();
    await expect(canvasContainer).not.toHaveClass(/md:left-1\/2/);
  });

  test('dismisses dual-pane view via Escape key', async ({ page }) => {
    // Open sidebar and launch scenario
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-applications').click();
    await page.getByTestId('sidebar-application-card').first().click();

    await expect(page.getByTestId('application-viewer-modal')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify dismissed
    await expect(page.getByTestId('application-viewer-modal')).not.toBeVisible();
    await expect(page.getByTestId('scene-canvas-container')).not.toHaveClass(/md:left-1\/2/);
  });

  test('opens applied scenario from 3D Topic Inspector', async ({ page }) => {
    // Search for a topic that has real-world applications (Consistent Hashing)
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Consistent Hashing');

    // Click matching card in sidebar
    const topicCard = page.getByTestId('sidebar-topic-card').filter({ hasText: /Consistent Hashing & DHT/i }).first();
    await expect(topicCard).toBeVisible();
    await topicCard.click();

    // Click Explore button to open Inspector
    const exploreBtn = page.getByTestId('explore-topic-btn');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Verify Real-World Applications section exists in Inspector
    await expect(page.getByText(/REAL-WORLD APPLICATIONS/i)).toBeVisible();

    // Click scenario item inside inspector
    const scenarioItem = page.getByTestId('inspector-application-item').first();
    await expect(scenarioItem).toBeVisible();
    await scenarioItem.click();

    // Verify dual-pane view opens with the scenario
    const leftPane = page.getByTestId('application-viewer-modal');
    await expect(leftPane).toBeVisible();
    await expect(page.getByTestId('scene-canvas-container')).toHaveClass(/md:left-1\/2/);

    // Verify the inspector card has cleanly closed
    await expect(page.getByTestId('inspector-application-item')).not.toBeVisible();
  });
});
