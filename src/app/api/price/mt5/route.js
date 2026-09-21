import { NextResponse } from "next/server";

// In-memory store (dev only — resets when server restarts)
let latestPrice = {
  symbol: null,
  bid: null,
  ask: null,
  last: null,
  timestamp: null,
  receivedAt: null,
};

export async function GET() {
  return NextResponse.json(latestPrice);
}

export async function POST(request) {
  try {
    const tick = await request.json();
    latestPrice = {
      ...tick,
      receivedAt: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid tick payload" },
      { status: 400 }
    );
  }
}