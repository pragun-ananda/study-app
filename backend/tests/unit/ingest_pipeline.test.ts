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
  IngestFetchError,
  MAX_CONTENT_BYTES
} from "../../src/services/ingestPipeline.js";

describe("Unit: Ingestion Pipeline Service (src/services/ingestPipeline.ts)", () => {
  let mockServer: http.Server;
  let mockServerPort: number;
  let lastReceivedHeaders: http.IncomingHttpHeaders = {};

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      lastReceivedHeaders = req.headers;

      if (req.url === "/article") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Neural Networks</h1><p>Deep Learning Concepts.</p></body></html>");
      } else if (req.url === "/rich-article") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Transformer Attention Architecture</h1><p>Self-attention mechanisms calculate scaled dot products between query and key vectors to model semantic context in sequence models. Multi-Head Attention enables parallel representation sub-spaces.</p></body></html>");
      } else if (req.url === "/redirect-source") {
        res.writeHead(302, { Location: "/article" });
        res.end();
      } else if (req.url === "/image.png") {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      } else if (req.url === "/document.pdf") {
        res.writeHead(200, { "Content-Type": "application/pdf" });
        res.end(Buffer.from("%PDF-1.4"));
      } else if (req.url === "/archive.zip") {
        res.writeHead(200, { "Content-Type": "application/zip" });
        res.end(Buffer.from("PK"));
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
        }, 1500);
      } else if (req.url === "/large-header") {
        res.writeHead(200, {
          "Content-Type": "text/plain",
          "Content-Length": String(MAX_CONTENT_BYTES + 1024)
        });
        res.end("Dummy");
      } else if (req.url === "/trickle-slow-body") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write("Start of body...");
        setTimeout(() => {
          res.end("End of body");
        }, 1500);
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
    it("successfully fetches content from a valid URL and sends browser headers", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/article`;
      const result = await fetchUrlStep(url);

      expect(result.status).toBe(200);
      expect(result.content).toContain("<h1>Neural Networks</h1>");
      expect(result.contentLength).toBeGreaterThan(0);
      expect(result.contentType).toContain("text/html");
      expect(result.finalUrl).toBe(url);
      expect(lastReceivedHeaders["accept-language"]).toContain("en-US");
    });

    it("tracks canonical finalUrl across HTTP 302 redirects", async () => {
      const initialUrl = `http://127.0.0.1:${mockServerPort}/redirect-source`;
      const result = await fetchUrlStep(initialUrl);

      expect(result.status).toBe(200);
      expect(result.content).toContain("<h1>Neural Networks</h1>");
      expect(result.finalUrl).toBe(`http://127.0.0.1:${mockServerPort}/article`);
    });

    it("rejects binary image media types (e.g. image/png) with 415 Unsupported Media Type", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/image.png`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown 415 error");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(415);
        expect(err.message).toContain("Unsupported media type: image/png");
      }
    });

    it("rejects binary PDF media types (application/pdf) with 415 Unsupported Media Type", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/document.pdf`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown 415 error");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(415);
        expect(err.message).toContain("Unsupported media type: application/pdf");
      }
    });

    it("rejects binary archive media types (application/zip) with 415 Unsupported Media Type", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/archive.zip`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown 415 error");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(415);
        expect(err.message).toContain("Unsupported media type: application/zip");
      }
    });

    it("rejects empty, null, or invalid URLs with 400 Bad Request", async () => {
      await expect(fetchUrlStep("")).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep("   ")).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep(null as any)).rejects.toThrowError(IngestFetchError);
      await expect(fetchUrlStep("not-a-valid-url")).rejects.toThrowError(/Invalid URL format/);
    });

    it("rejects unsupported protocols (e.g. ftp://, file://) with 400", async () => {
      await expect(fetchUrlStep("ftp://example.com/file")).rejects.toThrowError(
        /Unsupported URL protocol: ftp:. Only http: and https: are supported/
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

    it("handles request timeout with 504 Gateway Timeout during initial connect", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/slow`;
      try {
        await fetchUrlStep(url, { timeoutMs: 500 });
        expect.unreachable("Should have timed out");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(504);
        expect(err.message).toContain("timed out after 500ms");
      }
    });

    it("handles request timeout covering body streaming (Slowloris protection)", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/trickle-slow-body`;
      try {
        await fetchUrlStep(url, { timeoutMs: 500 });
        expect.unreachable("Should have timed out while streaming body");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(504);
        expect(err.message).toContain("timed out after 500ms");
      }
    });

    it("rejects payloads exceeding MAX_CONTENT_BYTES with 413 Payload Too Large via header", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/large-header`;
      try {
        await fetchUrlStep(url);
        expect.unreachable("Should have thrown 413");
      } catch (err: any) {
        expect(err).toBeInstanceOf(IngestFetchError);
        expect(err.statusCode).toBe(413);
        expect(err.message).toContain("exceeds maximum allowable limit");
      }
    });

    it("handles unreachable host servers with 502 Bad Gateway", async () => {
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
    it("cleanFetchedContentStep converts HTML to clean markdown and calculates accurate UTF-8 byte length (BAC-16)", async () => {
      const asciiInput = "<article><h1>Article Title</h1><p>Article body content.</p></article>";
      const asciiResult = await cleanFetchedContentStep(asciiInput);
      expect(asciiResult.cleanedContent).toContain("Article body content.");
      expect(asciiResult.cleanedLength).toBe(Buffer.byteLength(asciiResult.cleanedContent, "utf8"));

      const multiByteInput = "<article><h1>Neural 神经网络 ∇ ∫ 🚀</h1><p>Deep Learning 深度学习.</p></article>";
      const multiByteResult = await cleanFetchedContentStep(multiByteInput);
      expect(multiByteResult.cleanedContent).toContain("Neural 神经网络 ∇ ∫ 🚀");
      expect(multiByteResult.cleanedContent).toContain("Deep Learning 深度学习.");
      expect(multiByteResult.cleanedLength).toBe(Buffer.byteLength(multiByteResult.cleanedContent, "utf8"));
      expect(multiByteResult.cleanedLength).toBeGreaterThan(multiByteResult.cleanedContent.length);
    });

    it("extractTopicsStep returns empty topics list for short content (< 100 chars)", async () => {
      const result = await extractTopicsStep("Sample content");
      expect(result.topics).toEqual([]);
    });

    it("extractTopicsStep extracts structured ExtractedTopic nodes for substantive content (BAC-19)", async () => {
      const richContent = `# Deep Learning and Neural Network Architectures\n\n` +
        `Neural network models utilize deep layers with backpropagation to optimize weight parameters. ` +
        `Transformer self-attention architectures allow capturing long-range token relationships efficiently.`;
      const result = await extractTopicsStep(richContent);
      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.topics[0].name).toBeDefined();
      expect(result.topics[0].category).toBeDefined();
      expect(result.topics[0].summary).toBeDefined();
    });

    it("generateContentStep returns empty notes and quizzes for empty topics", async () => {
      const result = await generateContentStep([]);
      expect(result.notes).toEqual([]);
      expect(result.quizzes).toEqual([]);
    });

    it("generateContentStep synthesizes notes and quizzes for extracted topics (Stage 4 & 5)", async () => {
      const topics = [
        {
          name: "Transformer Self-Attention",
          category: "AI & ML" as const,
          summary: "Scaled dot-product mechanism for sequences."
        }
      ];
      const result = await generateContentStep(topics, "# Transformer Self-Attention\nScaled dot-product attention.");
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].title).toBe("Transformer Self-Attention");
      expect(result.quizzes).toHaveLength(1);
      expect(result.quizzes[0].questions.length).toBeGreaterThanOrEqual(1);
      expect(result.auditReports).toHaveLength(1);
      expect(result.quizAudits).toHaveLength(1);
    });

    it("reviewGeneratedContentStep returns passed: true when all audits pass", async () => {
      const result = await reviewGeneratedContentStep({ topics: [], notes: [] });
      expect(result.passed).toBe(true);
      expect(result.overallScore).toBe(100);
      expect(result.summary).toContain("Audit passed");
    });

    it("reviewGeneratedContentStep flags failure when an audit report fails or has low score", async () => {
      const failedNoteAudit = {
        topicName: "Transformer Self-Attention",
        passed: false,
        coverageScore: 65,
        missingConcepts: ["1/sqrt(d_k) scaling"],
        hallucinations: [],
        syntaxErrors: [],
        feedback: "Missing formula",
        refinementIterations: 2
      };
      const result = await reviewGeneratedContentStep({
        noteAudits: [failedNoteAudit],
        quizAudits: []
      });
      expect(result.passed).toBe(false);
      expect(result.overallScore).toBe(65);
      expect(result.summary).toContain("Audit flagged warnings");
    });

    it("addToReviewQueueStep returns bypassed status when review passed cleanly", async () => {
      const result = await addToReviewQueueStep({ reviewPassed: true });
      expect(result.status).toBe("bypassed");
      expect(result.queueId).toBeNull();
    });

    it("addToReviewQueueStep stages flagged content into the review queue when review fails", async () => {
      const result = await addToReviewQueueStep({
        url: "http://example.com/test",
        reviewPassed: false,
        reviewResult: {
          passed: false,
          overallScore: 60,
          noteAudits: [],
          quizAudits: [],
          summary: "Staged for review"
        }
      });
      expect(result.status).toBe("queued");
      expect(result.queueId).toMatch(/^QUEUE-/);
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
      expect(result.details.finalUrl).toBe(url);
      expect(result.details.fetchStatus).toBe(200);
      expect(result.details.contentLength).toBeGreaterThan(0);
      expect(result.details.cleanedLength).toBeGreaterThan(0);
      expect(result.details.extractedTopicsCount).toBe(0);
      expect(result.details.generatedNotesCount).toBe(0);
      expect(result.details.reviewPassed).toBe(true);
      expect(result.details.queueId).toBeNull();
    });

    it("populates extracted topics, notes, quizzes, and audit metrics when ingesting rich article content (BAC-19 & BAC-20)", async () => {
      const url = `http://127.0.0.1:${mockServerPort}/rich-article`;
      const result = await runIngestionPipeline({ url });

      expect(result.status).toBe("success");
      expect(result.executedSteps).toContain("extract_topics");
      expect(result.executedSteps).toContain("generate_content");
      expect(result.executedSteps).toContain("review_content");
      expect(result.executedSteps).toContain("add_to_review_queue");
      expect(result.details.extractedTopicsCount).toBeGreaterThan(0);
      expect(result.details.generatedNotesCount).toBeGreaterThan(0);
      expect(result.details.generatedQuizzesCount).toBeGreaterThan(0);
      expect(result.details.generatedQuestionsCount).toBeGreaterThan(0);
      expect(result.details.reviewPassed).toBe(true);
      expect(result.details.overallScore).toBeGreaterThanOrEqual(90);
    });
  });
});
