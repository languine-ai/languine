import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { API, FileInfo, JSCodeshift, Node, Path } from "jscodeshift";

// Load or create translation store
const TRANSLATION_FILE = path.resolve("translations.json");
let translations: Record<string, Record<string, string>> = {};

// Load existing translations if they exist
if (existsSync(TRANSLATION_FILE)) {
  try {
    const existingTranslations = JSON.parse(
      readFileSync(TRANSLATION_FILE, "utf-8"),
    );
    translations = { ...existingTranslations };
  } catch (error) {
    console.warn("Failed to parse existing translations, starting fresh");
  }
}

// Track text occurrences per element type per component
const elementCounts: Record<string, Record<string, number>> = {};

// Attributes that should not be translated
const SKIP_ATTRIBUTES = new Set([
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

// Add proper type definitions for AST nodes
type ASTNode = Node & {
  type: string;
  name?: string;
  value?: string;
  object?: ASTNode;
  property?: ASTNode;
  computed?: boolean;
};

// Get the element type from the JSX path
function getElementType(path: Path): string {
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
        return elementName;
      }
    }
    current = current.parent;
  }
  return "text";
}

// Helper to clean up text for translations
function cleanupText(text: string): string {
  return text
    .replace(/[\n\r\s\t]+/g, " ") // Replace all whitespace (newlines, spaces, tabs) with a single space
    .trim(); // Remove leading/trailing whitespace
}

// Get the next key for a component and type
function getNextKey(componentName: string, type: string): string {
  if (!elementCounts[componentName]) {
    elementCounts[componentName] = {};
  }
  elementCounts[componentName][type] =
    (elementCounts[componentName][type] || 0) + 1;
  return `${type}${elementCounts[componentName][type] > 1 ? `_${elementCounts[componentName][type]}` : ""}`;
}

// Helper to create member expression
function createSelectPattern(
  node: Node & {
    expression?: {
      type: string;
      test?: {
        type: string;
        left?: ASTNode;
        operator?: string;
        right?: { value?: string };
      };
      consequent?: { value?: string };
      alternate?: { value?: string };
    };
  },
): { pattern: string | null; variable: string | null } {
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
      const fullPath = getFullPath(test.left);
      const condition = test.right.value;
      const trueValue = consequent.value;
      const falseValue = alternate.value;
      const simplifiedKey = getSimplifiedKey(fullPath);

      return {
        pattern: `{${simplifiedKey}, select, ${condition} {${trueValue}} other {${falseValue}}}`,
        variable: fullPath,
      };
    }
  }
  return { pattern: null, variable: null };
}

// Helper to create a translation with variables and pluralization
function createTranslationWithVars(
  j: JSCodeshift,
  key: string,
  text: string,
  variables: Array<{ name: string; node: Node; pluralCondition?: Node }>,
): Node {
  // Create the variables object for t() call with full paths
  const properties = variables.map(({ name }) => {
    const simplifiedKey = getSimplifiedKey(name);

    // Build the member expression manually
    const memberExpr = name.split(".").reduce(
      (acc, part, idx) => {
        if (idx === 0) {
          return {
            type: "Identifier",
            name: part,
          } as Node;
        }
        return {
          type: "MemberExpression",
          object: acc,
          property: {
            type: "Identifier",
            name: part,
          },
          computed: false,
        } as Node;
      },
      null as unknown as Node,
    );

    return {
      type: "Property",
      key: {
        type: "Identifier",
        name: simplifiedKey,
      },
      value: memberExpr,
      kind: "init",
      method: false,
      shorthand: false,
      computed: false,
    } as unknown as Node;
  });

  const variablesObj = {
    type: "ObjectExpression",
    properties,
  } as Node;

  // Store the template in translations
  let template = text; // Don't clean up spaces between variables and text

  // Check for pluralization patterns
  for (const variable of variables) {
    if (variable.pluralCondition) {
      const pluralPattern = createPluralPattern(
        template,
        variable.name,
        variable.pluralCondition,
      );
      if (pluralPattern) {
        template = pluralPattern;
        break; // Only handle one pluralization per string for now
      }
    }
  }

  // Store final template
  template = template.replace(/\{([^}]+)\}/g, (_, name) => {
    // Skip if it's already a plural pattern
    if (name.includes("plural") || name.includes("select")) return `{${name}}`;
    // Use simplified key in the template
    const simplifiedKey = getSimplifiedKey(name);
    return `{${simplifiedKey}}`;
  });

  const [comp, ...rest] = key.split(".");
  if (comp) {
    if (!translations[comp]) translations[comp] = {};
    translations[comp][rest.join(".")] = template;
  }

  return j.jsxExpressionContainer(
    j.callExpression(j.identifier("t"), [j.literal(key), variablesObj]),
  );
}

// Helper to get full path from member expression
function getFullPath(node: ASTNode): string {
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
}

// Helper to get the simplified key name from a path
function getSimplifiedKey(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1];
}

