import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawd Files",
  description: "Self-hosted file sharing from the deep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-bg text-text font-body antialiased">
        {children}
      </body>
    </html>
  );
}
