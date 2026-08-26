import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import {
  fetchUrlStep,
  cleanFetchedContentStep,
  extractTopicsStep,
  generateContentStep,
  reviewGeneratedContentStep,
  addToReviewQueueStep,
  runIngestionPipeline,
  IngestFetchError
} from "../../src/services/ingestPipeline.js";

describe("Unit: Ingestion Pipeline Service (src/services/ingestPipeline.ts)", () => {
  let mockServer: http.Server;
  let mockServerPort: number;

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      if (req.url === "/article") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Neural Networks</h1><p>Deep Learning Concepts.</p></body></html>");
      } else if (req.url === "/not-found") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Page Not Found");
      } else if (req.url === "/server-error") {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Delayed Response");
        }, 300);
      } else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Unknown Route");
      }
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const address = mockServer.address() as any;
        mockServerPort = address.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  describe("fetchUrlStep (BAC-2)", () => {
    it("successfully fetches content from a valid URL", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/article`;
      const result = await fetchUrlStep(url);

      expect(result.status).toBe(200);
      expect(result.content).toContain("<h1>Neural Networks</h1>");
      expect(result.contentLength).toBeGreaterThan(0);
      expect(result.contentType).toContain("text/html");
    });

    it("rejects empty, null, or invalid URLs with 400 Bad Request", async () => {
      await expect(fetchUrlStep("")).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep("   ")).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep(null as any)).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep("not-a-valid-url")).rejects.toThrowError(/Invalid URL format/);
    });

    it("rejects unsupported protocols (e.g. ftp://, file://) with 400", async () => {
      await expect(fetchUrlStep("ftp://example.com/file")).rejects.toThrowError(
        /Unsupported URL protocol: ftp:\. Only http: and https: are supported/
      );
      await expect(fetchUrlStep("file:///tmp/test")).rejects.toThrowError(/Unsupported URL protocol/);
    });

    it("handles upstream HTTP 404 error cleanly", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/not-found`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown IngestFetchError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toContain("Upstream server returned HTTP 404");
      }
    });

    it("handles upstream HTTP 500 error mapped to 502 Bad Gateway", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/server-error`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown IngestFetchError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(502);
        expect(err.message).toContain("Upstream server returned HTTP 500");
      }
    });

    it("handles request timeout with 504 Gateway Timeout", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/slow`;
      try {
        await fetchUrlStep(url, { timeoutMs: 50 });
        expect.unreachable("Should have timed out");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(504);
        expect(err.message).toContain("timed out after 50ms");
      }
    });

    it("handles unreachable host servers with 502 Bad Gateway", async () => {
      // Connect to an unused random high port
      const url = "http://127.0.0.1:59991/nonexistent";
      try {
        await fetchUrlStep(url, { timeoutMs: 500 });
        expect.unreachable("Should have failed to connect");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(502);
        expect(err.message).toContain("Failed to fetch from URL");
      }
    });
  });

  describe("Pipeline Sub-Steps (Clean, Extract, Generate, Review, Queue)", () => {
    it("cleanFetchedContentStep returns raw content as no-op placeholder", async () => {
      const input = "<h1>Article</h1>";
      const result = await cleanFetchedContentStep(input);
      expect(result.cleanedContent).toBe(input);
      expect(result.cleanedLength).toBe(input.length);
    });

    it("extractTopicsStep returns empty topics list", async () => {
      const result = await extractTopicsStep("Sample content");
      expect(result.topics).toEqual([]);
    });

    it("generateContentStep returns empty notes list", async () => {
      const result = await generateContentStep([]);
      expect(result.notes).toEqual([]);
    });

    it("reviewGeneratedContentStep returns passed: true", async () => {
      const result = await reviewGeneratedContentStep({ topics: [], notes: [] });
      expect(result.passed).toBe(true);
    });

    it("addToReviewQueueStep returns bypassed status", async () => {
      const result = await addToReviewQueueStep({});
      expect(result.status).toBe("bypassed");
      expect(result.queueId).toBeNull();
    });
  });

  describe("runIngestionPipeline orchestrator", () => {
    it("runs through all 6 stages sequentially and drops content after execution", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/article`;
      const result = await runIngestionPipeline({ url });

      expect(result.status).toBe("success");
      expect(result.url).toBe(url);
      expect(result.executedSteps).toEqual([
        "fetch_url",
        "clean_content",
        "extract_topics",
        "generate_content",
        "review_content",
        "add_to_review_queue"
      ]);
      expect(result.details.fetchStatus).toBe(200);
      expect(result.details.contentLength).toBeGreaterThan(0);
      expect(result.details.cleanedLength).toBeGreaterThan(0);
      expect(result.details.extractedTopicsCount).toBe(0);
      expect(result.details.generatedNotesCount).toBe(0);
      expect(result.details.reviewPassed).toBe(true);
      expect(result.details.queueId).toBeNull();
    });
  });
});
