import { NextRequest, NextResponse } from "next/server";

interface VitalsPayload {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
  page: string;
  timestamp: number;
}

/**
 * POST /api/analytics/vitals
 * Receives Web Vitals metrics from the client
 */
export async function POST(request: NextRequest) {
  try {
    const payload: VitalsPayload = await request.json();

    // Validate payload
    if (!payload.name || typeof payload.value !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Log to server (in production, send to analytics service)
    if (process.env.NODE_ENV === "production") {
      console.log("[Web Vitals]", {
        metric: payload.name,
        value: payload.value,
        rating: payload.rating,
        page: payload.page,
        timestamp: new Date(payload.timestamp).toISOString(),
      });

      // TODO: Send to Langfuse, DataDog, or other analytics service
      // Example:
      // await langfuse.event({
      //   name: 'web_vital',
      //   metadata: payload,
      // });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing vitals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
