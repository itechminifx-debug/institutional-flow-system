"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { PAIRS } from "@/lib/setupHelpers";

export default function SetupsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pair, setPair] = useState(searchParams.get("pair") || "all");
  const [bias, setBias] = useState(searchParams.get("bias") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters({ pair, bias, sort, q: search });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyFilters({ pair, bias, sort, q }) {
    const params = new URLSearchParams();

    if (pair && pair !== "all") params.set("pair", pair);
    if (bias && bias !== "all") params.set("bias", bias);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (q) params.set("q", q);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleChange(field, value) {
    if (field === "pair") setPair(value);
    if (field === "bias") setBias(value);
    if (field === "sort") setSort(value);

    applyFilters({
      pair: field === "pair" ? value : pair,
      bias: field === "bias" ? value : bias,
      sort: field === "sort" ? value : sort,
      q: search,
    });
  }

  function clearAll() {
    setPair("all");
    setBias("all");
    setSort("newest");
    setSearch("");
    router.push(pathname);
  }

  const hasFilters =
    pair !== "all" || bias !== "all" || sort !== "newest" || search;

  return (
    <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
      {/* Search bar */}
      <div>
        <input
          type="text"
          placeholder="Search notes, zones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pair</label>
          <select
            value={pair}
            onChange={(e) => handleChange("pair", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          >
            <option value="all">All pairs</option>
            {PAIRS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Bias</label>
          <select
            value={bias}
            onChange={(e) => handleChange("bias", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          >
            <option value="all">All biases</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Sort</label>
          <select
            value={sort}
            onChange={(e) => handleChange("sort", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}