import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantora Pulse Configurator",
  description:
    "Configure a fictional Vantora Pulse and see estimated performance ranges.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <Link href="/garage" className="font-semibold tracking-tight">
              Vantora <span className="text-amber-400">Pulse</span>
            </Link>
            <div className="flex gap-4 text-sm text-slate-400">
              <Link href="/garage" className="hover:text-slate-100">
                Garage
              </Link>
              <Link href="/drive" className="hover:text-slate-100">
                Rev test
              </Link>
              <Link href="/methods" className="hover:text-slate-100">
                Methods
              </Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-500">
          Vantora and Pulse are fictional. Every performance figure on this site is
          a modelled estimate, not a measured result.
        </footer>
      </body>
    </html>
  );
}
