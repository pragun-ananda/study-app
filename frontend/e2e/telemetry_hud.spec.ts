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

    // Expand left sidebar to verify 187 graph nodes
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();
    await expect(page.getByText(/GRAPH NODES \(187\)/i)).toBeVisible();
  });

  test('Filters concepts via real-time search and displays matching node telemetry', async ({ page }) => {
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Raft');

    // Matching topic card in search/sidebar appears
    const raftNode = page.getByText('Distributed Consensus (Raft)').first();
    await expect(raftNode).toBeVisible();
    await raftNode.click();

    // Verify Floating EXPLORE action button appears on bottom right
    const exploreBtn = page.locator('button:has-text("EXPLORE:")');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Verify Raft topic details in HUD inspector
    await expect(page.getByText('Distributed Consensus (Raft)').first()).toBeVisible();
    await expect(page.getByText('SYSTEMS').first()).toBeVisible();

    // Close search
    const closeBtn = page.getByTitle('Close search');
    await closeBtn.click();
    await expect(searchInput).not.toBeVisible();
  });

  test('Filters domain subgraphs and dynamically recalibrates category mastery', async ({ page }) => {
    const subgraphsBtn = page.getByTitle('Open Subgraphs filter');
    await subgraphsBtn.click();

    // Select CS category
    const csButton = page.locator('button:has-text("CS")').first();
    await expect(csButton).toBeVisible();
    await csButton.click();

    // Verify HUD reflects CS category mastery in footer
    await expect(page.getByText(/CS MASTERY:/i)).toBeVisible();

    // Close subgraphs panel
    const minimizeBtn = page.getByTitle('Minimize Subgraphs');
    await minimizeBtn.click();
  });

  test('Expands left sidebar, navigates topics, and manages study tasks', async ({ page }) => {
    // Open left collapsible panel
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Verify GRAPH NODES and TASKS tabs are visible
    const topicsTab = page.getByRole('button', { name: /GRAPH NODES/i });
    const tasksTab = page.getByRole('button', { name: /TASKS/i });
    await expect(topicsTab).toBeVisible();
    await expect(tasksTab).toBeVisible();

    // Switch to Tasks tab
    await tasksTab.click();

    // Input new study task
    const todoInput = page.getByPlaceholder('Add new study goal...');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Master GPU Shader Pipelines');
    await todoInput.press('Enter');

    // Verify new todo appears in list
    const createdTodo = page.locator('text=Master GPU Shader Pipelines').first();
    await expect(createdTodo).toBeVisible();

    // Toggle todo completion
    const todoCheckbox = page.locator('div:has-text("Master GPU Shader Pipelines") input[type="checkbox"], div:has-text("Master GPU Shader Pipelines") button').first();
    await todoCheckbox.click();
  });
});
