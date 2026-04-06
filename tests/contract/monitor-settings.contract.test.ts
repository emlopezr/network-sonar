import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { MonitorSettings } from "../../backend/src/types/api";
import type { TestHarness } from "../helpers/test-harness";
import { createTestHarness } from "../helpers/test-harness";

describe("monitor settings routes", () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    harness.close();
  });

  it("updates the round robin flag at runtime", async () => {
    const response = await request(harness.app)
      .patch("/api/v1/monitor/settings")
      .send({ roundRobinEnabled: true });
    const body = response.body as MonitorSettings;

    expect(response.status).toBe(200);
    expect(body.roundRobinEnabled).toBe(true);
    expect(body.confirmDownAfter).toBe(2);
    expect(body.confirmUpAfter).toBe(2);
    expect(body.providers.filter((provider) => provider.isEnabled)).toHaveLength(2);
    expect(harness.monitorSettingsService.getSettings().roundRobinEnabled).toBe(true);
  });

  it("updates confirmation thresholds at runtime", async () => {
    const response = await request(harness.app)
      .patch("/api/v1/monitor/settings")
      .send({
        confirmDownAfter: 3,
        confirmUpAfter: 4
      });
    const body = response.body as MonitorSettings;

    expect(response.status).toBe(200);
    expect(body.confirmDownAfter).toBe(3);
    expect(body.confirmUpAfter).toBe(4);
    expect(harness.monitorSettingsService.getThresholds()).toEqual({
      confirmDownAfter: 3,
      confirmUpAfter: 4
    });
  });

  it("creates, updates, reorders and deletes a custom provider", async () => {
    const createResponse = await request(harness.app)
      .post("/api/v1/monitor/providers")
      .send({
        label: "Internal Edge DNS",
        target: "10.10.10.10",
        logoUrl: "https://assets.example.com/internal-dns.png"
      });
    const createdSettings = createResponse.body as MonitorSettings;
    const customProvider = createdSettings.providers.find(
      (provider) => provider.target === "10.10.10.10"
    );

    expect(createResponse.status).toBe(201);
    expect(customProvider).toMatchObject({
      label: "Internal Edge DNS",
      target: "10.10.10.10",
      logoUrl: "https://assets.example.com/internal-dns.png",
      isDefault: false,
      isEnabled: true
    });

    if (!customProvider) {
      throw new Error("Expected custom provider to be created.");
    }

    const updateResponse = await request(harness.app)
      .patch(`/api/v1/monitor/providers/${customProvider.id}`)
      .send({
        label: "Private Resolver",
        target: "10.10.20.20",
        logoUrl: "https://assets.example.com/private-resolver.png",
        isEnabled: false
      });
    const updatedSettings = updateResponse.body as MonitorSettings;

    expect(updateResponse.status).toBe(200);
    expect(
      updatedSettings.providers.find((provider) => provider.id === customProvider.id)
    ).toMatchObject({
      label: "Private Resolver",
      target: "10.10.20.20",
      logoUrl: "https://assets.example.com/private-resolver.png",
      isEnabled: false
    });

    const reorderedIds = [
      customProvider.id,
      ...updatedSettings.providers
        .filter((provider) => provider.id !== customProvider.id)
        .map((provider) => provider.id)
    ];
    const reorderResponse = await request(harness.app)
      .patch("/api/v1/monitor/providers/order")
      .send({
        providerIds: reorderedIds
      });
    const reorderedSettings = reorderResponse.body as MonitorSettings;

    expect(reorderResponse.status).toBe(200);
    expect(reorderedSettings.providers[0]?.id).toBe(customProvider.id);

    const deleteResponse = await request(harness.app).delete(
      `/api/v1/monitor/providers/${customProvider.id}`
    );
    const deletedSettings = deleteResponse.body as MonitorSettings;

    expect(deleteResponse.status).toBe(200);
    expect(
      deletedSettings.providers.find((provider) => provider.id === customProvider.id)
    ).toBeUndefined();
  });

  it("rejects deleting a default provider", async () => {
    const defaultProvider = harness
      .monitorSettingsService
      .getSettings()
      .providers.find((provider) => provider.isDefault);

    if (!defaultProvider) {
      throw new Error("Expected a default provider in the seeded catalog.");
    }

    const response = await request(harness.app).delete(
      `/api/v1/monitor/providers/${defaultProvider.id}`
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Default providers cannot be deleted."
    });
  });

  it("rejects editing a default provider", async () => {
    const defaultProvider = harness
      .monitorSettingsService
      .getSettings()
      .providers.find((provider) => provider.isDefault);

    if (!defaultProvider) {
      throw new Error("Expected a default provider in the seeded catalog.");
    }

    const response = await request(harness.app)
      .patch(`/api/v1/monitor/providers/${defaultProvider.id}`)
      .send({
        label: "Edited default",
        target: "4.4.4.4"
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Default providers cannot be edited."
    });
  });

  it("rejects invalid payloads", async () => {
    const response = await request(harness.app)
      .patch("/api/v1/monitor/settings")
      .send({ roundRobinEnabled: "yes" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Provide roundRobinEnabled as a boolean and/or confirmDownAfter and confirmUpAfter as positive integers."
    });

    const invalidLogoResponse = await request(harness.app)
      .post("/api/v1/monitor/providers")
      .send({
        label: "Internal Edge DNS",
        target: "10.10.10.10",
        logoUrl: "not-a-url"
      });

    expect(invalidLogoResponse.status).toBe(400);
    expect(invalidLogoResponse.body).toMatchObject({
      error: "Logo URL must be a valid absolute URL."
    });
  });
});
