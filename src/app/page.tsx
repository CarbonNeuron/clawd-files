import { PageShell } from "@/components/page-shell";

export default function Home() {
  return (
    <PageShell>
      <div className="flex flex-1 flex-col items-center justify-center py-32">
        <h1 className="text-5xl tracking-tight text-text sm:text-6xl">
          Clawd Files
        </h1>
        <p className="mt-4 text-lg text-text-muted font-body">
          Coming Soon
        </p>
        <div className="mt-8 h-px w-24 bg-accent/30" />
        <p className="mt-6 max-w-md text-center text-sm text-text-muted leading-relaxed">
          Self-hosted file sharing from the deep. Upload, organize, and share
          files with expiring buckets and API-first design.
        </p>
      </div>
    </PageShell>
  );
}
