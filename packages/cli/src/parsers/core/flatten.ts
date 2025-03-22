/**
 * Escapes dots in keys to prevent collisions with dots used as path separators
 * @param key The key to escape
 * @returns The escaped key
 */
export function escapeKey(key: string): string {
  return key.replace(/\./g, "\\.");
}

/**
 * Unescapes dots in keys
 * @param key The key to unescape
 * @returns The unescaped key
 */
export function unescapeKey(key: string): string {
  return key.replace(/\\./g, ".");
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
    const escapedKey = escapeKey(key);
    const newKey = prefix ? `${prefix}.${escapedKey}` : escapedKey;

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

  // First, collect all array paths and indices
  const arrays: Record<string, Record<number, unknown>> = {};

  // Process all keys to build the object structure and identify arrays
  for (const [key, value] of Object.entries(obj)) {
    // Split by dots that are not escaped
    const keyParts = key.split(/(?<!\\)\./).map((part) => unescapeKey(part));

    // Process the parts
    let current = result;
    let path = "";

    for (let i = 0; i < keyParts.length; i++) {
      const part = keyParts[i];
      const arrayMatch = part.match(/^(.*?)\[(\d+)\]$/);

      if (arrayMatch) {
        // We found an array notation like "items[0]"
        const [_, name, indexStr] = arrayMatch;
        const index = Number.parseInt(indexStr, 10);

        // Build path up to this point
        const arrayPath = path ? (name ? `${path}.${name}` : path) : name;

        if (i === keyParts.length - 1) {
          // This is the last part, set the value directly
          if (!arrays[arrayPath]) {
            arrays[arrayPath] = {};
          }
          arrays[arrayPath][index] = value;
        } else {
          // More parts to process after this array item
          if (!arrays[arrayPath]) {
            arrays[arrayPath] = {};
          }
          if (!arrays[arrayPath][index]) {
            arrays[arrayPath][index] = {};
          }

          // Continue processing with this array item as the new current object
          current = arrays[arrayPath][index] as Record<string, unknown>;
          path = ""; // Reset path for the nested object
        }
      } else {
        // Regular property (not array)
        path = path ? `${path}.${part}` : part;

        if (i === keyParts.length - 1) {
          // Last part, set the value
          current[part] = value;
        } else {
          // Not the last part, create nested object if needed
          if (!(part in current)) {
            current[part] = {};
          }
          // Move current to the nested object
          current = current[part] as Record<string, unknown>;
        }
      }
    }
  }

  // Convert array objects to actual arrays and insert them into the result
  for (const [path, indices] of Object.entries(arrays)) {
    const parts = path.split(".");
    let current = result;

    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    // Convert to array
    const lastPart = parts[parts.length - 1];
    const maxIndex = Math.max(...Object.keys(indices).map(Number));
    const array: unknown[] = new Array(maxIndex + 1);

    // Fill the array with values
    for (const [indexStr, value] of Object.entries(indices)) {
      array[Number(indexStr)] = value;
    }

    // Set the array in the result object
    current[lastPart] = array;
  }

  return result;
}
