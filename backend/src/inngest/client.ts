import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "lifeos",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type InngestClient = typeof inngest;
