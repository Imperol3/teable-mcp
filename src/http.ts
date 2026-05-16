#!/usr/bin/env node
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./server.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env["PORT"] ?? 3000);
const API_KEY = process.env["TEABLE_API_KEY"];
const BASE_URL = process.env["TEABLE_BASE_URL"] ?? "https://app.teable.io/api";

if (!API_KEY) {
  console.error("Error: TEABLE_API_KEY environment variable is required.");
  process.exit(1);
}

// Track active SSE transports by session ID
const transports = new Map<string, SSEServerTransport>();

// Health check — Coolify uses this to confirm the container is up
app.get("/health", (_req, res) => {
  res.json({ status: "ok", tools: 23 });
});

// SSE endpoint — Claude connects here
app.get("/sse", async (req, res) => {
  const server = createServer(API_KEY!, BASE_URL);
  const transport = new SSEServerTransport("/messages", res);

  transports.set(transport.sessionId, transport);

  transport.onclose = () => {
    transports.delete(transport.sessionId);
  };

  await server.connect(transport);
});

// Message endpoint — Claude posts tool calls here
app.post("/messages", async (req, res) => {
  const sessionId = req.query["sessionId"] as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`teable-mcp HTTP server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Teable base URL: ${BASE_URL}`);
});
