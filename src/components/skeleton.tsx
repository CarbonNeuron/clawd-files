function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Bone({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("animate-pulse rounded bg-surface", className)}
    />
  );
}

export function BoneText({
  width = "w-24",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Bone className={cn("h-4", width, className)} />;
}

export function BoneHeading({
  width = "w-48",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Bone className={cn("h-8", width, className)} />;
}

export function BoneBadge({ className }: { className?: string }) {
  return <Bone className={cn("h-5 w-16 rounded-md", className)} />;
}

export function BoneCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface/80 p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BoneTableRow({
  cols,
  className,
}: {
  cols: string[];
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-border/50", className)}>
      {cols.map((w, i) => (
        <td key={i} className="px-4 py-2">
          <Bone className={cn("h-4 rounded", w)} />
        </td>
      ))}
    </tr>
  );
}

export function SectionHeader({
  width = "w-32",
  dotColor = "bg-accent/60",
}: {
  width?: string;
  dotColor?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full animate-pulse",
          dotColor
        )}
      />
      <Bone className={cn("h-3", width)} />
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}
