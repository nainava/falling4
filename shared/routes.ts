import { z } from "zod";
import { insertScoreSchema, scores } from "./schema";

export const api = {
  scores: {
    list: {
      method: "GET" as const,
      path: "/api/scores",
      responses: {
        200: z.array(z.custom<typeof scores.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/scores",
      input: insertScoreSchema,
      responses: {
        201: z.custom<typeof scores.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
};
