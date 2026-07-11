#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8000;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function resolvedPort(value) {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function requestFilePath(root, requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl || "/", "http://127.0.0.1").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return null;
  return filePath;
}

export function createStaticAppServer({ root = DEFAULT_ROOT } = {}) {
  const resolvedRoot = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
        response.end("Method not allowed");
        return;
      }

      const filePath = requestFilePath(resolvedRoot, request.url);
      if (!filePath) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": body.length,
        "Content-Type": CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (error) {
      const status = error?.code === "ENOENT" || error?.code === "EISDIR" ? 404 : 500;
      response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(status === 404 ? "Not found" : "Internal server error");
      if (status === 500) console.error(error);
    }
  });

  server.on("clientError", (_error, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  return server;
}

export async function startStaticAppServer({ host = DEFAULT_HOST, port = DEFAULT_PORT, root = DEFAULT_ROOT } = {}) {
  const server = createStaticAppServer({ root });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(resolvedPort(port), host, resolveListen);
  });
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : resolvedPort(port);
  return { server, url: `http://${host}:${actualPort}` };
}

async function main() {
  const host = optionValue("--host") || process.env.HOST || DEFAULT_HOST;
  const port = optionValue("--port") || process.env.PORT || DEFAULT_PORT;
  const root = optionValue("--root") || DEFAULT_ROOT;
  const { server, url } = await startStaticAppServer({ host, port, root });

  console.log(`Bible App Reader available at ${url}`);
  console.log(`Serving ${resolve(root)}`);
  console.log("Press Ctrl+C to stop.");

  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
