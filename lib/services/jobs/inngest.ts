/**
 * Inngest Client Configuration
 *
 * Inngest provides durable function execution with:
 * - Step-level persistence (survives function restarts)
 * - Automatic retries with exponential backoff
 * - Built-in observability
 */

import { Inngest } from "inngest";

// Create Inngest client
export const inngest = new Inngest({
  id: "lifeos",
  // Event key for sending events
  eventKey: process.env.INNGEST_EVENT_KEY,
  // Signing key for production (verifying webhooks)
  ...(process.env.INNGEST_SIGNING_KEY && {
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
});

// Event types for type safety
export interface JobCreatedEvent {
  name: "lifeos/job.created";
  data: {
    job_id: string;
    user_id: string;
    item_id: string;
    content_type: "url" | "text" | "image";
  };
}

export interface JobStepCompletedEvent {
  name: "lifeos/job.step.completed";
  data: {
    job_id: string;
    step: number;
    action: string;
    result: unknown;
  };
}

export interface JobCompletedEvent {
  name: "lifeos/job.completed";
  data: {
    job_id: string;
    user_id: string;
    item_id: string;
    result: unknown;
  };
}

export interface JobFailedEvent {
  name: "lifeos/job.failed";
  data: {
    job_id: string;
    user_id: string;
    error: string;
  };
}

// Union type for all events
export type LifeOSEvent =
  | JobCreatedEvent
  | JobStepCompletedEvent
  | JobCompletedEvent
  | JobFailedEvent;
