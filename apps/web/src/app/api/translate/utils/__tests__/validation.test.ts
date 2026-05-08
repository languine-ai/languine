import { describe, expect, test } from "bun:test";

import {
  FORMAT_ENUM,
  getValidationErrorMessage,
  translateRequestSchema,
} from "../validation";
import { z } from "zod";

describe("translate validation", () => {
  test("accepts a minimal valid payload (default format)", () => {
    const parsed = translateRequestSchema.parse({
      projectId: "prj_1",
      sourceLocale: "en",
      targetLocale: "sv",
      sourceText: "Hello",
    });

    expect(parsed.format).toBe("string");
    expect(parsed.projectId).toBe("prj_1");
  });

  test("rejects unknown formats", () => {
    expect(() =>
      translateRequestSchema.parse({
        projectId: "prj_1",
        sourceLocale: "en",
        targetLocale: "sv",
        sourceText: "Hello",
        format: "made-up",
      }),
    ).toThrow();
  });

  test("FORMAT_ENUM covers all common formats", () => {
    for (const f of ["json", "yaml", "md", "xliff", "po", "csv"]) {
      expect(FORMAT_ENUM).toContain(f);
    }
  });

  test("getValidationErrorMessage produces a non-empty string", () => {
    const result = translateRequestSchema.safeParse({});
    if (result.success) throw new Error("expected failure");
    expect(typeof getValidationErrorMessage(result.error as z.ZodError)).toBe(
      "string",
    );
    expect(getValidationErrorMessage(result.error as z.ZodError).length).toBeGreaterThan(
      0,
    );
  });
});
