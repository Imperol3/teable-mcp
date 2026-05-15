import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

const ViewTypeSchema = z.enum(["grid", "gallery", "kanban", "calendar", "gantt", "form"]);

export function registerViewTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "create_view",
    {
      description: "Create a new view in a table. View types: grid (default spreadsheet), gallery (card layout), kanban (by select field), calendar (by date field), gantt (timeline), form (data entry).",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to create the view in"),
        name: z.string().describe("View name"),
        type: ViewTypeSchema.describe("View type: grid, gallery, kanban, calendar, gantt, or form"),
        description: z.string().optional().describe("Optional view description"),
      }),
    },
    async ({ tableId, name, type, description }) => {
      const body: Record<string, unknown> = { name, type };
      if (description) body["description"] = description;
      const data = await client.post(`/table/${tableId}/view`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_view",
    {
      description: "Rename a view or update its description.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        viewId: z.string().describe("The view ID to update"),
        name: z.string().optional().describe("New view name"),
        description: z.string().optional().describe("New view description"),
      }),
    },
    async ({ tableId, viewId, name, description }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body["name"] = name;
      if (description !== undefined) body["description"] = description;
      const data = await client.patch(`/table/${tableId}/view/${viewId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_view",
    {
      description: "Remove a view from a table. This only deletes the view configuration — the underlying records are not affected.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        viewId: z.string().describe("The view ID to delete"),
      }),
    },
    async ({ tableId, viewId }) => {
      await client.delete(`/table/${tableId}/view/${viewId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, viewId }, null, 2) }],
      };
    },
  );
}
