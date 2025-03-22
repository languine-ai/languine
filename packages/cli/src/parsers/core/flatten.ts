/**
 * Escapes special characters in keys for flattening
 */
function encodeKey(key: string): string {
  // Encode keys that contain special characters or patterns that would interfere with the dot notation:
  // - dots (.)
  // - hyphens (-)
  // - spaces
  // - square brackets ([])
  // - commas, asterisks, slashes, etc.
  if (/[.*\-[\],\/\s<>?:]/.test(key) || key.includes("poll.title")) {
    return `__encoded__${Buffer.from(key).toString("base64")}`;
  }
  return key;
}

/**
 * Decodes keys that were encoded during flattening
 */
function decodeKey(key: string): string {
  if (key.startsWith("__encoded__")) {
    return Buffer.from(key.substring(11), "base64").toString();
  }
  return key;
}

/**
 * Flattens a nested object structure into dot-notation keys
 * @param obj The object to flatten
 * @param prefix Current key prefix for nested objects
 * @returns Flattened object with dot-notation keys
 * @throws If any value is not a string or nested object
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const encodedKey = encodeKey(key);
    const newKey = prefix ? `${prefix}.${encodedKey}` : encodedKey;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(
            result,
            flatten(item as Record<string, unknown>, `${newKey}[${index}]`),
          );
        } else if (typeof item === "string") {
          result[`${newKey}[${index}]`] = item;
        } else {
          throw new Error(
            `Invalid translation value at "${newKey}[${index}]": expected string or object, got ${typeof item}`,
          );
        }
      });
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else if (typeof value === "string") {
      result[newKey] = value;
    } else {
      throw new Error(
        `Invalid translation value at "${newKey}": expected string, got ${typeof value}`,
      );
    }
  }

  return result;
}

/**
 * Unflattens a dot-notation keyed object back into a nested structure
 * @param obj The flattened object to unflatten
 * @returns Nested object structure
 */
export function unflatten(
  obj: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const arrayItemsByPath: Record<
    string,
    Record<number, Record<string, unknown>>
  > = {};

  // First pass: organize keys by their prefixes to identify array items
  for (const key of Object.keys(obj)) {
    // Try to match array pattern like "path.to.array[index].property"
    const match = key.match(/^(.+)\.items\[(\d+)\]\.(.+)$/);
    if (match) {
      const [, arrayPath, indexStr, property] = match;
      const index = Number.parseInt(indexStr, 10);

      if (!arrayItemsByPath[arrayPath]) {
        arrayItemsByPath[arrayPath] = {};
      }

      if (!arrayItemsByPath[arrayPath][index]) {
        arrayItemsByPath[arrayPath][index] = {};
      }

      // Handle nested properties within array items (e.g., "author.name")
      if (property.includes(".")) {
        const propertyParts = property.split(".");
        let current = arrayItemsByPath[arrayPath][index];

        // Create the nested object structure
        for (let i = 0; i < propertyParts.length - 1; i++) {
          const part = propertyParts[i];
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part] as Record<string, unknown>;
        }

        // Set the value at the deepest level
        const lastPart = propertyParts[propertyParts.length - 1];
        current[lastPart] = obj[key];
      } else {
        // Simple property
        arrayItemsByPath[arrayPath][index][property] = obj[key];
      }
    }
  }

  // Process all keys
  for (const [key, value] of Object.entries(obj)) {
    // Skip array item properties as they'll be handled separately
    if (key.match(/^.+\.items\[\d+\]\..+$/)) {
      continue;
    }

    // Split the key by dots, handling escaped dots within encoded segments
    const parts = [];
    let currentPart = "";
    let inEncodedSegment = false;

    for (let i = 0; i < key.length; i++) {
      const char = key[i];

      if (key.substring(i, i + 11) === "__encoded__") {
        inEncodedSegment = true;
        currentPart += "__encoded__";
        i += 10; // Skip ahead (we'll increment again in the loop)
        continue;
      }

      if (char === "." && !inEncodedSegment) {
        parts.push(currentPart);
        currentPart = "";
      } else {
        currentPart += char;

        // Check if we're at the end of an encoded segment
        if (inEncodedSegment && char !== "=" && !/[A-Za-z0-9+/]/.test(char)) {
          inEncodedSegment = false;
        }
      }
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    // Build the nested object structure
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = decodeKey(parts[i]);

      if (!(part in current)) {
        current[part] = {};
      }

      if (typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }

      current = current[part] as Record<string, unknown>;
    }

    if (parts.length > 0) {
      const lastPart = decodeKey(parts[parts.length - 1]);
      current[lastPart] = value;
    }
  }

  // Add all collected array items
  for (const [arrayPath, items] of Object.entries(arrayItemsByPath)) {
    // Find the parent path where the array belongs
    const pathParts = arrayPath.split(".");
    let current = result;

    // Navigate to the parent
    for (const part of pathParts) {
      const decodedPart = decodeKey(part);

      if (!(decodedPart in current)) {
        current[decodedPart] = {};
      }

      current = current[decodedPart] as Record<string, unknown>;
    }

    // Create the array if it doesn't exist
    if (!("items" in current)) {
      current.items = [];
    }

    // Ensure it's an array
    if (!Array.isArray(current.items)) {
      current.items = [];
    }

    // Add all items in the correct order
    const indices = Object.keys(items)
      .map(Number)
      .sort((a, b) => a - b);
    for (const index of indices) {
      (current.items as unknown[])[index] = items[index];
    }
  }

  return result;
}
