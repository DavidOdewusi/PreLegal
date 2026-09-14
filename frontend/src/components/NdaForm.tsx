"use client";

import type { NdaFormData, PartyDetails } from "@/lib/nda";

type PartyFieldKey = keyof PartyDetails;
type TopLevelFieldKey = Exclude<keyof NdaFormData, "partyA" | "partyB">;

const partyFields: { key: PartyFieldKey; label: string; type: "text" | "textarea" }[] = [
  { key: "legalName", label: "Legal name", type: "text" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "signatoryName", label: "Signatory name", type: "text" },
  { key: "signatoryTitle", label: "Signatory title", type: "text" },
  { key: "signatoryEmail", label: "Signatory email", type: "text" },
];

const termFields: { key: TopLevelFieldKey; label: string; type: "text" | "textarea" | "date" }[] = [
  { key: "effectiveDate", label: "Effective date", type: "date" },
  { key: "purpose", label: "Purpose of disclosure", type: "textarea" },
  { key: "mndaTerm", label: "MNDA term", type: "text" },
  { key: "confidentialityTerm", label: "Term of confidentiality", type: "text" },
  { key: "governingLaw", label: "Governing law", type: "text" },
  { key: "jurisdiction", label: "Jurisdiction", type: "text" },
];

function Field({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: "text" | "textarea" | "date";
  value: string;
  onChange: (value: string) => void;
}) {
  const controlClass =
    "rounded-md border border-line bg-white px-3 py-2 text-[14px] text-ink shadow-sm outline-none transition-colors focus:border-seal focus:ring-2 focus:ring-focus-ring/40";
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-soft">{label}</span>
      {type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={controlClass}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={controlClass}
        />
      )}
    </label>
  );
}

function PartyFieldset({
  badge,
  label,
  party,
  onChange,
}: {
  badge: string;
  label: string;
  party: PartyDetails;
  onChange: (party: PartyDetails) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-seal-tint text-[11px] font-semibold text-seal-dark">
          {badge}
        </span>
        <span className="font-medium text-ink">{label}</span>
      </legend>
      {partyFields.map(({ key, label: fieldLabel, type }) => (
        <Field
          key={key}
          id={`${label.toLowerCase().replace(/\s+/g, "-")}-${key}`}
          label={fieldLabel}
          type={type}
          value={party[key]}
          onChange={(value) => onChange({ ...party, [key]: value })}
        />
      ))}
    </fieldset>
  );
}

export function NdaForm({
  value,
  onChange,
}: {
  value: NdaFormData;
  onChange: (value: NdaFormData) => void;
}) {
  return (
    <form className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PartyFieldset
          badge="A"
          label="Party A"
          party={value.partyA}
          onChange={(partyA) => onChange({ ...value, partyA })}
        />
        <PartyFieldset
          badge="B"
          label="Party B"
          party={value.partyB}
          onChange={(partyB) => onChange({ ...value, partyB })}
        />
      </div>
      <div className="h-px bg-line" />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-medium text-ink">Agreement terms</legend>
        {termFields.map(({ key, label, type }) => (
          <Field
            key={key}
            id={key}
            label={label}
            type={type}
            value={value[key]}
            onChange={(fieldValue) => onChange({ ...value, [key]: fieldValue })}
          />
        ))}
      </fieldset>
    </form>
  );
}
