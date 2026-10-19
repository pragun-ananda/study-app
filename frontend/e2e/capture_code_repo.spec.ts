import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/Users/cheese/.gemini/antigravity/brain/fed3126a-a4b9-406d-97d7-77339209d8ec';

test('Captures code repository screenshots for artifacts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });

  // 1. Open left study panel
  const togglePanelBtn = page.getByLabel('Toggle study panel');
  await togglePanelBtn.click();

  // 2. Click REPOSITORIES tab
  const repoTabBtn = page.getByTestId('sidebar-tab-repositories');
  await expect(repoTabBtn).toBeVisible();
  await repoTabBtn.click();

  // Verify repository cards are rendered
  const repoCard = page.getByTestId('sidebar-repo-card').first();
  await expect(repoCard).toBeVisible();
  await repoCard.click();

  // 3. Wait for modal
  const modal = page.getByTestId('repo-viewer-modal');
  await expect(modal).toBeVisible();
  await page.waitForTimeout(1000);

  // 4. Open src/ae.c
  const treeExplorer = page.getByTestId('file-tree-explorer');
  await expect(treeExplorer).toBeVisible();
  const treeFilter = treeExplorer.getByPlaceholder('Search files...');
  await treeFilter.fill('ae.c');

  const fileNode = page.getByTestId('tree-file-src/ae.c');
  await expect(fileNode).toBeVisible();
  await fileNode.click();
  await page.waitForTimeout(1500);

  // Screenshot 1: Code Repo File Tree & Monaco Viewer
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'code_repo_file_tree_viewer.png') });

  // 5. Switch to SPLIT_ANNOTATIONS mode
  const splitModeBtn = page.getByTestId('viewmode-split-notes');
  await splitModeBtn.click();
  await page.waitForTimeout(1000);

  // Screenshot 2: Line Annotation Dock
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'code_repo_line_annotation_dock.png') });

  // 6. Focus on Staff+ AI Architectural Critique Card
  const annCard = page.getByTestId('annotation-card-ANN-SEED-001');
  await expect(annCard).toBeVisible();
  await annCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  // Screenshot 3: AI Architecture Critique card
  await annCard.screenshot({ path: path.join(ARTIFACT_DIR, 'code_repo_ai_architecture_critique.png') });
});
