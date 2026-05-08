import { describe, expect, test } from "bun:test";

import { calculateChunkSize } from "../chunk";

describe("calculateChunkSize", () => {
  test("returns at least 1 for empty content", () => {
    const size = calculateChunkSize([], {
      sourceLocale: "en",
      targetLocale: "sv",
    });
    expect(size).toBeGreaterThanOrEqual(1);
  });

  test("respects an upper bound", () => {
    const items = Array.from({ length: 500 }, (_, i) => ({
      key: `k${i}`,
      sourceText: "Hello world",
    }));
    const size = calculateChunkSize(items, {
      sourceLocale: "en",
      targetLocale: "sv",
    });
    expect(size).toBeLessThanOrEqual(100);
    expect(size).toBeGreaterThanOrEqual(1);
  });

  test("scales smaller for very large source texts", () => {
    const big = "lorem ipsum ".repeat(2000);
    const items = Array.from({ length: 50 }, (_, i) => ({
      key: `k${i}`,
      sourceText: big,
    }));
    const size = calculateChunkSize(items, {
      sourceLocale: "en",
      targetLocale: "sv",
    });
    expect(size).toBeLessThanOrEqual(50);
    expect(size).toBeGreaterThanOrEqual(1);
  });
});
