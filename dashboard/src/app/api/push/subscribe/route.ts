import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type {
  Json,
  PushSubscriptionInsert,
  PushKeys,
  DeviceInfo,
  ApiError,
} from "@/types/database";

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    if (!body.endpoint || typeof body.endpoint !== "string") {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "endpoint is required and must be a string",
        },
        { status: 400 },
      );
    }

    // Validate keys object
    if (!body.keys || typeof body.keys !== "object") {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "keys object is required",
        },
        { status: 400 },
      );
    }

    const keys: PushKeys = body.keys;
    if (!keys.p256dh || typeof keys.p256dh !== "string") {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "keys.p256dh is required and must be a string",
        },
        { status: 400 },
      );
    }

    if (!keys.auth || typeof keys.auth !== "string") {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "keys.auth is required and must be a string",
        },
        { status: 400 },
      );
    }

    // Build device info if provided
    const deviceInfo: DeviceInfo | null = body.device_info || null;

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, is_active")
      .eq("endpoint", body.endpoint)
      .single();

    if (existing) {
      // Reactivate if inactive, or just return success
      if (!existing.is_active) {
        const { data, error } = await supabase
          .from("push_subscriptions")
          .update({
            is_active: true,
            keys,
            device_info: deviceInfo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Supabase error:", error);
          return NextResponse.json<ApiError>(
            {
              error: "Failed to reactivate subscription",
              details: error.message,
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          message: "Subscription reactivated",
          subscription: data,
        });
      }

      return NextResponse.json({
        message: "Subscription already exists",
        subscription: existing,
      });
    }

    // Create new subscription
    const insertData: PushSubscriptionInsert = {
      user_id: body.user_id || "default",
      endpoint: body.endpoint,
      keys: keys as unknown as Json,
      device_info: deviceInfo as unknown as Json | null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to create subscription", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Subscription created", subscription: data },
      { status: 201 },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json<ApiError>(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    return NextResponse.json<ApiError>(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    if (!body.endpoint || typeof body.endpoint !== "string") {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "endpoint is required and must be a string",
        },
        { status: 400 },
      );
    }

    // Find and deactivate the subscription (soft delete)
    const { data: existing, error: findError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", body.endpoint)
      .single();

    if (findError || !existing) {
      return NextResponse.json<ApiError>(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to unsubscribe", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("Unexpected error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json<ApiError>(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    return NextResponse.json<ApiError>(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
