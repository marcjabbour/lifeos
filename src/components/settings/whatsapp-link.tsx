"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/core/database";

interface LinkStatus {
  linked: boolean;
  phone_number?: string;
  display_name?: string;
  verified_at?: string;
  last_message_at?: string;
  pending_code?: {
    code: string;
    expires_at: string;
  } | null;
}

// Helper to get auth headers for API calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }
  return {};
}

export function WhatsAppLink() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch current link status
  const fetchStatus = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/whatsapp/link", {
        credentials: "include",
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "WhatsApp status fetch failed:",
          response.status,
          errorData,
        );
        setError(errorData.error || "Failed to fetch WhatsApp status");
      }
    } catch (err) {
      console.error("WhatsApp status fetch error:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Generate a new linking code
  const generateCode = async () => {
    setGenerating(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/whatsapp/link", {
        method: "POST",
        credentials: "include",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Generated code:", data);
        setStatus({
          linked: false,
          pending_code: {
            code: data.code,
            expires_at: data.expires_at,
          },
        });
      } else {
        const data = await response.json().catch(() => ({}));
        console.error("Generate code failed:", response.status, data);
        setError(data.error || "Failed to generate code");
      }
    } catch (err) {
      console.error("Generate code error:", err);
      setError("Failed to connect to server");
    } finally {
      setGenerating(false);
    }
  };

  // Unlink WhatsApp account
  const unlinkAccount = async () => {
    if (!confirm("Are you sure you want to unlink your WhatsApp account?")) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/whatsapp/link", {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      if (response.ok) {
        setStatus({ linked: false, pending_code: null });
      } else {
        setError("Failed to unlink account");
      }
    } catch {
      setError("Failed to connect to server");
    }
  };

  // Copy code to clipboard
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate time remaining for code
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-elevated p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-bg-primary" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-bg-primary" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-bg-elevated p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
          <svg
            className="h-5 w-5 text-green-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">WhatsApp</h3>
          <p className="text-sm text-text-secondary">
            {status?.linked
              ? "Connected"
              : "Save items by sending them to WhatsApp"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {status?.linked ? (
        /* Linked State */
        <div className="space-y-4">
          <div className="rounded-lg bg-bg-primary p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Phone Number</p>
                <p className="font-mono text-text-primary">
                  {status.phone_number}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <svg
                  className="h-4 w-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            {status.display_name && (
              <div className="mt-2">
                <p className="text-sm text-text-muted">Display Name</p>
                <p className="text-text-primary">{status.display_name}</p>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={unlinkAccount}
            className="w-full"
          >
            Unlink Account
          </Button>
        </div>
      ) : status?.pending_code ? (
        /* Pending Code State */
        <div className="space-y-4">
          <div className="rounded-lg bg-bg-primary p-4 text-center">
            <p className="mb-2 text-sm text-text-muted">Your linking code</p>
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="font-mono text-3xl font-bold tracking-widest text-accent-primary">
                {status.pending_code.code}
              </span>
              <button
                onClick={() => copyCode(status.pending_code!.code)}
                className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                title="Copy code"
              >
                {copied ? (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Expires in {getTimeRemaining(status.pending_code.expires_at)}
            </p>
          </div>

          <div className="rounded-lg border border-border-primary bg-bg-primary p-4">
            <p className="mb-2 text-sm font-medium text-text-primary">
              How to link:
            </p>
            <ol className="space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2">
                <span className="font-medium text-accent-primary">1.</span>
                Open WhatsApp on your phone
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent-primary">2.</span>
                Send the code above to the LifeOS bot
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent-primary">3.</span>
                You'll receive a confirmation message
              </li>
            </ol>
          </div>

          <Button
            variant="secondary"
            onClick={generateCode}
            disabled={generating}
            className="w-full"
          >
            {generating ? "Generating..." : "Generate New Code"}
          </Button>
        </div>
      ) : (
        /* Not Linked State */
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Link your WhatsApp to save articles, images, and notes by simply
            sending them to the LifeOS bot.
          </p>
          <Button
            variant="primary"
            onClick={generateCode}
            disabled={generating}
            className="w-full"
          >
            {generating ? "Generating..." : "Generate Linking Code"}
          </Button>
        </div>
      )}
    </div>
  );
}
