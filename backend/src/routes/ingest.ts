import { Router, Request, Response } from "express";
import { runIngestionPipeline, IngestFetchError } from "../services/ingestPipeline.js";
import { IngestRequestPayload } from "../types.js";

const router = Router();

// POST /api/ingest (and POST /ingest) - Ingestion Pipeline Entrypoint
router.post("/", async (req: Request, res: Response) => {
  try {
    const { url, options } = req.body || {};

    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({
        status: "error",
        error: "URL is required and must be a non-empty string"
      });
    }

    const payload: IngestRequestPayload = {
      url: url.trim(),
      options
    };

    const result = await runIngestionPipeline(payload);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof IngestFetchError) {
      return res.status(error.statusCode).json({
        status: "error",
        error: error.message
      });
    }

    console.error("[INGEST_PIPELINE_ERROR]:", error);
    return res.status(500).json({
      status: "error",
      error: "Internal server error during ingestion pipeline execution",
      message: error.message || "An unexpected error occurred"
    });
  }
});

export default router;
