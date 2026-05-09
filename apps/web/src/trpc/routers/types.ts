// Re-export router types so consumers (CLI, GitHub Action) can import without
// pulling in the entire `_app.ts` file (which uses workspace-local path
// aliases). Importing from this file is type-only.

export type { AppRouter, RouterOutputs } from "./_app";
