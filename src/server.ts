import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TeableClient } from "./client.js";
import { registerDiscoveryTools } from "./tools/discovery.js";
import { registerRecordTools } from "./tools/records.js";
import { registerSchemaTools } from "./tools/schema.js";
import { registerTableTools } from "./tools/tables.js";
import { registerViewTools } from "./tools/views.js";
import { registerBaseTools } from "./tools/bases.js";

export function createServer(apiKey: string, baseUrl: string): McpServer {
  const client = new TeableClient({ apiKey, baseUrl });

  const server = new McpServer({
    name: "teable-mcp",
    version: "1.0.0",
  });

  registerDiscoveryTools(server, client);
  registerRecordTools(server, client);
  registerSchemaTools(server, client);
  registerBaseTools(server, client);
  registerTableTools(server, client);
  registerViewTools(server, client);

  return server;
}
