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
              retentionDays: 30,
              sampleIntervalSeconds: 5
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
      expect(screen.getByText("2 muestras")).toBeInTheDocument();
    });

    const source = FakeEventSource.instances[0];
    expect(source).toBeDefined();

    if (!source) {
      throw new Error("Expected dashboard to open an EventSource connection");
    }

    act(() => {
      source.onopen?.();
      source.emit("sample", {
        observedAt: 1_710_000_600,
        status: "down",
        externalTarget: "1.1.1.1",
        externalOk: false,
        externalLatencyMs: null,
        failureReason: "timeout"
      });
    });

    await waitFor(() => {
      expect(screen.getByText("3 muestras")).toBeInTheDocument();
    });
  });
});
