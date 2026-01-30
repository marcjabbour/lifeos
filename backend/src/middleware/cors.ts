import { cors } from "hono/cors";

const allowedOrigins = process.env.CORS_ORIGINS?.split(",") ?? [
  "http://localhost:3000",
  "http://localhost:5173",
];

export const corsMiddleware = cors({
  origin: allowedOrigins,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
});
