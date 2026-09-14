import { describe, expect, it } from "vitest";
import {
  buildCoverPage,
  buildFilledDocument,
  countCompletedFields,
  emptyNdaFormData,
  fillStandardTerms,
  type NdaFormData,
  type PartyDetails,
} from "./nda";

const party = (overrides: Partial<PartyDetails> = {}): PartyDetails => ({
  legalName: "",
  address: "",
  signatoryName: "",
  signatoryTitle: "",
  signatoryEmail: "",
  ...overrides,
});

const filledParty: PartyDetails = {
  legalName: "Acme Robotics, Inc.",
  address: "500 Market Street, San Francisco, CA",
  signatoryName: "Jordan Lee",
  signatoryTitle: "VP of Engineering",
  signatoryEmail: "jordan.lee@acmerobotics.com",
};

const filledFormData: NdaFormData = {
  partyA: filledParty,
  partyB: {
    ...filledParty,
    legalName: "Nimbus Data Systems LLC",
    signatoryEmail: "priya@nimbusdata.io",
  },
  effectiveDate: "2026-10-01",
  purpose: "Evaluating a potential integration.",
  mndaTerm: "2 years from the Effective Date",
  confidentialityTerm: "3 years from the date of disclosure",
  governingLaw: "Delaware",
  jurisdiction: "Wilmington, Delaware",
};

describe("emptyNdaFormData", () => {
  it("starts with blank parties and sensible default terms", () => {
    expect(emptyNdaFormData.partyA).toEqual(party());
    expect(emptyNdaFormData.partyB).toEqual(party());
    expect(emptyNdaFormData.effectiveDate).toBe("");
    expect(emptyNdaFormData.mndaTerm).toBe("2 years from the Effective Date");
    expect(emptyNdaFormData.confidentialityTerm).toBe("3 years from the date of disclosure");
  });
});

describe("countCompletedFields", () => {
  it("counts zero completed fields out of 16 for a blank form except the two defaults", () => {
    // emptyNdaFormData ships with mndaTerm/confidentialityTerm pre-filled.
    const { completed, total } = countCompletedFields(emptyNdaFormData);
    expect(total).toBe(16);
    expect(completed).toBe(2);
  });

  it("counts every field as complete when the form is fully filled in", () => {
    const { completed, total } = countCompletedFields(filledFormData);
    expect(completed).toBe(total);
    expect(total).toBe(16);
  });

  it("treats whitespace-only values as incomplete", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyA: party({ legalName: "   " }),
      purpose: "\t\n",
    };
    const { completed } = countCompletedFields(data);
    // Only the two default term fields should count; the whitespace fields should not.
    expect(completed).toBe(2);
  });

  it("counts partial completion correctly", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyA: party({ legalName: "Acme Robotics, Inc." }),
      governingLaw: "Delaware",
    };
    // 1 (partyA.legalName) + 2 (default mndaTerm/confidentialityTerm) + 1 (governingLaw) = 4
    const { completed } = countCompletedFields(data);
    expect(completed).toBe(4);
  });
});

describe("fillStandardTerms", () => {
  const template =
    'Use the info for <span class="coverpage_link">Purpose</span> under ' +
    '<span class="coverpage_link">Governing Law</span> law.';

  it("replaces known coverpage_link spans with bold values", () => {
    const result = fillStandardTerms(template, filledFormData);
    expect(result).toContain("**Evaluating a potential integration.**");
    expect(result).toContain("**Delaware**");
    expect(result).not.toContain("coverpage_link");
  });

  it("falls back to a bracketed placeholder for blank fields", () => {
    const result = fillStandardTerms(template, emptyNdaFormData);
    expect(result).toContain("**[Purpose]**");
    expect(result).toContain("**[Governing Law]**");
  });

  it("leaves unrecognized span fields untouched", () => {
    const withUnknownField =
      'See <span class="coverpage_link">Some Unknown Field</span> for details.';
    const result = fillStandardTerms(withUnknownField, filledFormData);
    expect(result).toBe(withUnknownField);
  });

  it("leaves markdown without coverpage_link spans unchanged", () => {
    const plain = "# Standard Terms\n\nNo placeholders here.";
    expect(fillStandardTerms(plain, filledFormData)).toBe(plain);
  });
});

