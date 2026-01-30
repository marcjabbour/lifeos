"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { AlertTriangleIcon, XIcon } from "@/components/icons";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel],
  );

  const variantStyles = {
    danger: {
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      buttonVariant: "primary" as const,
      buttonClass: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      buttonVariant: "primary" as const,
      buttonClass: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    default: {
      iconBg: "bg-bg-elevated",
      iconColor: "text-text-muted",
      buttonVariant: "primary" as const,
      buttonClass: "",
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border-subtle bg-bg-card shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute right-3 top-3 rounded-full p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label="Close dialog"
            >
              <XIcon size={18} />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              {variant !== "default" && (
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${styles.iconBg}`}
                >
                  <AlertTriangleIcon size={24} className={styles.iconColor} />
                </div>
              )}

              {/* Title */}
              <h2
                id="confirm-dialog-title"
                className="mb-2 text-lg font-semibold text-text-primary"
              >
                {title}
              </h2>

              {/* Message */}
              <p className="mb-6 text-sm text-text-secondary">{message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={onCancel}
                  className="flex-1"
                >
                  {cancelLabel}
                </Button>
                <Button
                  variant={styles.buttonVariant}
                  onClick={onConfirm}
                  className={`flex-1 ${styles.buttonClass}`}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
