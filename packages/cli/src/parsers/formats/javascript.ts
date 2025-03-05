import { BaseParser } from "../core/base-parser.js";

export class JavaScriptParser extends BaseParser {
  async parse(input: string) {
    try {
      const cleanInput = this.preprocessInput(input);
      const parsed = this.evaluateJavaScript(cleanInput);
      this.validateParsedObject(parsed);

      // First collect all explicit dot notation keys
      const explicitDotKeys = new Set<string>();
      this.findExplicitDotKeys(cleanInput, explicitDotKeys);

      // Then flatten while preserving explicit dot notation
      return this.flattenObject(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse JavaScript/TypeScript: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async serialize(
    _: string,
    data: Record<string, string>,
    originalData?: string | Record<string, unknown>,
    sourceData?: string | Record<string, unknown>,
  ): Promise<string> {
    let content: string;

    if (sourceData) {
      // If we have source data, use its format as a template
      const isNestedFormat =
        typeof sourceData === "string"
          ? this.isNestedObjectFormat(sourceData)
          : this.hasNestedObjects(sourceData);

      content = isNestedFormat
        ? this.formatNestedObject(data)
        : this.formatFlatObject(data);
    } else if (originalData) {
      // Fall back to original data format if source not available
      const isNestedFormat =
        typeof originalData === "string"
          ? this.isNestedObjectFormat(originalData)
          : this.hasNestedObjects(originalData);

      content = isNestedFormat
        ? this.formatNestedObject(data)
        : this.formatFlatObject(data);
    } else {
      // Default to flat object with dot notation
      content = this.formatFlatObject(data);
    }

    return this.wrapInExport(content);
  }

  private isNestedObjectFormat(data: string): boolean {
    try {
      const cleanInput = this.preprocessInput(data);
      const parsed = this.evaluateJavaScript(cleanInput);
      return this.hasNestedObjects(parsed);
    } catch {
      return false;
    }
  }

  private hasNestedObjects(obj: unknown): boolean {
    if (typeof obj !== "object" || obj === null) return false;

    for (const value of Object.values(obj)) {
      if (typeof value === "object" && value !== null) {
        return true;
      }
    }
    return false;
  }

  private formatNestedObject(data: Record<string, string>): string {
    if (Object.keys(data).length === 0) {
      return "{}";
    }

    // Group by common prefixes
    const groups: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const parts = key.split(".");
      let current = groups;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      const lastPart = parts[parts.length - 1];
      current[lastPart] = value;
    }

    return this.formatObjectRecursive(groups);
  }

  private formatObjectRecursive(
    obj: Record<string, unknown>,
    level = 1,
  ): string {
    if (Object.keys(obj).length === 0) {
      return "{}";
    }

    const indent = "  ".repeat(level);
    const entries = Object.entries(obj).map(([key, value]) => {
      const formattedKey = this.needsQuotes(key) ? `"${key}"` : key;
      const formattedValue =
        typeof value === "object" && value !== null
          ? this.formatObjectRecursive(
              value as Record<string, unknown>,
              level + 1,
            )
          : `"${String(value).replace(/"/g, '\\"')}"`;
      return `${indent}${formattedKey}: ${formattedValue}`;
    });

    return `{\n${entries.join(",\n")}\n${"  ".repeat(level - 1)}}`;
  }

  private formatFlatObject(obj: Record<string, string>): string {
    if (Object.keys(obj).length === 0) {
      return "{}";
    }

    const indentStr = "  ";
    const entries = Object.entries(obj).map(([key, value]) => {
      const formattedKey = this.needsQuotes(key) ? `"${key}"` : key;
      const formattedValue = `"${String(value).replace(/"/g, '\\"')}"`;
      return `${indentStr}${formattedKey}: ${formattedValue}`;
    });

    return `{\n${entries.join(",\n")}\n}`;
  }

  private needsQuotes(key: string): boolean {
    return (
      /[^a-zA-Z0-9_$]/.test(key) ||
      /^\d/.test(key) ||
      key.includes(".") ||
      !this.isValidIdentifier(key)
    );
  }

  private isValidIdentifier(key: string): boolean {
    try {
      new Function(`const ${key} = 0;`);
      return true;
    } catch {
      return false;
    }
  }

  private wrapInExport(content: string): string {
    return `export default ${content} as const;\n`;
  }

  private preprocessInput(input: string): string {
    let processed = input.trim();

    // Remove TypeScript imports first
    processed = processed.replace(
      /^import\s+[^;]+;(\s*import\s+[^;]+;)*\s*/m,
      "",
    );

    // Extract the object literal from variable declaration or export
    const objectMatch = processed.match(
      /(?:const\s+\w+(?:\s*:\s*\w+)?\s*=\s*)?({[\s\S]*?})\s*(?:;|\s*as\s+const\s*;)?$/,
    );
    if (objectMatch) {
      processed = objectMatch[1];
    } else {
      // Handle export default cases
      if (processed.includes("export default")) {
        // Try to match direct object export with optional 'as const'
        const directExportMatch = processed.match(
          /export\s+default\s+({[\s\S]*?})\s*(?:as\s+const)?\s*;?$/,
        );
        if (directExportMatch) {
          processed = directExportMatch[1];
        } else {
          // Try to match variable export
          const exportMatch = processed.match(/export\s+default\s+(\w+)\s*;?/);
          if (exportMatch) {
            // Find the variable declaration that matches the exported identifier
            const varName = exportMatch[1];
            const varMatch = processed.match(
              new RegExp(
                `const\\s+${varName}(?:\\s*:\\s*\\w+)?\\s*=\\s*({[\\s\\S]*?})\\s*;`,
              ),
            );
            if (varMatch) {
              processed = varMatch[1];
            }
          }
        }
      }
    }

    // Clean up any remaining 'as const'
    processed = processed.replace(/\s+as\s+const\s*;?$/, "");

    // Remove any trailing semicolons
    processed = processed.replace(/;$/, "");

    return processed.trim();
  }

  private evaluateJavaScript(input: string): unknown {
    try {
      return new Function(`return ${input};`)();
    } catch (error) {
      throw new Error(`Invalid JavaScript syntax: ${(error as Error).message}`);
    }
  }

  private validateParsedObject(
    parsed: unknown,
  ): asserts parsed is Record<string, string | Record<string, unknown>> {
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Translation file must export an object");
    }

    const validateValue = (value: unknown, path: string[]): void => {
      if (typeof value === "string") {
        return;
      }
      if (typeof value === "object" && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          validateValue(val, [...path, key]);
        }
        return;
      }
      throw new Error(
        `Invalid translation value at ${path.join(".")}: values must be strings or nested objects with string values`,
      );
    };

    for (const [key, value] of Object.entries(parsed)) {
      validateValue(value, [key]);
    }
  }

  private findExplicitDotKeys(input: string, keys: Set<string>) {
    // Match both quoted and unquoted keys that contain dots
    const keyRegex = /(?:"([^"]+)"|'([^']+)'|([^{},\s:]+))(?=\s*:)/g;
    let match: RegExpExecArray | null = null;

    do {
      match = keyRegex.exec(input);
      if (match) {
        const key = match[1] || match[2] || match[3];
        if (key?.includes(".")) {
          keys.add(key);
        }
      }
    } while (match);
  }

  private flattenObject(
    obj: Record<string, unknown>,
    prefix = "",
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        result[fullPath] = value;
      } else if (typeof value === "object" && value !== null) {
        Object.assign(
          result,
          this.flattenObject(value as Record<string, unknown>, fullPath),
        );
      }
    }

    return result;
  }
}
