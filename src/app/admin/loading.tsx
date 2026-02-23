import { PageShell } from "@/components/page-shell";
import {
  Bone,
  BoneText,
  BoneHeading,
  BoneCard,
  BoneTableRow,
  SectionHeader,
} from "@/components/skeleton";

export default function AdminLoading() {
  return (
    <PageShell>
      <div className="py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <SectionHeader width="w-16" dotColor="bg-accent-warm/60" />
          <BoneHeading width="w-64" className="mt-6" />
          <BoneText width="w-80" className="mt-3" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BoneCard key={i}>
              <div className="flex items-center gap-2 mb-3">
                <Bone className="h-3 w-3" />
                <BoneText width="w-16" className="h-3" />
              </div>
              <Bone className="h-9 w-20" />
            </BoneCard>
          ))}
        </div>

        {/* API Keys table */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <BoneHeading width="w-24" className="h-6" />
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Prefix</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Name</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Created</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Last Used</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Buckets</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <BoneTableRow
                      key={i}
                      cols={["w-20", "w-28", "w-16", "w-16", "w-8", "w-16"]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Buckets table */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <BoneHeading width="w-20" className="h-6" />
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">ID</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Name</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Owner</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Files</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Created</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Expires</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Status</th>
                    <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <BoneTableRow
                      key={i}
                      cols={[
                        "w-20",
                        "w-28",
                        "w-20",
                        "w-8",
                        "w-16",
                        "w-16",
                        "w-16",
                        "w-16",
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
