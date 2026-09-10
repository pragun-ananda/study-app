import { test, expect } from '@playwright/test';

test.describe('Diff-Based Content Review System (FRO-11)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
  });

  test('Displays notifications bell with unread badge and allows filtering review queue', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await expect(bellBtn).toBeVisible();

    // Verify unread badge exists and has a positive count
    const badge = bellBtn.locator('span');
    await expect(badge).toBeVisible();
    const badgeText = await badge.innerText();
    expect(parseInt(badgeText, 10)).toBeGreaterThan(0);

    // Click bell to open dropdown
    await bellBtn.click();
    await expect(page.getByText('REVIEW QUEUE')).toBeVisible();
    await expect(page.getByText(/PENDING/i).first()).toBeVisible();

    // Verify initial mock updates are listed
    await expect(page.getByText('Backpropagation & Autograd Refinement')).toBeVisible();
    await expect(page.getByText('Binary Search Trees Complexity Guarantees')).toBeVisible();
    await expect(page.getByText('Prerequisite Edge: Linear Algebra -> SVD')).toBeVisible();

    // Filter by FEEDBACK tab (empty initially)
    await page.getByRole('button', { name: 'FEEDBACK' }).click();
    await expect(page.getByText('All neural feeds synchronized')).toBeVisible();

    // Return to PENDING tab
    await page.getByRole('button', { name: 'PENDING' }).click();
    await expect(page.getByText('Backpropagation & Autograd Refinement')).toBeVisible();
  });

  test('Opens Diff Viewer Modal, toggles line diff and rendered markdown/KaTeX preview', async ({ page }) => {
    // Open notifications dropdown
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();

    // Click on Backpropagation update card to open diff modal
    const backpropCard = page.getByText('Backpropagation & Autograd Refinement');
    await backpropCard.click();

    // Verify modal elements
    await expect(page.getByText(/NOTE UPDATE/i).first()).toBeVisible();
    await expect(page.getByText('+ Additions')).toBeVisible();
    await expect(page.getByText('- Deletions')).toBeVisible();

    // Switch to Rendered Preview tab
    const previewBtn = page.getByRole('button', { name: /RENDERED PREVIEW/i });
    await previewBtn.click();

    // Verify KaTeX math / Markdown header is rendered
    await expect(page.getByRole('heading', { name: /Backpropagation & Automatic Differentiation/i })).toBeVisible();

    // Switch back to Diff View tab
    const diffBtn = page.getByRole('button', { name: /DIFF VIEW/i });
    await diffBtn.click();
    await expect(page.getByText('+ Additions')).toBeVisible();

    // Close modal via Close button
    const closeBtn = page.getByTitle('Close (ESC)');
    await closeBtn.click();
    await expect(page.getByText('+ Additions')).not.toBeVisible();
  });

  test('Authors inline review comment on diff line and executes Request Changes workflow', async ({ page }) => {
    // Intercept request-changes to return revised update with CHANGES_REQUESTED status for the feedback tab
    await page.route('**/api/review-queue/updates/**/request-changes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          update: {
            id: 'UPDATE-001',
            title: 'Backpropagation & Autograd Refinement',
            status: 'CHANGES_REQUESTED'
          }
        })
      });
    });

    // Open diff modal for Backpropagation
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();
    await page.getByText('Backpropagation & Autograd Refinement').click();

    // Hover over first diff line and click gutter "+" comment trigger
    const plusBtn = page.getByTitle('Add comment to line').first();
    await plusBtn.click();

    // Type feedback in inline comment composer
    const commentInput = page.getByPlaceholder(/Add review feedback for this line/i);
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Please double check the gradient transpose dimensions.');

    // Save comment
    const saveCommentBtn = page.getByRole('button', { name: /Save Comment/i });
    await saveCommentBtn.click();

    // Verify comment appears under the line
    await expect(page.getByText('Please double check the gradient transpose dimensions.')).toBeVisible();

    // Click Request Changes
    const requestChangesBtn = page.getByRole('button', { name: /REQUEST CHANGES/i });
    await requestChangesBtn.click();

    // Modal closes upon request changes
    await expect(commentInput).not.toBeVisible();

    // Reopen notifications: verify the update is re-staged in the review queue ready for re-review
    await bellBtn.click();
    await expect(page.getByText('Backpropagation & Autograd Refinement')).toBeVisible();
    await expect(page.getByText(/2 notes/i)).toBeVisible();
  });

  test('Approves content update and merges changes into live knowledge graph and inspector', async ({ page }) => {
    // Open notifications
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();

    // Open Binary Search Trees update
    await page.getByText('Binary Search Trees Complexity Guarantees').click();

    // Click Approve & Merge
    const approveBtn = page.getByRole('button', { name: 'APPROVE & MERGE', exact: true });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify modal closes and topic inspector opens with updated summary
    await expect(page.getByText('Self-balancing variants (AVL, Red-Black) guarantee worst-case').first()).toBeVisible({ timeout: 5000 });
  });

  test('Quick actions in dropdown and reset mock feed', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();

    // Quick reject the third update
    const quickRejectBtn = page.getByRole('button', { name: /Quick Reject/i }).first();
    await quickRejectBtn.click();

    // Reset feed
    const resetBtn = page.getByTitle('Reset Mock Updates Feed');
    await resetBtn.click();

    // All 3 updates restored to pending
    await expect(bellBtn.locator('span')).toHaveText('3');
  });

  test('Opens URL Ingest input via Plus icon and submits content for pipeline ingestion', async ({ page }) => {
    // Intercept /api/ingest to return a successful staged result deterministically
    await page.route('**/api/ingest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          url: 'https://example.com/dynamic-programming',
          executedSteps: ['fetch_url', 'clean_content', 'extract_topics', 'generate_content', 'review_content', 'add_to_review_queue'],
          message: 'Ingestion pipeline executed successfully',
          details: {
            extractedTopicsCount: 2,
            generatedNotesCount: 2,
            generatedQuizzesCount: 2,
            queueId: 'QUEUE-PLAYWRIGHT-001',
            graphUpdates: []
          }
        })
      });
    });

    const plusBtn = page.getByTestId('ingest-url-btn');
    await expect(plusBtn).toBeVisible();

    // Click plus button to reveal the URL ingest popover
    await plusBtn.click();
    const urlInput = page.getByTestId('ingest-url-input');
    const submitBtn = page.getByTestId('ingest-url-submit-btn');
    await expect(urlInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Fill URL and submit
    await urlInput.fill('https://example.com/dynamic-programming');
    await submitBtn.click();

    // After submission, review queue notifications dropdown opens automatically
    await expect(page.getByText('REVIEW QUEUE', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('Groups review queue by source batch and opens pedagogical walkthrough modal', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();

    // Verify source batch card headers
    await expect(page.getByText('Attention Is All You Need (ArXiv:1706.03762)')).toBeVisible();
    await expect(page.getByText('Binary Search Trees - Complexity & Balanced Bounds')).toBeVisible();

    // Click "View Walkthrough" button for ArXiv batch
    const walkthroughBtn = page.getByTestId('view-walkthrough-btn-QUEUE-INIT-001');
    await expect(walkthroughBtn).toBeVisible();
    await walkthroughBtn.click();

    // Verify Ingestion Walkthrough modal opened with executive summary and breakdown
    const modal = page.getByTestId('ingestion-walkthrough-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/AI WALKTHROUGH/i)).toBeVisible();
    await expect(page.getByText('Quiz & Practice Questions')).toBeVisible();
    await expect(page.getByText('Reverse-Mode Automatic Differentiation', { exact: true })).toBeVisible();
    await expect(page.getByText(/Hardware cluster node topologies/i)).toBeVisible();
    await expect(page.getByText(/Loss of precision in unscaled softmax gradients/i)).toBeVisible();

    // Close walkthrough modal
    const closeBtn = page.getByTestId('close-walkthrough-modal-btn');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Walkthrough button inside Diff Viewer Modal launches source walkthrough', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await bellBtn.click();

    // Open Diff Viewer for Backpropagation update
    await page.getByText('Backpropagation & Autograd Refinement').click();

    // Verify WALKTHROUGH button is visible in diff viewer header
    const diffWalkthroughBtn = page.getByTestId('diff-view-walkthrough-btn');
    await expect(diffWalkthroughBtn).toBeVisible();
    await diffWalkthroughBtn.click();

    // Walkthrough modal is displayed
    const modal = page.getByTestId('ingestion-walkthrough-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByText('Attention Is All You Need (ArXiv:1706.03762)')).toBeVisible();
  });
});
