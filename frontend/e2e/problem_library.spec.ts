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
    await expect(workbench.locator('span', { hasText: /^Rust$/ })).toBeVisible();

    // Switch to Protobuf and verify tab active styling and status bar
    const protoTab = page.getByTestId('workbench-lang-tab-protobuf');
    await protoTab.click();
    await expect(protoTab).toHaveClass(/bg-sky-600|bg-\[#00f0ff\]/);
    await expect(workbench.locator('span', { hasText: /^Protobuf$/ })).toBeVisible();

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

  test('interacts with testcase console drawer, creates custom case, and executes code via Run Code button', async ({ page }) => {
    // Open sidebar and launch Trapping Rain Water
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

    // Verify testcase console drawer is present
    const consoleDrawer = page.getByTestId('testcase-console-drawer');
    await expect(consoleDrawer).toBeVisible();

    // Verify testcase tabs: Test Cases and Console Output
    const tabTestcases = page.getByTestId('tab-testcases');
    const tabConsoleOutput = page.getByTestId('tab-console-output');
    await expect(tabTestcases).toBeVisible();
    await expect(tabConsoleOutput).toBeVisible();

    // Verify Case 1 pill is selected and input editor has content
    const case1Pill = page.getByTestId('case-pill-0');
    await expect(case1Pill).toBeVisible();
    const inputEditor = page.getByTestId('testcase-input-editor');
    await expect(inputEditor).toBeVisible();
    const expectedEditor = page.getByTestId('testcase-expected-editor');
    await expect(expectedEditor).toBeVisible();

    // Add custom test case
    const addCaseBtn = page.getByTestId('add-testcase-btn');
    await expect(addCaseBtn).toBeVisible();
    await addCaseBtn.click();

    // Verify Case 3 was added (since problem has 2 seeded cases)
    const newCasePill = page.getByTestId('case-pill-2');
    await expect(newCasePill).toBeVisible();

    // Delete the custom test case
    const deleteBtn = page.getByTestId('delete-case-btn-2');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await expect(newCasePill).not.toBeVisible();

    // Switch back to Case 1
    await case1Pill.click();

    // Click Run Code button
    const runBtn = page.getByTestId('run-code-btn');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify Console Output displays execution results
    const verdictBadge = page.getByTestId('execution-verdict-badge');
    await expect(verdictBadge).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('actual-output-display')).toBeVisible();
    await expect(page.getByTestId('expected-output-display')).toBeVisible();

    // Test toggle collapse / expand console drawer
    const toggleConsoleBtn = page.getByTestId('toggle-console-btn');
    await expect(toggleConsoleBtn).toBeVisible();
    await toggleConsoleBtn.click();
    await expect(consoleDrawer).toHaveClass(/h-10/);

    await toggleConsoleBtn.click({ force: true });
    await expect(consoleDrawer).toHaveClass(/h-\[230px\]/);
  });

  test('submits code solution to backend, displays LeetCode-style submission result overlay with telemetry, and inspects submissions history tab', async ({ page }) => {
    // Open sidebar and launch Trapping Rain Water
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

    // Verify Submit button
    const submitBtn = page.getByTestId('submit-solution-btn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Submission overlay appears
    const submissionModal = page.getByTestId('submission-result-modal');
    await expect(submissionModal).toBeVisible({ timeout: 10000 });

    // Verify submission status badge and telemetry cards
    const statusBadge = page.getByTestId('submission-verdict-title');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(/Accepted|Wrong Answer|Runtime Error/i);

    await expect(page.getByTestId('submission-runtime-stat')).toBeVisible();
    await expect(page.getByTestId('submission-memory-stat')).toBeVisible();
    await expect(page.getByTestId('submission-passed-stat')).toBeVisible();

    // Click View All Submissions button to transition to history tab
    const viewAllBtn = page.getByTestId('view-all-submissions-btn');
    await expect(viewAllBtn).toBeVisible();
    await viewAllBtn.click();

    // Submission modal closes and Submissions tab becomes active
    await expect(submissionModal).not.toBeVisible();
    const submissionsSection = page.getByTestId('problem-submissions-section');
    await expect(submissionsSection).toBeVisible();

    const submissionsTable = page.getByTestId('submissions-table');
    await expect(submissionsTable).toBeVisible();

    // At least one submission row exists
    const historyRows = page.getByTestId('submission-history-row');
    await expect(historyRows.first()).toBeVisible();

    // Click View Details on first history item
    const viewDetailsBtn = page.getByTestId('view-submission-details-btn').first();
    await expect(viewDetailsBtn).toBeVisible();
    await viewDetailsBtn.click();

    // Verify modal re-opens with that submission's details
    await expect(submissionModal).toBeVisible();
    await expect(page.getByTestId('submission-verdict-title')).toBeVisible();

    // Close via Back to Code
    const backBtn = page.getByTestId('back-to-code-btn');
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(submissionModal).not.toBeVisible();
  });

  test('discovers system design follow-ups, switches challenges, and saves architectural draft', async ({ page }) => {
    // Open left sidebar drawer
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();

    // Select problem card with follow-ups (Trapping Rain Water or Rate Limiter)
    const problemCards = page.getByTestId('sidebar-problem-card');
    await expect(problemCards.first()).toBeVisible({ timeout: 10000 });
    const targetCard = problemCards.filter({ hasText: /Trapping Rain Water|Rate Limiter|LRU Cache/i }).first();
    if (await targetCard.count() > 0) {
      await targetCard.click();
    } else {
      await problemCards.first().click();
    }

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Verify SYSTEM DESIGN tab is present with badge count
    const systemDesignTab = page.getByTestId('problem-tab-system-design');
    await expect(systemDesignTab).toBeVisible();
    const countBadge = page.getByTestId('system-design-count-badge');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText(/[1-9]/);

    // Switch to SYSTEM DESIGN tab
    await systemDesignTab.click();

    // Verify system design section is visible
    const systemDesignSection = page.getByTestId('problem-system-design-section');
    await expect(systemDesignSection).toBeVisible();
    await expect(page.getByText(/System Design Architectural Follow-Ups/i)).toBeVisible();

    // Verify challenge selector pills
    const firstPill = page.getByTestId('followup-pill-0');
    await expect(firstPill).toBeVisible();

    // Verify prompt card and rubric card
    await expect(page.getByTestId('followup-prompt-card')).toBeVisible();
    await expect(page.getByTestId('followup-rubric-card')).toBeVisible();

    // Capture screenshot of follow-up drawer showing challenges and rubric
    await page.waitForTimeout(500);
    await modal.screenshot({
      path: '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec/system_design_followups_drawer.png'
    });

    // If there is a second challenge pill, switch to it and verify
    const secondPill = page.getByTestId('followup-pill-1');
    if (await secondPill.count() > 0) {
      await secondPill.click();
      await expect(page.getByTestId('followup-prompt-card')).toBeVisible();
      // Switch back to first pill
      await firstPill.click();
    }

    // Toggle progressive hint
    const hintToggle = page.getByTestId('followup-hint-toggle-0');
    if (await hintToggle.count() > 0) {
      await hintToggle.click();
      await expect(page.getByTestId('followup-hint-content-0')).toBeVisible();
    }

    // Type candidate architectural response into editor
    const responseTextarea = page.getByTestId('followup-response-textarea');
    await expect(responseTextarea).toBeVisible();
    const testArchitectureText = '### Distributed Stream Architecture\n\n1. **Kafka Partitioning**: Keyed by Watershed Cell ID.\n2. **Flink Streaming Topology**: 5-minute tumbling windows computing reservoir deltas.\n3. **Storage Tiering**: TimescaleDB hot storage + S3 Parquet cold archive.';
    await responseTextarea.fill(testArchitectureText);

    // Click Save Architecture Draft
    const saveBtn = page.getByTestId('save-followup-response-btn');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify saved status indicator appears
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // Capture screenshot of response editor with saved draft and rubric
    await page.waitForTimeout(500);
    await modal.screenshot({
      path: '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec/system_design_followup_response_editor.png'
    });
  });

  test('interacts with Excalidraw architecture canvas, switches modes, and evaluates design with AI Grader', async ({ page }) => {
    // Open left sidebar drawer and open problem
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-problems').click();

    const problemCards = page.getByTestId('sidebar-problem-card');
    await expect(problemCards.first()).toBeVisible({ timeout: 10000 });
    const targetCard = problemCards.filter({ hasText: /Trapping Rain Water|Rate Limiter|LRU Cache/i }).first();
    if (await targetCard.count() > 0) {
      await targetCard.click();
    } else {
      await problemCards.first().click();
    }

    const modal = page.getByTestId('problem-viewer-modal');
    await expect(modal).toBeVisible();

    // Switch to SYSTEM DESIGN tab
    const systemDesignTab = page.getByTestId('problem-tab-system-design');
    await expect(systemDesignTab).toBeVisible();
    await systemDesignTab.click();

    // Verify workbench mode switcher is present
    await expect(page.getByTestId('workbench-mode-switcher')).toBeVisible();
    const diagramModeBtn = page.getByTestId('workbench-mode-diagram');
    const splitModeBtn = page.getByTestId('workbench-mode-split');
    const writtenModeBtn = page.getByTestId('workbench-mode-written');

    await expect(diagramModeBtn).toBeVisible();
    await expect(splitModeBtn).toBeVisible();
    await expect(writtenModeBtn).toBeVisible();

    // Switch to DIAGRAM only mode
    await diagramModeBtn.click();
    const canvasWrapper = page.getByTestId('excalidraw-canvas-wrapper');
    await expect(canvasWrapper).toBeVisible();
    await expect(page.getByTestId('followup-response-textarea')).not.toBeVisible();

    // Verify preset toolbar buttons
    const presetToolbar = page.getByTestId('excalidraw-preset-toolbar');
    await expect(presetToolbar).toBeVisible();

    // Add architectural components via quick presets
    await page.getByTestId('add-preset-load_balancer').click();
    await page.getByTestId('add-preset-api_gateway').click();
    await page.getByTestId('add-preset-microservice').click();
    await page.getByTestId('add-preset-stream').click();
    await page.getByTestId('add-preset-database').click();

    // Fit canvas view
    await page.getByTestId('canvas-zoom-to-fit-btn').click();
    await page.waitForTimeout(600);

    // Capture visual screenshot artifact of interactive Excalidraw session
    await modal.screenshot({
      path: '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec/system_design_excalidraw_canvas.png'
    });

    // Switch back to SPLIT mode
    await splitModeBtn.click();
    await expect(page.getByTestId('excalidraw-canvas-wrapper')).toBeVisible();
    const responseTextarea = page.getByTestId('followup-response-textarea');
    await expect(responseTextarea).toBeVisible();

    // Write comprehensive distributed architecture explanation
    const architectureSolution =
      '### High-Throughput Distributed Stream Architecture\n\n' +
      '1. **Ingestion Tier**: Edge Load Balancers distribute traffic across Envoy API Gateways with TLS offloading and rate limiting.\n' +
      '2. **Stream Partitioning**: Apache Kafka cluster partitioned by WatershedID and SensorCell ID ensuring ordered sequential replay.\n' +
      '3. **Stateful Stream Processing**: Apache Flink workers compute 5-minute tumbling windows and sliding percentile water levels. RocksDB state checkpoints allow rapid node failover without state loss.\n' +
      '4. **Storage Tiering**: CockroachDB distributed relational tier stores real-time sensor states. S3 Parquet columnar archive handles cold analytical queries.\n' +
      '5. **Trade-offs**: Prioritizes sub-second ingestion write throughput and eventual consistency over strict linearizability using idempotent consumer deduplication.';

    await responseTextarea.fill(architectureSolution);

    // Save Architecture Draft
    const saveBtn = page.getByTestId('save-followup-response-btn');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // Trigger AI Architecture Grader
    const gradeBtn = page.getByTestId('grade-architecture-btn');
    await expect(gradeBtn).toBeVisible();
    await gradeBtn.click();

    // Verify AI Grading Report Card renders with all evaluation sections
    const gradingReport = page.getByTestId('system-design-grading-report');
    await expect(gradingReport).toBeVisible({ timeout: 15000 });

    // Verify overall score badge
    const overallScore = page.getByTestId('grading-overall-score');
    await expect(overallScore).toBeVisible();
    await expect(overallScore).toContainText(/\/ 100/);

    // Verify rubric breakdown, scalability assessment, SPOFs, trade-offs, and actionable improvements
    await expect(page.getByTestId('grading-rubric-breakdown')).toBeVisible();
    await expect(page.getByTestId('grading-scalability-assessment')).toBeVisible();
    await expect(page.getByTestId('grading-spofs-container')).toBeVisible();
    await expect(page.getByTestId('grading-tradeoffs-critique')).toBeVisible();
    await expect(page.getByTestId('grading-improvements-container')).toBeVisible();

    // Verify current score pill in workbench header
    await expect(page.getByTestId('current-followup-score-badge')).toBeVisible();

    // Capture visual screenshot artifact of resulting LLM grading report
    await page.waitForTimeout(600);
    await modal.screenshot({
      path: '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec/system_design_llm_grader_report.png'
    });
  });
});


