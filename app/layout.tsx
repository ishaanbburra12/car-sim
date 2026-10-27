import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Two families, split by what the reader does with them: Archivo for the
// figures and labels you scan, a serif for the writing you actually read.
const ui = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const prose = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-prose",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Car Index", template: "%s · Car Index" },
  description:
    "A written reference of real cars — sports cars, hypercars, racing prototypes and everyday cars — with published figures, where each one came from, and a page for every manufacturer.",
};

const NAV = [
  { href: "/cars", label: "Cars" },
  { href: "/brands", label: "Brands" },
  { href: "/concepts", label: "Ideas" },
  { href: "/garage", label: "Simulator" },
  { href: "/methods", label: "Methods" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${prose.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="border-b" style={{ borderColor: "var(--rule)" }}>
          <nav className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-x-7 gap-y-2 px-6 py-5">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">
              Car Index
            </Link>
            <div className="flex gap-6 text-sm" style={{ color: "var(--ink-2)" }}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        {children}
        <footer
          className="mx-auto mt-20 max-w-5xl border-t px-6 py-10 text-[13px] leading-relaxed"
          style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
        >
          <p className="max-w-[68ch]">
            Car and brand names are used to refer to the products they name. Every
            specification is one the manufacturer published or an independent tester
            measured, and each car page says which and cites its sources. No logos or
            manufacturer photographs appear anywhere on this site.
          </p>
          <p className="mt-3 max-w-[68ch]">
            The simulator is a separate thing: everything it produces is a modelled
            estimate shown as a range, not a measured result.
          </p>
        </footer>
      </body>
    </html>
  );
}
