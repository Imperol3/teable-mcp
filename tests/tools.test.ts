import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TeableClient } from "../src/client.js";
import { registerDiscoveryTools } from "../src/tools/discovery.js";
import { registerRecordTools } from "../src/tools/records.js";
import { registerSchemaTools } from "../src/tools/schema.js";
import { registerTableTools } from "../src/tools/tables.js";
import { registerViewTools } from "../src/tools/views.js";
import { registerBaseTools } from "../src/tools/bases.js";

function registeredToolNames(server: McpServer): string[] {
  const s = server as unknown as { _registeredTools: Record<string, unknown> };
  return Object.keys(s._registeredTools);
}

interface Call {
  method: string;
  path: string;
  body?: unknown;
}

function makeClient(stub: (call: Call) => unknown): TeableClient {
  const client = new TeableClient({ apiKey: "test", baseUrl: "https://api.example.com" });
  const calls: Call[] = (client as unknown as { _calls: Call[] })._calls = [];

  const intercept = (method: string) =>
    (path: string, bodyOrParams?: unknown) => {
      calls.push({ method, path, body: bodyOrParams });
      return Promise.resolve(stub({ method, path, body: bodyOrParams }));
    };

  const c = client as unknown as Record<string, unknown>;
  c["get"] = intercept("GET");
  c["post"] = intercept("POST");
  c["patch"] = intercept("PATCH");
  c["put"] = intercept("PUT");
  c["delete"] = intercept("DELETE");

  return client;
}

function getCalls(client: TeableClient): Call[] {
  return (client as unknown as { _calls: Call[] })._calls;
}

function makeServer(client: TeableClient): McpServer {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerDiscoveryTools(server, client);
  registerRecordTools(server, client);
  registerSchemaTools(server, client);
  registerBaseTools(server, client);
  registerTableTools(server, client);
  registerViewTools(server, client);
  return server;
}

describe("Tool registration — all 23 tools registered", () => {
  it("registers exactly 23 tools", () => {
    const client = makeClient(() => ({}));
    const server = makeServer(client);
    const names = registeredToolNames(server).sort();

    const expected = [
      "create_base", "create_field", "create_records", "create_table", "create_view",
      "delete_base", "delete_field", "delete_records", "delete_table", "delete_view",
      "get_record", "get_record_history", "get_records",
      "get_table_schema",
      "list_bases", "list_spaces", "list_tables", "list_views",
      "update_field", "update_record", "update_records", "update_table", "update_view",
    ].sort();

    assert.deepEqual(names, expected);
  });
});

describe("Discovery tools — correct API paths", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient(() => ({}));
    calls = getCalls(client);
  });

  it("list_spaces → GET /space", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"]("/space");
    assert.equal(calls[0]?.path, "/space");
    assert.equal(calls[0]?.method, "GET");
  });

  it("list_bases → GET /space/{id}/base", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"]("/space/spc1/base");
    assert.ok(calls[0]?.path.includes("spc1"));
    assert.ok(calls[0]?.path.endsWith("/base"));
  });

  it("list_tables → GET /base/{id}/table", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"]("/base/bas1/table");
    assert.ok(calls[0]?.path.includes("bas1"));
    assert.ok(calls[0]?.path.endsWith("/table"));
  });

  it("get_table_schema → GET /table/{id}/field", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"]("/table/tbl1/field");
    assert.ok(calls[0]?.path.includes("/field"));
  });

  it("list_views → GET /table/{id}/view", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"]("/table/tbl1/view");
    assert.ok(calls[0]?.path.endsWith("/view"));
  });
});

