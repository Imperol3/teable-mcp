import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

export function registerDiscoveryTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "list_spaces",
    {
      description: "List all spaces the API key can access. A space is the top-level container in Teable (like a workspace). Call this first to discover available spaces.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get<{ spaces: unknown[] }>("/space");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_bases",
    {
      description: "List all bases (databases) in a space. Each base contains tables.",
      inputSchema: z.object({
        spaceId: z.string().describe("The space ID to list bases for"),
      }),
    },
    async ({ spaceId }) => {
      const data = await client.get<{ bases: unknown[] }>(`/space/${spaceId}/base`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_tables",
    {
      description: "List all tables in a base. Returns table IDs, names, and descriptions.",
      inputSchema: z.object({
        baseId: z.string().describe("The base ID to list tables for"),
      }),
    },
    async ({ baseId }) => {
      const data = await client.get<{ tables: unknown[] }>(`/base/${baseId}/table`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_table_schema",
    {
      description: "Get the full field schema for a table — field IDs, names, types, and options. ALWAYS call this before creating or updating records so you know the correct field names and types.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to get the schema for"),
      }),
    },
    async ({ tableId }) => {
      const data = await client.get<{ fields: unknown[] }>(`/table/${tableId}/field`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_views",
    {
      description: "List all views in a table. Views filter and sort records differently. Use a viewId in get_records to scope results to that view.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to list views for"),
      }),
    },
    async ({ tableId }) => {
      const data = await client.get<{ views: unknown[] }>(`/table/${tableId}/view`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
