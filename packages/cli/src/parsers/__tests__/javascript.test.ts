import { describe, expect, test } from "bun:test";
import { createParser } from "@/parsers/index.ts";

describe("JavaScript/TypeScript Parser", () => {
  const parser = createParser({ type: "js" });

  describe("parse", () => {
    test("parses simple object", async () => {
      const input = `{ "hello": "world" }`;
      const result = await parser.parse(input);
      expect(result).toEqual({ hello: "world" });
    });

    test("parses nested object", async () => {
      const input = `{
        nested: {
          key: "value",
          deeper: {
            another: "test"
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "nested.key": "value",
        "nested.deeper.another": "test",
      });
    });

    test("handles export default", async () => {
      const input = `export default {
        key: "value"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({ key: "value" });
    });

    test("handles as const", async () => {
      const input = `{
        key: "value"
      } as const`;
      const result = await parser.parse(input);
      expect(result).toEqual({ key: "value" });
    });

    test("handles export default with as const", async () => {
      const input = `export default {
        key: "value"
      } as const`;
      const result = await parser.parse(input);
      expect(result).toEqual({ key: "value" });
    });

    test("parses pluralization keys", async () => {
      const input = `{
        "cows#one": "A cow",
        "cows#other": "{count} cows"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "cows#one": "A cow",
        "cows#other": "{count} cows",
      });
    });

    test("parses deeply nested scopes", async () => {
      const input = `{
        scope: {
          more: {
            and: {
              more: {
                test: "A scope"
              }
            }
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "scope.more.and.more.test": "A scope",
      });
    });

    test("parses interpolation parameters", async () => {
      const input = `{
        welcome: "Hello {name}!",
        "about.you": "Hello {name}! You are {age} years old"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        welcome: "Hello {name}!",
        "about.you": "Hello {name}! You are {age} years old",
      });
    });

    test("preserves explicit dot notation keys while flattening nested objects", async () => {
      const input = `{
        "about.you": "Hello {name}! You are {age} years old",
        nested: {
          key: "value",
          deeper: {
            another: "test"
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "about.you": "Hello {name}! You are {age} years old",
        "nested.key": "value",
        "nested.deeper.another": "test",
      });
    });

    test("handles mix of explicit dot notation and nested objects with same prefix", async () => {
      const input = `{
        "scope.test": "A scope",
        scope: {
          more: {
            test: "Another scope"
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "scope.test": "A scope",
        "scope.more.test": "Another scope",
      });
    });

    test("preserves explicit dot notation in complex scenarios", async () => {
      const input = `{
        "very.deep.key": "Explicit deep key",
        very: {
          deep: {
            nested: "Nested value",
            "other.key": "Mixed nesting"
          }
        }
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "very.deep.key": "Explicit deep key",
        "very.deep.nested": "Nested value",
        "very.deep.other.key": "Mixed nesting",
      });
    });

    test("throws on invalid JavaScript syntax", async () => {
      const input = "{ invalid: syntax: }";
      await expect(parser.parse(input)).rejects.toThrow(
        "Invalid JavaScript syntax",
      );
    });

    test("throws on non-object input", async () => {
      const input = `"just a string"`;
      await expect(parser.parse(input)).rejects.toThrow(
        "Translation file must export an object",
      );
    });

    test("throws on non-string values", async () => {
      const input = "{ key: 123 }";
      await expect(parser.parse(input)).rejects.toThrow(
        "Invalid translation value",
      );
    });

    test("handles template literals", async () => {
      const input = `{
        message: "Hello {name}",
        template: "Multi line string"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        message: "Hello {name}",
        template: "Multi line string",
      });
    });

    test("handles comments in source", async () => {
      const input = `{
        // Single line comment
        key: "value",
        /* Multi
           line
           comment */
        other: "test"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        key: "value",
        other: "test",
      });
    });

    test("preserves whitespace in translation strings", async () => {
      const input = `{
        greeting: "  Hello  World  ",
        multiline: "Line 1\\nLine 2\\nLine 3"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        greeting: "  Hello  World  ",
        multiline: "Line 1\nLine 2\nLine 3",
      });
    });

    test("serializes with consistent ordering", async () => {
      const originalData = {
        b: "original second",
        a: "original first",
        c: "original third",
      };
      const input = {
        b: "second",
        a: "first",
        c: "third",
      };
      const result = await parser.serialize("en", input, originalData);
      expect(result).toBe(
        `export default {\n  b: "second",\n  a: "first",\n  c: "third"\n} as const;\n`,
      );
    });

    test("handles TypeScript dictionary format with type imports", async () => {
      const input = `import type { Dictionary } from "../types";

const dictionary: Dictionary = {
  web: {
    home: {
      hero: {
        title: "Welcome",
        description: "This is a test"
      }
    }
  }
};

export default dictionary;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.home.hero.title": "Welcome",
        "web.home.hero.description": "This is a test",
      });
    });

    test("handles TypeScript dictionary format with multiple imports", async () => {
      const input = `import type { Dictionary } from "../types";
import type { OtherType } from "./other";

const dictionary: Dictionary = {
  web: {
    home: {
      title: "Hello"
    }
  }
};

export default dictionary;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.home.title": "Hello",
      });
    });

    test("handles TypeScript dictionary format with comments", async () => {
      const input = `import type { Dictionary } from "../types";

// Main dictionary
const dictionary: Dictionary = {
  // Web section
  web: {
    /* Home page translations */
    home: {
      title: "Welcome"
    }
  }
};

export default dictionary;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.home.title": "Welcome",
      });
    });

    test("handles different variable names for dictionary", async () => {
      const input = `import type { Dictionary } from "../types";

const translations: Dictionary = {
  web: {
    title: "Hello"
  }
};

export default translations;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.title": "Hello",
      });
    });

    test("handles different type names for dictionary", async () => {
      const input = `import type { Translations } from "../types";

const dictionary: Translations = {
  web: {
    title: "Hello"
  }
};

export default dictionary;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.title": "Hello",
      });
    });

    test("handles different variable and type names", async () => {
      const input = `import type { LocaleMessages } from "./types";

const messages: LocaleMessages = {
  web: {
    title: "Hello"
  }
};

export default messages;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.title": "Hello",
      });
    });

    test("handles type annotation from different import path", async () => {
      const input = `import type { I18nDictionary } from "@/i18n/types";

const i18n: I18nDictionary = {
  web: {
    title: "Hello"
  }
};

export default i18n;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.title": "Hello",
      });
    });

    test("handles direct dictionary definition without type annotations", async () => {
      const input = `const dictionary = {
  web: {
    home: {
      hero: {
        announcement: "Read our latest article",
        title: "Transform Your Business Operations Today",
        description: "In today's fast-paced world, your business deserves better than outdated trading systems. Our innovative platform streamlines operations, reduces complexity, and helps small businesses thrive in the modern economy."
      }
    }
  }
};

export default dictionary;`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "web.home.hero.announcement": "Read our latest article",
        "web.home.hero.title": "Transform Your Business Operations Today",
        "web.home.hero.description":
          "In today's fast-paced world, your business deserves better than outdated trading systems. Our innovative platform streamlines operations, reduces complexity, and helps small businesses thrive in the modern economy.",
      });
    });
  });

  describe("serialize", () => {
    test("serializes flat object", async () => {
      const input = { key: "value" };
      const result = await parser.serialize("en", input);
      expect(result).toBe(`export default {\n  key: "value"\n} as const;\n`);
    });

    test("serializes dot notation keys when original uses dot notation", async () => {
      const originalData = {
        "nested.key": "value",
        "nested.deeper.another": "test",
        "scope.more.stars#one": "1 star on GitHub",
      };

      const input = {
        "nested.key": "valeur",
        "nested.deeper.another": "tester",
        "scope.more.stars#one": "1 étoile sur GitHub",
      };

      const result = await parser.serialize("fr", input, originalData);
      expect(result).toBe(
        `export default {\n  "nested.key": "valeur",\n  "nested.deeper.another": "tester",\n  "scope.more.stars#one": "1 étoile sur GitHub"\n} as const;\n`,
      );
    });

    test("serializes as nested objects when original uses nested structure", async () => {
      const originalData = {
        nested: {
          key: "value",
          deeper: {
            another: "test",
          },
        },
        scope: {
          more: {
            "stars#one": "1 star on GitHub",
          },
        },
      };

      const input = {
        "nested.key": "valeur",
        "nested.deeper.another": "tester",
        "scope.more.stars#one": "1 étoile sur GitHub",
      };

      const result = await parser.serialize("fr", input, originalData);
      expect(result).toBe(
        `export default {\n  nested: {\n    key: "valeur",\n    deeper: {\n      another: "tester"\n    }\n  },\n  scope: {\n    more: {\n      "stars#one": "1 étoile sur GitHub"\n    }\n  }\n} as const;\n`,
      );
    });

    test("preserves quotes in text content", async () => {
      const input = { key: 'value with "quotes"' };
      const result = await parser.serialize("en", input);
      expect(result).toBe(
        `export default {\n  key: "value with \\"quotes\\""\n} as const;\n`,
      );
    });

    test("handles empty object", async () => {
      const input = {};
      const result = await parser.serialize("en", input);
      expect(result).toBe("export default {} as const;\n");
    });

    test("serializes pluralization keys", async () => {
      const input = {
        "cows#one": "A cow",
        "cows#other": "{count} cows",
      };
      const result = await parser.serialize("en", input);
      expect(result).toBe(
        `export default {\n  "cows#one": "A cow",\n  "cows#other": "{count} cows"\n} as const;\n`,
      );
    });

    test("defaults to dot notation when no original data is provided", async () => {
      const input = {
        "scope.more.stars#one": "1 star on GitHub",
        "scope.more.stars#other": "{count} stars on GitHub",
        "scope.more.param": "A scope with {param}",
      };
      const result = await parser.serialize("en", input);
      expect(result).toBe(
        `export default {\n  "scope.more.stars#one": "1 star on GitHub",\n  "scope.more.stars#other": "{count} stars on GitHub",\n  "scope.more.param": "A scope with {param}"\n} as const;\n`,
      );
    });

    test("maintains same structure as original file", async () => {
      const originalData = {
        hello: "Hello",
        welcome: "Hello {name}!",
        "about.you": "Hello {name}! You are {age} years old",
        "scope.test": "A scope",
        "scope.more.test": "A scope",
        "scope.more.param": "A scope with {param}",
        "scope.more.and.more.test": "A scope",
        "scope.more.stars#one": "1 star on GitHub",
        "scope.more.stars#other": "{count} stars on GitHub",
      };

      const input = {
        hello: "Bonjour",
        welcome: "Bonjour {name} !",
        "about.you": "Bonjour {name} ! Vous avez {age} ans",
        "scope.test": "Un domaine",
        "scope.more.test": "Un domaine",
        "scope.more.param": "Un domaine avec {param}",
        "scope.more.and.more.test": "Un domaine",
        "scope.more.stars#one": "1 étoile sur GitHub",
        "scope.more.stars#other": "{count} étoiles sur GitHub",
      };

      const result = await parser.serialize("fr", input, originalData);
      expect(result).toBe(
        `export default {\n  hello: "Bonjour",\n  welcome: "Bonjour {name} !",\n  "about.you": "Bonjour {name} ! Vous avez {age} ans",\n  "scope.test": "Un domaine",\n  "scope.more.test": "Un domaine",\n  "scope.more.param": "Un domaine avec {param}",\n  "scope.more.and.more.test": "Un domaine",\n  "scope.more.stars#one": "1 étoile sur GitHub",\n  "scope.more.stars#other": "{count} étoiles sur GitHub"\n} as const;\n`,
      );
    });

    test("maintains same structure as example file", async () => {
      const originalData = {
        hello: {
          world: "Hello World",
        },
      };

      const input = {
        "hello.world": "Bonjour le monde",
      };

      const result = await parser.serialize("fr", input, originalData);
      expect(result).toBe(
        `export default {\n  hello: {\n    world: "Bonjour le monde"\n  }\n} as const;\n`,
      );
    });

    test("handles complex interpolation patterns", async () => {
      const input = `{
        message: "You have {count} item{count, plural, one{} other{s}} in your cart",
        price: "Total: {currency}{amount, number, .00}"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        message:
          "You have {count} item{count, plural, one{} other{s}} in your cart",
        price: "Total: {currency}{amount, number, .00}",
      });
    });

    test("handles object spread syntax", async () => {
      const input = `{
        ...commonTranslations,
        specific: "value"
      }`;
      await expect(parser.parse(input)).rejects.toThrow();
    });

    test("handles special characters in keys", async () => {
      const input = `{
        "special-key": "value",
        "key_with_underscore": "test",
        "123numeric": "number"
      }`;
      const result = await parser.parse(input);
      expect(result).toEqual({
        "special-key": "value",
        key_with_underscore: "test",
        "123numeric": "number",
      });
    });
  });
});
