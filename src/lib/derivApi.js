"use client";

const DERIV_WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";

export function connectToDeriv(symbol, onTick) {
  let ws = null;
  let closed = false;
  let reconnectTimer = null;

  function connect() {
    if (closed) return;

    ws = new WebSocket(DERIV_WS_URL);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === "tick" && data.tick) {
        onTick({
          symbol: data.tick.symbol,
          quote: parseFloat(data.tick.quote),
          epoch: data.tick.epoch,
          bid: data.tick.bid ? parseFloat(data.tick.bid) : null,
          ask: data.tick.ask ? parseFloat(data.tick.ask) : null,
        });
      }
    };

    ws.onerror = () => {
      // Silent — auto-reconnect below
    };

    ws.onclose = () => {
      if (closed) return;
      // Reconnect after 3 seconds
      reconnectTimer = setTimeout(connect, 3000);
    };
  }

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ forget_all: "ticks" }));
      ws.close();
    }
  };
}