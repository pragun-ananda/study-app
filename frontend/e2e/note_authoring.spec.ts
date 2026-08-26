import { test, expect } from '@playwright/test';

test.describe('Note Authoring & KaTeX Math Persistence (FRO-9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('Renders rich KaTeX math formulas and syntax-highlighted code in NoteViewerModal', async ({ page }) => {
    // 1. Search and select Neural Network Backpropagation
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();
    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Backpropagation');

    const nodeLabel = page.locator('.overflow-y-auto').getByText('Neural Network Backpropagation').first();
    await expect(nodeLabel).toBeVisible();
    await nodeLabel.click();

    // 2. Open Explorer Inspector card
    const exploreBtn = page.locator('button:has-text("EXPLORE:")');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // 3. Click the Backpropagation Derivation Note
    const noteCard = page.locator('text=Backpropagation Derivation Notes').first();
    await expect(noteCard).toBeVisible();
    await noteCard.click({ force: true });

    // 4. Verify NoteViewerModal is visible with formatted KaTeX and Code Block
    await expect(page.getByText('Backpropagation Derivation Notes').first()).toBeVisible();
    
    // Verify KaTeX math container rendered
    const katexElement = page.locator('.katex');
    await expect(katexElement.first()).toBeVisible();

    // Verify Code Block with Python syntax highlighting
    await expect(page.getByText('PYTHON', { exact: true })).toBeVisible();
    await expect(page.getByText('def backward_propagation')).toBeVisible();

    // 5. Test Copy Note button
    const copyBtn = page.getByTitle('Copy note content');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click({ force: true });
    await expect(page.getByText('COPIED')).toBeVisible();
  });

  test('Edits study note with math formulas, saves to database, and persists across reload', async ({ page }) => {
    // 1. Search and select Backpropagation
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();
    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Backpropagation');

    const nodeLabel = page.locator('.overflow-y-auto').getByText('Neural Network Backpropagation').first();
    await expect(nodeLabel).toBeVisible();
    await nodeLabel.click();

    // 2. Open Inspector and note
    const exploreBtn = page.locator('button:has-text("EXPLORE:")');
    await exploreBtn.click();

    const noteCard = page.locator('text=Backpropagation Derivation Notes').first();
    await expect(noteCard).toBeVisible();
    await noteCard.click({ force: true });

    // 3. Switch to EDIT mode
    const editBtn = page.getByTitle('Edit Note');
    await editBtn.click({ force: true });

    const titleInput = page.getByPlaceholder('Note title...');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Backpropagation Derivation Notes [Verified E2E]');

    const contentTextarea = page.getByPlaceholder('Start typing your note here...');
    await expect(contentTextarea).toBeVisible();
    await contentTextarea.fill('# Backpropagation Derivations\n\n$$ \\delta^{[l]} = \\frac{\\partial L}{\\partial Z^{[l]}} $$\n\nUpdated via automated Playwright E2E full-stack test.');

    // 4. Verify global shortcuts (KeyH, KeyO) are safely ignored inside textarea
    await contentTextarea.press('KeyH');
    await contentTextarea.press('KeyO');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible();

    // 5. Save Note
    const saveBtn = page.getByRole('button', { name: /SAVE NOTE/i });
    await saveBtn.click();

    // Modal switches back to view mode with updated content
    await expect(page.getByText('Backpropagation Derivation Notes [Verified E2E]').first()).toBeVisible();
    await expect(page.getByText('Updated via automated Playwright E2E full-stack test.').first()).toBeVisible();

    // Close modal
    const closeBtn = page.getByTitle('Close (ESC)');
    await closeBtn.click();

    // 6. Reload the page to test full-stack database persistence
    await page.reload();
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });

    // 7. Re-open the note and verify persisted content
    const searchBtnAfterReload = page.getByTitle('Open concept search');
    await searchBtnAfterReload.click();
    await page.getByPlaceholder('Search 220+ concepts...').fill('Backpropagation');
    const nodeAfterReload = page.locator('.overflow-y-auto').getByText('Neural Network Backpropagation').first();
    await expect(nodeAfterReload).toBeVisible();
    await nodeAfterReload.click();
    await page.locator('button:has-text("EXPLORE:")').click();

    const updatedNoteCard = page.getByText('Backpropagation Derivation Notes [Verified E2E]').first();
    await expect(updatedNoteCard).toBeVisible();
    await updatedNoteCard.click({ force: true });

    await expect(page.getByText('Updated via automated Playwright E2E full-stack test.').first()).toBeVisible();
  });
});
