import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NdaForm } from "./NdaForm";
import { emptyNdaFormData, type NdaFormData } from "@/lib/nda";

// NdaForm is a controlled component: it renders exactly the `value` it is
// given and never updates on its own. A bare `onChange={vi.fn()}` never
// feeds a new value back in, so typing a second character would still see
// the original (empty) value in the input. This wrapper closes that loop
// the same way NdaBuilder does, so multi-character typing accumulates
// correctly, while still exposing every onChange call to the test.
function ControlledNdaForm({ onChange }: { onChange: (value: NdaFormData) => void }) {
  const [value, setValue] = useState(emptyNdaFormData);
  return (
    <NdaForm
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("NdaForm", () => {
  it("renders a fieldset for each party plus one for agreement terms", () => {
    render(<NdaForm value={emptyNdaFormData} onChange={vi.fn()} />);

    expect(screen.getByRole("group", { name: /Party A/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Party B/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Agreement terms/i })).toBeInTheDocument();
  });

  it("renders the A/B badges for each party", () => {
    render(<NdaForm value={emptyNdaFormData} onChange={vi.fn()} />);

    const partyA = screen.getByRole("group", { name: /Party A/i });
    const partyB = screen.getByRole("group", { name: /Party B/i });
    expect(within(partyA).getByText("A")).toBeInTheDocument();
    expect(within(partyB).getByText("B")).toBeInTheDocument();
  });

  it("pre-fills the default MNDA term and confidentiality term", () => {
    render(<NdaForm value={emptyNdaFormData} onChange={vi.fn()} />);

    expect(screen.getByLabelText("MNDA term")).toHaveValue("2 years from the Effective Date");
    expect(screen.getByLabelText("Term of confidentiality")).toHaveValue(
      "3 years from the date of disclosure"
    );
  });

  it("calls onChange with an updated partyA when typing into a Party A field, without touching Party B", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ControlledNdaForm onChange={handleChange} />);

    const partyA = screen.getByRole("group", { name: /Party A/i });
    await user.type(within(partyA).getByLabelText("Legal name"), "Acme");

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls.at(-1)![0];
    expect(lastCall.partyA.legalName).toBe("Acme");
    expect(lastCall.partyB).toEqual(emptyNdaFormData.partyB);
  });

  it("calls onChange with an updated top-level term field", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ControlledNdaForm onChange={handleChange} />);

    await user.type(screen.getByLabelText("Governing law"), "Delaware");

    const lastCall = handleChange.mock.calls.at(-1)![0];
    expect(lastCall.governingLaw).toBe("Delaware");
  });

  it("reflects externally-updated values (controlled component)", () => {
    const { rerender } = render(<NdaForm value={emptyNdaFormData} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Jurisdiction")).toHaveValue("");

    rerender(
      <NdaForm
        value={{ ...emptyNdaFormData, jurisdiction: "Wilmington, Delaware" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Jurisdiction")).toHaveValue("Wilmington, Delaware");
  });
});
