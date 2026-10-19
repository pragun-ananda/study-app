import { test, expect } from '@playwright/test';

test.describe('Code Repository Documentation & Architectural Learning Engine (Milestones 1-5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('Navigates REPOSITORIES tab in sidebar, opens Code Studio, and browses file tree', async ({ page }) => {
    // 1. Open left study panel
    const togglePanelBtn = page.getByLabel('Toggle study panel');
    await togglePanelBtn.click();

    // 2. Click on the 4th tab: REPOSITORIES
    const repoTabBtn = page.getByTestId('sidebar-tab-repositories');
    await expect(repoTabBtn).toBeVisible();
    await repoTabBtn.click();

    // Verify repository cards are rendered
    await expect(page.getByText(/CODE REPOSITORIES/i)).toBeVisible();
    const repoCard = page.getByTestId('sidebar-repo-card').first();
    await expect(repoCard).toBeVisible();
    await expect(repoCard.getByRole('heading', { name: 'redis' })).toBeVisible();

    // 3. Open Code Studio Modal
    await repoCard.click();

    // Verify Studio Modal opened
    const studioModal = page.getByTestId('repo-viewer-modal');
    await expect(studioModal).toBeVisible();
    await expect(studioModal.getByText('Code Repository Studio')).toBeVisible();
    await expect(studioModal.locator('option', { hasText: 'redis/redis' })).toBeAttached();

    // 4. Verify File Tree Explorer
    const treeExplorer = page.getByTestId('file-tree-explorer');
    await expect(treeExplorer).toBeVisible();
    await expect(treeExplorer.getByPlaceholder('Search files...')).toBeVisible();

    // Filter file tree
    const treeFilter = treeExplorer.getByPlaceholder('Search files...');
    await treeFilter.fill('ae.c');

    // Select file in tree
    const aeFileNode = page.getByTestId('tree-file-src/ae.c');
    await expect(aeFileNode).toBeVisible();
    await aeFileNode.click();

    // Verify Monaco code viewer loaded file
    const monacoViewer = page.getByTestId('monaco-repo-viewer');
    await expect(monacoViewer).toBeVisible();

    // Close Studio Modal
    const closeBtn = page.getByTestId('close-repo-viewer-button');
    await closeBtn.click();
    await expect(studioModal).not.toBeVisible();
  });

  test('Inspects line-anchored annotations, verifies Staff+ AI critique and exports to quiz', async ({ page }) => {
    // 1. Open left study panel & switch to REPOSITORIES
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-repositories').click();

    // 2. Open Code Studio Modal
    const repoCard = page.getByTestId('sidebar-repo-card').first();
    await repoCard.click();
    const studioModal = page.getByTestId('repo-viewer-modal');
    await expect(studioModal).toBeVisible();

    // 3. Switch to SPLIT_ANNOTATIONS mode
    const splitModeBtn = page.getByTestId('viewmode-split-notes');
    await splitModeBtn.click();

    // Open file with annotations
    await page.getByTestId('tree-file-src/ae.c').click();

    // 4. Verify Annotation Dock is visible
    const dock = page.getByTestId('annotation-dock');
    await expect(dock).toBeVisible();
    await expect(dock.getByText('Architecture & Notes Studio')).toBeVisible();

    // Verify existing annotation card
    const annCard = page.getByTestId('annotation-card-ANN-SEED-001');
    await expect(annCard).toBeVisible();
    await expect(annCard.getByText('Epoll Multiplexing Engine')).toBeVisible();

    // 5. Verify Staff+ AI Architectural Critique card
    await expect(annCard.getByText(/Why It Was Designed This Way:/i)).toBeVisible();
    await expect(annCard.getByText(/Reactor Pattern/i)).toBeVisible();
    await expect(annCard.getByText(/Single-threaded event loop avoids locking overhead/i)).toBeVisible();
    await expect(annCard.getByText(/Concurrency & SPOF Trade-offs:/i)).toBeVisible();

    // 6. Test Spaced Repetition Quiz Export
    const exportQuizBtn = annCard.getByTestId('export-quiz-btn-ANN-SEED-001');
    await expect(exportQuizBtn).toBeVisible();
    await exportQuizBtn.scrollIntoViewIfNeeded();
    await exportQuizBtn.click({ force: true });

    // Verify confirmation and thread update
    await expect(annCard.getByText(/Quiz Created!/i)).toBeVisible({ timeout: 10000 });
    await expect(annCard.getByText(/Exported to Spaced Repetition Quiz/i)).toBeVisible();

    // 7. Test Ask Sol AI bridge
    const askSolBtn = annCard.getByText('Ask Sol AI in Chat');
    await askSolBtn.click();

    // Verify Sol chat drawer opened
    const solDrawer = page.getByTestId('sol-chat-drawer');
    await expect(solDrawer).toBeVisible();
    await expect(solDrawer.getByText(/src\/ae.c/i)).toBeVisible();

    // Close Sol drawer and studio modal
    await page.getByLabel('Close Sol Chat').click();
    await page.getByTestId('close-repo-viewer-button').click();
  });

  test('Links code repository annotations to Knowledge Graph topic inspector', async ({ page }) => {
    // 1. Search for TOPIC-001 (Neural Network Backpropagation or seeded topic)
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Backpropagation');

    const topicCard = page.getByTestId('sidebar-topic-card').first();
    await expect(topicCard).toBeVisible();
    await topicCard.click();

    // 2. Open Topic Inspector
    const exploreBtn = page.getByTestId('explore-topic-btn');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    const inspector = page.getByTestId('topic-inspector');
    await expect(inspector).toBeVisible();

    // 3. Verify CODE REPOSITORY ANNOTATIONS section is rendered
    await expect(inspector.getByText(/CODE REPOSITORY ANNOTATIONS/i)).toBeVisible({ timeout: 10000 });
    const repoAnnItem = inspector.getByTestId('inspector-repo-annotation-item');
    await expect(repoAnnItem).toBeVisible();
    await expect(repoAnnItem.getByText('Epoll Multiplexing Engine')).toBeVisible();

    // 4. Click the annotation item in the inspector
    await repoAnnItem.click();

    // Verify Repository Studio opens automatically to this file & annotation
    const studioModal = page.getByTestId('repo-viewer-modal');
    await expect(studioModal).toBeVisible();
    await expect(page.getByTestId('annotation-card-ANN-SEED-001')).toBeVisible();

    // Close studio
    await page.getByTestId('close-repo-viewer-button').click();
  });

  test('Imports a new repository from GitHub URL shorthand', async ({ page }) => {
    // 1. Open left study panel & switch to REPOSITORIES
    await page.getByLabel('Toggle study panel').click();
    await page.getByTestId('sidebar-tab-repositories').click();

    // 2. Click "Import" button
    const importBtn = page.getByTestId('sidebar-import-repo-btn');
    await importBtn.click();

    // 3. Fill in import modal
    const inputField = page.getByTestId('import-repo-input');
    await expect(inputField).toBeVisible();
    await inputField.fill('tokio-rs/tokio');

    const submitImportBtn = page.getByTestId('submit-import-button');
    await expect(submitImportBtn).toBeEnabled();
    await submitImportBtn.click();

    // 4. Verify Studio opens with the newly imported repository
    const studioModal = page.getByTestId('repo-viewer-modal');
    await expect(studioModal).toBeVisible({ timeout: 15000 });
    await expect(studioModal.locator('option', { hasText: /tokio/i })).toBeAttached({ timeout: 15000 });

    // Close Studio
    await page.getByTestId('close-repo-viewer-button').click();
  });
});
