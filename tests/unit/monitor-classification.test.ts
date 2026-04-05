import { describe, expect, it } from "vitest";

import { classifyMonitorCycle } from "../../backend/src/services/monitor-cycle-service";
import { createCycle } from "../helpers/test-harness";

describe("classifyMonitorCycle", () => {
  it("classifies a healthy probe as ok", () => {
    const sample = classifyMonitorCycle(createCycle());

    expect(sample.status).toBe("ok");
    expect(sample.externalOk).toBe(true);
    expect(sample.failureReason).toBeNull();
  });

  it("classifies any external failure as down", () => {
    const sample = classifyMonitorCycle(
      createCycle({
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );

    expect(sample.status).toBe("down");
    expect(sample.failureReason).toBe("timeout");
  });
});
