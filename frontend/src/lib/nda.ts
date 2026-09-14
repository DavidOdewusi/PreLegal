export type PartyDetails = {
  legalName: string;
  address: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryEmail: string;
};

export type NdaFormData = {
  partyA: PartyDetails;
  partyB: PartyDetails;
  effectiveDate: string;
  purpose: string;
  mndaTerm: string;
  confidentialityTerm: string;
  governingLaw: string;
  jurisdiction: string;
};

const emptyParty: PartyDetails = {
  legalName: "",
  address: "",
  signatoryName: "",
  signatoryTitle: "",
  signatoryEmail: "",
};

export const emptyNdaFormData: NdaFormData = {
  partyA: { ...emptyParty },
  partyB: { ...emptyParty },
  effectiveDate: "",
  purpose: "",
  mndaTerm: "2 years from the Effective Date",
  confidentialityTerm: "3 years from the date of disclosure",
  governingLaw: "",
  jurisdiction: "",
};

// Counts how many of the form's fields have a non-empty value, so the UI
// can show the user how far along they are in completing the cover page.
export function countCompletedFields(data: NdaFormData): { completed: number; total: number } {
  const partyFieldCount = Object.keys(emptyParty).length;
  const termFieldCount = Object.keys(emptyNdaFormData).length - 2; // minus partyA/partyB
  const total = partyFieldCount * 2 + termFieldCount;

  const countParty = (party: PartyDetails) =>
    Object.values(party).filter((v) => v.trim() !== "").length;

  const { partyA, partyB, ...terms } = data;
  const completed =
    countParty(partyA) +
    countParty(partyB) +
    Object.values(terms).filter((v) => v.trim() !== "").length;

  return { completed, total };
}

// Escapes CommonMark-significant punctuation in free-form user input before
// it's interpolated into the generated markdown. Without this, a party
// whose address is literally "---" would have it rendered as a horizontal
// rule instead of an address, and "**bold**" typed into any field would
// break out of the bold wrapper it's embedded in and corrupt the rest of
// the document's formatting. The on-screen preview (react-markdown) already
// understands backslash-escapes per the CommonMark spec; lib/pdf.ts's own
// lightweight parser is taught to recognize and reverse them too (see
// stripInlineMarkdown/classifyBlock).
//
// Two passes, deliberately not one flat character class:
//  - `*_[]()~ and backslash itself are escaped everywhere, since they can
//    trigger inline formatting (bold, emphasis, links, strikethrough)
//    wherever they appear in a line.
//  - `#>+-` are only escaped when they *lead* a line, since that's the only
//    position where they mean anything (heading, blockquote, list marker,
//    or — for a repeated run of "-" — a thematic break). A hyphen in the
//    middle of a date like "2026-10-01" is never reinterpreted, so leaving
//    it alone keeps the common case free of unnecessary backslashes.
function escapeMarkdown(value: string): string {
  return value
    .replace(/[\\`*_[\]()~]/g, "\\$&")
    .replace(/^([ \t]*)([#>+-])/gm, "$1\\$2");
}

function withPlaceholder(value: string, placeholder: string): string {
  return value ? escapeMarkdown(value) : placeholder;
}

// Maps the field names that appear in the Common Paper coverpage_link spans
// (templates/Mutual-NDA.md) to the value the user entered for that field.
function coverPageValues(data: NdaFormData): Record<string, string> {
  return {
    Purpose: withPlaceholder(data.purpose, "[Purpose]"),
    "Effective Date": withPlaceholder(data.effectiveDate, "[Effective Date]"),
    "MNDA Term": withPlaceholder(data.mndaTerm, "[MNDA Term]"),
    "Term of Confidentiality": withPlaceholder(
      data.confidentialityTerm,
      "[Term of Confidentiality]"
    ),
    "Governing Law": withPlaceholder(data.governingLaw, "[Governing Law]"),
    Jurisdiction: withPlaceholder(data.jurisdiction, "[Jurisdiction]"),
  };
}

const COVERPAGE_LINK_PATTERN =
  /<span class="coverpage_link">([^<]+)<\/span>/g;

// Replaces every <span class="coverpage_link">Field</span> placeholder in the
// Standard Terms markdown with the corresponding value, emitting plain
// markdown bold syntax so the result can be rendered with react-markdown
// without needing to allow raw HTML.
export function fillStandardTerms(templateMarkdown: string, data: NdaFormData): string {
  const values = coverPageValues(data);
  return templateMarkdown.replace(COVERPAGE_LINK_PATTERN, (match, field: string) => {
    const value = values[field];
    return value ? `**${value}**` : match;
  });
}

function partySection(party: PartyDetails, label: string): string {
  const name = withPlaceholder(party.legalName, `[${label} Legal Name]`);
  const address = withPlaceholder(party.address, `[${label} Address]`);
  const signatory = withPlaceholder(party.signatoryName, `[${label} Signatory Name]`);
  const title = withPlaceholder(party.signatoryTitle, `[${label} Signatory Title]`);
  const email = withPlaceholder(party.signatoryEmail, `[${label} Signatory Email]`);
  return `**${label}: ${name}**

${address}

Signatory: ${signatory}, ${title} (${email})`;
}

export function buildCoverPage(data: NdaFormData): string {
  const values = coverPageValues(data);
  return `# Cover Page

## Mutual Non-Disclosure Agreement

${partySection(data.partyA, "Party A")}

${partySection(data.partyB, "Party B")}

- **Effective Date:** ${values["Effective Date"]}
- **Purpose:** ${values.Purpose}
- **MNDA Term:** ${values["MNDA Term"]}
- **Term of Confidentiality:** ${values["Term of Confidentiality"]}
- **Governing Law:** ${values["Governing Law"]}
- **Jurisdiction:** ${values.Jurisdiction}

By signing below, each party agrees to be bound by this Mutual Non-Disclosure Agreement, including the Standard Terms that follow.

**Party A Signature:** ______________________  **Date:** ______________

**Party B Signature:** ______________________  **Date:** ______________
`;
}

export function buildFilledDocument(templateMarkdown: string, data: NdaFormData): string {
  return `${buildCoverPage(data)}\n---\n\n${fillStandardTerms(templateMarkdown, data)}`;
}
