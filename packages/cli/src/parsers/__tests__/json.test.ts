import { beforeEach, describe, expect, test } from "bun:test";
import { createParser } from "@/parsers/index.ts";
import type { Parser } from "../core/types.ts";

describe("JSON Parser", () => {
  let parser: Parser;

  beforeEach(() => {
    parser = createParser({ type: "json" });
  });

  describe("parse", () => {
    test("parses simple key-value pairs", async () => {
      const input = `{
        "hello": "world",
        "test": "value"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        hello: "world",
        test: "value",
      });
    });

    test("parses nested objects", async () => {
      const input = `{
        "nested": {
          "key": "value",
          "another": {
            "deep": "test"
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "nested.key": "value",
        "nested.another.deep": "test",
      });
    });

    test("parses arrays and preserves array structure", async () => {
      const input = `{
        "testimonials": {
          "title": "Hear from Our Thriving Community",
          "items": [
            {
              "title": "Best decision",
              "description": "Our goal was to streamline SMB trade, making it easier and faster than ever and we did it together.",
              "author": {
                "name": "Hayden Bleasel",
                "image": "https://github.com/haydenbleasel.png"
              }
            },
            {
              "title": "Game changer",
              "description": "This platform revolutionized how we handle our day-to-day operations. The efficiency gains have been remarkable.",
              "author": {
                "name": "Lee Robinson",
                "image": "https://github.com/leerob.png"
              }
            }
          ]
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "testimonials.title": "Hear from Our Thriving Community",
        "testimonials.items[0].title": "Best decision",
        "testimonials.items[0].description":
          "Our goal was to streamline SMB trade, making it easier and faster than ever and we did it together.",
        "testimonials.items[0].author.name": "Hayden Bleasel",
        "testimonials.items[0].author.image":
          "https://github.com/haydenbleasel.png",
        "testimonials.items[1].title": "Game changer",
        "testimonials.items[1].description":
          "This platform revolutionized how we handle our day-to-day operations. The efficiency gains have been remarkable.",
        "testimonials.items[1].author.name": "Lee Robinson",
        "testimonials.items[1].author.image": "https://github.com/leerob.png",
      });
    });

    test("repairs malformed JSON", async () => {
      const input = `{
        hello: "world",
        'test': 'value'
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        hello: "world",
        test: "value",
      });
    });

    test("extracts translations from complex objects", async () => {
      const input = `{
        "messageId": {
          "translation": "Translated message",
          "message": "Default message", 
          "description": "Comment for translators"
        },
        "obsoleteId": {
          "translation": "Obsolete message"
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "messageId.translation": "Translated message",
        "messageId.message": "Default message",
        "messageId.description": "Comment for translators",
        "obsoleteId.translation": "Obsolete message",
      });
    });

    test("throws on non-object input", async () => {
      const input = `"just a string"`;
      await expect(parser.parse(input)).rejects.toThrow(
        "Translation file must contain a JSON object",
      );
    });

    test("handles empty object", async () => {
      const input = "{}";
      const result = await parser.parse(input);
      expect(result).toEqual({});
    });

    test("parses deeply nested structures", async () => {
      const input = `{
        "a": {
          "b": {
            "c": {
              "d": "value"
            }
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "a.b.c.d": "value",
      });
    });

    test("handles special characters in keys", async () => {
      const input = `{
        "special@key": "value",
        "with spaces": "test",
        "with.dot": "works"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "special@key": "value",
        "with spaces": "test",
        "with\\.dot": "works",
      });
    });
  });

  describe("serialize", () => {
    test("serializes flat object", async () => {
      const input = {
        hello: "world",
        test: "value",
      };
      const result = await parser.serialize("en", input);
      expect(JSON.parse(result)).toEqual({
        hello: "world",
        test: "value",
      });
    });

    test("serializes nested keys", async () => {
      const input = {
        "nested.key": "value",
        "nested.another.deep": "test",
      };
      const result = await parser.serialize("en", input);
      expect(JSON.parse(result)).toEqual({
        nested: {
          key: "value",
          another: {
            deep: "test",
          },
        },
      });
    });

    test("preserves special characters", async () => {
      const input = {
        "special@key": "value",
        "with spaces": "test",
      };
      const result = await parser.serialize("en", input);
      expect(JSON.parse(result)).toEqual({
        "special@key": "value",
        "with spaces": "test",
      });
    });

    test("handles empty object", async () => {
      const input = {};
      const result = await parser.serialize("en", input);
      expect(JSON.parse(result)).toEqual({});
    });

    test("adds newline at end of file", async () => {
      const input = { key: "value" };
      const result = await parser.serialize("en", input);
      expect(result.endsWith("\n")).toBe(true);
    });

    test("removes deleted keys when serializing", async () => {
      const translations = {
        greeting: "Hello",
        farewell: "Goodbye",
      };
      const result = await parser.serialize("en", translations);
      expect(JSON.parse(result)).toEqual({
        greeting: "Hello",
        farewell: "Goodbye",
      });
    });

    test("handles object with no translations", async () => {
      const translations = {};
      const result = await parser.serialize("en", translations);
      expect(JSON.parse(result)).toEqual({});
    });

    test("serializes arrays correctly", async () => {
      const input = {
        "testimonials.title": "Hear from Our Thriving Community",
        "testimonials.items[0].title": "Best decision",
        "testimonials.items[0].description":
          "Our goal was to streamline SMB trade, making it easier and faster than ever and we did it together.",
        "testimonials.items[0].author.name": "Hayden Bleasel",
        "testimonials.items[0].author.image":
          "https://github.com/haydenbleasel.png",
        "testimonials.items[1].title": "Game changer",
        "testimonials.items[1].description":
          "This platform revolutionized how we handle our day-to-day operations. The efficiency gains have been remarkable.",
        "testimonials.items[1].author.name": "Lee Robinson",
        "testimonials.items[1].author.image": "https://github.com/leerob.png",
      };
      const result = await parser.serialize("en", input);
      expect(JSON.parse(result)).toEqual({
        testimonials: {
          title: "Hear from Our Thriving Community",
          items: [
            {
              title: "Best decision",
              description:
                "Our goal was to streamline SMB trade, making it easier and faster than ever and we did it together.",
              author: {
                name: "Hayden Bleasel",
                image: "https://github.com/haydenbleasel.png",
              },
            },
            {
              title: "Game changer",
              description:
                "This platform revolutionized how we handle our day-to-day operations. The efficiency gains have been remarkable.",
              author: {
                name: "Lee Robinson",
                image: "https://github.com/leerob.png",
              },
            },
          ],
        },
      });
    });
  });
});
