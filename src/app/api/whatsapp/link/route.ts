/**
 * WhatsApp Link API Route
 *
 * POST /api/whatsapp/link - Generate a verification code for linking WhatsApp
 * GET /api/whatsapp/link - Get current link status
 * DELETE /api/whatsapp/link - Unlink WhatsApp account
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/auth";
import { getServiceClient } from "@/lib/core/database";

/**
 * Generate a random 6-digit verification code
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/whatsapp/link
 * Generate a new verification code for WhatsApp linking
 */
async function handleGenerateCode(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    // Use service client to bypass RLS (we've already authenticated the user)
    const supabase = getServiceClient();

    // Generate a new 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing unused codes for this user
    await supabase
      .from("whatsapp_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("used_at", null);

    // Create new code
    const { data, error } = await supabase
      .from("whatsapp_link_codes")
      .insert({
        user_id: context.userId,
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating link code:", error);
      return NextResponse.json(
        { error: "Failed to generate code" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      code: data.code,
      expires_at: data.expires_at,
      instructions:
        "Send this code to the LifeOS WhatsApp bot to link your account.",
    });
  } catch (err) {
    console.error("Unexpected error generating code:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/whatsapp/link
 * Get current WhatsApp link status
 */
async function handleGetStatus(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    // Use service client to bypass RLS (we've already authenticated the user)
    const supabase = getServiceClient();

    // Check if user has a linked WhatsApp account
    const { data: whatsappUser, error } = await supabase
      .from("whatsapp_users")
      .select("phone_number, display_name, verified_at, last_message_at")
      .eq("user_id", context.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error checking WhatsApp status:", error);
      return NextResponse.json(
        { error: "Failed to check status" },
        { status: 500 },
      );
    }

    if (!whatsappUser) {
      // Check for pending codes
      const { data: pendingCode } = await supabase
        .from("whatsapp_link_codes")
        .select("code, expires_at")
        .eq("user_id", context.userId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json({
        linked: false,
        pending_code: pendingCode
          ? {
              code: pendingCode.code,
              expires_at: pendingCode.expires_at,
            }
          : null,
      });
    }

    // Mask phone number for privacy (show last 4 digits)
    const maskedPhone = whatsappUser.phone_number.replace(
      /^(.*)(.{4})$/,
      (_match: string, start: string) =>
        "*".repeat(start.length) + whatsappUser.phone_number.slice(-4),
    );

    return NextResponse.json({
      linked: true,
      phone_number: maskedPhone,
      display_name: whatsappUser.display_name,
      verified_at: whatsappUser.verified_at,
      last_message_at: whatsappUser.last_message_at,
    });
  } catch (err) {
    console.error("Unexpected error getting status:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/whatsapp/link
 * Unlink WhatsApp account
 */
async function handleUnlink(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    // Use service client to bypass RLS (we've already authenticated the user)
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("whatsapp_users")
      .delete()
      .eq("user_id", context.userId);

    if (error) {
      console.error("Error unlinking WhatsApp:", error);
      return NextResponse.json(
        { error: "Failed to unlink account" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp account unlinked successfully",
    });
  } catch (err) {
    console.error("Unexpected error unlinking:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export handlers with auth middleware
export const POST = withAuth(handleGenerateCode);
export const GET = withAuth(handleGetStatus);
export const DELETE = withAuth(handleUnlink);
