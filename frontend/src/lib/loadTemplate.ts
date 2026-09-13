import { readFile } from "node:fs/promises";
import path from "node:path";

// The Mutual NDA Standard Terms live in the shared templates/ dataset at the
// repo root (see templates/Mutual-NDA.md), not duplicated into the frontend,
// so the two stay in sync.
export async function loadMutualNdaTemplate(): Promise<string> {
  const templatePath = path.join(process.cwd(), "..", "templates", "Mutual-NDA.md");
  return readFile(templatePath, "utf-8");
}
