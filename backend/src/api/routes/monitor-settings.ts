import type { Response } from "express";
import { Router } from "express";

import type {
  CreateMonitorProviderRequest,
  ReorderMonitorProvidersRequest,
  UpdateMonitorProviderRequest,
  UpdateMonitorSettingsRequest
} from "../../types/api";
import type { MonitorSettingsService } from "../../services/monitor-settings-service";
import {
  MonitorSettingsError
} from "../../services/monitor-settings-service";

function isUpdateMonitorSettingsRequest(
  value: unknown
): value is UpdateMonitorSettingsRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "roundRobinEnabled" in value &&
    typeof value.roundRobinEnabled === "boolean"
  );
}

function isCreateMonitorProviderRequest(
  value: unknown
): value is CreateMonitorProviderRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "target" in value &&
    typeof value.target === "string" &&
    (!("logoUrl" in value) || typeof value.logoUrl === "string")
  );
}

function isUpdateMonitorProviderRequest(
  value: unknown
): value is UpdateMonitorProviderRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const hasLabel = "label" in value && typeof value.label === "string";
  const hasTarget = "target" in value && typeof value.target === "string";
  const hasLogoUrl = "logoUrl" in value && typeof value.logoUrl === "string";
  const hasIsEnabled = "isEnabled" in value && typeof value.isEnabled === "boolean";
  return hasLabel || hasTarget || hasLogoUrl || hasIsEnabled;
}

function isReorderMonitorProvidersRequest(
  value: unknown
): value is ReorderMonitorProvidersRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "providerIds" in value &&
    Array.isArray(value.providerIds) &&
    value.providerIds.every((providerId) => Number.isInteger(providerId))
  );
}

function parseProviderId(rawValue: string): number | null {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sendMonitorSettingsError(error: unknown, response: Response): void {
  if (error instanceof MonitorSettingsError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  throw error;
}

export function createMonitorSettingsRouter(
  monitorSettingsService: MonitorSettingsService
): Router {
  const router = Router();

  router.get("/api/v1/monitor/settings", (_request, response) => {
    response.json(monitorSettingsService.getSettings());
  });

  router.patch("/api/v1/monitor/settings", (request, response) => {
    if (!isUpdateMonitorSettingsRequest(request.body)) {
      response.status(400).json({
        error: "roundRobinEnabled must be provided as a boolean."
      });
      return;
    }

    try {
      const { roundRobinEnabled } = request.body;
      response.json(monitorSettingsService.updateRoundRobinEnabled(roundRobinEnabled));
    } catch (error) {
      sendMonitorSettingsError(error, response);
    }
  });

  router.post("/api/v1/monitor/providers", (request, response) => {
    if (!isCreateMonitorProviderRequest(request.body)) {
      response.status(400).json({
        error: "label and target must be provided as strings."
      });
      return;
    }

    try {
      response.status(201).json(
        monitorSettingsService.createCustomProvider(request.body)
      );
    } catch (error) {
      sendMonitorSettingsError(error, response);
    }
  });

  router.patch("/api/v1/monitor/providers/order", (request, response) => {
    if (!isReorderMonitorProvidersRequest(request.body)) {
      response.status(400).json({
        error: "providerIds must be provided as an integer array."
      });
      return;
    }

    try {
      response.json(monitorSettingsService.reorderProviders(request.body));
    } catch (error) {
      sendMonitorSettingsError(error, response);
    }
  });

  router.patch("/api/v1/monitor/providers/:providerId", (request, response) => {
    const providerId = parseProviderId(request.params.providerId);

    if (!providerId) {
      response.status(400).json({
        error: "providerId must be a positive integer."
      });
      return;
    }

    if (!isUpdateMonitorProviderRequest(request.body)) {
      response.status(400).json({
        error: "Provide label, target, or logoUrl as strings and/or isEnabled as a boolean."
      });
      return;
    }

    try {
      response.json(monitorSettingsService.updateProvider(providerId, request.body));
    } catch (error) {
      sendMonitorSettingsError(error, response);
    }
  });

  router.delete("/api/v1/monitor/providers/:providerId", (request, response) => {
    const providerId = parseProviderId(request.params.providerId);

    if (!providerId) {
      response.status(400).json({
        error: "providerId must be a positive integer."
      });
      return;
    }

    try {
      response.json(monitorSettingsService.deleteProvider(providerId));
    } catch (error) {
      sendMonitorSettingsError(error, response);
    }
  });

  return router;
}
