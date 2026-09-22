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
  const { pair, zone, price, direction, timeframe, setupId, status } = body;

  // Get user's Telegram settings
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

  // Build enriched message
  const arrow = direction === "buy" ? "⬆️" : "⬇️";
  const dirLabel = direction === "buy" ? "BUY" : "SELL";
  const isZoneHit = status === "in-zone";

  const header = isZoneHit ? "🎯 ZONE HIT" : "⚠️ APPROACHING ZONE";
  const priceFormatted = typeof price === "number" ? price.toFixed(2) : price;

  let message = `${header}\n\n`;
  message += `${arrow} ${dirLabel} · ${pair}\n`;
  message += `💰 Price: ${priceFormatted}\n`;
  message += `📊 Zone: ${zone || "—"}\n`;
  if (timeframe) message += `⏱ Timeframe: ${timeframe}\n`;
  if (setupId) message += `🆔 Setup: ${setupId.slice(0, 8)}...\n`;
  message += isZoneHit
    ? `\n✅ Walk the checklist now!`
    : `\n👀 Prepare to watch closely.`;

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
      sent_to: profile.telegram_chat_id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}