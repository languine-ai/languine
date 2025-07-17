import { beforeEach, describe, expect, test } from "bun:test";
import { createParser } from "@/parsers/index.ts";
import type { Parser } from "../core/types.ts";

describe("PO Parser", () => {
  let parser: Parser;

  beforeEach(() => {
    parser = createParser({ type: "po" });
  });

  describe("parse", () => {
    test("parses simple key-value pairs", async () => {
      const input = `
msgid "hello"
msgstr "world"

msgid "test"
msgstr "value"
`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        hello: "world",
        test: "value",
      });
    });

    test("ignores comments and empty lines", async () => {
      const input = `
# This is a comment
msgid "key"
msgstr "value"

# Another comment

msgid "another"
msgstr "translation"
`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        key: "value",
        another: "translation",
      });
    });

    test("handles empty translations", async () => {
      const input = `
msgid "empty"
msgstr ""
`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        empty: "",
      });
    });

    test("handles quotes in translations", async () => {
      const input = `
msgid "with_quotes"
msgstr "text with "quotes" inside"

msgid "with_escaped_quotes"
msgstr "text with escaped \\"quotes\\" inside"
`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        with_quotes: 'text with "quotes" inside',
        with_escaped_quotes: 'text with escaped "quotes" inside',
      });
    });

    test("handles empty input", async () => {
      const input = "";
      const result = await parser.parse(input);
      expect(result).toEqual({});
    });

    test("handles headers in input", async () => {
      const input = `
"POT-Creation-Date: 2025-07-11 19:57+0900\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=utf-8\n"
"Content-Transfer-Encoding: 8bit\n"
"X-Generator: @lingui/cli\n"
"Language: ko\n"
"Project-Id-Version: \n"
"Report-Msgid-Bugs-To: \n"
"PO-Revision-Date: \n"
"Last-Translator: \n"
"Language-Team: \n"
"Plural-Forms: \n"

# This is a comment
#: another comment
msgid "key"
msgstr "value"
`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        key: "value",
      });

      const serialized = await parser.serialize("ko", result);
      expect(serialized).toBe(
        'msgid ""\nmsgstr ""\n"POT-Creation-Date: 2025-07-11 19:57+0900\\n"\n": \\n"\n"MIME-Version: 1.0\\n"\n": \\n"\n"Content-Type: text/plain; charset=utf-8\\n"\n": \\n"\n"Content-Transfer-Encoding: 8bit\\n"\n": \\n"\n"X-Generator: @lingui/cli\\n"\n": \\n"\n"Language: ko\\n"\n": \\n"\n"Project-Id-Version: \\n"\n": \\n"\n"Report-Msgid-Bugs-To: \\n"\n": \\n"\n"PO-Revision-Date: \\n"\n": \\n"\n"Last-Translator: \\n"\n": \\n"\n"Language-Team: \\n"\n": \\n"\n"Plural-Forms: \\n"\n": \\n"\n\n# This is a comment\n#: another comment\nmsgid "key"\nmsgstr "value"\n',
      );
    });
  });

  describe("serialize", () => {
    test("serializes simple key-value pairs", async () => {
      const input = {
        hello: "world",
        test: "value",
      };
      const result = await parser.serialize("en", input);
      expect(result).toBe(
        'msgid ""\nmsgstr ""\n\nmsgid "hello"\nmsgstr "world"\n\nmsgid "test"\nmsgstr "value"\n',
      );
    });

    test("serializes empty translations", async () => {
      const input = {
        empty: "",
      };
      const result = await parser.serialize("en", input);
      expect(result).toBe('msgid ""\nmsgstr ""\n\nmsgid "empty"\nmsgstr ""\n');
    });

    test("serializes translations with quotes", async () => {
      const input = {
        with_quotes: 'text with "quotes" inside',
      };
      const result = await parser.serialize("en", input);
      expect(result).toBe(
        'msgid ""\nmsgstr ""\n\nmsgid "with_quotes"\nmsgstr "text with \\"quotes\\" inside"\n',
      );
    });

    test("handles empty object", async () => {
      const input = {};
      const result = await parser.serialize("en", input);
      expect(result).toBe('msgid ""\nmsgstr ""\n');
    });

    test("adds newline at end of file", async () => {
      const input = { key: "value" };
      const result = await parser.serialize("en", input);
      expect(result.endsWith("\n")).toBe(true);
    });

    test("removes deleted keys when serializing", async () => {
      const translations = {
        hello: "world",
        keep: "value",
      };
      const result = await parser.serialize("en", translations);
      expect(result).toBe(
        'msgid ""\nmsgstr ""\n\nmsgid "hello"\nmsgstr "world"\n\nmsgid "keep"\nmsgstr "value"\n',
      );
    });

    test("handles object with no translations", async () => {
      const translations = {};
      const result = await parser.serialize("en", translations);
      expect(result).toBe('msgid ""\nmsgstr ""\n');
    });
  });
});
