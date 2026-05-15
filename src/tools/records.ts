import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeableClient } from "../client.js";

export function registerRecordTools(server: McpServer, client: TeableClient): void {
  server.registerTool(
    "get_records",
    {
      description: "Fetch records from a table with optional filtering, sorting, searching, and pagination. Returns up to 1000 records per call. Use skip for pagination.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to fetch records from"),
        take: z.number().int().min(1).max(1000).optional().default(100).describe("Number of records to return (max 1000)"),
        skip: z.number().int().min(0).optional().default(0).describe("Number of records to skip for pagination"),
        viewId: z.string().optional().describe("Scope to a specific view's filter/sort"),
        search: z.string().optional().describe("Full-text search string"),
        filterByTql: z.string().optional().describe("Filter using Teable Query Language (TQL)"),
        orderBy: z.string().optional().describe("JSON array of sort specs, e.g. [{\"field\":\"Name\",\"order\":\"asc\"}]"),
        fieldKeyType: z.enum(["name", "id", "dbFieldName"]).optional().default("name").describe("How to key fields in the response"),
        cellFormat: z.enum(["json", "text"]).optional().default("json").describe("Format of cell values"),
        projection: z.array(z.string()).optional().describe("List of field names/IDs to include (omit for all fields)"),
      }),
    },
    async ({ tableId, take, skip, viewId, search, filterByTql, orderBy, fieldKeyType, cellFormat, projection }) => {
      const params: Record<string, string | number | boolean | undefined> = {
        take,
        skip,
        viewId,
        search,
        filterByTql,
        orderBy,
        fieldKeyType,
        cellFormat,
      };
      if (projection && projection.length > 0) {
        params["projection"] = projection.join(",");
      }
      const data = await client.get(`/table/${tableId}/record`, params);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_record",
    {
      description: "Fetch a single record by its ID.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        recordId: z.string().describe("The record ID (starts with 'rec')"),
        fieldKeyType: z.enum(["name", "id", "dbFieldName"]).optional().default("name").describe("How to key fields in the response"),
        cellFormat: z.enum(["json", "text"]).optional().default("json").describe("Format of cell values"),
      }),
    },
    async ({ tableId, recordId, fieldKeyType, cellFormat }) => {
      const data = await client.get(`/table/${tableId}/record/${recordId}`, { fieldKeyType, cellFormat });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_record_history",
    {
      description: "Get the full change history (audit trail) for a single record.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        recordId: z.string().describe("The record ID"),
      }),
    },
    async ({ tableId, recordId }) => {
      const data = await client.get(`/table/${tableId}/record/${recordId}/history`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_records",
    {
      description: "Create 1 to 2000 records in a single call. Always call get_table_schema first to know the correct field names. Use typecast:true to auto-convert values to the correct field type.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID to create records in"),
        records: z.array(
          z.object({
            fields: z.record(z.unknown()).describe("Field name → value map. Use get_table_schema to see available fields."),
          }),
        ).min(1).max(2000).describe("Array of records to create (1–2000)"),
        typecast: z.boolean().optional().default(true).describe("Auto-convert values to correct field types"),
        fieldKeyType: z.enum(["name", "id"]).optional().default("name").describe("Whether fields are keyed by name or ID"),
      }),
    },
    async ({ tableId, records, typecast, fieldKeyType }) => {
      const data = await client.post(`/table/${tableId}/record`, { records, typecast, fieldKeyType });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_record",
    {
      description: "Update fields on a single record. This is a PATCH — only the fields you provide are changed. Pass null as a value to clear a field. Always call get_table_schema first to know the correct field names.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        recordId: z.string().describe("The record ID to update"),
        fields: z.record(z.unknown()).describe("Field name → new value. Omitted fields are unchanged. Pass null to clear a field."),
        typecast: z.boolean().optional().default(true).describe("Auto-convert values to correct field types"),
        fieldKeyType: z.enum(["name", "id"]).optional().default("name").describe("Whether fields are keyed by name or ID"),
      }),
    },
    async ({ tableId, recordId, fields, typecast, fieldKeyType }) => {
      const data = await client.patch(`/table/${tableId}/record/${recordId}`, {
        record: { fields },
        typecast,
        fieldKeyType,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_records",
    {
      description: "Batch update multiple records in a single call. More efficient than calling update_record repeatedly. Always call get_table_schema first to know the correct field names.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        records: z.array(
          z.object({
            id: z.string().describe("Record ID to update"),
            fields: z.record(z.unknown()).describe("Field name → new value map"),
          }),
        ).min(1).max(2000).describe("Array of {id, fields} objects to update"),
        typecast: z.boolean().optional().default(true).describe("Auto-convert values to correct field types"),
        fieldKeyType: z.enum(["name", "id"]).optional().default("name").describe("Whether fields are keyed by name or ID"),
      }),
    },
    async ({ tableId, records, typecast, fieldKeyType }) => {
      const data = await client.patch(`/table/${tableId}/record`, { records, typecast, fieldKeyType });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_records",
    {
      description: "Delete one or more records by their IDs. Each record is deleted via its own DELETE /table/{tableId}/record/{recordId} request. Deletions run in parallel. This is permanent — deleted records cannot be recovered via the API.",
      inputSchema: z.object({
        tableId: z.string().describe("The table ID"),
        recordIds: z.array(z.string()).min(1).describe("Array of record IDs to delete"),
      }),
    },
    async ({ tableId, recordIds }) => {
      // Teable API: DELETE /table/{tableId}/record/{recordId} — one call per record, no body.
      await Promise.all(
        recordIds.map((recordId) => client.delete(`/table/${tableId}/record/${recordId}`)),
      );
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: recordIds.length, recordIds }, null, 2) }],
      };
    },
  );
}
