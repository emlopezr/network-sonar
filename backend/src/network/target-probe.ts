import { runPingCommand } from "./ping-command";
import type { MonitorProbeResult } from "../types/monitor";

type ProbeRunner = (binary: string, target: string, timeoutMs: number) => Promise<MonitorProbeResult>;

function summarizeFailureReason(failedProbes: MonitorProbeResult[]): string {
  const normalizedReasons: string[] = [];

  for (const probe of failedProbes) {
    const reason = probe.failureReason ?? "probe_failed";

    if (reason.length > 0) {
      normalizedReasons.push(reason);
    }
  }

  const uniqueReasons = [...new Set(normalizedReasons)];

  if (uniqueReasons.length === 0) {
    return "probe_failed";
  }

  const [onlyReason] = uniqueReasons;
  return uniqueReasons.length === 1 ? (onlyReason ?? "probe_failed") : "all_targets_failed";
}

export function buildProbeOrder(targets: string[], cycleCursor: number): string[] {
  if (targets.length <= 1) {
    return [...targets];
  }

  const rotation = ((cycleCursor % targets.length) + targets.length) % targets.length;
  return [...targets.slice(rotation), ...targets.slice(0, rotation)];
}

export async function runProbeSequence(
  binary: string,
  targets: string[],
  timeoutMs: number,
  probeRunner: ProbeRunner = runPingCommand
): Promise<{ externalTarget: string; externalProbe: MonitorProbeResult }> {
  if (targets.length === 0) {
    throw new Error("At least one monitor target must be configured.");
  }

  const failedProbes: MonitorProbeResult[] = [];

  for (const target of targets) {
    const probe = await probeRunner(binary, target, timeoutMs);

    if (probe.ok) {
      return {
        externalTarget: target,
        externalProbe: probe
      };
    }

    failedProbes.push(probe);
  }

  const lastProbe = failedProbes[failedProbes.length - 1];

  if (!lastProbe) {
    throw new Error("Probe sequence completed without any probe results.");
  }

  return {
    externalTarget: lastProbe.target,
    externalProbe: {
      ...lastProbe,
      failureReason: summarizeFailureReason(failedProbes)
    }
  };
}
