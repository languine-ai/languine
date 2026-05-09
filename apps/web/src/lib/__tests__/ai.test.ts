import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const ORIGINAL_ENV = { ...process.env };

let lastModelSlug: string | null = null;

mock.module("@ai-sdk/gateway", () => ({
  gateway: (slug: string) => {
    lastModelSlug = slug;
    return { __mock: true, slug } as unknown;
  },
}));

describe("lib/ai", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    lastModelSlug = null;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("uses the default model when AI_MODEL is unset", async () => {
    delete process.env.AI_MODEL;
    const { getModel, DEFAULT_MODEL } = await import("../ai");
    getModel();
    expect(lastModelSlug).toBe(DEFAULT_MODEL);
  });

  test("respects AI_MODEL when set", async () => {
    process.env.AI_MODEL = "anthropic/claude-sonnet-4";
    const { getModel } = await import("../ai");
    getModel();
    expect(lastModelSlug).toBe("anthropic/claude-sonnet-4");
  });
});
