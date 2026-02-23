import { Footer } from "@/components/footer";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
