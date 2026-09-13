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

// Maps the field names that appear in the Common Paper coverpage_link spans
// (templates/Mutual-NDA.md) to the value the user entered for that field.
function coverPageValues(data: NdaFormData): Record<string, string> {
  return {
    Purpose: data.purpose || "[Purpose]",
    "Effective Date": data.effectiveDate || "[Effective Date]",
    "MNDA Term": data.mndaTerm || "[MNDA Term]",
    "Term of Confidentiality": data.confidentialityTerm || "[Term of Confidentiality]",
    "Governing Law": data.governingLaw || "[Governing Law]",
    Jurisdiction: data.jurisdiction || "[Jurisdiction]",
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
  const name = party.legalName || `[${label} Legal Name]`;
  const address = party.address || `[${label} Address]`;
  const signatory = party.signatoryName || `[${label} Signatory Name]`;
  const title = party.signatoryTitle || `[${label} Signatory Title]`;
  const email = party.signatoryEmail || `[${label} Signatory Email]`;
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
