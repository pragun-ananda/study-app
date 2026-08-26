import {
  IngestPipelineStep,
  IngestRequestPayload,
  IngestRequestOptions,
  IngestPipelineResult,
  FetchUrlResult,
  CleanContentResult,
  ExtractTopicsResult,
  GenerateContentResult,
  ReviewContentResult,
  AddToReviewQueueResult
} from "../types.js";

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
 * Handles timeouts, unreachable hosts, and invalid URL protocols with clear error codes.
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

  const timeoutMs = options?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "StudyApp-Ingestion-Bot/1.0 (+https://github.com/pragun-ananda/study-app)",
        Accept: "text/html,application/xhtml+xml,application/xml,text/plain,text/markdown;q=0.9,*/*;q=0.8"
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new IngestFetchError(
        response.status >= 500 ? 502 : response.status,
        `Upstream server returned HTTP ${response.status}: ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || undefined;
    const content = await response.text();

    return {
      content,
      status: response.status,
      contentType,
      contentLength: Buffer.byteLength(content, "utf8")
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof IngestFetchError) {
      throw error;
    }

    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      throw new IngestFetchError(
        504,
        `Request to upstream URL ${rawUrl} timed out after ${timeoutMs}ms`,
        error
      );
    }

    // Network error / connection refused / DNS lookup failure
    const msg = error.message || "Host server for URL is unavailable";
    throw new IngestFetchError(
      502,
      `Failed to fetch from URL ${rawUrl}: ${msg}`,
      error
    );
  }
}

/**
 * Step 2: Clean fetched content
 * Placeholder no-op for HTML boilerplate removal, DOM cleaning, and markdown extraction.
 */
export async function cleanFetchedContentStep(
  rawContent: string
): Promise<CleanContentResult> {
  return {
    cleanedContent: rawContent,
    cleanedLength: rawContent.length
  };
}

/**
 * Step 3: Extract topics
 * Placeholder no-op for entity recognition and concept extraction into topic nodes.
 */
export async function extractTopicsStep(
  _cleanedContent: string
): Promise<ExtractTopicsResult> {
  return {
    topics: []
  };
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
  _reviewData: any
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
  const cleanResult = await cleanFetchedContentStep(fetchResult.content);
  executedSteps.push("clean_content");

  // 3. Extract topics (no-op)
  const extractResult = await extractTopicsStep(cleanResult.cleanedContent);
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
      fetchStatus: fetchResult.status,
      contentLength: fetchResult.contentLength,
      cleanedLength: cleanResult.cleanedLength,
      extractedTopicsCount: extractResult.topics.length,
      generatedNotesCount: generateResult.notes.length,
      reviewPassed: reviewResult.passed,
      queueId: queueResult.queueId
    }
  };
}
