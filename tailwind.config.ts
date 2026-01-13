import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Backgrounds - blue-tinted dark
        bg: {
          primary: "#0a0a0f",
          secondary: "#12121a",
          card: "#161620",
          elevated: "#1a1a28",
          hover: "#1e1e2d",
        },
        // Accent - Purple/Violet
        accent: {
          primary: "#8b5cf6",
          hover: "#a78bfa",
          muted: "rgba(139, 92, 246, 0.15)",
          glow: "rgba(139, 92, 246, 0.4)",
        },
        // Nova Enriched - Amber/Orange
        nova: {
          amber: "#f59e0b",
          "amber-bg": "rgba(245, 158, 11, 0.15)",
          "amber-glow": "rgba(245, 158, 11, 0.3)",
        },
        // Activity dots
        dot: {
          active: "#8b5cf6",
          warning: "#f59e0b",
          success: "#10b981",
          muted: "#4b5563",
        },
        // Borders
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          DEFAULT: "rgba(255, 255, 255, 0.12)",
          strong: "rgba(255, 255, 255, 0.16)",
        },
        // Text
        text: {
          primary: "#ffffff",
          secondary: "rgba(255, 255, 255, 0.7)",
          muted: "rgba(255, 255, 255, 0.5)",
          disabled: "rgba(255, 255, 255, 0.3)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
        md: "0 4px 12px rgba(0, 0, 0, 0.4)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.6)",
        "glow-purple":
          "0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)",
        "glow-purple-sm":
          "0 0 12px rgba(139, 92, 246, 0.3), 0 0 24px rgba(139, 92, 246, 0.15)",
        "glow-amber":
          "0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.15)",
        "glow-blue":
          "0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        sidebar: "68px",
        widget: "320px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SF Mono", "Monaco", "Fira Code", "monospace"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["17px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        tiny: ["11px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "pulse-slow": "pulse 2s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        glow: {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)",
          },
        },
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
