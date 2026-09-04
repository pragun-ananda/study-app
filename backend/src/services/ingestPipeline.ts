import { cleanHtmlToMarkdown, CleanContentOptions } from "./contentCleaner.js";
import { extractHighFidelityTopics } from "./topicExtractor.js";
import {
  IngestPipelineStep,
  IngestRequestPayload,
  IngestRequestOptions,
  IngestPipelineResult,
  FetchUrlResult,
  CleanContentResult,
  ExtractTopicsOptions,
  ExtractTopicsResult,
  GenerateContentResult,
  ReviewContentResult,
  AddToReviewQueueResult
} from "../types.js";

export const MAX_CONTENT_BYTES = 10 * 1024 * 1024; // 10 MB maximum payload size
export const MIN_TIMEOUT_MS = 500;
export const MAX_TIMEOUT_MS = 30000;
export const DEFAULT_TIMEOUT_MS = 8000;

export const UNSUPPORTED_BINARY_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/zip",
  "application/x-zip",
  "application/x-tar",
  "application/gzip",
  "application/x-bzip",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument",
  "application/msword"
];

export class IngestFetchError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "IngestFetchError";
  }
}

/**
 * Step 1: Fetch from URL (BAC-2)
 * Validates and retrieves raw content from a given HTTP/HTTPS URL.
 * Handles timeouts, unreachable hosts, large payloads, binary media types, and invalid URL protocols with clear error codes.
 */
