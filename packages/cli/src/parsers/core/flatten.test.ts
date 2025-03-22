import { describe, expect, it } from "bun:test";
import { escapeKey, flatten, unescapeKey, unflatten } from "./flatten.js";

describe("escapeKey", () => {
  it("should escape dots in keys", () => {
    expect(escapeKey("key")).toBe("key");
    expect(escapeKey("key.with.dots")).toBe("key\\.with\\.dots");
    expect(escapeKey("allow-multiple")).toBe("allow-multiple");
  });
});

describe("unescapeKey", () => {
  it("should unescape dots in keys", () => {
    expect(unescapeKey("key")).toBe("key");
    expect(unescapeKey("key\\.with\\.dots")).toBe("key.with.dots");
    expect(unescapeKey("allow-multiple")).toBe("allow-multiple");
  });
});

describe("flatten", () => {
  it("should flatten a nested object with string values", () => {
    const input = {
      a: {
        b: "c",
        d: "e",
      },
      f: "g",
    };
    const expected = {
      "a.b": "c",
      "a.d": "e",
      f: "g",
    };
    expect(flatten(input)).toEqual(expected);
  });

  it("should flatten a nested object with mixed keys (including dots)", () => {
    const input = {
      chat: {
        poll: {
          "allow-multiple": "Allow Multiple Answers?",
          "create-poll": "Poll",
          "create-poll.title": "Create Poll",
          "create-poll.question": "Question",
        },
      },
    };
    const expected = {
      "chat.poll.allow-multiple": "Allow Multiple Answers?",
      "chat.poll.create-poll": "Poll",
      "chat.poll.create-poll\\.title": "Create Poll",
      "chat.poll.create-poll\\.question": "Question",
    };
    expect(flatten(input)).toEqual(expected);
  });

  it("should handle arrays", () => {
    const input = {
      a: ["b", "c"],
      d: [{ e: "f" }, { g: "h" }],
    };
    const expected = {
      "a[0]": "b",
      "a[1]": "c",
      "d[0].e": "f",
      "d[1].g": "h",
    };
    expect(flatten(input)).toEqual(expected);
  });
});

describe("unflatten", () => {
  it("should unflatten a flattened object", () => {
    const input = {
      "a.b": "c",
      "a.d": "e",
      f: "g",
    };
    const expected = {
      a: {
        b: "c",
        d: "e",
      },
      f: "g",
    };
    expect(unflatten(input)).toEqual(expected);
  });

  it("should unflatten a flattened object with mixed keys (including dots)", () => {
    const input = {
      "chat.poll.allow-multiple": "Allow Multiple Answers?",
      "chat.poll.create-poll": "Poll",
      "chat.poll.create-poll\\.title": "Create Poll",
      "chat.poll.create-poll\\.question": "Question",
    };
    const expected = {
      chat: {
        poll: {
          "allow-multiple": "Allow Multiple Answers?",
          "create-poll": "Poll",
          "create-poll.title": "Create Poll",
          "create-poll.question": "Question",
        },
      },
    };
    expect(unflatten(input)).toEqual(expected);
  });

  it("should handle arrays", () => {
    const input = {
      "a[0]": "b",
      "a[1]": "c",
      "d[0].e": "f",
      "d[1].g": "h",
    };
    const expected = {
      a: ["b", "c"],
      d: [{ e: "f" }, { g: "h" }],
    };
    expect(unflatten(input)).toEqual(expected);
  });

  it("should round-trip correctly with mixed keys", () => {
    const original = {
      test: {
        "*": "Allow all file types",
        "image/*, .jpg, .jpeg, .png, .gif, .svg, .webp": "Images",
        ".mp4, .mov, .avi, .mkv, .webm, .mpeg": "Videos",
        ".mp3, .wav, .ogg, .flac, .aac, .wma, .m4a, .midi, .alac": "Audio",
        ".pdf": ".pdf",
        ".docx": ".docx",
        ".csv": ".csv",
        ".pptx": ".pptx",
        ".xlsx": ".xlsx",
        ".zip": ".zip",
      },
    };

    const flattened = flatten(original);
    const roundTripped = unflatten(flattened);

    expect(roundTripped).toEqual(original);
  });
});
