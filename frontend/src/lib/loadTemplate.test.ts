import { describe, expect, it } from "vitest";
import { loadMutualNdaTemplate } from "./loadTemplate";

describe("loadMutualNdaTemplate", () => {
  it("loads the shared Mutual-NDA template from the repo-root templates/ dataset", async () => {
    const markdown = await loadMutualNdaTemplate();

    expect(markdown).toContain("# Standard Terms");
    expect(markdown).toContain('<span class="coverpage_link">Purpose</span>');
    expect(markdown.length).toBeGreaterThan(1000);
  });
});
