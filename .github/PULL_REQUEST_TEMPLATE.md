## Description
<!-- Provide a brief summary of the changes and link related Linear issues -->

## CI Verification Checklist
Please verify the following checks before submitting:
- [ ] Schema & Seed tests pass (`npm --prefix storage test`)
- [ ] Backend build & tests pass (`npm --prefix backend run build && npm --prefix backend test`)
- [ ] Frontend unit & component tests pass (`npm --prefix frontend run build && npm --prefix frontend test`)
- [ ] Playwright E2E tests verified locally (12/12 passing via `npm --prefix frontend run test:e2e`)

> **Note**: The CI gate requires proof of local Playwright execution. Satisfy this by checking the E2E box above or attaching the `playwright-verified` label to this PR.
