import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const ORIGINAL_ENV = { ...process.env };

mock.module("server-only", () => ({}));

describe("lib/auth", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("isValidApiKey returns false when LANGUINE_API_KEY is not set", async () => {
    delete process.env.LANGUINE_API_KEY;
    const { isValidApiKey } = await import("../auth");
    expect(isValidApiKey("anything")).toBe(false);
    expect(isValidApiKey(null)).toBe(false);
    expect(isValidApiKey(undefined)).toBe(false);
  });

  test("isValidApiKey is timing-safe and returns true for the right key", async () => {
    process.env.LANGUINE_API_KEY = "deadbeef-".repeat(8);
    const { isValidApiKey } = await import("../auth");
    expect(isValidApiKey(process.env.LANGUINE_API_KEY!)).toBe(true);
  });

  test("isValidApiKey returns false for wrong/empty values", async () => {
    process.env.LANGUINE_API_KEY = "real-key";
    const { isValidApiKey } = await import("../auth");
    expect(isValidApiKey("wrong-key")).toBe(false);
    expect(isValidApiKey("")).toBe(false);
    expect(isValidApiKey(null)).toBe(false);
    expect(isValidApiKey(undefined)).toBe(false);
  });

  test("readApiKeyFromHeaders reads x-api-key", async () => {
    const { readApiKeyFromHeaders } = await import("../auth");
    const headers = new Headers({ "x-api-key": "abc" });
    expect(readApiKeyFromHeaders(headers)).toBe("abc");
  });

  test("requireApiKey throws on missing/invalid key", async () => {
    process.env.LANGUINE_API_KEY = "real-key";
    const { requireApiKey, ApiKeyError } = await import("../auth");

    expect(() => requireApiKey(new Headers())).toThrow(ApiKeyError);
    expect(() =>
      requireApiKey(new Headers({ "x-api-key": "wrong" })),
    ).toThrow(ApiKeyError);
    expect(() =>
      requireApiKey(new Headers({ "x-api-key": "real-key" })),
    ).not.toThrow();
  });

  test("isOwnerRequest is permissive in development", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const { isOwnerRequest } = await import("../auth");
    expect(isOwnerRequest(new Headers())).toBe(true);
  });

  test("isOwnerRequest requires Vercel headers in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    const { isOwnerRequest } = await import("../auth");

    expect(isOwnerRequest(new Headers())).toBe(false);
    expect(
      isOwnerRequest(new Headers({ "x-vercel-id-token": "x" })),
    ).toBe(true);
    expect(
      isOwnerRequest(new Headers({ "x-vercel-protection-bypass": "x" })),
    ).toBe(true);
  });
});
