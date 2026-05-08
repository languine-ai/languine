import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const ORIGINAL_ENV = { ...process.env };

mock.module("server-only", () => ({}));

mock.module("@vercel/functions", () => ({
  waitUntil: (p: Promise<unknown>) => {
    void p.catch(() => {});
  },
}));

mock.module("@/db/queries/translate", () => ({
  createTranslations: async () => [],
}));

mock.module("@/workflows/utils/translate", () => ({
  translateKeys: async (
    content: Array<{ key: string; sourceText: string }>,
  ) => content.map((c) => `[sv] ${c.sourceText}`),
}));

mock.module("@/db", () => ({
  db: {
    query: {
      projects: {
        findFirst: async (_opts: unknown) => {
          void _opts;
          return { id: "prj_1" };
        },
      },
    },
  },
}));

describe("POST /api/translate", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.LANGUINE_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("rejects unauthenticated requests", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  test("rejects invalid payloads", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        headers: { "x-api-key": "test-key", "content-type": "application/json" },
        body: JSON.stringify({ projectId: "prj_1" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("returns translated text for a valid request", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        headers: { "x-api-key": "test-key", "content-type": "application/json" },
        body: JSON.stringify({
          projectId: "prj_1",
          sourceLocale: "en",
          targetLocale: "sv",
          sourceText: "Hello",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; translatedText: string };
    expect(json.success).toBe(true);
    expect(json.translatedText).toBe("[sv] Hello");
  });

  test("returns 404 for unknown project", async () => {
    mock.module("@/db", () => ({
      db: {
        query: {
          projects: {
            findFirst: async () => undefined,
          },
        },
      },
    }));

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        headers: { "x-api-key": "test-key", "content-type": "application/json" },
        body: JSON.stringify({
          projectId: "prj_unknown",
          sourceLocale: "en",
          targetLocale: "sv",
          sourceText: "Hello",
        }),
      }),
    );
    expect(res.status).toBe(404);
  });
});
