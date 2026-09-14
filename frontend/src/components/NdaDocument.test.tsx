import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NdaDocument } from "./NdaDocument";

describe("NdaDocument", () => {
  it("renders markdown headings as real heading elements", () => {
    render(<NdaDocument markdown={"# Cover Page\n\n## Mutual Non-Disclosure Agreement"} />);

    expect(screen.getByRole("heading", { level: 1, name: "Cover Page" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Mutual Non-Disclosure Agreement" })
    ).toBeInTheDocument();
  });

  it("renders an ordered list for numbered clauses, preserving document order", () => {
    const markdown = [
      "1. **Introduction**. First clause.",
      "2. **Use**. Second clause.",
      "3. **Exceptions**. Third clause.",
    ].join("\n");
    render(<NdaDocument markdown={markdown} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Introduction");
    expect(items[1]).toHaveTextContent("Use");
    expect(items[2]).toHaveTextContent("Exceptions");
  });

  it("renders bullet lists from the cover page (e.g. Effective Date, Purpose)", () => {
    const markdown = "- **Effective Date:** 2026-10-01\n- **Purpose:** Evaluating a deal.";
    render(<NdaDocument markdown={markdown} />);

    expect(screen.getByText("Evaluating a deal.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders bold text produced by nda.ts as strong emphasis", () => {
    render(<NdaDocument markdown={"**Party A: Acme Robotics, Inc.**"} />);

    const strong = screen.getByText("Party A: Acme Robotics, Inc.");
    expect(strong.tagName.toLowerCase()).toBe("strong");
  });

  it("renders bracketed placeholders as plain text when a field is blank", () => {
    render(<NdaDocument markdown={"Party A: [Party A Legal Name]"} />);

    expect(screen.getByText("Party A: [Party A Legal Name]")).toBeInTheDocument();
  });

  it("renders GFM tables if the underlying markdown ever includes one", () => {
    const markdown = ["| A | B |", "| - | - |", "| 1 | 2 |"].join("\n");
    render(<NdaDocument markdown={markdown} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
