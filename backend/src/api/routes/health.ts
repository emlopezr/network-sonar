import { Router } from "express";

import type { HealthResponse } from "../../types/api";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/health", (_request, response) => {
    const payload: HealthResponse = {
      ok: true,
      now: Math.floor(Date.now() / 1000)
    };

    response.json(payload);
  });

  return router;
}

