import { NdaBuilder } from "@/components/NdaBuilder";
import { loadMutualNdaTemplate } from "@/lib/loadTemplate";

export default async function Home() {
  const templateMarkdown = await loadMutualNdaTemplate();

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 shrink-0">
              <rect width="32" height="32" rx="7" fill="var(--ink)" />
              <path d="M9 8.5H20.5L23 11V23.5H9V8.5Z" fill="var(--paper)" />
              <circle cx="16" cy="17" r="3.4" fill="var(--seal)" />
              <path
                d="M14.6 17L15.6 18L17.6 15.8"
                stroke="var(--paper)"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[15px] font-medium tracking-tight text-ink">PreLegal</span>
          </div>
          <span className="rounded-full bg-seal-tint px-3 py-1 text-xs font-medium text-seal-dark">
            Mutual NDA
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Mutual NDA creator</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Fill in both parties&rsquo; details and the deal terms. The Common Paper standard MNDA
            on the right updates as you type, ready to sign and download.
          </p>
        </div>
        <NdaBuilder templateMarkdown={templateMarkdown} />
      </main>
    </div>
  );
}
