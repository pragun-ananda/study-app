import { Router, Request, Response } from "express";
import {
  getReviewQueue,
  getUpdateById,
  approveQueueUpdate,
  rejectQueueUpdate,
  requestChangesOnUpdate,
  approveEntireQueueItem,
  rejectEntireQueueItem
} from "../services/reviewQueueService.js";
import { RequestChangesPayload } from "../types.js";

const router = Router();

/**
 * GET /api/review-queue
 * Retrieves all review queue records, flattened updates, and status counts.
 * Optional query parameter: ?status=PENDING|APPROVED|REJECTED|CHANGES_REQUESTED|ALL
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter = typeof status === "string" ? { status } : undefined;
    const response = await getReviewQueue(filter);
    return res.status(200).json(response);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[REVIEW_QUEUE_GET_ERROR]:", error);
    return res.status(500).json({
      error: "Failed to fetch review queue",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * GET /api/review-queue/updates/:updateId
 * Retrieves a specific GraphUpdate and its parent review queue record.
 */
router.get("/updates/:updateId", async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const match = await getUpdateById(updateId);
    if (!match) {
      return res.status(404).json({
        error: "Not Found",
        message: `GraphUpdate with id '${updateId}' not found in review queue`
      });
    }
    return res.status(200).json(match);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[REVIEW_QUEUE_GET_UPDATE_ERROR]:", error);
    return res.status(500).json({
      error: "Failed to fetch update details",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/review-queue/updates/:updateId/approve
 * Approves a single GraphUpdate and atomically applies it to the knowledge graph DB.
 */
router.post("/updates/:updateId/approve", async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const result = await approveQueueUpdate(updateId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    const statusCode = err?.message?.includes("not found") ? 404 : 500;
    console.error("[REVIEW_QUEUE_APPROVE_ERROR]:", error);
    return res.status(statusCode).json({
      error: "Failed to approve update",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/review-queue/updates/:updateId/reject
 * Rejects a single GraphUpdate without modifying the active knowledge graph DB.
 */
router.post("/updates/:updateId/reject", async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const result = await rejectQueueUpdate(updateId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    const statusCode = err?.message?.includes("not found") ? 404 : 500;
    console.error("[REVIEW_QUEUE_REJECT_ERROR]:", error);
    return res.status(statusCode).json({
      error: "Failed to reject update",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/review-queue/updates/:updateId/request-changes
 * Human-in-the-loop Agent Redrafting:
 * Receives line comments and general feedback, feeds to generator/critic, and stages revised diff.
 */
router.post("/updates/:updateId/request-changes", async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const { comments, generalFeedback } = req.body || {};

    if ((!comments || !Array.isArray(comments) || comments.length === 0) && !generalFeedback) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Must provide at least one line comment or non-empty generalFeedback"
      });
    }

    const payload: RequestChangesPayload = {
      comments: Array.isArray(comments) ? comments : [],
      generalFeedback: typeof generalFeedback === "string" ? generalFeedback : undefined
    };

    const result = await requestChangesOnUpdate(updateId, payload);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    const statusCode = err?.message?.includes("not found") ? 404 : 500;
    console.error("[REVIEW_QUEUE_REQUEST_CHANGES_ERROR]:", error);
    return res.status(statusCode).json({
      error: "Failed to request changes on update",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/review-queue/items/:queueId/approve
 * Approves an entire queue batch and applies all its updates to PostgreSQL.
 */
router.post("/items/:queueId/approve", async (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const result = await approveEntireQueueItem(queueId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    const statusCode = err?.message?.includes("not found") ? 404 : 500;
    console.error("[REVIEW_QUEUE_APPROVE_ITEM_ERROR]:", error);
    return res.status(statusCode).json({
      error: "Failed to approve queue item",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

/**
 * POST /api/review-queue/items/:queueId/reject
 * Rejects an entire queue batch.
 */
router.post("/items/:queueId/reject", async (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const result = await rejectEntireQueueItem(queueId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    const statusCode = err?.message?.includes("not found") ? 404 : 500;
    console.error("[REVIEW_QUEUE_REJECT_ITEM_ERROR]:", error);
    return res.status(statusCode).json({
      error: "Failed to reject queue item",
      message: err?.message || "An unexpected error occurred"
    });
  }
});

export default router;
