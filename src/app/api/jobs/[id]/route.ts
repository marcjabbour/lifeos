/**
 * Job Status API Route
 *
 * GET /api/jobs/:id - Get job status and details
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, withRateLimit, type AuthContext } from "@/lib/auth";
import { JobService, isValidUUID } from "@/lib/services/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/:id
 * Get job status, optionally including the associated item
 */
async function getJobStatus(
  request: NextRequest,
  context: AuthContext,
  params: { id: string },
): Promise<NextResponse> {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const includeItem = searchParams.get("include_item") === "true";

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: "Invalid job ID format" },
      { status: 400 },
    );
  }

  try {
    const jobService = new JobService(context.supabase, context.userId);

    if (includeItem) {
      const response = await jobService.getWithItem(id);
      if (!response) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json(response);
    } else {
      const job = await jobService.get(id);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }
  } catch (err) {
    console.error("Unexpected error fetching job:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Apply middleware and export handler
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => getJobStatus(r, c, resolvedParams))(req, ctx),
  )(request);
}
