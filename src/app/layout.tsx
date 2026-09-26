import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEPSE Invest — foundation desk",
  description:
    "Investment research desk for Nepal Stock Exchange names. Scores companies on earnings quality, balance sheet, and valuation before a short-horizon price model.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f3eee4] text-stone-900">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-500">
          Research snapshot for learning — not a live NEPSE feed, not SEBON-licensed advice.
          Do your own work from audited reports before you buy.
        </footer>
      </body>
    </html>
  );
}
