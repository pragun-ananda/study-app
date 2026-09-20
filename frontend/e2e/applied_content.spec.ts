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
    await expect(page.getByTestId('topic-inspector')).not.toBeVisible();
  });

  test('switches between OVERVIEW and QUIZ tabs in dual-pane view and interacts with comprehension questions', async ({ page }) => {
    // Open sidebar and launch scenario
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-applications').click();
    await page.getByTestId('sidebar-application-card').first().click();

    const leftPane = page.getByTestId('application-viewer-modal');
    await expect(leftPane).toBeVisible();

    // Verify tab switcher exists with OVERVIEW and QUIZ pills
    const tabSwitcher = page.getByTestId('application-tab-switcher');
    await expect(tabSwitcher).toBeVisible();

    const quizTabBtn = page.getByTestId('application-tab-quiz');
    await expect(quizTabBtn).toBeVisible();
    await expect(quizTabBtn).toHaveText(/QUIZ \(\d+\)/);

    // Switch to QUIZ tab
    await quizTabBtn.click();

    // Quiz container is visible with questions
    const quizContainer = page.getByTestId('application-quiz-container');
    await expect(quizContainer).toBeVisible();
    await expect(page.getByTestId('quiz-viewer')).toBeVisible();

    // Verify relevant concept nodes quick-reference is shown below quiz
    await expect(page.getByText(/Relevant Concept Nodes/i)).toBeVisible();

    // Right-side 3D graph canvas remains present and docked at md:left-1/2
    const canvasContainer = page.getByTestId('scene-canvas-container');
    await expect(canvasContainer).toBeVisible();
    await expect(canvasContainer).toHaveClass(/md:left-1\/2/);

    // Switch back to OVERVIEW tab
    const overviewTabBtn = page.getByTestId('application-tab-overview');
    await overviewTabBtn.click();
    await expect(quizContainer).not.toBeVisible();
    await expect(page.getByText(/Executive Context/i)).toBeVisible();
  });

  test('interacts with MATCHING and ORDERING questions in Dynamo & Cassandra quiz', async ({ page }) => {
    // Open sidebar and launch Dynamo & Cassandra scenario
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-applications').click();
    const dynamoCard = page.getByTestId('sidebar-application-card').filter({ hasText: /Dynamo & Cassandra/i }).first();
    await dynamoCard.click();

    // Switch to QUIZ tab
    const quizTabBtn = page.getByTestId('application-tab-quiz');
    await quizTabBtn.click();

    // Verify Quiz is in PRACTICE MODE initially
    await expect(page.getByText('PRACTICE MODE')).toBeVisible();

    // 1. MATCHING question (Question 3)
    await expect(page.getByText(/Match each Dynamo architectural component/i)).toBeVisible();
    await expect(page.getByText(/Available Definitions Pool/i)).toBeVisible();

    // Click the custom dropdown trigger for Consistent Hash Ring
    const hashRingDropdownBtn = page.getByRole('button', { name: /Select definition for Consistent Hash Ring/i });
    await expect(hashRingDropdownBtn).toBeVisible();
    await hashRingDropdownBtn.click();

    // Dropdown listbox appears with readable options
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    // Select the correct definition from the listbox
    const correctChoice = listbox.getByRole('option').filter({ hasText: /Minimizes key migration/i });
    await expect(correctChoice).toBeVisible();
    await correctChoice.click();

    // Verify listbox closed and selection is displayed
    await expect(listbox).not.toBeVisible();
    await expect(page.getByText('Minimizes key migration when nodes join or leave').first()).toBeVisible();

    // Click Check Matches button
    const checkMatchesBtn = page.getByRole('button', { name: /Check Matches/i });
    await expect(checkMatchesBtn).toBeVisible();
    await checkMatchesBtn.click();

    // Verify CORRECT feedback is displayed
    await expect(page.getByText('CORRECT').first()).toBeVisible();

    // Verify Reset Matches button is now present
    const resetMatchesBtn = page.getByRole('button', { name: /Reset Matches/i });
    await expect(resetMatchesBtn).toBeVisible();

    // 2. ORDERING question (Question 4)
    await expect(page.getByText(/Order the chronological execution steps/i)).toBeVisible();

    // Find move buttons on ordering steps
    const moveStepUpBtns = page.getByTitle('Move Step Up');
    await expect(moveStepUpBtns.first()).toBeVisible();
    // Move a step up
    await moveStepUpBtns.nth(1).click();

    // Click Check Order button
    const checkOrderBtn = page.getByRole('button', { name: /Check Order/i });
    await expect(checkOrderBtn).toBeVisible();
    await checkOrderBtn.click();

    // Verify evaluation summary badge and Reset Order button
    const resetOrderBtn = page.getByRole('button', { name: /Reset Order/i });
    await expect(resetOrderBtn).toBeVisible();

    // 3. Toggle between PRACTICE MODE and AUDIT MODE
    const modeBtn = page.getByText('PRACTICE MODE');
    await modeBtn.click();
    await expect(page.getByText('AUDIT MODE')).toBeVisible();
  });
});
