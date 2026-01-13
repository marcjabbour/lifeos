"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hero" | "split" | "memory" | "article";
  clickable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = "",
      variant = "default",
      clickable = false,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "bg-bg-card border border-border-subtle rounded-xl overflow-hidden transition-all duration-300";

    const variants = {
      default: "",
      hero: "relative",
      split: "flex flex-col md:flex-row",
      memory:
        "border-accent-primary/20 bg-gradient-to-br from-bg-card to-accent-primary/5",
      article: "",
    };

    const hoverStyles = clickable
      ? "cursor-pointer hover:border-border hover:translate-y-[-2px] hover:shadow-lg"
      : "";

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

// Card subcomponents
export interface CardThumbnailProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  overlay?: boolean;
  height?: string;
}

export function CardThumbnail({
  src,
  alt,
  overlay = false,
  height = "280px",
  className = "",
  ...props
}: CardThumbnailProps) {
  return (
    <div className={`relative ${className}`} style={{ height }} {...props}>
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {overlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 50%, var(--bg-card) 100%)",
          }}
        />
      )}
    </div>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({
  className = "",
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={`p-5 md:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardMetaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardMeta({
  className = "",
  children,
  ...props
}: CardMetaProps) {
  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-3 text-[13px] text-text-muted ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardSourceProps {
  iconUrl?: string;
  name: string;
}

export function CardSource({ iconUrl, name }: CardSourceProps) {
  return (
    <span className="flex items-center gap-2">
      {iconUrl && (
        <img
          src={iconUrl}
          alt={name}
          className="h-[18px] w-[18px] rounded-sm"
        />
      )}
      {name}
    </span>
  );
}

export function MetaDot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-text-muted" />;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
}

export function CardTitle({
  as: Tag = "h2",
  className = "",
  children,
  ...props
}: CardTitleProps) {
  const sizes = {
    h1: "text-h1",
    h2: "text-h2",
    h3: "text-h3",
  };

  return (
    <Tag
      className={`mb-4 font-semibold leading-snug text-text-primary ${sizes[Tag]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({
  className = "",
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={`mb-4 text-sm leading-relaxed text-text-secondary ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {}

export function CardActions({
  className = "",
  children,
  ...props
}: CardActionsProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardImageProps extends HTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function CardImage({
  src,
  alt,
  className = "",
  ...props
}: CardImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`h-[180px] w-full flex-shrink-0 object-cover md:h-full md:w-[200px] ${className}`}
      {...props}
    />
  );
}
