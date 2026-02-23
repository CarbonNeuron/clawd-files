import { PageShell } from "@/components/page-shell";
import {
  Bone,
  BoneText,
  BoneHeading,
  BoneBadge,
  BoneTableRow,
  SectionHeader,
} from "@/components/skeleton";

export default function BucketLoading() {
  return (
    <PageShell>
      {/* Bucket header */}
      <div className="py-8 space-y-5">
        <SectionHeader width="w-16" />

        <BoneHeading width="w-56" className="h-9" />

        <div className="flex items-center gap-2">
          <BoneText width="w-12" className="h-3.5" />
          <BoneText width="w-24" className="h-3.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BoneBadge />
          <BoneBadge />
        </div>

        <Bone className="h-9 w-32 rounded-md" />
      </div>

      {/* Breadcrumb + view toggle */}
      <div className="flex items-center justify-between py-3">
        <BoneText width="w-28" className="h-4" />
        <div className="flex items-center rounded-full border border-border bg-bg/50 p-0.5">
          <Bone className="size-6 rounded-full" />
          <Bone className="size-6 rounded-full" />
        </div>
      </div>

      {/* File tree table */}
      <div className="rounded-lg border border-border overflow-hidden bg-surface/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/30">
                <th className="text-left text-text-muted font-code text-xs uppercase tracking-wider px-4 py-2">Name</th>
                <th className="text-left text-text-muted w-20 text-right font-code text-xs uppercase tracking-wider hidden sm:table-cell px-4 py-2">
                  Type
                </th>
                <th className="text-left text-text-muted w-24 text-right font-code text-xs uppercase tracking-wider px-4 py-2">
                  Size
                </th>
                <th className="text-left text-text-muted w-44 text-right font-code text-xs uppercase tracking-wider hidden md:table-cell px-4 py-2">
                  Modified
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <BoneTableRow
                  key={i}
                  cols={["w-40", "w-10", "w-14", "w-28"]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