export async function fetchUrlStep(
  rawUrl: string,
  options?: IngestRequestOptions
): Promise<FetchUrlResult> {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new IngestFetchError(400, "URL is required and must be a non-empty string");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new IngestFetchError(400, `Invalid URL format: ${rawUrl}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new IngestFetchError(
      400,
      `Unsupported URL protocol: ${parsedUrl.protocol}. Only http: and https: are supported.`
    );
  }

  const rawTimeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number.isFinite(rawTimeout)
    ? Math.max(MIN_TIMEOUT_MS, Math.min(rawTimeout, MAX_TIMEOUT_MS))
    : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "StudyApp-Ingestion-Bot/1.0 (+https://github.com/pragun-ananda/study-app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,text/markdown;q=0.8,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new IngestFetchError(
        response.status >= 500 ? 502 : response.status,
        `Upstream server returned HTTP ${response.status}: ${response.statusText}`
      );
    }

    const rawContentType = response.headers.get("content-type");
    const normalizedContentType = rawContentType
      ? rawContentType.split(";")[0].trim().toLowerCase()
      : undefined;

    // Check for unsupported binary media types upfront before reading body stream
    if (normalizedContentType) {
      const isBinary = UNSUPPORTED_BINARY_MIME_PREFIXES.some((prefix) =>
        normalizedContentType.startsWith(prefix)
      );
      if (isBinary) {
        throw new IngestFetchError(
          415,
          `Unsupported media type: ${normalizedContentType}. Only text, HTML, and markdown documents are supported for ingestion.`
        );
      }
    }

    // Check Content-Length header if available before buffering body
    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declaredLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(declaredLength) && declaredLength > MAX_CONTENT_BYTES) {
        throw new IngestFetchError(
          413,
          `Content length (${declaredLength} bytes) exceeds maximum allowable limit of ${MAX_CONTENT_BYTES} bytes`
        );
      }
    }

    const content = await response.text();

    const actualByteLength = Buffer.byteLength(content, "utf8");
    if (actualByteLength > MAX_CONTENT_BYTES) {
      throw new IngestFetchError(
        413,
        `Response body (${actualByteLength} bytes) exceeds maximum allowable limit of ${MAX_CONTENT_BYTES} bytes`
      );
    }

    const finalUrl = response.url || parsedUrl.toString();

    return {
      content,
      status: response.status,
      contentType: rawContentType || undefined,
      contentLength: actualByteLength,
      finalUrl
    };
  } catch (error: unknown) {
    if (error instanceof IngestFetchError) {
      throw error;
    }

    const err = error as Error;
    if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
      throw new IngestFetchError(
        504,
        `Request to upstream URL ${rawUrl} timed out after ${timeoutMs}ms`,
        error
      );
    }

    // Network error / connection refused / DNS lookup failure
    const msg = err?.message || "Host server for URL is unavailable";
    throw new IngestFetchError(
      502,
      `Failed to fetch from URL ${rawUrl}: ${msg}`,
      error
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Step 2: Clean fetched content
 * Placeholder no-op for HTML boilerplate removal, DOM cleaning, and markdown extraction.
 */
/**
 * Step 2: Clean fetched content (BAC-16)
 * Converts raw fetched web content (HTML, plain text, markdown) into clean,
 * standardized GitHub-Flavored Markdown while stripping boilerplate and preserving
 * code blocks, LaTeX math formulas, tables, and relative URLs.
 */
export async function cleanFetchedContentStep(
  rawContent: string,
  options?: CleanContentOptions
): Promise<CleanContentResult> {
  return cleanHtmlToMarkdown(rawContent, options);
}

/**
 * Step 3: Extract topics (BAC-19)
 * Extracts high-fidelity topic nodes from cleaned markdown using a dual-agent
 * architecture (Generator + Critic) with dynamic domain emergence.
 */
export async function extractTopicsStep(
  cleanedContent: string,
  options?: ExtractTopicsOptions
): Promise<ExtractTopicsResult> {
  return extractHighFidelityTopics(cleanedContent, options);
}

/**
 * Step 4: Generate content
 * Placeholder no-op for study notes, summaries, and mathematical formulas generation.
 */
export async function generateContentStep(
  _topics: ExtractTopicsResult["topics"]
): Promise<GenerateContentResult> {
  return {
    notes: []
  };
}

/**
 * Step 5: Review generated content
 * Placeholder no-op for automated quality and coherence checks.
 */
export async function reviewGeneratedContentStep(
  _data: { topics: ExtractTopicsResult["topics"]; notes: GenerateContentResult["notes"] }
): Promise<ReviewContentResult> {
  return {
    passed: true
  };
}

/**
 * Step 6: Add to human review queue
 * Placeholder no-op for diff-based human review staging.
 */
export async function addToReviewQueueStep(
  _reviewData: { reviewPassed: boolean }
): Promise<AddToReviewQueueResult> {
  return {
    queueId: null,
    status: "bypassed"
  };
}

/**
 * Executes the complete 6-stage ingestion pipeline.
 * Per BAC-2: Fetches from URL, executes pipeline steps in memory, and drops raw content at completion.
 */
export async function runIngestionPipeline(
  payload: IngestRequestPayload
): Promise<IngestPipelineResult> {
  const executedSteps: IngestPipelineStep[] = [];

  // 1. Fetch from URL
  const fetchResult = await fetchUrlStep(payload.url, payload.options);
  executedSteps.push("fetch_url");

  // 2. Clean fetched content (no-op)
  const cleanResult = await cleanFetchedContentStep(fetchResult.content, {
    finalUrl: fetchResult.finalUrl,
    contentType: fetchResult.contentType
  });
  executedSteps.push("clean_content");

  // 3. Extract topics (BAC-19)
  const extractResult = await extractTopicsStep(cleanResult.cleanedContent, payload.options);
  executedSteps.push("extract_topics");

  // 4. Generate content (no-op)
  const generateResult = await generateContentStep(extractResult.topics);
  executedSteps.push("generate_content");

  // 5. Review generated content (no-op)
  const reviewResult = await reviewGeneratedContentStep({
    topics: extractResult.topics,
    notes: generateResult.notes
  });
  executedSteps.push("review_content");

  // 6. Add to human review queue (no-op)
  const queueResult = await addToReviewQueueStep({
    reviewPassed: reviewResult.passed
  });
  executedSteps.push("add_to_review_queue");

  // Raw content is dropped from memory here as execution leaves scope.
  return {
    status: "success",
    url: payload.url,
    executedSteps,
    message: "Ingestion pipeline executed successfully",
    details: {
      finalUrl: fetchResult.finalUrl,
      fetchStatus: fetchResult.status,
      contentLength: fetchResult.contentLength,
      cleanedLength: cleanResult.cleanedLength,
      cleanedTitle: cleanResult.title,
      extractedTopicsCount: extractResult.topics.length,
      suggestedNewDomains: extractResult.suggestedNewDomains,
      generatedNotesCount: generateResult.notes.length,
      reviewPassed: reviewResult.passed,
      queueId: queueResult.queueId
    }
  };
}
