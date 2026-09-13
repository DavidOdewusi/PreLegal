import { NdaBuilder } from "@/components/NdaBuilder";
import { loadMutualNdaTemplate } from "@/lib/loadTemplate";

export default async function Home() {
  const templateMarkdown = await loadMutualNdaTemplate();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mutual NDA Creator
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Enter the details below to generate a Mutual Non-Disclosure Agreement based on the
            Common Paper standard MNDA, then download it as a PDF.
          </p>
        </header>
        <NdaBuilder templateMarkdown={templateMarkdown} />
      </main>
    </div>
  );
}
