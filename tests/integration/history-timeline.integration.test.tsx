// @vitest-environment jsdom
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "../../frontend/src/pages/dashboard";

class FakeEventSource {
  public static instances: FakeEventSource[] = [];

  public onopen: (() => void) | null = null;

  public onerror: (() => void) | null = null;

  private readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();

  public constructor(_url: string) {
    void _url;
    FakeEventSource.instances.push(this);
  }

  public addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  public close(): void {}

  public emit(type: string, payload: unknown): void {
    const listeners = this.listeners.get(type) ?? [];
    const event = new MessageEvent<string>("message", { data: JSON.stringify(payload) });

    for (const listener of listeners) {
      listener(event);
    }
  }
}

describe("dashboard timeline", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

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
                },
                {
                  observedAt: 1_710_000_300,
                  status: "down",
                  externalTarget: "1.1.1.1",
                  externalOk: false,
                  externalLatencyMs: null,
                  failureReason: "timeout"
                }
              ],
              historySegments: [
                {
                  status: "ok",
                  startedAt: 1_710_000_000,
                  endedAt: 1_710_000_300,
                  visibleStart: 1_710_000_000,
                  visibleEnd: 1_710_000_300,
                  durationSeconds: 300,
                  sampleCount: 1,
                  lastObservedAt: 1_710_000_000,
                  latestFailureReason: null,
                  latestLatencyMs: 12,
                  startedBeforeRange: false,
                  endsAfterRange: false
                },
                {
                  status: "down",
                  startedAt: 1_710_000_300,
                  endedAt: null,
                  visibleStart: 1_710_000_300,
                  visibleEnd: 1_710_000_300,
                  durationSeconds: 0,
                  sampleCount: 1,
                  lastObservedAt: 1_710_000_300,
                  latestFailureReason: "timeout",
                  latestLatencyMs: null,
                  startedBeforeRange: false,
                  endsAfterRange: true
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
                  },
                  {
                    id: 3,
                    sortOrder: 2,
                    target: "9.9.9.9",
                    company: "Quad9",
                    logoUrl: null,
                    label: "Quad9 Secure DNS 9.9.9.9",
                    kind: "default",
                    isDefault: true,
                    isEnabled: false
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
    vi.unstubAllGlobals();
  });

  it("appends live samples without reloading the page", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("NETWORK SONAR")).toBeInTheDocument();
      expect(screen.getByText("Connectivity Timeline (last 1 hour)")).toBeInTheDocument();
      expect(screen.getByText("Segments: 2")).toBeInTheDocument();
      expect(screen.getByText("Show provider summary")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByText("Segment DOWN")).toBeInTheDocument();
    expect(screen.getByText("timeout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View raw detail" })).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /show provider summary/i }).click();
    });

    expect(screen.getByText("Providers in rotation")).toBeInTheDocument();
    expect(screen.getAllByText("Primary With Fallback").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12 ms").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Manage providers" })).toBeInTheDocument();

    const source = FakeEventSource.instances[0];
    expect(source).toBeDefined();

    if (!source) {
      throw new Error("Expected dashboard to open an EventSource connection");
    }

    act(() => {
      source.onopen?.();
      source.emit("snapshot", {
        current: {
          observedAt: 1_710_000_600,
          status: "down",
          externalTarget: "1.1.1.1",
          externalOk: false,
          externalLatencyMs: null,
          failureReason: "icmp-unreachable",
          staleAfterSeconds: 15,
          lastChangeAt: 1_710_000_300
        }
      });
      source.emit("sample", {
        observedAt: 1_710_000_600,
        status: "down",
        externalTarget: "1.1.1.1",
        externalOk: false,
        externalLatencyMs: null,
        failureReason: "icmp-unreachable"
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Segments: 2")).toBeInTheDocument();
      expect(screen.getByText("Segment DOWN")).toBeInTheDocument();
      expect(screen.getByText("Duration")).toBeInTheDocument();
      expect(screen.getAllByText("Successful Probes").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "Manage providers" })).toBeInTheDocument();
    });
  });

});
