import type { Server } from "node:http";

import type { Express } from "express";

export interface OpenStreamResult {
  server: Server;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  close: () => Promise<void>;
}

export async function openSseStream(app: Express, route = "/api/v1/events"): Promise<OpenStreamResult> {
  const server = await new Promise<Server>((resolve) => {
    const running = app.listen(0, "127.0.0.1", () => resolve(running));
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address");
  }

  const response = await fetch(`http://127.0.0.1:${address.port}${route}`);

  if (!response.body) {
    throw new Error("Expected SSE response body");
  }

  const reader = response.body.getReader();

  return {
    server,
    reader,
    close: async () => {
      await reader.cancel().catch(() => undefined);
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        const fallback = setTimeout(() => {
          resolve();
        }, 100);

        server.close((error) => {
          clearTimeout(fallback);
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

export async function readSseChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<string> {
  const decoder = new TextDecoder();
  const result = await reader.read();
  return decoder.decode(result.value ?? new Uint8Array());
}
