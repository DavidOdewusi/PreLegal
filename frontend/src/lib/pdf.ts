import jsPDF from "jspdf";

const PAGE_WIDTH_MM = 210; // A4
const PAGE_HEIGHT_MM = 297; // A4
const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const LINE_HEIGHT_MM = 6;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

type Block = { kind: "heading1" | "heading2" | "rule" | "list" | "bold" | "paragraph"; text: string };

function classifyBlock(rawBlock: string): Block {
  const text = rawBlock.trim();
  if (text === "---") return { kind: "rule", text };
  if (text.startsWith("# ")) return { kind: "heading1", text: text.slice(2) };
  if (text.startsWith("## ")) return { kind: "heading2", text: text.slice(3) };
  if (text.startsWith("- ")) return { kind: "list", text };
  if (/^\*\*(.+)\*\*$/.test(text)) return { kind: "bold", text: text.slice(2, -2) };
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

  function writeLines(lines: string[], indentMm: number, spacingAfterMm: number) {
    ensureSpace(lines.length);
    pdf.text(lines, MARGIN_MM + indentMm, y);
    y += lines.length * LINE_HEIGHT_MM + spacingAfterMm;
  }

  const blocks = markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(classifyBlock);

  for (const block of blocks) {
    switch (block.kind) {
      case "heading1":
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        writeLines(pdf.splitTextToSize(block.text, CONTENT_WIDTH_MM), 0, 6);
        break;
      case "heading2":
        pdf.setFont("helvetica", "bold");
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
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        for (const rawLine of block.text.split("\n")) {
          const bullet = `-  ${stripInlineMarkdown(rawLine.replace(/^-\s*/, ""))}`;
          writeLines(pdf.splitTextToSize(bullet, CONTENT_WIDTH_MM - 4), 4, 1);
        }
        y += 3;
        break;
      case "bold":
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        writeLines(pdf.splitTextToSize(stripInlineMarkdown(block.text), CONTENT_WIDTH_MM), 0, 4);
        break;
      case "paragraph":
        pdf.setFont("helvetica", "normal");
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
