import MetaTrader5 as mt5

if not mt5.initialize():
    print("initialize() failed, error code =", mt5.last_error())
    quit()

# Get all symbols available in MT5
symbols = mt5.symbols_get()
print(f"Total symbols: {len(symbols)}")
print("\n--- Symbols matching 'VOL' or 'Vol' ---")
for s in symbols:
    if "vol" in s.name.lower() or "80" in s.name:
        print(f"  {s.name} | {s.description}")