// Helper to create member expression
function createMemberExpression(parts: string[]): ASTNode {
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
}

// Helper to store translation
function storeTranslation(
  componentName: string,
  key: string,
  value: string,
): void {
  if (!translations[componentName]) {
    translations[componentName] = {};
  }
  translations[componentName][key] = value;
}

// Helper to create pluralization pattern
function createPluralPattern(
  text: string,
  varName: string,
  pluralCondition: Node & {
    type: string;
    expression?: {
      type: string;
      test?: {
        type: string;
        operator?: string;
        right?: {
          type: string;
          value?: number;
        };
      };
    };
  },
): string | null {
  if (
    pluralCondition.type === "JSXExpressionContainer" &&
    pluralCondition.expression
  ) {
    const expr = pluralCondition.expression;
    if (expr.type === "ConditionalExpression" && expr.test) {
      const test = expr.test;
      if (
        test.type === "BinaryExpression" &&
        test.operator === "!==" &&
        test.right?.type === "NumericLiteral" &&
        test.right.value === 1
      ) {
        const simplifiedKey = getSimplifiedKey(varName);
        return `{${simplifiedKey}, plural, =1 {${text}} other {${text}s}}`;
      }
    }
  }
  return null;
}

// Helper to check if a node is a JSX expression
function isJSXExpression(node: Node): boolean {
  return node.type === "JSXExpressionContainer";
}

// Helper to get variable name from expression
function getVariableName(node: Node & { expression?: unknown }): string | null {
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

      // Handle nested properties like user.preferences.language
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

      // Handle single level properties like user.notifications
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
}