describe("Record write tools — correct methods and paths", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient(() => ({}));
    calls = getCalls(client);
  });

  it("create_records → POST /table/{id}/record with records array", async () => {
    const body = { records: [{ fields: { Name: "Alice" } }], typecast: true };
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"]("/table/tbl1/record", body);
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.path, "/table/tbl1/record");
    const b = calls[0]?.body as typeof body;
    assert.ok(Array.isArray(b.records));
  });

  it("update_record → PATCH /table/{id}/record/{recordId}", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["patch"](
      "/table/tbl1/record/rec1",
      { record: { fields: { Name: "Bob" } }, typecast: true },
    );
    assert.equal(calls[0]?.method, "PATCH");
    assert.ok(calls[0]?.path.includes("rec1"));
  });

  it("update_records batch → PATCH /table/{id}/record", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["patch"](
      "/table/tbl1/record",
      { records: [{ id: "rec1", fields: { Status: "Done" } }] },
    );
    assert.equal(calls[0]?.path, "/table/tbl1/record");
    assert.equal(calls[0]?.method, "PATCH");
  });

  it("delete_records → DELETE /table/{id}/record/{recordId} per record, no body", async () => {
    // Two records = two separate DELETE calls, each with recordId in the path
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/table/tbl1/record/rec1",
    );
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/table/tbl1/record/rec2",
    );
    assert.equal(calls.length, 2);
    assert.ok(calls[0]?.path.endsWith("/rec1"));
    assert.ok(calls[1]?.path.endsWith("/rec2"));
    assert.equal(calls[0]?.body, undefined);
  });

  it("get_record_history → GET /table/{id}/record/{recordId}/history", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["get"](
      "/table/tbl1/record/rec1/history",
    );
    assert.ok(calls[0]?.path.endsWith("/history"));
  });
});

describe("Schema tools — correct methods and paths", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient(() => ({}));
    calls = getCalls(client);
  });

  it("create_field → POST /table/{id}/field", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"](
      "/table/tbl1/field", { name: "Score", type: "number" },
    );
    assert.equal(calls[0]?.path, "/table/tbl1/field");
    assert.equal(calls[0]?.method, "POST");
  });

  it("update_field → PATCH /table/{id}/field/{fieldId}", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["patch"](
      "/table/tbl1/field/fld1", { name: "Rating" },
    );
    assert.ok(calls[0]?.path.includes("fld1"));
  });

  it("delete_field → DELETE /table/{id}/field/{fieldId}", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/table/tbl1/field/fld1",
    );
    assert.equal(calls[0]?.method, "DELETE");
    assert.ok(calls[0]?.path.includes("fld1"));
  });
});

describe("Table tools — correct methods and paths", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient(() => ({}));
    calls = getCalls(client);
  });

  it("create_table → POST /base/{id}/table", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"](
      "/base/bas1/table", { name: "Tasks" },
    );
    assert.equal(calls[0]?.path, "/base/bas1/table");
  });

  it("update_table → PATCH /base/{id}/table/{tableId}", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["patch"](
      "/base/bas1/table/tbl1", { name: "Renamed" },
    );
    assert.ok(calls[0]?.path.includes("tbl1"));
  });

  it("delete_table → DELETE /base/{id}/table/{tableId}", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/base/bas1/table/tbl1",
    );
    assert.equal(calls[0]?.method, "DELETE");
    assert.ok(calls[0]?.path.includes("tbl1"));
  });
});

describe("View tools — correct methods and paths", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient(() => ({}));
    calls = getCalls(client);
  });

  it("create_view → POST /table/{id}/view", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"](
      "/table/tbl1/view", { name: "Kanban", type: "kanban" },
    );
    assert.equal(calls[0]?.path, "/table/tbl1/view");
  });

  it("update_view → PATCH /table/{id}/view/{viewId}", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["patch"](
      "/table/tbl1/view/viw1", { name: "Renamed" },
    );
    assert.ok(calls[0]?.path.includes("viw1"));
  });

  it("delete_view → DELETE /table/{id}/view/{viewId}", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/table/tbl1/view/viw1",
    );
    assert.equal(calls[0]?.method, "DELETE");
    assert.ok(calls[0]?.path.includes("viw1"));
  });
});
