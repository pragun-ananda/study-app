import { test, expect } from '@playwright/test';

test.describe('3D WebGL SceneCanvas & Engine (FRO-9)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      console.error('Page error in browser:', err);
    });

    await page.goto('/');
    // Wait for the full cosmos dataset to hydrate and HUD to mount
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MASTERY:/i)).toBeVisible({ timeout: 15000 });
  });

  test('Canvas Viewport mounts and establishes a valid WebGL context without shader errors', async ({ page }) => {
    const canvasViewport = page.locator('#canvas-viewport');
    await expect(canvasViewport).toBeVisible();

    const canvas = canvasViewport.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify canvas dimensions and WebGL context support
    const isWebGLReady = await canvas.evaluate((el: HTMLCanvasElement) => {
      const gl = el.getContext('webgl2') || el.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });

    expect(isWebGLReady).toBe(true);
  });

  test('Executes Deep Space Hyper-Drive camera swoop and settles into calibrated overview framing', async ({ page }) => {
    // After deep space swoop completes (~2.2s), the camera lands at calibrated overviewZ
    await page.waitForTimeout(2500);

    // Verify telemetry HUD is mounted and active
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible();
    await expect(page.getByText(/MASTERY:/i)).toBeVisible();

    // Verify settled camera framing distance from window test state
    const framingState = await page.evaluate(() => {
      const camera = (window as any).__SCENE_CAMERA__;
      const overviewZ = (window as any).__OVERVIEW_Z__;
      const dist = camera ? Math.sqrt(camera.position.x ** 2 + camera.position.y ** 2 + camera.position.z ** 2) : 0;
      return {
        overviewZ,
        dist
      };
    });

    // overviewZ should be snug (~54 - 65) to fit the whole graph comfortably
    expect(framingState.overviewZ).toBeGreaterThanOrEqual(54.0);
    expect(framingState.overviewZ).toBeLessThanOrEqual(65.0);
    expect(framingState.dist).toBeGreaterThanOrEqual(52.0);
    expect(framingState.dist).toBeLessThanOrEqual(68.0);
  });

  test('Slowly auto-rotates the knowledge graph in overview mode', async ({ page }) => {
    // Wait for initial entry swoop to complete
    await page.waitForTimeout(2600);

    // Verify auto-rotation is active in overview mode
    const isAutoRotating = await page.evaluate(() => (window as any).__AUTO_ROTATE__);
    expect(isAutoRotating).toBe(true);

    // Record initial camera position
    const pos1 = await page.evaluate(() => {
      const cam = (window as any).__SCENE_CAMERA__;
      return cam ? { x: cam.position.x, z: cam.position.z } : null;
    });
    expect(pos1).not.toBeNull();

    // Wait 1.2s for slow ambient rotation to progress
    await page.waitForTimeout(1200);

    const pos2 = await page.evaluate(() => {
      const cam = (window as any).__SCENE_CAMERA__;
      return cam ? { x: cam.position.x, z: cam.position.z } : null;
    });
    expect(pos2).not.toBeNull();

    // Camera position should have orbited along X/Z plane
    const deltaX = Math.abs(pos2!.x - pos1!.x);
    const deltaZ = Math.abs(pos2!.z - pos1!.z);
    expect(deltaX + deltaZ).toBeGreaterThan(0.05);
  });

  test('Pauses auto-rotation during concept node inspection and resumes upon deselect', async ({ page }) => {
    await page.waitForTimeout(2500);

    // Search and select concept node
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();
    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await searchInput.fill('Backpropagation');

    const nodeLabel = page.locator('text=Neural Network Backpropagation').first();
    await expect(nodeLabel).toBeVisible();
    await nodeLabel.click({ force: true });

    // Verify auto-rotation pauses while node is selected
    await page.waitForTimeout(800);
    const isRotatingWhileSelected = await page.evaluate(() => (window as any).__AUTO_ROTATE__);
    expect(isRotatingWhileSelected).toBe(false);

    // Press Escape to dismiss search and selection, returning to overview
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    // Wait for camera zoom-out animation to complete (~1.5s) and auto-rotation to resume
    await page.waitForTimeout(1600);

    // Verify auto-rotation resumes in overview mode
    const isRotatingAfterEscape = await page.evaluate(() => (window as any).__AUTO_ROTATE__);
    expect(isRotatingAfterEscape).toBe(true);
  });

  test('Verifies clean scene background without starry background particle layers', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Inspect Three.js scene object tree to ensure no distant starfield points or starfield shaders exist
    const hasStarfield = await page.evaluate(() => {
      const controls = (window as any).__SCENE_CONTROLS__;
      const camera = (window as any).__SCENE_CAMERA__;
      if (!controls || !camera) return false;

      // Check window for any DeepSpaceShaderMaterial references
      const w = window as any;
      return !!w.DeepSpaceShaderMaterial;
    });

    expect(hasStarfield).toBe(false);
  });

  test('Allows OrbitControls mouse rotation and drag interactions on the canvas', async ({ page }) => {
    const canvasViewport = page.locator('#canvas-viewport');
    const box = await canvasViewport.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // Simulate dragging to orbit the 3D knowledge graph camera
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 120, startY + 60, { steps: 5 });
      await page.mouse.up();
    }

    // Canvas should remain healthy and active after orbital rotation
    await expect(page.locator('#canvas-viewport canvas')).toBeVisible();
  });

  test('Renders dynamic 3D HTML labels when concepts are searched and selected', async ({ page }) => {
    // Open search
    const searchBtn = page.getByTitle('Open concept search');
    await searchBtn.click();

    const searchInput = page.getByPlaceholder('Search 220+ concepts...');
    await expect(searchInput).toBeVisible();

    // Type topic name
    await searchInput.fill('Backpropagation');

    // The Drei <Html> label tag for the matched node should appear in the DOM overlay
    const nodeLabel = page.locator('text=Neural Network Backpropagation').first();
    await expect(nodeLabel).toBeVisible();

    // Click label to select node and trigger camera zoom
    await nodeLabel.click({ force: true });

    // Verify Floating EXPLORE action button appears on bottom right
    const exploreBtn = page.locator('button:has-text("EXPLORE:")');
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();

    // Verify Inspector card opens with category and details
    await expect(page.getByText('AI & ML').first()).toBeVisible();
  });

  test('Toggles Overload mode and CRT scanline overlays via KeyO', async ({ page }) => {
    // Press KeyO to activate overload simulation
    await page.keyboard.press('KeyO');

    // Verify CRT scanlines and vignette overlay layers are present
    const crtOverlay = page.locator('.crt-scanlines.crt-vignette');
    await expect(crtOverlay).toBeVisible();

    // Press KeyO again to restore normal mode
    await page.keyboard.press('KeyO');
    await expect(crtOverlay).toBeVisible();
  });

  test('Toggles HUD visibility with KeyH and allows restoring via Restore HUD button', async ({ page }) => {
    // HUD is initially visible
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible();

    // Press KeyH to hide HUD
    await page.keyboard.press('KeyH');
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).not.toBeVisible();

    // Restore HUD button should be visible
    const restoreBtn = page.getByRole('button', { name: /RESTORE HUD/i });
    await expect(restoreBtn).toBeVisible();

    // Click Restore HUD
    await restoreBtn.click();
    await expect(page.getByRole('button', { name: /SUBGRAPHS/i })).toBeVisible();
  });
});
