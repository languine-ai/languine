import { ApiKeyError } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidationErrorMessage } from "./validation";

export const handleError = (error: unknown) => {
  if (error instanceof ApiKeyError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: getValidationErrorMessage(error) },
      { status: 400 },
    );
  }

  console.error("Translation error:", error);
  return NextResponse.json(
    {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your translation request.",
    },
    { status: 500 },
  );
};
