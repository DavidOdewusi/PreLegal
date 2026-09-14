import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyBlock, generateNdaPdf, stripInlineMarkdown } from "./pdf";
import { buildCoverPage, emptyNdaFormData, type NdaFormData } from "./nda";

describe("stripInlineMarkdown", () => {
  it("removes bold markers but keeps the inner text", () => {
    expect(stripInlineMarkdown("**Confidential Information**")).toBe("Confidential Information");
  });

  it("removes multiple bold spans in the same line", () => {
    expect(stripInlineMarkdown("The **Receiving Party** shall notify the **Disclosing Party**")).toBe(
      "The Receiving Party shall notify the Disclosing Party"
    );
  });

  it("replaces markdown links with their link text", () => {
    expect(stripInlineMarkdown("[Version 1.0](https://commonpaper.com/standards/mutual-nda/1.0/)")).toBe(
      "Version 1.0"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(stripInlineMarkdown("  plain text  ")).toBe("plain text");
  });

  it("leaves text with no markdown formatting unchanged", () => {
    expect(stripInlineMarkdown("Plain paragraph with no formatting.")).toBe(
      "Plain paragraph with no formatting."
    );
  });

  // nda.ts backslash-escapes markdown-significant characters found in user
  // input (see escapeMarkdown in lib/nda.ts) so they can't restructure the
  // document. stripInlineMarkdown is responsible for reversing that
  // escaping for the PDF's plain-text output, without mistaking the escaped
  // characters for real markdown syntax along the way.
  describe("escaped user input", () => {
    it("does not treat an escaped '**' as real bold, and unescapes it back to literal asterisks", () => {
      expect(stripInlineMarkdown("over \\*\\*secret\\*\\* deal")).toBe("over **secret** deal");
    });

    it("still strips real, unescaped bold surrounding escaped bold", () => {
      // The outer "**" is real markdown added by nda.ts; the inner escaped
      // "**" is literal text the user typed.
      expect(stripInlineMarkdown("**Party A: Acme \\*\\*Robotics\\*\\*, Inc.**")).toBe(
        "Party A: Acme **Robotics**, Inc."
      );
    });

    it("unescapes an escaped leading hyphen back to a literal hyphen", () => {
      expect(stripInlineMarkdown("\\--- deal")).toBe("--- deal");
    });

    it("unescapes an escaped leading heading/quote/list marker", () => {
      expect(stripInlineMarkdown("\\# Not a heading")).toBe("# Not a heading");
      expect(stripInlineMarkdown("\\> Not a quote")).toBe("> Not a quote");
      expect(stripInlineMarkdown("\\+ Not a list item")).toBe("+ Not a list item");
    });

    it("still strips a real, unescaped markdown link", () => {
      expect(
        stripInlineMarkdown(
          "[Version 1.0](https://commonpaper.com/standards/mutual-nda/1.0/) for details"
        )
      ).toBe("Version 1.0 for details");
    });
  });
});

describe("classifyBlock", () => {
  it("classifies a horizontal rule", () => {
    expect(classifyBlock("---")).toEqual({ kind: "rule", text: "---" });
  });

  it("classifies an H1 heading and strips the marker", () => {
    expect(classifyBlock("# Cover Page")).toEqual({ kind: "heading1", text: "Cover Page" });
  });

  it("classifies an H2 heading and strips the marker", () => {
    expect(classifyBlock("## Mutual Non-Disclosure Agreement")).toEqual({
      kind: "heading2",
      text: "Mutual Non-Disclosure Agreement",
    });
  });

  it("classifies a bullet list block", () => {
    const block = "- **Effective Date:** 2026-10-01";
    expect(classifyBlock(block)).toEqual({ kind: "list", text: block });
  });

  it("classifies a bold-only line distinctly from a paragraph containing bold", () => {
    expect(classifyBlock("**Party A: Acme Robotics, Inc.**")).toEqual({
      kind: "bold",
      text: "Party A: Acme Robotics, Inc.",
    });
  });

  it("classifies a numbered clause as a paragraph, not a list", () => {
    const block = '1. **Introduction**. This Mutual Non-Disclosure Agreement...';
    expect(classifyBlock(block)).toEqual({ kind: "paragraph", text: block });
  });

  it("classifies plain prose as a paragraph", () => {
    const block = "By signing below, each party agrees to be bound by this agreement.";
    expect(classifyBlock(block)).toEqual({ kind: "paragraph", text: block });
  });

  it("trims surrounding whitespace before classifying", () => {
    expect(classifyBlock("  # Cover Page  \n")).toEqual({ kind: "heading1", text: "Cover Page" });
  });

  describe("escaped user input", () => {
    it("treats an escaped '---' as a paragraph, not a rule", () => {
      expect(classifyBlock("\\---")).toEqual({ kind: "paragraph", text: "\\---" });
    });

    it("treats an escaped leading '#' or '-' as a paragraph, not a heading or list item", () => {
      expect(classifyBlock("\\# Not a heading").kind).toBe("paragraph");
      expect(classifyBlock("\\- Not a list item").kind).toBe("paragraph");
    });

    it("still recognizes the real outer bold wrapper when it wraps escaped content", () => {
      // nda.ts's own "**...**" wrapper is real; escaped user text inside it
      // (e.g. a legal name literally ending in "**") should still let the
      // genuine wrapper be found correctly.
      const block = classifyBlock("**Party A: Company\\*\\***");
      expect(block.kind).toBe("bold");
      expect(block.text).toBe("Party A: Company\\*\\*");
    });
  });
});

// generateNdaPdf drives jsPDF, a third-party library that needs canvas/font
// APIs jsdom does not provide. Mock it so these tests exercise our own
// block-routing and pagination logic in isolation.
type Call = unknown[];

const state = {
  textCalls: [] as Call[],
  fontCalls: [] as Call[],
  fontSizeCalls: [] as Call[],
  lineCalls: [] as Call[],
  addPageCalls: 0,
  saveCalls: [] as Call[],
};

vi.mock("jspdf", () => {
  class MockJsPDF {
    constructor(public options: unknown) {}
    setFont(...args: Call) {
      state.fontCalls.push(args);
    }
    setFontSize(...args: Call) {
      state.fontSizeCalls.push(args);
    }
    setDrawColor() {}
    text(...args: Call) {
      state.textCalls.push(args);
    }
    line(...args: Call) {
      state.lineCalls.push(args);
    }
    addPage() {
      state.addPageCalls += 1;
    }
    splitTextToSize(text: string) {
      // A naive stand-in for real word-wrapping: chunk into fixed-size
      // pieces so short block text (headings, short sentences) still
      // yields exactly one "line" — keeping existing single-line
      // assumptions valid — while a genuinely long block yields many
      // lines, which is what the pagination tests below need to exercise
      // multi-page splitting.
      const CHARS_PER_LINE = 40;
      if (text.length <= CHARS_PER_LINE) return [text];
      const lines: string[] = [];
      for (let i = 0; i < text.length; i += CHARS_PER_LINE) {
        lines.push(text.slice(i, i + CHARS_PER_LINE));
      }
      return lines;
    }
    save(...args: Call) {
      state.saveCalls.push(args);
    }
  }
  return { default: MockJsPDF };
});

describe("generateNdaPdf", () => {
  beforeEach(() => {
    state.textCalls = [];
    state.fontCalls = [];
    state.fontSizeCalls = [];
    state.lineCalls = [];
    state.addPageCalls = 0;
    state.saveCalls = [];
  });

  it("renders headings, rules, lists, bold lines and paragraphs with the right font, and saves the given filename", () => {
    const markdown = [
      "# Cover Page",
      "## Mutual Non-Disclosure Agreement",
      "**Party A: Acme Robotics, Inc.**",
      "- **Effective Date:** 2026-10-01",
      "---",
      "1. **Introduction**. This MNDA governs confidential information.",
    ].join("\n\n");

    generateNdaPdf(markdown, "Mutual-NDA-Test.pdf");

    // Times is used throughout, matching the serif identity of the on-screen preview.
    expect(state.fontCalls.every(([family]) => family === "times")).toBe(true);
    // heading1
    expect(state.fontCalls).toContainEqual(["times", "bold"]);
    expect(state.fontSizeCalls).toContainEqual([18]);
    // heading2
    expect(state.fontSizeCalls).toContainEqual([14]);
    // rule draws a horizontal line
    expect(state.lineCalls).toHaveLength(1);
    // bold line and paragraph both render at 11pt
    expect(state.fontSizeCalls.filter(([size]) => size === 11).length).toBeGreaterThanOrEqual(2);

    // Text content: headings preserved, list bullet reformatted, inline markdown stripped.
    const allText = state.textCalls.map(([lines]) => lines).flat();
    expect(allText).toContain("Cover Page");
    expect(allText.some((line) => String(line).startsWith("-  Effective Date: 2026-10-01"))).toBe(
      true
    );
    expect(allText.some((line) => String(line).includes("**"))).toBe(false);

    expect(state.saveCalls).toEqual([["Mutual-NDA-Test.pdf"]]);
  });

  it("adds a new page once content exceeds a single page's height", () => {
    // Each heading1 block consumes ~12mm (1 line * 6mm + 6mm spacing) starting
    // at y=20mm, against a ~257mm usable page height, so ~30 blocks reliably
    // overflows onto a second page.
    const markdown = Array.from({ length: 30 }, (_, i) => `# Heading ${i}`).join("\n\n");

    generateNdaPdf(markdown, "overflow.pdf");

    expect(state.addPageCalls).toBeGreaterThanOrEqual(1);
  });

  it("does not add a page for a short, single-section document", () => {
    generateNdaPdf("# Cover Page\n\nJust one short paragraph.", "short.pdf");

    expect(state.addPageCalls).toBe(0);
  });

  it("skips blank blocks created by extra blank lines", () => {
    generateNdaPdf("# Cover Page\n\n\n\n   \n\nSome text.", "spacing.pdf");

    const allText = state.textCalls.map(([lines]) => lines).flat();
    expect(allText).toEqual(["Cover Page", "Some text."]);
  });

  it("splits a single block that is longer than one page across multiple pages instead of overflowing the margin", () => {
    // ~4000 characters, e.g. someone pasting several paragraphs into the
    // Purpose or Address field: at ~40 chars/line that's ~100 lines, far
    // more than the ~40 lines that fit on one page.
    const longParagraph = "Confidential information includes the following items: ".repeat(70).trim();
    generateNdaPdf(`# Cover Page\n\n${longParagraph}`, "long.pdf");

    const paragraphCalls = state.textCalls.filter(([lines]) =>
      (lines as string[]).some((line) => line.includes("Confidential information"))
    );

    // Previously this block was handed to a single pdf.text() call with no
    // further page-break check, so lines past the first page ran off the
    // bottom margin. It must now be split across more than one call/page.
    expect(paragraphCalls.length).toBeGreaterThan(1);
    expect(state.addPageCalls).toBeGreaterThanOrEqual(1);

    // And nothing should be dropped in the process.
    const rejoined = paragraphCalls.map(([lines]) => (lines as string[]).join("")).join("");
    expect(rejoined).toBe(longParagraph);
  });

  it("renders a legal name containing literal '**' as literal asterisks, not as broken bold formatting", () => {
    // End-to-end: nda.ts escapes the user's own "**", and pdf.ts must
    // recognize the real outer bold wrapper while reversing that escaping
    // for display, rather than either breaking the document's formatting
    // or leaking a raw backslash into the PDF.
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyA: { ...emptyNdaFormData.partyA, legalName: "Company**" },
    };
    const coverPage = buildCoverPage(data);

    generateNdaPdf(coverPage, "injection.pdf");

    const allText = state.textCalls.map(([lines]) => lines).flat().map(String);
    expect(allText).toContain("Party A: Company**");
    expect(allText.some((line) => line.includes("\\"))).toBe(false);
  });
});