describe("buildCoverPage", () => {
  it("renders placeholder brackets for every blank field", () => {
    const coverPage = buildCoverPage(emptyNdaFormData);
    expect(coverPage).toContain("[Party A Legal Name]");
    expect(coverPage).toContain("[Party A Address]");
    expect(coverPage).toContain("[Party A Signatory Name]");
    expect(coverPage).toContain("[Party A Signatory Title]");
    expect(coverPage).toContain("[Party A Signatory Email]");
    expect(coverPage).toContain("[Party B Legal Name]");
    expect(coverPage).toContain("[Effective Date]");
    expect(coverPage).toContain("[Purpose]");
    expect(coverPage).toContain("[Governing Law]");
    expect(coverPage).toContain("[Jurisdiction]");
  });

  it("renders actual party and term values when the form is filled in", () => {
    const coverPage = buildCoverPage(filledFormData);
    expect(coverPage).toContain("Party A: Acme Robotics, Inc.");
    expect(coverPage).toContain("Party B: Nimbus Data Systems LLC");
    expect(coverPage).toContain(
      "Signatory: Jordan Lee, VP of Engineering (jordan.lee@acmerobotics.com)"
    );
    expect(coverPage).toContain("**Effective Date:** 2026-10-01");
    expect(coverPage).toContain("**Governing Law:** Delaware");
    expect(coverPage).not.toMatch(/\[Party [AB]/);
  });

  it("includes a signature block for both parties", () => {
    const coverPage = buildCoverPage(emptyNdaFormData);
    expect(coverPage).toContain("**Party A Signature:**");
    expect(coverPage).toContain("**Party B Signature:**");
  });
});

describe("markdown injection safety", () => {
  // A party's free-text fields (address, purpose, etc.) end up as their own
  // markdown blocks or inline runs. Without escaping, a value that happens
  // to look like markdown syntax would restructure the generated document
  // instead of appearing as the literal text the user typed.
  it("stops a '---' address from becoming a horizontal rule", () => {
    const data: NdaFormData = { ...emptyNdaFormData, partyA: party({ address: "---" }) };
    const coverPage = buildCoverPage(data);

    // The escaped form should survive as literal text, not a bare "---"
    // line (which react-markdown/remark would render as an <hr>).
    expect(coverPage).toContain("\\---");
    expect(coverPage).not.toMatch(/\n---\n/);
  });

  it("stops a leading '#', '>', or '+' from being read as a heading, quote, or list", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyA: party({ address: "# Not a heading" }),
      partyB: party({ address: "> Not a quote" }),
      purpose: "+ Not a list item",
    };
    const coverPage = buildCoverPage(data);

    expect(coverPage).toContain("\\# Not a heading");
    expect(coverPage).toContain("\\> Not a quote");
    expect(coverPage).toContain("\\+ Not a list item");
  });

  it("escapes '**' in user text so it can't break out of the bold wrapper it's embedded in", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyA: party({ legalName: "Acme **Robotics**, Inc." }),
    };
    const coverPage = buildCoverPage(data);

    // The outer bold wrapper nda.ts adds is real; the user's own "**" must
    // be escaped so it doesn't prematurely close it.
    expect(coverPage).toContain("**Party A: Acme \\*\\*Robotics\\*\\*, Inc.**");
  });

  it("does not escape ordinary punctuation like hyphens in dates or periods in abbreviations", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      effectiveDate: "2026-10-01",
      partyA: party({ legalName: "Acme Robotics, Inc." }),
    };
    const coverPage = buildCoverPage(data);

    expect(coverPage).toContain("**Effective Date:** 2026-10-01");
    expect(coverPage).toContain("Party A: Acme Robotics, Inc.");
  });

  it("escapes dangerous characters inside fillStandardTerms substitutions too", () => {
    const template = 'Only for <span class="coverpage_link">Purpose</span>.';
    const data: NdaFormData = { ...emptyNdaFormData, purpose: "---" };

    const result = fillStandardTerms(template, data);
    expect(result).toContain("**\\---**");
  });
});

describe("buildFilledDocument", () => {
  it("joins the cover page and the filled standard terms with a horizontal rule", () => {
    const template =
      '# Standard Terms\n\n1. **Purpose**. Use for <span class="coverpage_link">Purpose</span>.';
    const document = buildFilledDocument(template, filledFormData);

    expect(document).toContain("# Cover Page");
    expect(document).toContain("\n---\n\n");
    expect(document).toContain("# Standard Terms");
    expect(document).toContain("**Evaluating a potential integration.**");
    // Cover page content must appear before the Standard Terms section.
    expect(document.indexOf("# Cover Page")).toBeLessThan(document.indexOf("# Standard Terms"));
  });
});
