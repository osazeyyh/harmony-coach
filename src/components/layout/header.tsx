"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotationSwitcher } from "@/components/music/notation-switcher";
import { Music, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze/audio", label: "Audio" },
  { href: "/analyze/sheet", label: "Sheet Music" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-md supports-[backdrop-filter]:bg-black/10">
      <div className="container flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold mr-6 group">
          <Music className="h-5 w-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
          <span className="gradient-text text-base tracking-tight">
            Harmony Coach
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                pathname === link.href
                  ? "bg-violet-500/20 text-violet-200 font-medium"
                  : "text-white/50 hover:text-white/90 hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          <NotationSwitcher />
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden ml-auto p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/30 backdrop-blur-md">
          <nav className="flex flex-col p-4 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  pathname === link.href
                    ? "bg-violet-500/20 text-violet-200 font-medium"
                    : "text-white/50 hover:text-white/90 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10">
              <NotationSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
