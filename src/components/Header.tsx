"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Desk" },
  { href: "/screener", label: "Screener" },
  { href: "/methodology", label: "How it scores" },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="border-b border-stone-200/80 bg-[#f6f1e7]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-xl tracking-tight text-emerald-950">
            NEPSE Invest
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-stone-500 sm:inline">
            Foundation desk
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 ${
                  active
                    ? "bg-emerald-900 text-[#f6f1e7]"
                    : "text-stone-700 hover:bg-stone-200/70"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
