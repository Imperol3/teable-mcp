import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

export function registerTableTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "create_table",
    {
      description: "Create a new table in a base, optionally with initial fields. If no fields are provided, Teable creates a default 'Name' text field.",
      inputSchema: z.object({
        baseId: z.string().describe("The base ID to create the table in"),
        name: z.string().describe("Table name"),
        description: z.string().optional().describe("Optional table description"),
        fields: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            options: z.record(z.unknown()).optional(),
          }),
        ).optional().describe("Initial fields to create with the table"),
      }),
    },
    async ({ baseId, name, description, fields }) => {
      const body: Record<string, unknown> = { name };
      if (description) body["description"] = description;
      if (fields && fields.length > 0) body["fields"] = fields;
      const data = await client.post(`/base/${baseId}/table`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_table",
    {
      description: "Rename a table or update its description.",
      inputSchema: z.object({
        baseId: z.string().describe("The base ID that contains the table"),
        tableId: z.string().describe("The table ID to update"),
        name: z.string().optional().describe("New table name"),
        description: z.string().optional().describe("New table description"),
      }),
    },
    async ({ baseId, tableId, name, description }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body["name"] = name;
      if (description !== undefined) body["description"] = description;
      const data = await client.patch(`/base/${baseId}/table/${tableId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_table",
    {
      description: "Move a table to trash (recoverable from the Teable UI for a limited time). All records in the table will also be trashed.",
      inputSchema: z.object({
        baseId: z.string().describe("The base ID that contains the table"),
        tableId: z.string().describe("The table ID to delete"),
      }),
    },
    async ({ baseId, tableId }) => {
      await client.delete(`/base/${baseId}/table/${tableId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, tableId }, null, 2) }],
      };
    },
  );
}
