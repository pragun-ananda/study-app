import { test, expect } from '@playwright/test';

test.describe('Diff-Based Content Review System (FRO-11)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
  });

  test('Displays notifications bell with unread badge and allows filtering review queue', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Review Updates \/ Notifications/i });
    await expect(bellBtn).toBeVisible();

    // Verify unread badge count shows 3 pending updates
    await expect(bellBtn.locator('span')).toHaveText('3');

    // Click bell to open dropdown
    await bellBtn.click();
    await expect(page.getByText('REVIEW QUEUE')).toBeVisible();
    await expect(page.getByText('3 PENDING')).toBeVisible();

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

    // Reopen notifications: verify badge decrements and item is in FEEDBACK tab
    await bellBtn.click();
    await page.getByRole('button', { name: 'FEEDBACK' }).click();
    await expect(page.getByText('Backpropagation & Autograd Refinement')).toBeVisible();
    await expect(page.getByText('FEEDBACK', { exact: true }).first()).toBeVisible();
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
});
