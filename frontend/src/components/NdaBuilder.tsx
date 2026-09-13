"use client";

import { useMemo, useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaDocument } from "@/components/NdaDocument";
import { buildFilledDocument, emptyNdaFormData, type NdaFormData } from "@/lib/nda";

export function NdaBuilder({ templateMarkdown }: { templateMarkdown: string }) {
  const [formData, setFormData] = useState<NdaFormData>(emptyNdaFormData);
  const [isDownloading, setIsDownloading] = useState(false);

  const filledMarkdown = useMemo(
    () => buildFilledDocument(templateMarkdown, formData),
    [templateMarkdown, formData]
  );

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const { generateNdaPdf } = await import("@/lib/pdf");
      const partyAName = formData.partyA.legalName || "Party-A";
      const partyBName = formData.partyB.legalName || "Party-B";
      const filename = `Mutual-NDA-${partyAName}-${partyBName}.pdf`.replace(/\s+/g, "-");
      generateNdaPdf(filledMarkdown, filename);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="lg:w-1/2">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Agreement Details
        </h2>
        <NdaForm value={formData} onChange={setFormData} />
      </div>
      <div className="lg:w-1/2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Preview</h2>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isDownloading ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
        <NdaDocument markdown={filledMarkdown} />
      </div>
    </div>
  );
}
