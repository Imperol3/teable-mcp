import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { TeableClient, TeableError } from "../src/client.js";

function makeFetch(status: number, body: unknown): typeof fetch {
  return async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;
}

describe("TeableClient", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mock.restoreAll();
  });

  it("sends Authorization header with Bearer token", async () => {
    let capturedHeaders: HeadersInit | undefined;
    global.fetch = async (_, init) => {
      capturedHeaders = init?.headers;
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
    await client.get("/space");

    const headers = capturedHeaders as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer test-key");
  });

  it("appends query params correctly", async () => {
    let capturedUrl = "";
    global.fetch = async (url) => {
      capturedUrl = String(url);
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await client.get("/table/tbl123/record", { take: 50, skip: 100, viewId: "viwABC" });

    assert.ok(capturedUrl.includes("take=50"), `URL missing take: ${capturedUrl}`);
    assert.ok(capturedUrl.includes("skip=100"), `URL missing skip: ${capturedUrl}`);
    assert.ok(capturedUrl.includes("viewId=viwABC"), `URL missing viewId: ${capturedUrl}`);
  });

  it("throws TeableError on 4xx", async () => {
    global.fetch = makeFetch(403, { message: "Forbidden", code: "PERMISSION_DENIED" });

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await assert.rejects(
      () => client.get("/space"),
      (err: TeableError) => {
        assert.ok(err instanceof TeableError);
        assert.equal(err.status, 403);
        assert.ok(err.message.includes("403"));
        return true;
      },
    );
  });

  it("throws TeableError on 5xx", async () => {
    global.fetch = makeFetch(500, { message: "Internal Server Error" });

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await assert.rejects(
      () => client.post("/table/t/record", {}),
      (err: TeableError) => {
        assert.equal(err.status, 500);
        return true;
      },
    );
  });

  it("returns undefined for 204 No Content", async () => {
    global.fetch = async () => ({ ok: true, status: 204 } as Response);

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    const result = await client.delete("/table/t/record", { recordIds: ["rec1"] });
    assert.equal(result, undefined);
  });

  it("returns undefined for 200 with empty body (Bug B fix)", async () => {
    global.fetch = async () =>
      ({ ok: true, status: 200, text: async () => "" }) as unknown as Response;

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    const result = await client.delete("/table/t/record", { recordIds: ["rec1"] });
    assert.equal(result, undefined);
  });

  it("returns undefined for 200 with whitespace-only body (Bug B fix)", async () => {
    global.fetch = async () =>
      ({ ok: true, status: 200, text: async () => "   " }) as unknown as Response;

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    const result = await client.patch("/table/t/field/fld1", { name: "New" });
    assert.equal(result, undefined);
  });

  it("delete sends recordId in path, no body", async () => {
    let capturedUrl = "";
    let capturedBody: string | null = null;
    global.fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = (init?.body as string) ?? null;
      return { ok: true, status: 200, text: async () => "" } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await client.delete("/table/tbl1/record/rec1");

    assert.ok(capturedUrl.endsWith("/rec1"), `recordId must be in path: ${capturedUrl}`);
    assert.equal(capturedBody, null);
  });

  it("strips trailing slash from baseUrl", async () => {
    let capturedUrl = "";
    global.fetch = async (url) => {
      capturedUrl = String(url);
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com/" });
    await client.get("/space");

    assert.ok(!capturedUrl.includes("//space"), `Double slash in URL: ${capturedUrl}`);
  });

  it("sends JSON body on POST", async () => {
    let capturedBody = "";
    global.fetch = async (_, init) => {
      capturedBody = init?.body as string;
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await client.post("/table/t/record", { records: [{ fields: { Name: "Test" } }] });

    const parsed = JSON.parse(capturedBody);
    assert.deepEqual(parsed.records[0].fields, { Name: "Test" });
  });

  it("sends PATCH with correct method", async () => {
    let capturedMethod = "";
    global.fetch = async (_, init) => {
      capturedMethod = init?.method ?? "";
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await client.patch("/table/t/record/rec1", { record: { fields: {} } });

    assert.equal(capturedMethod, "PATCH");
  });

  it("omits undefined query params", async () => {
    let capturedUrl = "";
    global.fetch = async (url) => {
      capturedUrl = String(url);
      return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response;
    };

    const client = new TeableClient({ apiKey: "k", baseUrl: "https://api.example.com" });
    await client.get("/table/t/record", { take: 10, viewId: undefined });

    assert.ok(!capturedUrl.includes("viewId"), `Undefined param leaked into URL: ${capturedUrl}`);
    assert.ok(capturedUrl.includes("take=10"));
  });
});
