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

    // Expand left sidebar to verify graph nodes
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();
    await expect(page.getByText(/GRAPH NODES/i).first()).toBeVisible();
  });

  test('Filters concepts via real-time search and displays matching node telemetry', async ({ page }) => {
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Raft');

    // Matching topic card in search/sidebar appears
    const raftNode = page.locator('.overflow-y-auto').getByText('Distributed Consensus (Raft)').first();
    await expect(raftNode).toBeVisible();
    await raftNode.click();

    // Verify Floating EXPLORE action button appears on bottom right
    const exploreBtn = page.locator('button:has-text("EXPLORE:")');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Verify Raft topic details in HUD inspector
    await expect(page.getByText('Distributed Consensus (Raft)').first()).toBeVisible();
    await expect(page.getByText('SYSTEMS').first()).toBeVisible();

    // Verify prerequisites & learn next unlock chains are listed
    await expect(page.getByText(/PREREQUISITES/i).first()).toBeVisible();
    await expect(page.getByText(/LEARN NEXT/i).first()).toBeVisible();
    await expect(page.getByText('Paxos Protocol').first()).toBeVisible();
  });

  test('Filters domain subgraphs and dynamically recalibrates category mastery', async ({ page }) => {
    // Open subgraphs filter
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

  test('Expands left sidebar, navigates topics, and manages study tasks', async ({ page }) => {
    // Open sidebar
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Switch to Tasks tab
    const tasksTabBtn = page.getByRole('button', { name: /TASKS/i });
    await expect(tasksTabBtn).toBeVisible();
    await tasksTabBtn.click();

    // Input new study task
    const todoInput = page.getByPlaceholder('Add new study goal...');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Master GPU Shader Pipelines');

    // Submit form via Plus button
    const submitBtn = page.locator('form').filter({ has: todoInput }).locator('button[type="submit"]');
    await submitBtn.click();

    // Verify new todo appears in list
    const createdTodo = page.locator('text=Master GPU Shader Pipelines').first();
    await expect(createdTodo).toBeVisible();

    // Toggle todo completion
    const todoCheckbox = page.locator('div:has-text("Master GPU Shader Pipelines") input[type="checkbox"], div:has-text("Master GPU Shader Pipelines") button').first();
    await todoCheckbox.click();
  });
});
