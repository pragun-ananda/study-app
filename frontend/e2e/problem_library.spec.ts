import { test, expect } from '@playwright/test';

test.describe('Interview Problem Library & Content Editor E2E (BAC-38 / FRO-18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('navigates to PROBLEMS tab from sidebar and renders practice problems', async ({ page }) => {
    // Open left sidebar drawer
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // Verify PROBLEMS tab is present in the tab switcher
    const problemsTab = page.getByTestId('sidebar-tab-problems');
    await expect(problemsTab).toBeVisible();
    await expect(problemsTab).toHaveText(/PROBLEMS/i);

    // Switch to PROBLEMS tab
    await problemsTab.click();

    // Verify header and problem cards
    await expect(page.getByText(/PRACTICE PROBLEMS/i)).toBeVisible();
    const problemCards = page.getByTestId('sidebar-problem-card');
    await expect(problemCards.first()).toBeVisible({ timeout: 10000 });
    expect(await problemCards.count()).toBeGreaterThanOrEqual(1);

    // Verify first card has type badge and difficulty badge
    const firstCard = problemCards.first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByText(/CODING|SYSTEM DESIGN|ML SYSTEM DESIGN/i)).toBeVisible();
    await expect(firstCard.getByText(/EASY|MEDIUM|HARD/i)).toBeVisible();
  });

  test('opens ProblemViewerModal and verifies Required Prerequisite Concepts heading', async ({ page }) => {
    // Open sidebar
    await page.getByLabel('Toggle study panel').click();

    // Switch to PROBLEMS tab
    const problemsTab = page.getByTestId('sidebar-tab-problems');
    await problemsTab.click();

    // Find and click the Rate Limiter problem card
    const problemCards = page.getByTestId('sidebar-problem-card');
    await expect(problemCards.first()).toBeVisible({ timeout: 10000 });
    const rateLimiterCard = problemCards.filter({ hasText: /Rate Limiter/i }).first();

    if (await rateLimiterCard.count() > 0) {
      await rateLimiterCard.click();
    } else {
      await problemCards.first().click();
    }

    // Verify ProblemViewerModal is displayed
    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Switch to SOLUTION tab to view canonical architecture & prerequisites
    const solutionTabBtn = page.getByTestId('problem-tab-solution');
    await expect(solutionTabBtn).toBeVisible();
    await solutionTabBtn.click();

    // Verify Required Prerequisite Concepts heading (User Request: exact wording)
    const prereqHeading = page.getByRole('heading', { name: 'Required Prerequisite Concepts' });
    await expect(prereqHeading).toBeVisible();

    // Verify Edit button is visible in header
    const editBtn = page.getByTestId('problem-edit-btn');
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toHaveText(/Edit/i);
  });

  test('switches tabs between PROMPT and SOLUTION in problem modal', async ({ page }) => {
    // Open sidebar and launch first problem
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();
    await page.getByTestId('sidebar-problem-card').first().click();

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Prompt tab is active by default
    const promptTabBtn = page.getByTestId('problem-tab-prompt');
    await expect(promptTabBtn).toBeVisible();

    // Switch to SOLUTION tab
    const solutionTabBtn = page.getByTestId('problem-tab-solution');
    await expect(solutionTabBtn).toBeVisible();
    await solutionTabBtn.click();

    // Verify solution tab is selected and displays solution content
    await expect(modal.getByText(/Solution|Canonical Architecture/i).first()).toBeVisible();

    // Switch back to PROMPT tab
    await promptTabBtn.click();
    await expect(page.getByTestId('reveal-solution-btn')).toBeVisible();
  });

  test('toggles in-place edit mode, tests cancellation, and verifies edit controls', async ({ page }) => {
    // Open sidebar and launch first problem
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();
    await page.getByTestId('sidebar-problem-card').first().click();

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Click Edit button
    const editBtn = page.getByTestId('problem-edit-btn');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify edit mode form fields appear
    const titleInput = page.getByTestId('problem-edit-title-input');
    await expect(titleInput).toBeVisible();
    const originalTitle = await titleInput.inputValue();
    expect(originalTitle.length).toBeGreaterThan(0);

    const timelimitInput = page.getByTestId('problem-edit-timelimit-input');
    await expect(timelimitInput).toBeVisible();

    const companiesInput = page.getByTestId('problem-edit-companies-input');
    await expect(companiesInput).toBeVisible();

    const summaryTextarea = page.getByTestId('problem-edit-summary-textarea');
    await expect(summaryTextarea).toBeVisible();

    // Verify Cancel button reverts without saving
    await titleInput.fill(originalTitle + ' [DRAFT TEST]');
    const cancelBtn = page.getByTestId('problem-cancel-edit-btn');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Verify returned to view mode and title retains original value
    await expect(page.getByTestId('problem-edit-title-input')).not.toBeVisible();
    await expect(modal.getByRole('heading', { level: 2 })).toHaveText(originalTitle);

    // Enter edit mode again, modify and save
    await editBtn.click();
    await expect(titleInput).toBeVisible();
    const updatedTitle = originalTitle + ' (Verified)';
    await titleInput.fill(updatedTitle);

    const saveBtn = page.getByTestId('problem-save-btn');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify modal returns to view mode with updated title
    await expect(page.getByTestId('problem-edit-title-input')).not.toBeVisible({ timeout: 5000 });
    await expect(modal.getByRole('heading', { level: 2 })).toHaveText(updatedTitle);
  });

  test('dismisses problem viewer modal via close button and Escape key', async ({ page }) => {
    // Open sidebar and launch problem
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();
    await page.getByTestId('sidebar-problem-card').first().click();

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // 1. Close via close button
    const closeBtn = page.getByTestId('problem-viewer-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 2. Open again and close via Escape key
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-problem-card').first().click();
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('interacts with Monaco code workbench in dual-pane split view, switches language, adjusts font size, and toggles layout', async ({ page }) => {
    // Open sidebar and launch first coding problem
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();
    const codingProblem = page.getByTestId('sidebar-problem-card').filter({ hasText: /Trapping Rain Water/i }).first();
    if (await codingProblem.count() > 0) {
      await codingProblem.click();
    } else {
      await page.getByTestId('sidebar-problem-card').first().click();
    }

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Verify dual-pane layout: Left pane (prompt) + Right pane (code workbench)
    const leftPane = page.getByTestId('problem-prompt-left-pane');
    const workbench = page.getByTestId('problem-code-workbench');
    await expect(leftPane).toBeVisible();
    await expect(workbench).toBeVisible();

    // Verify Monaco editor container inside workbench
    const monacoContainer = page.getByTestId('monaco-editor-container');
    await expect(monacoContainer).toBeVisible();

    // Verify all 8 workbench language tabs are rendered and selectable
    const expectedLangs = ['python', 'typescript', 'java', 'cpp', 'go', 'rust', 'sql', 'protobuf'];
    for (const lang of expectedLangs) {
      await expect(page.getByTestId(`workbench-lang-tab-${lang}`)).toBeVisible();
    }

    // Switch to Rust and verify tab active styling and status bar
    const rustTab = page.getByTestId('workbench-lang-tab-rust');
    await rustTab.click();
    await expect(rustTab).toHaveClass(/bg-sky-600|bg-\[#00f0ff\]/);
    await expect(workbench.getByText('Rust', { exact: true })).toBeVisible();

    // Switch to Protobuf and verify tab active styling and status bar
    const protoTab = page.getByTestId('workbench-lang-tab-protobuf');
    await protoTab.click();
    await expect(protoTab).toHaveClass(/bg-sky-600|bg-\[#00f0ff\]/);
    await expect(workbench.getByText('Protobuf', { exact: true })).toBeVisible();

    // Switch to TypeScript
    const tsTab = page.getByTestId('workbench-lang-tab-typescript');
    await tsTab.click();
    await expect(tsTab).toHaveClass(/bg-sky-600|bg-\[#00f0ff\]/);

    // Verify font size controls
    const increaseFontBtn = page.getByTestId('increase-font-btn');
    await expect(increaseFontBtn).toBeVisible();
    await increaseFontBtn.click();
    await expect(workbench.getByText('14px')).toBeVisible();

    // Verify Run Code and Submit action buttons
    const runBtn = page.getByTestId('run-code-btn');
    const submitBtn = page.getByTestId('submit-solution-btn');
    await expect(runBtn).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify Layout Toggle (Split View -> Full Prompt -> Split View)
    const layoutToggleBtn = page.getByTestId('toggle-workbench-layout-btn');
    await expect(layoutToggleBtn).toBeVisible();
    await layoutToggleBtn.click();

    // In Full Prompt mode, workbench is hidden and full prompt is displayed
    await expect(workbench).not.toBeVisible();
    await expect(page.getByTestId('problem-starter-code-box')).toBeVisible();

    // Toggle back to split view
    await layoutToggleBtn.click();
    await expect(workbench).toBeVisible();
  });
});

