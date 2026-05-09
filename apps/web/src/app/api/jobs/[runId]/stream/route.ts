import { requireApiKey } from "@/lib/auth";
import type { ProgressEvent } from "@/workflows/translate-locale";
import { handleError } from "@/app/api/translate/utils/errors";
import { getRun } from "workflow/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    requireApiKey(request.headers);

    const { runId } = await params;
    const url = new URL(request.url);
    const startIndexParam = url.searchParams.get("startIndex");
    const startIndex = startIndexParam
      ? Number.parseInt(startIndexParam, 10)
      : undefined;

    const run = getRun(runId);
    const progress = run.getReadable<ProgressEvent>({ startIndex });

    const encoder = new TextEncoder();
    const sse = new TransformStream<ProgressEvent, Uint8Array>({
      transform(event, controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      },
    });

    const sseReadable = progress.pipeThrough(sse);

    return new Response(sseReadable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
