// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusCard } from "../../frontend/src/components/status-card";

describe("status card", () => {
  it("renders the simplified current state for an active probe", () => {
    render(
      <StatusCard
        snapshot={{
          observedAt: 1_710_000_000,
          status: "ok",
          externalTarget: "1.1.1.1",
          externalOk: true,
          externalLatencyMs: 12,
          failureReason: null,
          staleAfterSeconds: 15,
          lastChangeAt: 1_710_000_000
        }}
        monitorRuntime={{ mode: "running" }}
        streamState="live"
        lastEventAt={1_710_000_005}
        operationalRate="99.95%"
      />
    );

    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("System stability: 99.95%")).toBeInTheDocument();
    expect(screen.getByText("Monitor: RUNNING")).toBeInTheDocument();
    expect(screen.getByText("1.1.1.1")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
  });
});
