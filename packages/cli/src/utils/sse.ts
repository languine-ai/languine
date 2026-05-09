/**
 * Tiny Server-Sent Events parser. Given an `AsyncIterable<string>` of decoded
 * chunks (e.g. piped through `TextDecoderStream`), yields parsed `data:`
 * payloads as JSON.
 *
 * Returns `null` for unparseable payloads instead of throwing so the caller
 * can decide whether to skip or fail.
 */
export async function* parseSseEvents<T>(
  source: AsyncIterable<string>,
): AsyncGenerator<T, void, void> {
  let buffer = "";
  for await (const chunk of source) {
    buffer += chunk;
    let nlIndex = buffer.indexOf("\n\n");
    while (nlIndex !== -1) {
      const block = buffer.slice(0, nlIndex);
      buffer = buffer.slice(nlIndex + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          yield JSON.parse(payload) as T;
        } catch {
          // ignore malformed event
        }
      }
      nlIndex = buffer.indexOf("\n\n");
    }
  }
}
