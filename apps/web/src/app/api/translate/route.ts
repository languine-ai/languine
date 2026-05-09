import { createTranslations } from "@/db/queries/translate";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireApiKey } from "@/lib/auth";
import { translateKeys } from "@/workflows/utils/translate";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { handleError } from "./utils/errors";
import { translateRequestSchema } from "./utils/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireApiKey(request.headers);

    const body = await request.json();
    const { projectId, sourceLocale, targetLocale, format, sourceText } =
      translateRequestSchema.parse(body);

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const key = sourceText;

    const [translatedText] = await translateKeys(
      [{ key, sourceText }],
      {
        sourceLocale,
        targetLocale,
        sourceFormat: format,
      },
    );

    const isDocument = format === "md" || format === "mdx";

    waitUntil(
      createTranslations({
        projectId,
        sourceFormat: format,
        translations: [
          {
            translationKey: key,
            sourceLanguage: sourceLocale,
            targetLanguage: targetLocale,
            sourceText,
            translatedText: translatedText ?? "",
            sourceFile: "api",
            sourceType: isDocument ? "document" : "key",
          },
        ],
      }),
    );

    return NextResponse.json({
      success: true,
      translatedText: translatedText ?? "",
    });
  } catch (error) {
    return handleError(error);
  }
}
