import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import http from "http";
import { app } from "../../src/app.js";
import { setupTestDatabase } from "../helpers.js";

describe("Integration: Ingestion API (POST /api/ingest & POST /ingest)", () => {
  let mockServer: http.Server;
  let mockServerPort: number;

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      if (req.url === "/valid-source") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<!DOCTYPE html><html><body><h1>Attention Is All You Need</h1><p>Transformer paper text.</p></body></html>");
      } else if (req.url === "/photo.jpg") {
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(Buffer.from([0xff, 0xd8, 0xff]));
      } else if (req.url === "/not-found") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Resource Not Found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server Error");
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

  beforeEach(() => {
    setupTestDatabase();
  });

  it("POST /api/ingest successfully executes 6-stage ingestion pipeline for valid URL", async () => {
    const targetUrl = `http://127.0.0.1:${mockServerPort}/valid-source`;

    const res = await request(app)
      .post("/api/ingest")
      .send({ url: targetUrl });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.url).toBe(targetUrl);
    expect(res.body.message).toBe("Ingestion pipeline executed successfully");
    expect(res.body.executedSteps).toEqual([
      "fetch_url",
      "clean_content",
      "extract_topics",
      "generate_content",
      "review_content",
      "add_to_review_queue"
    ]);
    expect(res.body.details).toBeDefined();
    expect(res.body.details.finalUrl).toBe(targetUrl);
    expect(res.body.details.fetchStatus).toBe(200);
    expect(res.body.details.contentLength).toBeGreaterThan(0);
    expect(res.body.details.cleanedLength).toBe(res.body.details.contentLength);
    expect(res.body.details.extractedTopicsCount).toBe(0);
    expect(res.body.details.generatedNotesCount).toBe(0);
    expect(res.body.details.reviewPassed).toBe(true);
    expect(res.body.details.queueId).toBeNull();
  });

  it("POST /ingest (root alias) behaves identically to /api/ingest", async () => {
    const targetUrl = `http://127.0.0.1:${mockServerPort}/valid-source`;

    const res = await request(app)
      .post("/ingest")
      .send({ url: targetUrl });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.url).toBe(targetUrl);
    expect(res.body.executedSteps.length).toBe(6);
  });

  it("POST /api/ingest returns 415 Unsupported Media Type when target is binary media (e.g. image/jpeg)", async () => {
    const targetUrl = `http://127.0.0.1:${mockServerPort}/photo.jpg`;

    const res = await request(app)
      .post("/api/ingest")
      .send({ url: targetUrl });

    expect(res.status).toBe(415);
    expect(res.body.status).toBe("error");
    expect(res.body.error).toContain("Unsupported media type: image/jpeg");
  });

  it("POST /api/ingest returns 400 Bad Request when URL is missing or empty", async () => {
    const resEmpty = await request(app)
      .post("/api/ingest")
      .send({});
    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.status).toBe("error");
    expect(resEmpty.body.error).toContain("URL is required");

    const resWhitespace = await request(app)
      .post("/api/ingest")
      .send({ url: "   " });
    expect(resWhitespace.status).toBe(400);
    expect(resWhitespace.body.status).toBe("error");
    expect(resWhitespace.body.error).toContain("URL is required");
  });

  it("POST /api/ingest returns 400 Bad Request when URL protocol is unsupported", async () => {
    const res = await request(app)
      .post("/api/ingest")
      .send({ url: "ftp://files.example.com/data.txt" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.error).toContain("Unsupported URL protocol");
  });

  it("POST /api/ingest returns 502 Bad Gateway when upstream host server is unavailable (BAC-2)", async () => {
    const unavailableUrl = "http://127.0.0.1:59993/article";

    const res = await request(app)
      .post("/api/ingest")
      .send({ url: unavailableUrl, options: { timeoutMs: 500 } });

    expect(res.status).toBe(502);
    expect(res.body.status).toBe("error");
    expect(res.body.error).toContain("Failed to fetch from URL");
  });

  it("POST /api/ingest returns 404 when upstream resource does not exist", async () => {
    const notFoundUrl = `http://127.0.0.1:${mockServerPort}/not-found`;

    const res = await request(app)
      .post("/api/ingest")
      .send({ url: notFoundUrl });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.error).toContain("Upstream server returned HTTP 404");
  });
});
