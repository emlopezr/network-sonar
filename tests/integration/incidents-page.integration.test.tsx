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

describe("incidents page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("/api/v1/incidents")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                from: 1_710_000_000,
                to: 1_710_000_600,
                incidents: [
                  {
                    startedAt: 1_710_000_300,
                    lastObservedAt: 1_710_000_305,
                    resolvedAt: 1_710_000_310,
                    durationSeconds: 10,
                    sampleCount: 2,
                    externalTarget: "1.1.1.1",
                    latestFailureReason: "timeout",
                    latestLatencyMs: null,
                    status: "resolved",
                    samples: [
                      {
                        observedAt: 1_710_000_300,
                        status: "down",
                        externalTarget: "1.1.1.1",
                        externalOk: false,
                        externalLatencyMs: null,
                        failureReason: "timeout"
                      },
                      {
                        observedAt: 1_710_000_305,
                        status: "down",
                        externalTarget: "1.1.1.1",
                        externalOk: false,
                        externalLatencyMs: null,
                        failureReason: "timeout"
                      }
                    ]
                  }
                ]
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes("/api/v1/history")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                from: 1_710_000_000,
                to: 1_710_000_600,
                samples: []
              }),
              { status: 200 }
            )
          );
        }

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

  it("navigates to incidents and shows grouped outage details", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("NETWORK SONAR")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: "Incidents" }));

    await waitFor(() => {
      expect(screen.getByText("Grouped outages")).toBeInTheDocument();
      expect(screen.getByText("Details")).toBeInTheDocument();
    });

    await screen.findByText("Incident samples");

    expect(screen.getAllByText("Timeout")).not.toHaveLength(0);
    expect(screen.getAllByText("Resolved")).not.toHaveLength(0);
    expect(screen.getAllByText("1.1.1.1")).not.toHaveLength(0);
    expect(window.location.pathname).toBe("/incidents");
  });
});
