"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    title: "Trading",
    links: [
      { href: "/rejection-block", label: "Rejection Block" },
      { href: "/liquidity-sequence", label: "Liquidity Sequence" },
      { href: "/liquidity-sequence/history", label: "Sequence History" },
      { href: "/bos-rb", label: "BOS + RB" },
      { href: "/negotiation", label: "Negotiation" },
      { href: "/killzones", label: "Killzones" },
    ],
  },
  {
    title: "SLD System",
    links: [
      { href: "/sld", label: "SLD Setup" },
      { href: "/sld/journal", label: "SLD Journal" },
      { href: "/sld/history", label: "SLD History" },
      { href: "/sld/manual", label: "SLD Manual" },
    ],
  },
  {
    title: "SMC System",
    links: [
      { href: "/smc", label: "SMC Setup" },
      { href: "/smc/journal", label: "SMC Journal" },
      { href: "/smc/history", label: "SMC History" },
      { href: "/smc/manual", label: "SMC Manual" },
    ],
  },
  {
    title: "LQE System",
    links: [
      { href: "/lqe", label: "LQE Setup" },
      { href: "/lqe/journal", label: "LQE Journal" },
      { href: "/lqe/history", label: "LQE History" },
      { href: "/lqe/manual", label: "LQE Manual" },
    ],
  },
  {
    title: "Layers System",
    links: [
      { href: "/layers", label: "Layers Setup" },
      { href: "/layers/journal", label: "Layers Journal" },
      { href: "/layers/history", label: "Layers History" },
    ],
  },
  {
    title: "AMD System",
    links: [
      { href: "/amd", label: "AMD Setup" },
      { href: "/amd/journal", label: "AMD Journal" },
      { href: "/amd/history", label: "AMD History" },
    ],
  },
  {
    title: "Structure",
    links: [
      { href: "/mss", label: "MSS" },
      { href: "/mss-zones", label: "MSS Zones" },
      { href: "/premium-discount", label: "Premium/Discount" },
      { href: "/liquidity", label: "Liquidity" },
      { href: "/liquidity-zone", label: "Liquidity Zone" },
      { href: "/sweeps", label: "Sweeps" },
      { href: "/traps", label: "Traps" },
    ],
  },
  {
    title: "Analysis",
    links: [
      { href: "/chart-checklist", label: "Chart" },
      { href: "/trend", label: "Trend" },
      { href: "/confluence", label: "Confluence" },
      { href: "/scanner", label: "Scanner" },
      { href: "/integrated", label: "Integrated" },
      { href: "/rb-validator", label: "RB Validator" },
      { href: "/ce-tracker", label: "CE Tracker" },
    ],
  },
  {
    title: "Journal",
    links: [
      { href: "/setups", label: "My Setups" },
      { href: "/trade", label: "Trade" },
      { href: "/journal", label: "Journal" },
      { href: "/stats", label: "Stats" },
      { href: "/review", label: "Review" },
      { href: "/plan", label: "Plan" },
      { href: "/notes", label: "Notes" },
    ],
  },
  {
    title: "System",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/mindset", label: "Mindset" },
      { href: "/news", label: "News" },
      { href: "/manual", label: "Manual" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const ALL_LINKS = GROUPS.flatMap((g) => g.links);

function computeActiveHref(pathname) {
  if (!pathname) return null;
  const matches = ALL_LINKS.filter(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/")
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.href.length - a.href.length)[0].href;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeHref = computeActiveHref(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-gray-800 bg-black">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-gray-300 hover:text-white text-xl leading-none"
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
        <Link href="/dashboard" className="font-bold text-sm">
          IFS
        </Link>
        <div className="w-6" />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[220px] bg-black border-r border-gray-800 overflow-y-auto
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          pt-3`}
      >
        <div className="hidden md:block px-4 pb-3 border-b border-gray-800">
          <Link href="/dashboard" className="font-bold text-sm">
            IFS
          </Link>
        </div>

        <nav className="px-2 py-3 space-y-4">
          {GROUPS.map((group) => {
            const isSldGroup = group.title === "SLD System";
            const isSmcGroup = group.title === "SMC System";
            const isLqeGroup = group.title === "LQE System";
            const isLayersGroup = group.title === "Layers System";
            const isAmdGroup = group.title === "AMD System";
            const isSystemGroup = isSldGroup || isSmcGroup || isLqeGroup || isLayersGroup || isAmdGroup;

            return (
              <div key={group.title}>
                <p
                  className={`px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold ${
                    isSldGroup
                      ? "text-emerald-400"
                      : isSmcGroup
                      ? "text-orange-400"
                      : isLqeGroup
                      ? "text-orange-400"
                      : isLayersGroup
                      ? "text-purple-400"
                      : isAmdGroup
                      ? "text-blue-400"
                      : "text-gray-500"
                  }`}
                >
                  {group.title}
                </p>
                <div
                  className={`space-y-0.5 ${
                    isSystemGroup
                      ? isSldGroup
                        ? "pl-2 border-l-2 border-emerald-800/60 ml-2"
                        : isSmcGroup
                        ? "pl-2 border-l-2 border-orange-800/60 ml-2"
                        : isLqeGroup
                        ? "pl-2 border-l-2 border-orange-800/60 ml-2"
                        : isLayersGroup
                        ? "pl-2 border-l-2 border-purple-800/60 ml-2"
                        : "pl-2 border-l-2 border-blue-800/60 ml-2"
                      : ""
                  }`}
                >
                  {group.links.map((link) => {
                    const active = link.href === activeHref;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-3 py-1.5 rounded-md text-xs transition ${
                          active
                            ? "bg-blue-600 text-white font-medium"
                            : "text-gray-400 hover:text-white hover:bg-gray-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}