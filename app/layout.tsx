import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Car Index",
    template: "%s · Car Index",
  },
  description:
    "A hand-written reference of real cars — sports cars, hypercars, racing prototypes and everyday cars — with published figures, their sources, and a page for every manufacturer.",
};

const NAV = [
  { href: "/cars", label: "Cars" },
  { href: "/brands", label: "Brands" },
  { href: "/garage", label: "Simulator" },
  { href: "/methods", label: "Methods" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              Car <span className="text-amber-400">Index</span>
            </Link>
            <div className="flex gap-4 text-sm text-slate-400">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-slate-100">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl border-t border-white/10 px-6 py-10 text-xs leading-relaxed text-slate-500">
          <p>
            Car and brand names are used to refer to the products they name. Specifications are
            facts published by the manufacturer or measured by an independent tester, and each
            car page says which and cites its sources. No logos or manufacturer photographs are
            reproduced anywhere on this site.
          </p>
          <p className="mt-2">
            The simulator section is a separate thing entirely: every number it produces is a
            modelled estimate, shown as a range, and is not a measured result.
          </p>
        </footer>
      </body>
    </html>
  );
}
