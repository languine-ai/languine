import { describe, expect, test } from "bun:test";

import { parseSseEvents } from "../sse.js";

async function* asAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

describe("parseSseEvents", () => {
  test("yields one event per data: line", async () => {
    const chunks = [
      "data: {\"type\":\"started\",\"targetLocale\":\"sv\",\"total\":3}\n\n",
      "data: {\"type\":\"progress\",\"targetLocale\":\"sv\",\"done\":1,\"total\":3}\n\n",
    ];
    const events: unknown[] = [];
    for await (const event of parseSseEvents(asAsyncIterable(chunks))) {
      events.push(event);
    }
    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe("started");
    expect((events[1] as { done: number }).done).toBe(1);
  });

  test("buffers across multiple chunks", async () => {
    const chunks = [
      "data: {\"type\":\"prog",
      "ress\",\"targetLocale\":\"sv\"",
      ",\"done\":2,\"total\":3}\n\n",
    ];
    const events: unknown[] = [];
    for await (const event of parseSseEvents(asAsyncIterable(chunks))) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect((events[0] as { done: number }).done).toBe(2);
  });

  test("skips malformed payloads silently", async () => {
    const chunks = [
      "data: not-json\n\n",
      "data: {\"ok\":true}\n\n",
    ];
    const events: unknown[] = [];
    for await (const event of parseSseEvents(asAsyncIterable(chunks))) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect((events[0] as { ok: boolean }).ok).toBe(true);
  });

  test("ignores non-data fields and comments", async () => {
    const chunks = [
      "event: progress\nid: 1\ndata: {\"x\":1}\n\n",
      ": comment-only\n\n",
    ];
    const events: unknown[] = [];
    for await (const event of parseSseEvents(asAsyncIterable(chunks))) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect((events[0] as { x: number }).x).toBe(1);
  });
});
