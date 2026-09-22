"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Pages that DON'T require mindset check
const EXEMPT_PATHS = ["/mindset", "/journal", "/stats", "/settings"];

export default function MindsetGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      // Skip check for exempt paths
      if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
        setChecked(true);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setChecked(true);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("mindset_checks")
        .select("id")
        .eq("user_id", user.id)
        .eq("check_date", today)
        .single();

      if (!data) {
        router.push("/mindset");
        return;
      }

      setChecked(true);
      setLoading(false);
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!checked) return null;

  return children;
}