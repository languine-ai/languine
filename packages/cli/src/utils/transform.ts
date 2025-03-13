import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { API, FileInfo, JSCodeshift, Node, Path } from "jscodeshift";
import { client } from "./api.ts";
import { loadConfig } from "./config.ts";

// Core types and interfaces
interface ASTNode extends Node {
  type: string;
  name?: string;
  value?: string;
  object?: ASTNode;
  property?: ASTNode;
  computed?: boolean;
}

interface CollectedTranslation {
  originalKey: string;
  value: string;
  type: "text" | "attribute" | "link";
  functionName: string;
  elementKey: string;
}

interface TransformState {
  translations: Record<string, Record<string, string>>;
  elementCounts: Record<string, number>;
  collectedTranslations: CollectedTranslation[];
  keyMap: Record<string, string>;
  apiKeys: Record<string, string>;
}

interface SelectPattern {
  pattern: string;
  variable: string;
}

/**
 * Service for transforming JSX/TSX files to use translations.
 * Handles extraction of text content, attributes, and dynamic content.
 */
export class TransformService {
  // State management
  private state: TransformState = {
    translations: {},
    elementCounts: {},
    collectedTranslations: [],
    keyMap: {},
    apiKeys: {},
  };

  // Constants
  private readonly SKIP_ATTRIBUTES = new Set([
    "href",
    "src",
    "id",
    "className",
    "class",
    "key",
    "name",
    "type",
    "value",
    "for",
    "role",
    "target",
    "rel",
    "aria-labelledby",
    "aria-describedby",
    "data-testid",
    "style",
    "width",
    "height",
    "size",
    "maxLength",
    "min",
    "max",
    "pattern",
    "tabIndex",
  ]);

  // Cache for performance optimization
  private readonly translationCache = new Map<string, string>();
  private readonly functionNameCache = new Map<string, string>();
  private readonly elementTypeCache = new Map<string, string>();
  private translationFile = "";
  private projectId = "";
  private sourceLocale = "";

  constructor() {
    this.run();
  }

  async run() {
    const config = await loadConfig();

    console.log("config", config);

    const projectId = config.projectId || process.env.LANGUINE_PROJECT_ID;

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    this.projectId = projectId;
    this.sourceLocale = config.locale.source;

    // Get the target folder from config
    const jsonConfig = config.files.json;
    if (!jsonConfig || !jsonConfig.include || jsonConfig.include.length === 0) {
      throw new Error("No JSON file configuration found in languine.json");
    }

    // Get the first include pattern and replace [locale] with source locale
    const pattern = jsonConfig.include[0];
    const globPattern = typeof pattern === "string" ? pattern : pattern.glob;
    const targetPath = globPattern.replace("[locale]", this.sourceLocale);

    // Ensure the directory exists
    const dir = path.dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.translationFile = path.resolve(targetPath);
    this.loadTranslations();
  }

