import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { MonitorProbeResult } from "../types/monitor";

const execFileAsync = promisify(execFile);

function buildArgs(target: string, timeoutMs: number): string[] {
  if (process.platform === "win32") {
    return ["-n", "1", "-w", String(timeoutMs), target];
  }

  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  return ["-n", "-c", "1", "-W", String(timeoutSeconds), target];
}

function parseLatency(output: string): number | null {
  const match = output.match(/time[=<]([\d.]+)/i);
  const value = match?.[1];
  return value ? Number.parseFloat(value) : null;
}

function normalizeFailureReason(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "timeout";
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("not found") ? "command_unavailable" : "command_failed";
  }

  return "command_failed";
}

export async function runPingCommand(
  binary: string,
  target: string,
  timeoutMs: number
): Promise<MonitorProbeResult> {
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    const { stdout, stderr } = await execFileAsync(binary, buildArgs(target, timeoutMs), {
      encoding: "utf8",
      signal
    });
    const output = `${stdout}\n${stderr}`;

    return {
      target,
      ok: true,
      latencyMs: parseLatency(output),
      failureReason: null
    };
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string"
        ? error.stdout
        : "";
    const stderr =
      error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr
        : "";
    const output = `${stdout}\n${stderr}`;

    return {
      target,
      ok: false,
      latencyMs: parseLatency(output),
      failureReason: normalizeFailureReason(error)
    };
  }
}