// Check if a node is inside a link
function isInsideLink(path: Path): boolean {
  let current = path;
  while (current) {
    const node = current.node as Node & {
      type?: string;
      openingElement?: {
        name?: { name?: string };
      };
    };

    if (node.type === "JSXElement" && node.openingElement?.name?.name === "a") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

// Helper to create a JSX text node
function createJSXText(j: JSCodeshift, text: string): Node {
  return {
    type: "JSXText",
    value: text,
  };
}

// Save translations to file with component nesting
function saveTranslations(): void {
  // Merge with existing translations if the file exists
  let finalTranslations = { ...translations };
  if (existsSync(TRANSLATION_FILE)) {
    try {
      const existingTranslations = JSON.parse(
        readFileSync(TRANSLATION_FILE, "utf-8"),
      );
      finalTranslations = { ...existingTranslations, ...translations };
    } catch (error) {
      console.warn("Failed to merge with existing translations");
    }
  }

  writeFileSync(TRANSLATION_FILE, JSON.stringify(finalTranslations, null, 2));
}

// Helper to transform JSX elements
function transformJSXElement(
  j: JSCodeshift,
  path: Path,
  componentName: string,
): void {
  const node = path.node as Node & {
    children?: Array<Node & { type: string; value?: string }>;
  };
  const children = node.children || [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    // Handle JSX expressions (variables)
    if (child.type === "JSXExpressionContainer") {
      // Check for conditional expressions first
      const selectPattern = createSelectPattern(child);
      if (selectPattern.pattern && selectPattern.variable) {
        const key = getNextKey(componentName, "text");
        storeTranslation(componentName, key, selectPattern.pattern);

        const replacement = j.jsxExpressionContainer(
          j.callExpression(j.identifier("t"), [
            j.literal(`${componentName}.${key}`),
            {
              type: "ObjectExpression",
              properties: [
                {
                  type: "ObjectProperty",
                  key: {
                    type: "Identifier",
                    name: getSimplifiedKey(selectPattern.variable),
                  } as unknown as Node,
                  value: createMemberExpression(
                    selectPattern.variable.split("."),
                  ) as unknown as Node,
                  shorthand: false,
                  computed: false,
                } as unknown as Node,
              ],
            } as unknown as Node,
          ]),
        );

        children[i] = replacement;
        continue;
      }

      const varName = getVariableName(child);
      if (varName) {
        // Check for text after the variable
        const nextChild = children[i + 1];
        const textAfter =
          nextChild?.type === "JSXText" ? nextChild.value || "" : "";

        if (textAfter) {
          // Handle variable + text case (like "{theme} mode")
          const key = getNextKey(componentName, "text");
          const simplifiedKey = getSimplifiedKey(varName);
          const template = `{${simplifiedKey}}${textAfter}`;

          storeTranslation(componentName, key, template);

          const replacement = j.jsxExpressionContainer(
            j.callExpression(j.identifier("t"), [
              j.literal(`${componentName}.${key}`),
              {
                type: "ObjectExpression",
                properties: [
                  {
                    type: "ObjectProperty",
                    key: {
                      type: "Identifier",
                      name: simplifiedKey,
                    } as unknown as Node,
                    value: createMemberExpression(
                      varName.split("."),
                    ) as unknown as Node,
                    shorthand: false,
                    computed: false,
                  } as unknown as Node,
                ],
              } as unknown as Node,
            ]),
          );

          // Replace both the variable and the text after it
          children.splice(i, 2, replacement);
          continue;
        }
      }
    }

    // Handle other cases...
    if (child.type === "JSXText") {
      const text = child.value || "";
      if (!text.trim()) continue;

      // Check if next nodes are expressions
      const variables: Array<{
        name: string;
        node: Node;
        pluralCondition?: Node;
      }> = [];
      let nextIndex = i + 1;
      let hasVariables = false;

      while (nextIndex < children.length) {
        const nextChild = children[nextIndex];
        if (nextChild.type === "JSXExpressionContainer") {
          const varName = getVariableName(nextChild);
          if (varName) {
            variables.push({
              name: varName,
              node: nextChild,
            });
            hasVariables = true;
            nextIndex++;

            // Look for text after the variable
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

      if (hasVariables) {
        // Create combined text with variables and preserve spaces
        const parts = children.slice(i, nextIndex).map((node) => {
          if (node.type === "JSXText") {
            // Clean up whitespace in text parts while preserving single spaces between words
            return cleanupText(node.value || "");
          }
          const varName = getVariableName(node);
          if (!varName) return "";
          const simplifiedKey = getSimplifiedKey(varName);
          return `{${simplifiedKey}}`;
        });

        const combinedText = parts.join("").trim();

        if (combinedText) {
          const key = getNextKey(componentName, "text");
          storeTranslation(componentName, key, combinedText);

          const variablesObj = {
            type: "ObjectExpression",
            properties: variables.map(({ name }) => ({
              type: "ObjectProperty",
              key: { type: "Identifier", name: getSimplifiedKey(name) },
              value: createMemberExpression(name.split(".")),
              shorthand: false,
              computed: false,
            })),
          } as unknown as Node;

          const replacement = j.jsxExpressionContainer(
            j.callExpression(j.identifier("t"), [
              j.literal(`${componentName}.${key}`),
              variablesObj,
            ]),
          );

          children.splice(i, nextIndex - i, replacement);
        }
      } else {
        // Handle regular text
        const cleanText = cleanupText(text);
        if (cleanText.length >= 2 && /[a-zA-Z]/.test(cleanText)) {
          const isLink = isInsideLink(path);
          const key = getNextKey(componentName, isLink ? "link" : "text");
          storeTranslation(componentName, key, cleanText);

          const replacement = j.jsxExpressionContainer(
            j.callExpression(j.identifier("t"), [
              j.literal(`${componentName}.${key}`),
            ]),
          );

          // Handle whitespace
          const leadingSpace = text.match(/^\s*\n\s*/)?.[0] || "";
          const trailingSpace = text.match(/\s*\n\s*$/)?.[0] || "";

          if (leadingSpace || trailingSpace) {
            const nodes: Node[] = [];
            if (leadingSpace) nodes.push(createJSXText(j, leadingSpace));
            nodes.push(replacement);
            if (trailingSpace) nodes.push(createJSXText(j, trailingSpace));
            children.splice(i, 1, ...nodes);
          } else {
            children[i] = replacement;
          }
        }
      }
    }
  }
}

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;

  // First clean up the source by removing extra parentheses
  const source = file.source.replace(
    /return\s*\(\s*(<[\s\S]*?>)\s*\)\s*;/g,
    "return $1;",
  );
  const root = j(source);

  // Get the component name from the file path
  const componentName = path.basename(file.path).replace(/\.[jt]sx?$/, "");

  // Initialize component in translations if not exists
  if (!translations[componentName]) {
    translations[componentName] = {};
  }

  // Replace JSX text content
  const elements = root.find("JSXElement");
  for (const parentPath of elements.paths()) {
    transformJSXElement(j, parentPath, componentName);
  }

  // Replace string literals in JSX attributes
  for (const path of root.find(j.StringLiteral).paths()) {
    const parent = path.parent.node as Node & {
      type?: string;
      name?: { name?: string };
    };

    if (parent.type !== "JSXAttribute") continue;

    const text = path.node.value;
    if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) {
      continue; // Skip empty, short, or non-text content
    }

    const cleanText = cleanupText(text);
    const attrName = parent.name?.name;
    // Skip non-translatable attributes
    if (attrName && SKIP_ATTRIBUTES.has(attrName)) {
      continue;
    }

    const key = getNextKey(componentName, "attribute");
    if (!key) continue;

    storeTranslation(componentName, key, cleanText);

    // Create t() call with proper key
    const replacement = j.jsxExpressionContainer(
      j.callExpression(j.identifier("t"), [
        j.literal(`${componentName}.${key}`),
      ]),
    );

    root
      .find(j.StringLiteral)
      .filter((p) => p.node.value === text)
      .replaceWith(replacement);
  }

  // Save the translations
  saveTranslations();

  // Return the transformed source with proper formatting
  return root.toSource({
    quote: "double",
  });
}
