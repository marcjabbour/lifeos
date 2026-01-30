import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "lifeos-backend",
  });
});

app.get("/ready", async (c) => {
  return c.json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

export default app;
