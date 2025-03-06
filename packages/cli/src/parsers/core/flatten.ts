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
    const newKey = prefix ? `${prefix}.${key}` : key;

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

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(/\.|\[|\]/).filter(Boolean);
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextPartArrayIndex = /^\d+$/.test(nextPart);

      if (!(part in current)) {
        current[part] = isNextPartArrayIndex ? [] : {};
      }

      if (Array.isArray(current[part]) && isNextPartArrayIndex) {
        const index = Number.parseInt(nextPart, 10);
        if (!(index in (current[part] as unknown[]))) {
          (current[part] as unknown[])[index] = {};
        }
        current = (current[part] as unknown[])[index] as Record<
          string,
          unknown
        >;
        i++; // Skip the array index part
      } else {
        current = current[part] as Record<string, unknown>;
      }
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  return result;
}
