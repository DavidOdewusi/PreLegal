import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NdaBuilder } from "./NdaBuilder";

const generateNdaPdf = vi.fn();
vi.mock("@/lib/pdf", () => ({
  generateNdaPdf: (...args: unknown[]) => generateNdaPdf(...args),
}));

// A tiny stand-in for the real Common Paper template: enough structure
// (a heading and a coverpage_link span) to exercise buildFilledDocument
// without depending on the full Mutual-NDA.md content in a component test.
const templateMarkdown =
  '# Standard Terms\n\n1. **Purpose**. Use only for <span class="coverpage_link">Purpose</span>.';

describe("NdaBuilder", () => {
  beforeEach(() => {
    generateNdaPdf.mockClear();
  });

  it("shows the two default term fields as already complete out of 16", () => {
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    expect(screen.getByText("2 of 16 fields")).toBeInTheDocument();
  });

  it("shows placeholder brackets in the preview before any field is filled in", () => {
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    expect(screen.getByText(/\[Party A Legal Name\]/)).toBeInTheDocument();
  });

  it("updates the preview and the progress count as the user fills in fields", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    const partyA = screen.getByRole("group", { name: /Party A/i });
    await user.type(within(partyA).getByLabelText("Legal name"), "Acme Robotics, Inc.");

    expect(screen.getByText("3 of 16 fields")).toBeInTheDocument();
    expect(screen.getByText(/Party A: Acme Robotics, Inc\./)).toBeInTheDocument();
    expect(screen.queryByText(/\[Party A Legal Name\]/)).not.toBeInTheDocument();
  });

  it("downloads the PDF with a filename derived from both parties' legal names", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    const partyA = screen.getByRole("group", { name: /Party A/i });
    const partyB = screen.getByRole("group", { name: /Party B/i });
    await user.type(within(partyA).getByLabelText("Legal name"), "Acme Robotics");
    await user.type(within(partyB).getByLabelText("Legal name"), "Nimbus Data");

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(generateNdaPdf).toHaveBeenCalledTimes(1);
    const [, filename] = generateNdaPdf.mock.calls[0];
    expect(filename).toBe("Mutual-NDA-Acme-Robotics-Nimbus-Data.pdf");
  });

  it("falls back to generic party labels in the filename when legal names are blank", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(generateNdaPdf).toHaveBeenCalledTimes(1);
    const [, filename] = generateNdaPdf.mock.calls[0];
    expect(filename).toBe("Mutual-NDA-Party-A-Party-B.pdf");
  });

  it("strips filesystem-unsafe characters from legal names before building the filename", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    const partyA = screen.getByRole("group", { name: /Party A/i });
    const partyB = screen.getByRole("group", { name: /Party B/i });
    await user.type(within(partyA).getByLabelText("Legal name"), "Smith & Jones, LLC");
    await user.type(within(partyB).getByLabelText("Legal name"), "A/B Testing Corp.");

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    const [, filename] = generateNdaPdf.mock.calls[0];
    expect(filename).toBe("Mutual-NDA-Smith-&-Jones,-LLC-AB-Testing-Corp..pdf");
  });

  it("shows an inline error and re-enables the button if PDF generation throws", async () => {
    generateNdaPdf.mockImplementationOnce(() => {
      throw new Error("jsPDF exploded");
    });
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't generate the pdf/i);
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("clears a previous error on the next successful download", async () => {
    generateNdaPdf.mockImplementationOnce(() => {
      throw new Error("jsPDF exploded");
    });
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("passes the fully-built markdown document to generateNdaPdf", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    const [markdown] = generateNdaPdf.mock.calls[0];
    expect(markdown).toContain("# Cover Page");
    expect(markdown).toContain("# Standard Terms");
  });

  it("returns the button to its normal label after the PDF has been generated", async () => {
    const user = userEvent.setup();
    render(<NdaBuilder templateMarkdown={templateMarkdown} />);

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });
});
