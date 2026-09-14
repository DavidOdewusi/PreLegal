"use client";

import { useMemo, useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaDocument } from "@/components/NdaDocument";
import {
  buildFilledDocument,
  countCompletedFields,
  emptyNdaFormData,
  type NdaFormData,
} from "@/lib/nda";

// Filenames can't contain these characters on Windows, and browsers vary in
// how they handle them (some silently drop the rest of the name, some
// interpret "/" as a path separator), so a legal name like "Smith & Jones,
// LLC" or "A/B Testing Corp." needs them stripped before it lands in a
// download filename.
function sanitizeForFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-");
}

export function NdaBuilder({ templateMarkdown }: { templateMarkdown: string }) {
  const [formData, setFormData] = useState<NdaFormData>(emptyNdaFormData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filledMarkdown = useMemo(
    () => buildFilledDocument(templateMarkdown, formData),
    [templateMarkdown, formData]
  );

  const { completed, total } = useMemo(() => countCompletedFields(formData), [formData]);

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const { generateNdaPdf } = await import("@/lib/pdf");
      const partyAName = sanitizeForFilename(formData.partyA.legalName) || "Party-A";
      const partyBName = sanitizeForFilename(formData.partyB.legalName) || "Party-B";
      generateNdaPdf(filledMarkdown, `Mutual-NDA-${partyAName}-${partyBName}.pdf`);
    } catch {
      setDownloadError("Couldn't generate the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      <div className="lg:w-[40%]">
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-ink">Agreement details</h2>
            <span className="text-xs text-muted">
              {completed} of {total} fields
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-seal transition-[width] duration-300 ease-out"
              style={{ width: `${total === 0 ? 0 : (completed / total) * 100}%` }}
            />
          </div>
        </div>
        <NdaForm value={formData} onChange={setFormData} />
      </div>

      <div className="lg:flex lg:h-[calc(100vh-3rem)] lg:w-[60%] lg:flex-col lg:sticky lg:top-6">
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <h2 className="text-sm font-medium text-ink">Preview</h2>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-md bg-seal px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-seal-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            {downloadError ? (
              <p role="alert" className="text-xs text-seal-dark">
                {downloadError}
              </p>
            ) : null}
          </div>
        </div>
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:pb-6">
          <NdaDocument markdown={filledMarkdown} />
        </div>
      </div>
    </div>
  );
}
