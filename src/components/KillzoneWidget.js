"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentKillzone,
  isJudasWindow,
  minutesUntilNextKillzone,
  formatTimeUntil,
} from "@/lib/killzoneHelpers";

export default function KillzoneWidget() {
  const [current, setCurrent] = useState(getCurrentKillzone());
  const [judas, setJudas] = useState(isJudasWindow());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(getCurrentKillzone());
      setJudas(isJudasWindow());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isKillzone =
    current.key === "london" ||
    current.key === "new_york" ||
    current.key === "overlap";

  return (
    <Link
      href="/killzones"
      className={`block p-4 rounded-lg border transition ${current.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Killzone</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{current.emoji}</p>
      <p className="text-lg font-bold">{current.label}</p>

      {judas ? (
        <p className="text-xs text-red-300 mt-1 font-semibold">
          ⚠️ Judas window — wait 30m
        </p>
      ) : isKillzone ? (
        <p className="text-xs opacity-70 mt-1">
          {current.quality} quality window
        </p>
      ) : (
        <p className="text-xs opacity-70 mt-1">
          Next killzone {formatTimeUntil(minutesUntilNextKillzone())}
        </p>
      )}
    </Link>
  );
}