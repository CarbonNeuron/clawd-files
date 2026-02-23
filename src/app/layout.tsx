import type { Metadata } from "next";
import { JetBrains_Mono, Roboto, Noto_Color_Emoji } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawd Files",
  description: "Self-hosted file sharing from the deep",
};

// Google Fonts configuration
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "Cascadia Code", "SF Mono", "Menlo", "Consolas", "monospace"],
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const notoColorEmoji = Noto_Color_Emoji({
  subsets: ["emoji"],
  weight: "400",
  variable: "--font-noto-emoji",
  display: "swap",
  fallback: ["Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={`bg-bg text-text font-body antialiased ${jetbrainsMono.variable} ${roboto.variable} ${notoColorEmoji.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
