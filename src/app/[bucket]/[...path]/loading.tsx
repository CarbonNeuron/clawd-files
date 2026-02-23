import { PageShell } from "@/components/page-shell";
import {
  Bone,
  BoneText,
  BoneHeading,
  BoneBadge,
} from "@/components/skeleton";

export default function FilePreviewLoading() {
  return (
    <PageShell>
      <div className="space-y-6 py-8">
        {/* Breadcrumbs */}
        <nav className="overflow-x-auto font-code">
          <div className="flex items-center gap-1.5">
            <BoneText width="w-20" className="h-4" />
            <span className="text-text-muted/50">/</span>
            <BoneText width="w-24" className="h-4" />
          </div>
        </nav>

        {/* Filename + badge */}
        <div className="flex items-center gap-3">
          <BoneHeading width="w-48" />
          <BoneBadge />
        </div>

        {/* Metadata bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface/50 px-4 py-3">
          <BoneText width="w-24" className="h-3.5" />
          <span className="text-border">·</span>
          <BoneText width="w-14" className="h-3.5" />
          <span className="text-border">·</span>
          <BoneBadge className="h-4 w-20" />

          <div className="ml-auto flex items-center gap-2">
            <Bone className="h-7 w-24 rounded-md" />
            <Bone className="h-7 w-16 rounded-md" />
          </div>
        </div>

        {/* Curl command */}
        <div className="rounded-lg border border-border bg-bg/50 px-4 py-2.5">
          <BoneText width="w-80" className="h-3.5" />
        </div>

        {/* Code preview skeleton */}
        <div className="rounded-lg border border-border bg-surface/50 overflow-hidden">
          {/* Terminal header dots */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg/30">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-warm/50 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-accent/25 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-border animate-pulse" />
            </div>
            <BoneText width="w-24" className="ml-1 h-3" />
          </div>

          {/* Staggered code lines */}
          <div className="p-4 space-y-2.5">
            <Bone className="h-3.5 w-3/4" />
            <Bone className="h-3.5 w-1/2" />
            <Bone className="h-3.5 w-5/6" />
            <Bone className="h-3.5 w-2/3" />
            <Bone className="h-3.5 w-3/5" />
            <Bone className="h-3.5 w-4/5" />
            <Bone className="h-3.5 w-1/3" />
            <Bone className="h-3.5 w-3/4" />
            <Bone className="h-3.5 w-1/2" />
            <Bone className="h-3.5 w-2/5" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