  // Public API
  public async transform(file: FileInfo, api: API): Promise<string> {
    try {
      const j = api.jscodeshift;
      const source = this.cleanSource(file.source);
      const root = j(source);
      const componentName = this.getComponentName(file.path);

      this.resetState();
      await this.processTranslations(j, root, componentName);
      await this.saveTranslations();

      return root.toSource({ quote: "double" });
    } catch (error) {
      console.error(`Error transforming file ${file.path}:`, error);
      throw new Error(
        `Failed to transform file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Main Processing Methods
  private async processTranslations(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    componentName: string,
  ): Promise<void> {
    try {
      // First collect all translations
      await this.collectTranslations(j, root, componentName);

      // Generate API keys for all collected translations
      const apiKeys = await this.generateAPIKeys(
        this.state.collectedTranslations,
      );
      this.state.apiKeys = apiKeys;

      // Update keyMap with API keys where available
      for (const translation of this.state.collectedTranslations) {
        const apiKey = apiKeys[translation.originalKey];
        if (apiKey) {
          this.state.keyMap[translation.originalKey] = apiKey;
        }
      }

      // Now transform with the generated keys
      await this.transformWithGeneratedKeys(j, root, componentName);
    } catch (error) {
      console.error("Error in processTranslations:", error);
      throw new Error(
        `Failed to process translations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async collectTranslations(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    componentName: string,
  ): Promise<void> {
    try {
      const elements = root.find("JSXElement");
      for (const path of elements.paths()) {
        this.collectFromJSXElement(path, componentName);
      }

      for (const path of root.find(j.StringLiteral).paths()) {
        this.collectFromStringLiteral(path, componentName);
      }
    } catch (error) {
      console.error("Error in collectTranslations:", error);
      throw new Error(
        `Failed to collect translations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Translation Management Methods
  private loadTranslations(): void {
    if (existsSync(this.translationFile)) {
      try {
        const existingTranslations = JSON.parse(
          readFileSync(this.translationFile, "utf-8"),
        );
        this.state.translations = { ...existingTranslations };
      } catch (error) {
        console.warn(
          "Failed to parse existing translations, starting fresh:",
          error,
        );
      }
    }
  }

  private async saveTranslations(): Promise<
    Record<string, Record<string, string>>
  > {
    try {
      const transformedTranslations = this.buildTransformedTranslations();
      const finalTranslations = await this.mergePreviousTranslations(
        transformedTranslations,
      );

      // Ensure the directory exists
      const dir = path.dirname(this.translationFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(
        this.translationFile,
        JSON.stringify(finalTranslations, null, 2),
      );
      return transformedTranslations;
    } catch (error) {
      console.error("Error saving translations:", error);
      throw new Error(
        `Failed to save translations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async mergePreviousTranslations(
    newTranslations: Record<string, Record<string, string>>,
  ): Promise<Record<string, Record<string, string>>> {
    if (!existsSync(this.translationFile)) {
      return newTranslations;
    }

    try {
      const content = readFileSync(this.translationFile, "utf-8");
      if (!content.trim()) {
        return newTranslations;
      }

      const existingTranslations = JSON.parse(content);
      if (
        typeof existingTranslations !== "object" ||
        existingTranslations === null
      ) {
        console.warn("Invalid translations file format, starting fresh");
        return newTranslations;
      }

      const mergedTranslations: Record<string, Record<string, string>> = {
        ...existingTranslations,
      };

      for (const [component, translations] of Object.entries(newTranslations)) {
        if (!mergedTranslations[component]) {
          mergedTranslations[component] = {};
        }
        mergedTranslations[component] = {
          ...mergedTranslations[component],
          ...translations,
        };
      }

      return mergedTranslations;
    } catch (error) {
      console.warn("Failed to merge with existing translations:", error);
      return newTranslations;
    }
  }

  // State Management Methods
  private resetState(): void {
    this.state.collectedTranslations.length = 0;
    this.state.keyMap = {};
    this.state.apiKeys = {};
    this.translationCache.clear();
    this.functionNameCache.clear();
    this.elementTypeCache.clear();
  }

  private buildTransformedTranslations(): Record<
    string,
    Record<string, string>
  > {
    const transformedTranslations: Record<string, Record<string, string>> = {};
    const seenValues = new Map<string, string>();

    // First pass: Process items with API keys
    for (const item of this.state.collectedTranslations) {
      const apiKey = this.state.apiKeys[item.originalKey];
      if (apiKey) {
        const [component, ...keyParts] = apiKey.split(".");
        const descriptiveKey = keyParts.join(".");

        if (!transformedTranslations[component]) {
          transformedTranslations[component] = {};
        }

        if (!seenValues.has(item.value)) {
          transformedTranslations[component][descriptiveKey] = item.value;
          seenValues.set(item.value, descriptiveKey);
        }
      }
    }

    // Second pass: Process remaining items using original keys (should be rare)
    for (const item of this.state.collectedTranslations) {
      if (
        !this.state.apiKeys[item.originalKey] &&
        !seenValues.has(item.value)
      ) {
        const [component, ...keyParts] = item.originalKey.split(".");
        const simpleKey = keyParts.join(".");

        if (!transformedTranslations[component]) {
          transformedTranslations[component] = {};
        }

        transformedTranslations[component][simpleKey] = item.value;
        seenValues.set(item.value, simpleKey);
      }
    }

    return transformedTranslations;
  }

  // File Processing Methods
  private cleanSource(source: string): string {
    return source.replace(/return\s*\(\s*(<[\s\S]*?>)\s*\)\s*;/g, "return $1;");
  }

  private getComponentName(filePath: string): string {
    return path.basename(filePath).replace(/\.[jt]sx?$/, "");
  }

  private collectFromJSXElement(path: Path, componentName: string): void {
    try {
      const node = path.node as Node & {
        children?: Array<Node & { type: string; value?: string }>;
      };
      const children = node.children || [];

      for (const child of children) {
        if (child.type === "JSXText") {
          const text = child.value || "";
          if (text.trim()) {
            const cleanText = this.cleanupText(text);
            if (cleanText.length >= 2 && /[a-zA-Z]/.test(cleanText)) {
              const isLink = this.isInsideLink(path);
              const key = this.getNextKey(
                componentName,
                isLink ? "link" : "text",
                path,
              );
              this.storeTranslation(componentName, key, cleanText, path);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in collectFromJSXElement:", error);
      throw new Error(
        `Failed to collect from JSX element: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private collectFromStringLiteral(path: Path, componentName: string): void {
    try {
      const parent = path.parent.node as Node & {
        type?: string;
        name?: { name?: string };
      };

      if (parent.type !== "JSXAttribute") return;

      const text = path.node.value;
      if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) {
        return;
      }

      const cleanText = this.cleanupText(text);
      const attrName = parent.name?.name;
      if (attrName && this.SKIP_ATTRIBUTES.has(attrName)) {
        return;
      }

      const key = this.getNextKey(componentName, "attribute", path);
      if (!key) return;

      this.storeTranslation(componentName, key, cleanText, path);
    } catch (error) {
      console.error("Error in collectFromStringLiteral:", error);
      throw new Error(
        `Failed to collect from string literal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private storeTranslation(
    componentName: string,
    key: string,
    value: string,
    path: Path,
  ): void {
    try {
      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${key}`;

      // Check if we've already seen this value
      const existingTranslation = this.state.collectedTranslations.find(
        (t) => t.value === value,
      );

      if (existingTranslation) {
        // If we have an API key for the existing translation, use that
        const existingTranslationApiKey =
          this.state.apiKeys[existingTranslation.originalKey];
        if (existingTranslationApiKey) {
          this.state.keyMap[originalKey] = existingTranslationApiKey;
        } else {
          // Otherwise use the existing key mapping
          this.state.keyMap[originalKey] =
            this.state.keyMap[existingTranslation.originalKey];
        }
      } else {
        // Check if we already have an API key for this translation
        const currentTranslationApiKey = this.state.apiKeys[originalKey];
        if (currentTranslationApiKey) {
          this.state.keyMap[originalKey] = currentTranslationApiKey;
        } else {
          this.state.collectedTranslations.push({
            originalKey,
            value,
            type: this.getElementType(path) === "a" ? "link" : "text",
            functionName,
            elementKey: key,
          });
          // Store the full key with functionName prefix
          this.state.keyMap[originalKey] = originalKey;
        }
      }
    } catch (error) {
      console.error("Error in storeTranslation:", error);
      throw new Error(
        `Failed to store translation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // AST Transformation Methods
  private async transformWithGeneratedKeys(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    componentName: string,
  ): Promise<void> {
    try {
      await this.transformJSXElements(j, root, componentName);
      await this.transformStringLiterals(j, root, componentName);

      const savedTranslations = await this.saveTranslations();
    } catch (error) {
      console.error("Error transforming with generated keys:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  private async transformJSXElements(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    componentName: string,
  ): Promise<void> {
    try {
      const elements = root.find("JSXElement");
      for (const path of elements.paths()) {
        this.transformJSXElement(j, path, componentName);
      }
    } catch (error) {
      console.error("Error in transformJSXElements:", error);
      throw new Error(
        `Failed to transform JSX elements: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async transformStringLiterals(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    componentName: string,
  ): Promise<void> {
    try {
      for (const path of root.find(j.StringLiteral).paths()) {
        this.handleStringLiteral(j, root, path, componentName);
      }
    } catch (error) {
      console.error("Error in transformStringLiterals:", error);
      throw new Error(
        `Failed to transform string literals: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // JSX Element Processing Methods
  private transformJSXElement(
    j: JSCodeshift,
    path: Path,
    componentName: string,
  ): void {
    try {
      const node = path.node as Node & {
        children?: Array<Node & { type: string; value?: string }>;
      };
      const children = node.children || [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        i = this.processJSXChild(j, children, i, path, componentName);
      }
    } catch (error) {
      console.error("Error in transformJSXElement:", error);
      throw new Error(
        `Failed to transform JSX element: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private processJSXChild(
    j: JSCodeshift,
    children: Array<Node & { type: string; value?: string }>,
    index: number,
    path: Path,
    componentName: string,
  ): number {
    try {
      const child = children[index];

      if (child.type === "JSXExpressionContainer") {
        return this.handleJSXExpression(
          j,
          children,
          index,
          path,
          componentName,
        );
      }

      if (child.type === "JSXText") {
        return this.handleJSXText(j, children, index, path, componentName);
      }

      return index;
    } catch (error) {
      console.error("Error in processJSXChild:", error);
      throw new Error(
        `Failed to process JSX child: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Translation Creation Methods
  private createSelectTranslation(
    j: JSCodeshift,
    selectPattern: SelectPattern,
    path: Path,
    componentName: string,
  ): Node {
    try {
      const key = this.getNextKey(componentName, "text", path);
      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${key}`;

      this.storeTranslation(componentName, key, selectPattern.pattern, path);

      // Use the API-generated key if available, otherwise use the original key
      const mappedKey =
        this.state.apiKeys[originalKey] ||
        this.state.keyMap[originalKey] ||
        originalKey;

      return this.createTranslationNode(j, mappedKey, {
        [this.getSimplifiedKey(selectPattern.variable)]:
          this.createMemberExpression(selectPattern.variable.split(".")),
      });
    } catch (error) {
      console.error("Error in createSelectTranslation:", error);
      throw new Error(
        `Failed to create select translation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private createVariableWithTextTranslation(
    j: JSCodeshift,
    varName: string,
    textAfter: string,
    path: Path,
    componentName: string,
  ): Node {
    try {
      const key = this.getNextKey(componentName, "text", path);
      const simplifiedKey = this.getSimplifiedKey(varName);
      const template = `{${simplifiedKey}}${textAfter}`;
      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${key}`;

      this.storeTranslation(componentName, key, template, path);

      // Use the API-generated key if available, otherwise use the original key
      const mappedKey =
        this.state.apiKeys[originalKey] ||
        this.state.keyMap[originalKey] ||
        originalKey;

      return this.createTranslationNode(j, mappedKey, {
        [simplifiedKey]: this.createMemberExpression(varName.split(".")),
      });
    } catch (error) {
      console.error("Error in createVariableWithTextTranslation:", error);
      throw new Error(
        `Failed to create variable with text translation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private createTranslationNode(
    j: JSCodeshift,
    key: string,
    variables: Record<string, Node>,
  ): Node {
    try {
      return j.jsxExpressionContainer(
        j.callExpression(j.identifier("t"), [
          j.literal(key),
          {
            type: "ObjectExpression",
            properties: Object.entries(variables).map(([name, value]) => ({
              type: "ObjectProperty",
              key: { type: "Identifier", name } as unknown as Node,
              value: value as unknown as Node,
              shorthand: false,
              computed: false,
            })),
          } as unknown as Node,
        ]),
      );
    } catch (error) {
      console.error("Error in createTranslationNode:", error);
      throw new Error(
        `Failed to create translation node: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Utility Methods
  private getElementType(path: Path): string {
    try {
      // Check cache first
      const cacheKey = path.node.type;
      if (this.elementTypeCache.has(cacheKey)) {
        return this.elementTypeCache.get(cacheKey)!;
      }

      let current = path;
      while (current) {
        const node = current.node as Node & {
          type?: string;
          openingElement?: {
            name?: { name?: string };
          };
        };

        if (node.type === "JSXElement") {
          const elementName = node.openingElement?.name?.name?.toLowerCase();
          if (elementName) {
            this.elementTypeCache.set(cacheKey, elementName);
            return elementName;
          }
        }
        current = current.parent;
      }
      return "text";
    } catch (error) {
      console.error("Error in getElementType:", error);
      return "text"; // Fallback to text type on error
    }
  }

  private cleanupText(text: string): string {
    return text.replace(/[\n\r\s\t]+/g, " ").trim();
  }

  private getFunctionName(path: Path): string {
    try {
      // Check cache first
      const cacheKey = path.node.type;
      if (this.functionNameCache.has(cacheKey)) {
        return this.functionNameCache.get(cacheKey)!;
      }

      let current = path;
      while (current) {
        const node = current.node as Node & {
          type?: string;
          id?: { name?: string };
        };

        if (
          node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression"
        ) {
          if (node.id?.name) {
            this.functionNameCache.set(cacheKey, node.id.name);
            return node.id.name;
          }
          const parent = current.parent?.node as Node & {
            type?: string;
            id?: { name?: string };
            key?: { name?: string };
          };
          if (parent?.type === "VariableDeclarator" && parent.id?.name) {
            this.functionNameCache.set(cacheKey, parent.id.name);
            return parent.id.name;
          }
          if (parent?.type === "Property" && parent.key?.name) {
            this.functionNameCache.set(cacheKey, parent.key.name);
            return parent.key.name;
          }
        }
        current = current.parent;
      }
      return "unknown";
    } catch (error) {
      console.error("Error in getFunctionName:", error);
      return "unknown"; // Fallback to unknown on error
    }
  }

  private getNextKey(componentName: string, type: string, path: Path): string {
    try {
      const elementName = this.getElementName(path);

      // Get or initialize counter for this element name
      if (!this.state.elementCounts[elementName]) {
        this.state.elementCounts[elementName] = 0;
      }
      this.state.elementCounts[elementName]++;

      // Generate a temporary key for this element
      const tempKey =
        this.state.elementCounts[elementName] === 1
          ? elementName
          : `${elementName}_${this.state.elementCounts[elementName] - 1}`;

      // Check if we have an API-generated key for this element
      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${tempKey}`;
      const apiKey = this.state.apiKeys[originalKey];

      // If we have an API key, extract just the key part (after the component prefix)
      if (apiKey) {
        const keyParts = apiKey.split(".");
        return keyParts[keyParts.length - 1];
      }

      return tempKey;
    } catch (error) {
      console.error("Error in getNextKey:", error);
      return "unknown"; // Fallback to unknown on error
    }
  }

  private getElementName(path: Path): string {
    try {
      const node = path.node as Node & {
        type?: string;
        openingElement?: { name?: { name?: string } };
        name?: { name?: string };
      };

      // For JSXElements, get the element name (e.g., 'div', 'span', etc.)
      if (node.type === "JSXElement" && node.openingElement?.name?.name) {
        return node.openingElement.name.name.toLowerCase();
      }

      // For attributes, get the attribute name
      if (path.parent?.node?.type === "JSXAttribute") {
        const attrNode = path.parent.node as Node & {
          name?: { name?: string };
        };
        return attrNode.name?.name || "attr";
      }

      // For text nodes, use 'text'
      if (node.type === "JSXText") {
        return "text";
      }

      // For string literals not in attributes, use 'string'
      if (node.type === "StringLiteral") {
        return "string";
      }

      return "unknown";
    } catch (error) {
      console.error("Error in getElementName:", error);
      return "unknown"; // Fallback to unknown on error
    }
  }

  private createSelectPattern(
    node: Node & {
      expression?: {
        type: string;
        test?: {
          type: string;
          left?: { type: string; value?: string };
          operator?: string;
          right?: { type: string; value?: string };
        };
        consequent?: { value?: string };
        alternate?: { value?: string };
      };
    },
  ): { pattern: string | null; variable: string | null } {
    try {
      if (
        node.type === "JSXExpressionContainer" &&
        node.expression &&
        node.expression.type === "ConditionalExpression"
      ) {
        const { test, consequent, alternate } = node.expression;

        if (
          test?.type === "BinaryExpression" &&
          test.operator === "===" &&
          test.left &&
          test.right?.value &&
          consequent?.value &&
          alternate?.value
        ) {
          const fullPath = this.getFullPath(test.left);
          const condition = test.right.value;
          const trueValue = consequent.value;
          const falseValue = alternate.value;
          const simplifiedKey = this.getSimplifiedKey(fullPath);

          return {
            pattern: `{${simplifiedKey}, select, ${condition} {${trueValue}} other {${falseValue}}}`,
            variable: fullPath,
          };
        }
      }
      return { pattern: null, variable: null };
    } catch (error) {
      console.error("Error in createSelectPattern:", error);
      return { pattern: null, variable: null }; // Return null on error
    }
  }

  private getFullPath(node: ASTNode): string {
    try {
      const parts: string[] = [];
      let current: ASTNode | undefined = node;

      while (current) {
        if (current.type === "Identifier" && current.name) {
          parts.unshift(current.name);
        } else if (current.type === "MemberExpression") {
          if (
            current.property &&
            current.property.type === "Identifier" &&
            current.property.name
          ) {
            parts.unshift(current.property.name);
          }
          current = current.object;
          continue;
        }
        break;
      }

      return parts.join(".");
    } catch (error) {
      console.error("Error in getFullPath:", error);
      return "unknown"; // Fallback to unknown on error
    }
  }

  private getSimplifiedKey(path: string): string {
    try {
      const parts = path.split(".");
      return parts[parts.length - 1];
    } catch (error) {
      console.error("Error in getSimplifiedKey:", error);
      return path; // Fallback to original path on error
    }
  }

  private createMemberExpression(parts: string[]): ASTNode {
    try {
      return parts.reduce(
        (acc: ASTNode, curr: string, idx: number): ASTNode => {
          if (idx === 0) {
            return {
              type: "Identifier",
              name: curr,
            } as ASTNode;
          }
          return {
            type: "MemberExpression",
            object: acc,
            property: {
              type: "Identifier",
              name: curr,
            } as ASTNode,
            computed: false,
          } as ASTNode;
        },
        { type: "Identifier", name: parts[0] } as ASTNode,
      );
    } catch (error) {
      console.error("Error in createMemberExpression:", error);
      throw new Error(
        `Failed to create member expression: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private getVariableName(
    node: Node & { expression?: unknown },
  ): string | null {
    try {
      if (node.type === "JSXExpressionContainer" && node.expression) {
        const expression = node.expression as {
          type: string;
          object?: {
            type: string;
            object?: { type: string; name?: string };
            property?: { type: string; name?: string };
            name?: string;
          };
          property?: { type: string; name?: string };
        };
        if (expression.type === "MemberExpression") {
          const object = expression.object;
          const property = expression.property;

          if (
            object?.type === "MemberExpression" &&
            property?.type === "Identifier"
          ) {
            const parentObject = object.object;
            const parentProperty = object.property;
            if (
              parentObject?.type === "Identifier" &&
              parentObject.name &&
              parentProperty?.type === "Identifier" &&
              parentProperty.name &&
              property.name
            ) {
              return `${parentObject.name}.${parentProperty.name}.${property.name}`;
            }
          }

          if (
            object?.type === "Identifier" &&
            object.name &&
            property?.type === "Identifier" &&
            property.name
          ) {
            return `${object.name}.${property.name}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error in getVariableName:", error);
      return null; // Return null on error
    }
  }

  private isInsideLink(path: Path): boolean {
    try {
      let current = path;
      while (current) {
        const node = current.node as Node & {
          type?: string;
          openingElement?: {
            name?: { name?: string };
          };
        };

        if (
          node.type === "JSXElement" &&
          node.openingElement?.name?.name === "a"
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    } catch (error) {
      console.error("Error in isInsideLink:", error);
      return false; // Fallback to false on error
    }
  }

  private createJSXText(j: JSCodeshift, text: string): Node {
    return {
      type: "JSXText",
      value: text,
    };
  }

  private handleStringLiteral(
    j: JSCodeshift,
    root: ReturnType<JSCodeshift>,
    path: Path,
    componentName: string,
  ): void {
    try {
      const parent = path.parent.node as Node & {
        type?: string;
        name?: { name?: string };
      };

      if (parent.type !== "JSXAttribute") return;

      const text = path.node.value;
      if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) {
        return;
      }

      const cleanText = this.cleanupText(text);
      const attrName = parent.name?.name;
      if (attrName && this.SKIP_ATTRIBUTES.has(attrName)) {
        return;
      }

      const key = this.getNextKey(componentName, "attribute", path);
      if (!key) return;

      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${key}`;

      this.storeTranslation(componentName, key, cleanText, path);

      // Use the API-generated key if available, otherwise use keyMap or original key
      const mappedKey =
        this.state.apiKeys[originalKey] ||
        this.state.keyMap[originalKey] ||
        originalKey;

      const replacement = j.jsxExpressionContainer(
        j.callExpression(j.identifier("t"), [j.literal(mappedKey)]),
      );

      root
        .find(j.StringLiteral)
        .filter((p: Path) => p.node.value === text)
        .replaceWith(replacement);
    } catch (error) {
      console.error("Error in handleStringLiteral:", error);
      throw new Error(
        `Failed to handle string literal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private handleJSXExpression(
    j: JSCodeshift,
    children: Array<Node & { type: string; value?: string }>,
    index: number,
    path: Path,
    componentName: string,
  ): number {
    try {
      const child = children[index];
      const selectPattern = this.createSelectPattern(child);

      if (selectPattern.pattern && selectPattern.variable) {
        children[index] = this.createSelectTranslation(
          j,
          selectPattern as { pattern: string; variable: string },
          path,
          componentName,
        );
        return index;
      }

      const varName = this.getVariableName(child);
      if (varName) {
        const nextChild = children[index + 1];
        const textAfter =
          nextChild?.type === "JSXText" ? nextChild.value || "" : "";

        if (textAfter) {
          children[index] = this.createVariableWithTextTranslation(
            j,
            varName,
            textAfter,
            path,
            componentName,
          );
          return index + 1;
        }
      }

      return index;
    } catch (error) {
      console.error("Error in handleJSXExpression:", error);
      return index; // Return original index on error
    }
  }

  private handleJSXText(
    j: JSCodeshift,
    children: Array<Node & { type: string; value?: string }>,
    index: number,
    path: Path,
    componentName: string,
  ): number {
    try {
      const child = children[index];
      const text = child.value || "";
      if (!text.trim()) return index;

      const { hasVariables, nextIndex, variables } = this.collectVariables(
        children,
        index,
      );

      if (hasVariables) {
        return this.handleTextWithVariables(
          j,
          children,
          index,
          nextIndex,
          variables,
          path,
          componentName,
        );
      }

      return this.handleSimpleText(
        j,
        children,
        index,
        text,
        path,
        componentName,
      );
    } catch (error) {
      console.error("Error in handleJSXText:", error);
      return index; // Return original index on error
    }
  }

  private collectVariables(
    children: Array<Node & { type: string; value?: string }>,
    startIndex: number,
  ): {
    hasVariables: boolean;
    nextIndex: number;
    variables: Array<{ name: string; node: Node; pluralCondition?: Node }>;
  } {
    try {
      const variables: Array<{
        name: string;
        node: Node;
        pluralCondition?: Node;
      }> = [];
      let nextIndex = startIndex + 1;
      let hasVariables = false;

      while (nextIndex < children.length) {
        const nextChild = children[nextIndex];
        if (nextChild.type === "JSXExpressionContainer") {
          const varName = this.getVariableName(nextChild);
          if (varName) {
            variables.push({
              name: varName,
              node: nextChild,
            });
            hasVariables = true;
            nextIndex++;

            if (nextIndex < children.length) {
              const afterNode = children[nextIndex];
              if (afterNode.type === "JSXText" && afterNode.value) {
                nextIndex++;
              }
            }
            continue;
          }
        }
        break;
      }

      return { hasVariables, nextIndex, variables };
    } catch (error) {
      console.error("Error in collectVariables:", error);
      return { hasVariables: false, nextIndex: startIndex + 1, variables: [] }; // Return safe default on error
    }
  }

  private handleTextWithVariables(
    j: JSCodeshift,
    children: Array<Node & { type: string; value?: string }>,
    startIndex: number,
    endIndex: number,
    variables: Array<{ name: string; node: Node; pluralCondition?: Node }>,
    path: Path,
    componentName: string,
  ): number {
    try {
      const parts = children.slice(startIndex, endIndex).map((node, index) => {
        if (node.type === "JSXText") {
          const text = this.cleanupText(node.value || "");
          // If next node is a variable and current text doesn't end with a space
          // and the text is not empty, add a space
          const nextNode = children[startIndex + index + 1];
          if (
            nextNode?.type === "JSXExpressionContainer" &&
            text &&
            !text.endsWith(" ")
          ) {
            return `${text} `;
          }
          return text;
        }
        const varName = this.getVariableName(node);
        if (!varName) return "";
        const simplifiedKey = this.getSimplifiedKey(varName);
        return `{${simplifiedKey}}`;
      });

      const combinedText = parts.join("").trim();

      if (combinedText) {
        const key = this.getNextKey(componentName, "text", path);
        const functionName = this.getFunctionName(path);
        const originalKey = `${functionName}.${key}`;

        // Find if we already have this translation
        const existingTranslation = this.state.collectedTranslations.find(
          (t) => t.value === combinedText,
        );

        // Use the API key if available, either from the existing translation or the current one
        const mappedKey = existingTranslation
          ? this.state.apiKeys[existingTranslation.originalKey] ||
            this.state.keyMap[existingTranslation.originalKey]
          : this.state.apiKeys[originalKey] ||
            this.state.keyMap[originalKey] ||
            originalKey;

        const variablesObj = {
          type: "ObjectExpression",
          properties: variables.map(({ name }) => ({
            type: "ObjectProperty",
            key: { type: "Identifier", name: this.getSimplifiedKey(name) },
            value: this.createMemberExpression(name.split(".")),
            shorthand: false,
            computed: false,
          })),
        } as unknown as Node;

        const replacement = j.jsxExpressionContainer(
          j.callExpression(j.identifier("t"), [
            j.literal(mappedKey),
            variablesObj,
          ]),
        );

        children.splice(startIndex, endIndex - startIndex, replacement);
      }

      return endIndex - 1;
    } catch (error) {
      console.error("Error in handleTextWithVariables:", error);
      return endIndex - 1; // Return original endIndex on error
    }
  }

  private handleSimpleText(
    j: JSCodeshift,
    children: Array<Node & { type: string; value?: string }>,
    index: number,
    text: string,
    path: Path,
    componentName: string,
  ): number {
    const cleanText = this.cleanupText(text);
    if (cleanText.length >= 2 && /[a-zA-Z]/.test(cleanText)) {
      const isLink = this.isInsideLink(path);
      const key = this.getNextKey(
        componentName,
        isLink ? "link" : "text",
        path,
      );
      const functionName = this.getFunctionName(path);
      const originalKey = `${functionName}.${key}`;

      this.storeTranslation(componentName, key, cleanText, path);

      // Use API key if available, otherwise use keyMap or original key
      const mappedKey =
        this.state.apiKeys[originalKey] ||
        this.state.keyMap[originalKey] ||
        originalKey;

      const replacement = j.jsxExpressionContainer(
        j.callExpression(j.identifier("t"), [j.literal(mappedKey)]),
      );

      const leadingSpace = text.match(/^\s*\n\s*/)?.[0] || "";
      const trailingSpace = text.match(/\s*\n\s*$/)?.[0] || "";

      if (leadingSpace || trailingSpace) {
        const nodes: Node[] = [];
        if (leadingSpace) nodes.push(this.createJSXText(j, leadingSpace));
        nodes.push(replacement);
        if (trailingSpace) nodes.push(this.createJSXText(j, trailingSpace));
        children.splice(index, 1, ...nodes);
      } else {
        children[index] = replacement;
      }
    }

    return index;
  }

  private async generateAPIKeys(
    translations: CollectedTranslation[],
  ): Promise<Record<string, string>> {
    try {
      const result = await client.jobs.startTransformJob.mutate({
        projectId: this.projectId,
        translations: translations.map((t) => ({
          key: t.originalKey,
          value: t.value,
        })),
      });

      // Create a map of original keys to API-generated keys
      const keys: Record<string, string> = {};

      // The API returns an array of objects with newKeys
      if (result && Array.isArray(result) && result.length > 0) {
        translations.forEach((translation, index) => {
          if (result[index]?.key) {
            keys[translation.originalKey] = result[index].key;
          } else {
            console.warn(
              `No API key generated for: ${translation.originalKey}`,
            );
          }
        });
      } else {
      }

      return keys;
    } catch (error) {
      console.error("Error generating API keys:", error);
      throw new Error(
        `Failed to generate API keys: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export default async function transform(
  file: FileInfo,
  api: API,
): Promise<string> {
  const transformer = new TransformService();

  return transformer.transform(file, api);
}
