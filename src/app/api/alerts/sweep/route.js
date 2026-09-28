import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { pair, levelPrice, levelType, clusterStrength, sweepStatus, distance, atrMultiple } = body;

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_bot_token, telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (!profile?.telegram_bot_token || !profile?.telegram_chat_id) {
    return NextResponse.json(
      { error: "Telegram not configured" },
      { status: 400 }
    );
  }

  const emoji =
    sweepStatus === "occurred" ? "✓" :
    sweepStatus === "imminent" ? "🔥" :
    sweepStatus === "likely" ? "⚡" : "•";

  const label =
    sweepStatus === "occurred" ? "SWEEP OCCURRED" :
    sweepStatus === "imminent" ? "SWEEP IMMINENT" :
    sweepStatus === "likely" ? "SWEEP LIKELY" : "SWEEP WATCH";

  const message =
    `${emoji} ${label}\n\n` +
    `${pair}\n` +
    `Level: ${levelPrice}\n` +
    `Type: ${levelType || "—"}\n` +
    `Cluster: ${clusterStrength || "—"}\n` +
    `Distance: ${distance?.toFixed(2) || "—"}\n` +
    `ATR Multiple: ${atrMultiple?.toFixed(2) || "—"}×\n\n` +
    (sweepStatus === "occurred"
      ? "🎯 Watch for rejection — prepare RB"
      : sweepStatus === "imminent"
      ? "👀 Get ready — sweep in minutes"
      : "📊 Watch closely");

  const url = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    return NextResponse.json({
      ok: data.ok,
      telegram: data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}