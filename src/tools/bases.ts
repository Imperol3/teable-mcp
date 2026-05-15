import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

export function registerBaseTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "create_base",
    {
      description: "Create a new base (database) inside a space. A base contains tables. Use list_spaces first to get the spaceId.",
      inputSchema: z.object({
        spaceId: z.string().describe("The space ID to create the base in"),
        name: z.string().describe("Base name"),
        icon: z.string().optional().describe("Optional emoji icon for the base, e.g. '🚀'"),
      }),
    },
    async ({ spaceId, name, icon }) => {
      const body: Record<string, unknown> = { name, spaceId };
      if (icon) body["icon"] = icon;
      const data = await client.post(`/base`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_base",
    {
      description: "Move a base to trash (recoverable from the Teable UI). All tables and records inside will also be trashed.",
      inputSchema: z.object({
        baseId: z.string().describe("The base ID to delete"),
      }),
    },
    async ({ baseId }) => {
      await client.delete(`/base/${baseId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, baseId }, null, 2) }],
      };
    },
  );
}
