import { describe, expect, test } from "bun:test";

import { normalizeBaseUrl, parseLoginArgs } from "../login.js";

describe("auth/login: parseLoginArgs", () => {
  test("returns undefined for missing flags", () => {
    expect(parseLoginArgs([])).toEqual({ url: undefined, apiKey: undefined });
  });

  test("reads --url and --api-key", () => {
    const result = parseLoginArgs([
      "--url",
      "https://x.vercel.app",
      "--api-key",
      "abc",
    ]);
    expect(result.url).toBe("https://x.vercel.app");
    expect(result.apiKey).toBe("abc");
  });

  test("ignores values that look like flags", () => {
    const result = parseLoginArgs(["--url", "--api-key"]);
    expect(result.url).toBeUndefined();
  });
});

describe("auth/login: normalizeBaseUrl", () => {
  test("adds https:// when missing", () => {
    expect(normalizeBaseUrl("x.vercel.app")).toBe("https://x.vercel.app");
  });

  test("preserves http:// when present", () => {
    expect(normalizeBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  test("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://x.vercel.app/")).toBe(
      "https://x.vercel.app",
    );
    expect(normalizeBaseUrl("https://x.vercel.app///")).toBe(
      "https://x.vercel.app",
    );
  });

  test("trims whitespace", () => {
    expect(normalizeBaseUrl("  https://x.vercel.app  ")).toBe(
      "https://x.vercel.app",
    );
  });
});
