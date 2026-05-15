import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

const FieldTypeSchema = z.enum([
  "singleLineText",
  "longText",
  "number",
  "singleSelect",
  "multipleSelect",
  "date",
  "checkbox",
  "user",
  "attachment",
  "link",
  "url",
  "email",
  "phone",
  "rating",
  "formula",
  "rollup",
  "count",
  "autoNumber",
  "createdTime",
  "lastModifiedTime",
  "createdBy",
  "lastModifiedBy",
]);

export function registerSchemaTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "create_field",
    {
      description: "Add a new field (column) to a table. Supported types: singleLineText, longText, number, singleSelect, multipleSelect, date, checkbox, url, email, phone, rating, formula, rollup, count, user, attachment, link.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to add the field to"),
        name: z.string().describe("Field name (displayed in the table header)"),
        type: FieldTypeSchema.describe("Field type"),
        description: z.string().optional().describe("Optional field description"),
        options: z.record(z.unknown()).optional().describe("Type-specific options. For singleSelect/multipleSelect: {choices:[{name,color}]}. For number: {precision:2}. For date: {date:'YYYY-MM-DD',time:'HH:mm'}. For formula: {expression:'...'}"),
      }),
    },
    async ({ tableId, name, type, description, options }) => {
      const body: Record<string, unknown> = { name, type };
      if (description) body["description"] = description;
      if (options) body["options"] = options;
      const data = await client.post(`/table/${tableId}/field`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_field",
    {
      description: "Rename a field or update its options (e.g. add choices to a select field). You cannot change a field's type after creation.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        fieldId: z.string().describe("The field ID to update"),
        name: z.string().optional().describe("New field name"),
        description: z.string().optional().describe("New field description"),
        options: z.record(z.unknown()).optional().describe("Updated type-specific options"),
      }),
    },
    async ({ tableId, fieldId, name, description, options }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body["name"] = name;
      if (description !== undefined) body["description"] = description;
      if (options !== undefined) body["options"] = options;
      const data = await client.patch(`/table/${tableId}/field/${fieldId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_field",
    {
      description: "Permanently remove a field (column) from a table. This deletes all cell data in that field. This action cannot be undone.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        fieldId: z.string().describe("The field ID to delete"),
      }),
    },
    async ({ tableId, fieldId }) => {
      await client.delete(`/table/${tableId}/field/${fieldId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, fieldId }, null, 2) }],
      };
    },
  );
}
