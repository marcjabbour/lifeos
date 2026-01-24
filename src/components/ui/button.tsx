"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderIcon } from "@/components/icons";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-accent-primary text-white hover:bg-accent-hover hover:shadow-glow-purple active:scale-[0.98]",
      secondary:
        "bg-bg-hover text-text-secondary border border-border hover:bg-bg-elevated hover:text-text-primary hover:border-accent-primary",
      ghost:
        "bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
      danger:
        "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm min-w-[36px]",
      md: "h-11 px-5 text-sm min-w-[44px]",
      lg: "h-13 px-6 text-base min-w-[52px]",
      icon: "h-11 w-11 p-0",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <LoaderIcon size={size === "sm" ? 14 : 16} className="animate-spin" />
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
