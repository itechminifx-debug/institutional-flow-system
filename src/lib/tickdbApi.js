"use client";

const TICKDB_WS_URL = "wss://api.tickdb.ai/v1/realtime";

export function connectToTickDB(symbols, apiKey, onTick) {
  const url = `${TICKDB_WS_URL}?api_key=${apiKey}`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        cmd: "subscribe",
        data: {
          channel: "ticker",
          symbols: symbols,
        },
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((tick) => {
          onTick({
            symbol: tick.symbol,
            quote: parseFloat(tick.last_price),
            timestamp: tick.timestamp,
            change24h: tick.price_change_percent_24h,
          });
        });
      }
    } catch (err) {
      console.error("TickDB parse error:", err);
    }
  };

  ws.onerror = (err) => {
    console.error("TickDB WebSocket error:", err);
  };

  return () => {
    ws.close();
  };
}