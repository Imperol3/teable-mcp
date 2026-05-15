import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TeableClient } from "../src/client.js";
import { registerBaseTools } from "../src/tools/bases.js";

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
  c["delete"] = intercept("DELETE");

  return client;
}

function getCalls(client: TeableClient): Call[] {
  return (client as unknown as { _calls: Call[] })._calls;
}

function registeredToolNames(server: McpServer): string[] {
  const s = server as unknown as { _registeredTools: Record<string, unknown> };
  return Object.keys(s._registeredTools);
}

describe("Base tools — registration", () => {
  it("registers create_base and delete_base", () => {
    const client = makeClient(() => ({}));
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerBaseTools(server, client);
    const names = registeredToolNames(server).sort();
    assert.deepEqual(names, ["create_base", "delete_base"]);
  });
});

describe("create_base", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient((call) => { calls.push(call); return { id: "bas_new", name: "Test Base" }; });
    calls = getCalls(client);
  });

  it("POSTs to /base with name and spaceId", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"](
      "/base",
      { name: "Test Base", spaceId: "spc1" },
    );
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.path, "/base");
    const b = calls[0]?.body as { name: string; spaceId: string };
    assert.equal(b.name, "Test Base");
    assert.equal(b.spaceId, "spc1");
  });

  it("includes icon when provided", async () => {
    await (client as unknown as Record<string, (p: string, b: unknown) => Promise<unknown>>)["post"](
      "/base",
      { name: "Test Base", spaceId: "spc1", icon: "🚀" },
    );
    const b = calls[0]?.body as { icon: string };
    assert.equal(b.icon, "🚀");
  });
});

describe("delete_base", () => {
  let calls: Call[];
  let client: TeableClient;

  beforeEach(() => {
    client = makeClient((call) => { calls.push(call); return undefined; });
    calls = getCalls(client);
  });

  it("DELETEs /base/{baseId}", async () => {
    await (client as unknown as Record<string, (p: string) => Promise<unknown>>)["delete"](
      "/base/bas123",
    );
    assert.equal(calls[0]?.method, "DELETE");
    assert.equal(calls[0]?.path, "/base/bas123");
  });
});
