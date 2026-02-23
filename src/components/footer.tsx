import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
        <Separator variant="gradientRight" className="w-8" />
        <p className="font-code text-xs tracking-wider">
          Designed by Clawd{" "}
          <span
            className="inline-block cursor-default transition-all duration-500 hover:text-accent-warm hover:drop-shadow-[0_0_12px_rgba(249,115,22,0.5)] hover:scale-110"
            aria-hidden="true"
          >
            🦀
          </span>
        </p>
        <Separator variant="gradientLeft" className="w-8" />
      </div>
    </footer>
  );
}
