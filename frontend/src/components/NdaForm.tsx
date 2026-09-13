"use client";

import type { NdaFormData, PartyDetails } from "@/lib/nda";

type PartyFieldKey = keyof PartyDetails;
type TopLevelFieldKey = Exclude<keyof NdaFormData, "partyA" | "partyB">;

const partyFields: { key: PartyFieldKey; label: string; type: "text" | "textarea" }[] = [
  { key: "legalName", label: "Legal Name", type: "text" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "signatoryName", label: "Signatory Name", type: "text" },
  { key: "signatoryTitle", label: "Signatory Title", type: "text" },
  { key: "signatoryEmail", label: "Signatory Email", type: "text" },
];

const termFields: { key: TopLevelFieldKey; label: string; type: "text" | "textarea" | "date" }[] = [
  { key: "effectiveDate", label: "Effective Date", type: "date" },
  { key: "purpose", label: "Purpose", type: "textarea" },
  { key: "mndaTerm", label: "MNDA Term", type: "text" },
  { key: "confidentialityTerm", label: "Term of Confidentiality", type: "text" },
  { key: "governingLaw", label: "Governing Law", type: "text" },
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
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      )}
    </label>
  );
}

function PartyFieldset({
  label,
  party,
  onChange,
}: {
  label: string;
  party: PartyDetails;
  onChange: (party: PartyDetails) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 font-semibold text-zinc-900 dark:text-zinc-100">{label}</legend>
      {partyFields.map(({ key, label: fieldLabel, type }) => (
        <Field
          key={key}
          id={`${label}-${key}`}
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
    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PartyFieldset
          label="Party A"
          party={value.partyA}
          onChange={(partyA) => onChange({ ...value, partyA })}
        />
        <PartyFieldset
          label="Party B"
          party={value.partyB}
          onChange={(partyB) => onChange({ ...value, partyB })}
        />
      </div>
      <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 font-semibold text-zinc-900 dark:text-zinc-100">
          Agreement Terms
        </legend>
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
