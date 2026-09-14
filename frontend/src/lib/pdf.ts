import jsPDF from "jspdf";

const PAGE_WIDTH_MM = 210; // A4
const PAGE_HEIGHT_MM = 297; // A4
const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const LINE_HEIGHT_MM = 6;

// Exported for unit testing: these are pure functions that decide how a
// markdown block is classified and cleaned up before being written to the
// PDF, independent of jsPDF itself.
//
// nda.ts backslash-escapes CommonMark-significant characters in user input
// (see escapeMarkdown there) so a value like "---" or "**bold**" can't
// restructure the document. The regexes below use a negative lookbehind so
// they only treat "**"/"[...]" as real markdown when it isn't escaped, and
// the final replace reverses the escaping so the user's literal characters
// still show up in the PDF text instead of a stray backslash.
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/(?<!\\)\*\*(.*?)(?<!\\)\*\*/g, "$1")
    .replace(/(?<!\\)\[(.*?)\]\((?:.*?)\)/g, "$1")
    .replace(/\\([\\`*_[\]()~#>+-])/g, "$1")
    .trim();
}

export type Block = {
  kind: "heading1" | "heading2" | "rule" | "list" | "bold" | "paragraph";
  text: string;
};

export function classifyBlock(rawBlock: string): Block {
  const text = rawBlock.trim();
  if (text === "---") return { kind: "rule", text };
  if (text.startsWith("# ")) return { kind: "heading1", text: text.slice(2) };
  if (text.startsWith("## ")) return { kind: "heading2", text: text.slice(3) };
  if (text.startsWith("- ")) return { kind: "list", text };
  if (/^\*\*(.+)(?<!\\)\*\*$/.test(text)) return { kind: "bold", text: text.slice(2, -2) };
  return { kind: "paragraph", text };
}

// Renders the filled NDA markdown (see lib/nda.ts) directly as PDF text.
// Inline formatting like bold is flattened, since this document's structure
// (headings, bold-only lines, and single-paragraph clauses) reads clearly
// even without mixed bold/normal runs within a line.
export function generateNdaPdf(markdown: string, filename: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;

  function ensureSpace(lineCount: number) {
    if (y + lineCount * LINE_HEIGHT_MM > PAGE_HEIGHT_MM - MARGIN_MM) {
      pdf.addPage();
      y = MARGIN_MM;
    }
  }

  // Writes `lines`, breaking across as many pages as needed. A block long
  // enough to exceed a single page (a pasted multi-paragraph address or
  // purpose, say) used to be handed to a single pdf.text() call after only
  // one page-break check, so anything past the first page's worth ran off
  // the bottom margin instead of continuing onto a further page.
  function writeLines(lines: string[], indentMm: number, spacingAfterMm: number) {
    let remaining = lines;
    while (remaining.length > 0) {
      ensureSpace(1);
      const availableLines = Math.max(
        1,
        Math.floor((PAGE_HEIGHT_MM - MARGIN_MM - y) / LINE_HEIGHT_MM)
      );
      const chunk = remaining.slice(0, availableLines);
      pdf.text(chunk, MARGIN_MM + indentMm, y);
      y += chunk.length * LINE_HEIGHT_MM;
      remaining = remaining.slice(chunk.length);
    }
    y += spacingAfterMm;
  }

  const blocks = markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(classifyBlock);

  for (const block of blocks) {
    switch (block.kind) {
      case "heading1":
        pdf.setFont("times", "bold");
        pdf.setFontSize(18);
        writeLines(pdf.splitTextToSize(block.text, CONTENT_WIDTH_MM), 0, 6);
        break;
      case "heading2":
        pdf.setFont("times", "bold");
        pdf.setFontSize(14);
        writeLines(pdf.splitTextToSize(block.text, CONTENT_WIDTH_MM), 0, 5);
        break;
      case "rule":
        ensureSpace(1);
        pdf.setDrawColor(200);
        pdf.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
        y += LINE_HEIGHT_MM;
        break;
      case "list":
        pdf.setFont("times", "normal");
        pdf.setFontSize(11);
        for (const rawLine of block.text.split("\n")) {
          const bullet = `-  ${stripInlineMarkdown(rawLine.replace(/^-\s*/, ""))}`;
          writeLines(pdf.splitTextToSize(bullet, CONTENT_WIDTH_MM - 4), 4, 1);
        }
        y += 3;
        break;
      case "bold":
        pdf.setFont("times", "bold");
        pdf.setFontSize(11);
        writeLines(pdf.splitTextToSize(stripInlineMarkdown(block.text), CONTENT_WIDTH_MM), 0, 4);
        break;
      case "paragraph":
        pdf.setFont("times", "normal");
        pdf.setFontSize(11);
        writeLines(
          pdf.splitTextToSize(stripInlineMarkdown(block.text), CONTENT_WIDTH_MM),
          0,
          4
        );
        break;
    }
  }

  pdf.save(filename);
}
