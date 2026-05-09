import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

const dir = mkdtempSync(join(tmpdir(), "languine-session-"));
const sessionFile = join(dir, "session.json");

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.LANGUINE_SESSION_FILE = sessionFile;
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  process.env = { ...ORIGINAL_ENV };
});

beforeEach(() => {
  delete process.env.LANGUINE_BASE_URL;
  delete process.env.LANGUINE_API_KEY;
});

afterEach(() => {
  if (existsSync(sessionFile)) rmSync(sessionFile);
});

describe("session", () => {
  test("save/load round-trip", async () => {
    const { saveSession, loadSession } = await import("../session.js");
    saveSession({ baseUrl: "https://x.vercel.app", apiKey: "abc" });
    const loaded = loadSession();
    expect(loaded?.baseUrl).toBe("https://x.vercel.app");
    expect(loaded?.apiKey).toBe("abc");
  });

  test("clearSession removes the file", async () => {
    const { saveSession, clearSession, loadSession } = await import(
      "../session.js"
    );
    saveSession({ baseUrl: "https://x.vercel.app", apiKey: "abc" });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  test("env vars take precedence over saved session", async () => {
    const { saveSession, getAPIKey, getBaseUrl } = await import(
      "../session.js"
    );
    saveSession({ baseUrl: "https://saved.vercel.app", apiKey: "saved" });
    process.env.LANGUINE_API_KEY = "env-key";
    process.env.LANGUINE_BASE_URL = "https://env.vercel.app";

    expect(getAPIKey()).toBe("env-key");
    expect(getBaseUrl()).toBe("https://env.vercel.app");
  });

  test("requireBaseUrl throws when nothing is configured", async () => {
    const { clearSession, requireBaseUrl } = await import("../session.js");
    clearSession();
    expect(() => requireBaseUrl()).toThrow();
  });

  test("requireBaseUrl strips trailing slashes", async () => {
    const { saveSession, requireBaseUrl } = await import("../session.js");
    saveSession({ baseUrl: "https://x.vercel.app/", apiKey: "k" });
    expect(requireBaseUrl()).toBe("https://x.vercel.app");
  });
});
