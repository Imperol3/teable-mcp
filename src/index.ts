#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const apiKey = process.env["TEABLE_API_KEY"];
if (!apiKey) {
  console.error("Error: TEABLE_API_KEY environment variable is required.");
  console.error("Get your token from: Teable → Settings → Personal Access Token");
  process.exit(1);
}

const baseUrl = process.env["TEABLE_BASE_URL"] ?? "https://app.teable.io/api";

const server = createServer(apiKey, baseUrl);

const transport = new StdioServerTransport();
await server.connect(transport);
