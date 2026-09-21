import MetaTrader5 as mt5
import requests
import time
from datetime import datetime

# ============ CONFIGURATION ============
SYMBOL = "VOL_80"
NEXTJS_URL = "http://localhost:3000/api/price/mt5"
INTERVAL_SECONDS = 1
# =======================================


def init_mt5():
    if not mt5.initialize():
        print("MT5 initialize() failed, error code =", mt5.last_error())
        return False
    info = mt5.terminal_info()
    acc = mt5.account_info()
    print("MT5 initialized")
    print(f"  Terminal: {info.name}")
    if acc:
        print(f"  Account:  {acc.login} ({acc.server})")
    return True


def get_tick(symbol):
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return None
    return {
        "symbol": symbol,
        "bid": tick.bid,
        "ask": tick.ask,
        "last": tick.last,
        "volume": tick.volume,
        "time": tick.time,
        "time_msc": tick.time_msc,
        "timestamp": datetime.now().isoformat(),
    }


def push_to_nextjs(tick):
    try:
        r = requests.post(NEXTJS_URL, json=tick, timeout=2)
        return r.status_code == 200
    except Exception as e:
        print(f"POST failed: {e}")
        return False


def main():
    if not init_mt5():
        return

    if not mt5.symbol_select(SYMBOL, True):
        print(f"Failed to select {SYMBOL} in Market Watch")
        mt5.shutdown()
        return

    print(f"\nBridging {SYMBOL} -> {NEXTJS_URL}")
    print("Press Ctrl+C to stop.\n")

    tick_count = 0
    success_count = 0

    try:
        while True:
            tick = get_tick(SYMBOL)
            if tick:
                tick_count += 1
                ok = push_to_nextjs(tick)
                if ok:
                    success_count += 1
                status = "OK " if ok else "ERR"
                print(
                    f"[{status}] #{tick_count} "
                    f"bid={tick['bid']} ask={tick['ask']} "
                    f"(sent={success_count})"
                )
            else:
                print(f"No tick for {SYMBOL}")
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\nStopping bridge...")
    finally:
        mt5.shutdown()
        print("MT5 shutdown.")


if __name__ == "__main__":
    main()