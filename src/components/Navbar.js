"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
 { href: "/confluence", label: "Confluence" },
  { href: "/setups", label: "Setups" },
  { href: "/trade", label: "Trade" },
  { href: "/news", label: "News" },
  { href: "/trend", label: "Trend" },
  { href: "/mindset", label: "Mindset" },
  { href: "/notes", label: "Notes" },
  { href: "/journal", label: "Journal" },
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="font-bold text-sm">
            IFS
          </Link>

          <div className="flex gap-1 overflow-x-auto">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}