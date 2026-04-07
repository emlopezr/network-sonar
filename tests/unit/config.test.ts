import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../backend/src/config";

const originalEnv = { ...process.env };

describe("loadConfig", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to a local-only runtime on port 4044", () => {
    delete process.env.HOST;
    delete process.env.PORT;

    const config = loadConfig();

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(4044);
  });

  it("accepts explicit host and port overrides", () => {
    process.env.HOST = "0.0.0.0";
    process.env.PORT = "4173";

    const config = loadConfig();

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(4173);
  });
});
