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
  const { pair, zone, price, direction } = body;

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

  const message = `🎯 *ZONE HIT*\n\n${direction.toUpperCase()} ${pair}\nPrice: ${price}\nZone: ${zone}\n\nWalk the checklist!`;

  const url = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    // Return full Telegram response for debugging
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