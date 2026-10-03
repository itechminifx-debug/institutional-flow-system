"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FAVORITES,
  PAIR_CATEGORIES,
  searchPairs,
} from "@/lib/pairCatalog";

const RECENT_KEY = "ifs_recent_pairs";

export default function PairPicker({ value, onChange, label = "Pair" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecents(JSON.parse(stored).slice(0, 5));
    } catch {}
  }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchPairs(search);
  }, [search]);

  function handleSelect(pair) {
    try {
      const updated = [pair, ...recents.filter((p) => p !== pair)].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      setRecents(updated);
    } catch {}

    onChange(pair);
    setOpen(false);
    setSearch("");
  }

  function toggleCategory(key) {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm mb-2 text-gray-300">{label}</label>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none flex items-center justify-between"
      >
        <span className="text-sm">{value || "Select a pair..."}</span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-96 overflow-y-auto rounded-lg bg-gray-900 border border-gray-700 shadow-2xl">
          <div className="sticky top-0 bg-gray-900 p-2 border-b border-gray-800 z-10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pairs..."
              autoFocus
              className="w-full px-3 py-2 rounded bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1">
                Search Results
              </p>
              {searchResults.map((pair) => (
                <PairRow
                  key={pair}
                  pair={pair}
                  isSelected={value === pair}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}

          {searchResults && searchResults.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-500">
              No pairs match "{search}"
            </div>
          )}

          {!searchResults && (
            <>
              {FAVORITES.length > 0 && (
                <div className="p-2 border-b border-gray-800">
                  <p className="text-xs text-yellow-400 px-2 py-1 font-semibold">
                    ⭐ Favorites
                  </p>
                  {FAVORITES.map((pair) => (
                    <PairRow
                      key={pair}
                      pair={pair}
                      isSelected={value === pair}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {recents.length > 0 && (
                <div className="p-2 border-b border-gray-800">
                  <p className="text-xs text-blue-400 px-2 py-1 font-semibold">
                    🕐 Recent
                  </p>
                  {recents
                    .filter((p) => !FAVORITES.includes(p))
                    .map((pair) => (
                      <PairRow
                        key={pair}
                        pair={pair}
                        isSelected={value === pair}
                        onSelect={handleSelect}
                      />
                    ))}
                </div>
              )}

              {PAIR_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategories[cat.key];
                return (
                  <div
                    key={cat.key}
                    className="border-b border-gray-800 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.key)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-800 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-300">
                        {cat.emoji} {cat.label}
                        <span className="text-xs text-gray-500 ml-2">
                          ({cat.pairs.length})
                        </span>
                      </span>
                      <span className="text-gray-500 text-xs">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="pb-2">
                        {cat.pairs.map((pair) => (
                          <PairRow
                            key={pair}
                            pair={pair}
                            isSelected={value === pair}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <div className="sticky bottom-0 bg-gray-900 p-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearch("");
              }}
              className="w-full py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PairRow({ pair, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pair)}
      className={`w-full text-left px-4 py-2 text-sm transition ${
        isSelected
          ? "bg-blue-900/40 text-blue-200 font-medium"
          : "text-gray-300 hover:bg-gray-800"
      }`}
    >
      {isSelected && "✓ "}
      {pair}
    </button>
  );
}