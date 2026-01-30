import { Hono } from "hono";
import webhook from "./webhook";
import link from "./link";

const app = new Hono();

app.route("/webhook", webhook);
app.route("/link", link);

export default app;
