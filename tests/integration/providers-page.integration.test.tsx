// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../frontend/src/app";

class FakeEventSource {
  public static instances: FakeEventSource[] = [];

  public onopen: (() => void) | null = null;

  public onerror: (() => void) | null = null;

  public constructor(_url: string) {
    void _url;
    FakeEventSource.instances.push(this);
  }

  public addEventListener(): void {}

  public close(): void {}
}

describe("configuration page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              current: {
                observedAt: 1_710_000_000,
                status: "ok",
                externalTarget: "1.1.1.1",
                externalOk: true,
                externalLatencyMs: 12,
                failureReason: null,
                staleAfterSeconds: 15,
                lastChangeAt: 1_710_000_000
              },
              history: [
                {
                  observedAt: 1_710_000_000,
                  status: "ok",
                  externalTarget: "1.1.1.1",
                  externalOk: true,
                  externalLatencyMs: 12,
                  failureReason: null
                }
              ],
              retentionDays: 30,
              sampleIntervalSeconds: 5,
              monitorRuntime: {
                mode: "running"
              },
              monitorSettings: {
                roundRobinEnabled: false,
                confirmDownAfter: 2,
                confirmUpAfter: 2,
                providers: [
                  {
                    id: 1,
                    sortOrder: 0,
                    target: "1.1.1.1",
                    company: "Cloudflare",
                    logoUrl: null,
                    label: "Cloudflare Resolver 1.1.1.1",
                    kind: "default",
                    isDefault: true,
                    isEnabled: true
                  },
                  {
                    id: 2,
                    sortOrder: 1,
                    target: "8.8.8.8",
                    company: "Google",
                    logoUrl: null,
                    label: "Google Public DNS 8.8.8.8",
                    kind: "default",
                    isDefault: true,
                    isEnabled: true
                  },
                  {
                    id: 3,
                    sortOrder: 2,
                    target: "10.10.10.10",
                    company: null,
                    logoUrl: "https://assets.example.com/internal-dns.png",
                    label: "Internal Edge DNS",
                    kind: "custom",
                    isDefault: false,
                    isEnabled: true
                  }
                ]
              }
            }),
            { status: 200 }
          )
        );
      })
    );
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("navigates to configuration and renders the management UI", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Configuration" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: "Configuration" }));

    await waitFor(() => {
      expect(screen.getByText("Add a custom provider")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add provider" })).toBeInTheDocument();
      expect(screen.getByText("Provider list")).toBeInTheDocument();
      expect(screen.getByText("Cloudflare")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit Internal Edge DNS" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add provider" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Logo URL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close provider modal" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Internal Edge DNS" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit custom provider")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Internal Edge DNS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10.10.10.10")).toBeInTheDocument();

    expect(window.location.pathname).toBe("/config");
  });
});
