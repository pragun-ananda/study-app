import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { setupTestDatabase } from "../helpers.js";

const shouldSkipLiveTests = process.env.SKIP_LIVE_TESTS === "true";

describe("E2E: Real Live URL Ingestion over HTTPS", { timeout: 15000 }, () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  it.skipIf(shouldSkipLiveTests)(
    "successfully fetches and executes pipeline for a real public HTTPS URL",
    async () => {
      const realUrl = "https://raw.githubusercontent.com/pragun-ananda/study-app/main/README.md";

      const res = await request(app)
        .post("/api/ingest")
        .send({ url: realUrl, options: { timeoutMs: 10000 } });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.url).toBe(realUrl);
      expect(res.body.executedSteps).toEqual([
        "fetch_url",
        "clean_content",
        "extract_topics",
        "generate_content",
        "review_content",
        "add_to_review_queue"
      ]);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.fetchStatus).toBe(200);
      expect(res.body.details.contentLength).toBeGreaterThan(100);
      expect(res.body.details.cleanedLength).toBe(res.body.details.contentLength);
    },
    15000
  );

  it.skipIf(shouldSkipLiveTests)(
    "handles a real live 404 Not Found response cleanly over HTTPS",
    async () => {
      const real404Url = "https://raw.githubusercontent.com/pragun-ananda/study-app/main/NON_EXISTENT_FILE_BAC2_TEST.md";

      const res = await request(app)
        .post("/api/ingest")
        .send({ url: real404Url, options: { timeoutMs: 10000 } });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("error");
      expect(res.body.error).toContain("Upstream server returned HTTP 404");
    },
    15000
  );
});
