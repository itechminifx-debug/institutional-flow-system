import MetaTrader5 as mt5
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import threading
import time

app = Flask(__name__)
CORS(app)

SYMBOL = "VOL_80"
PORT = 5000

latest_tick = {
    "symbol": None,
    "bid": None,
    "ask": None,
    "last": None,
    "timestamp": None,
    "receivedAt": None,
}


def poll_mt5():
    global latest_tick

    if not mt5.initialize():
        print("MT5 initialize() failed, error code =", mt5.last_error())
        return

    print("MT5 initialized")
    info = mt5.terminal_info()
    if info:
        print(f"  Terminal: {info.name}")
    acc = mt5.account_info()
    if acc:
        print(f"  Account:  {acc.login} ({acc.server})")

    if not mt5.symbol_select(SYMBOL, True):
        print(f"Failed to select {SYMBOL}")
        mt5.shutdown()
        return

    print(f"Polling {SYMBOL}...")
    print(f"API running at http://localhost:{PORT}/api/price/mt5\n")

    while True:
        tick = mt5.symbol_info_tick(SYMBOL)
        if tick:
            latest_tick = {
                "symbol": SYMBOL,
                "bid": tick.bid,
                "ask": tick.ask,
                "last": tick.last,
                "timestamp": datetime.now().isoformat(),
                "receivedAt": datetime.now().isoformat(),
            }
        time.sleep(1)


@app.route("/api/price/mt5")
def get_price():
    return jsonify(latest_tick)


@app.route("/health")
def health():
    return jsonify({"ok": True, "symbol": SYMBOL})


if __name__ == "__main__":
    threading.Thread(target=poll_mt5, daemon=True).start()
    app.run(host="0.0.0.0", port=PORT)