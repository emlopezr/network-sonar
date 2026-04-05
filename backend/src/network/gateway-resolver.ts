import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

export function extractGatewayIp(output: string): string | null {
  const candidates = output.match(ipv4Pattern) ?? [];
  return candidates.find((candidate) => candidate !== "0.0.0.0") ?? null;
}

async function runCommand(file: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, { encoding: "utf8" });
    return `${stdout}\n${stderr}`;
  } catch (error) {
    if (error && typeof error === "object") {
      const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
      const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";

      if (stdout || stderr) {
        return `${stdout}\n${stderr}`;
      }
    }

    return null;
  }
}

export async function resolveGatewayIp(override: string | null): Promise<string | null> {
  if (override) {
    return override;
  }

  const attempts: Array<[string, string[]]> =
    process.platform === "win32"
      ? [["cmd", ["/c", "route print 0.0.0.0"]]]
      : process.platform === "darwin"
        ? [["sh", ["-lc", "route -n get default"]]]
        : [["sh", ["-lc", "ip route show default || /sbin/ip route show default || route -n"]]];

  for (const [file, args] of attempts) {
    const output = await runCommand(file, args);

    if (!output) {
      continue;
    }

    const gatewayIp = extractGatewayIp(output);

    if (gatewayIp) {
      return gatewayIp;
    }
  }

  return null;
}
