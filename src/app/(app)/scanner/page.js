"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  parseCandlesCSV,
  scanCandles,
  scanOneRB,
} from "@/lib/rbAutoScanner";
import {
  rbRankInfo,
  premiumDiscountVerdict,
  strengthInfo,
  allFlippedInfo,
  computePips,
  PIP_SIZE_DEFAULT,
} from "@/lib/rejectionBlockEngine";
import PairPicker from "@/components/PairPicker";

const SAMPLE = `2026-10-07 00:00, 209300, 209500, 209250, 209450
2026-10-07 04:00, 209450, 209700, 209400, 209500
2026-10-07 08:00, 209500, 209550, 209100, 209200
2026-10-07 12:00, 209200, 209400, 209000, 209350
2026-10-07 16:00, 209350, 209600, 209300, 209550
2026-10-07 20:00, 209550, 209850, 209500, 209800`;

export default function ScannerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [csv, setCsv] = useState("");
  const [pair, setPair] = useState("Volatility 80");
  const [timeframe, setTimeframe] = useState("H4");
  const [pipSize, setPipSize] = useState(PIP_SIZE_DEFAULT);
  const [currentClose, setCurrentClose] = useState("");
  const [priorClose, setPriorClose] = useState("");
  const [atr, setAtr] = useState("");
  const [accountSize, setAccountSize] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1);

  const [result, setResult] = useState(null);
  const [selectedRbId, setSelectedRbId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState("");

  function handleLoadSample() {
    setCsv(SAMPLE);
    setCurrentClose("209800");
    setPriorClose("209550");
    setAtr("120");
  }

  function handleClear() {
    setCsv("");
    setCurrentClose("");
    setPriorClose("");
    setAtr("");
    setResult(null);
    setSelectedRbId(null);
    setSavedId(null);
    setError("");
  }

  function handleScan() {
    setError("");
    setSavedId(null);

    const candles = parseCandlesCSV(csv);

    if (candles.length < 2) {
      setError("Need at least 2 valid candles. Format: time,open,high,low,close (or open,high,low,close).");
      setResult(null);
      return;
    }

    const scan = scanCandles({
      candles,
      currentClose: currentClose || null,
      pipSize: parseFloat(pipSize) || PIP_SIZE_DEFAULT,
      accountSize: parseFloat(accountSize) || 0,
      riskPercent: parseFloat(riskPercent) || 1,
      atr: parseFloat(atr) || 0,
    });

    setResult({ ...scan, candles });
    setSelectedRbId(scan.best?.id || null);
  }

  // Detailed view of the selected RB
  const selectedDetail = useMemo(() => {
    if (!result || !selectedRbId) return null;
    const rb = result.rbs.find((r) => r.id === selectedRbId);
    if (!rb) return null;

    return scanOneRB({
      rb,
      allRbs: result.rbs,
      close: result.close,
      priorClose: priorClose ? parseFloat(priorClose) : null,
      pipSize: parseFloat(pipSize) || PIP_SIZE_DEFAULT,
      accountSize: parseFloat(accountSize) || 0,
      riskPercent: parseFloat(riskPercent) || 1,
      atr: parseFloat(atr) || 0,
    });
  }, [result, selectedRbId, priorClose, pipSize, accountSize, riskPercent, atr]);

  async function handleSaveAsSetup() {
    if (!result || !selectedRbId || !selectedDetail) return;

    const rb = result.rbs.find((r) => r.id === selectedRbId);
    if (!rb) return;

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const verdict = selectedDetail.negotiation;
    const trade = selectedDetail.trade;

    // 1. Save to setups
    const { data: setup, error: setupErr } = await supabase
      .from("setups")
      .insert({
        user_id: user.id,
        pair,
        setup_type: "rejection_block",
        d1_bias: verdict.verdict === "BUY" ? "bullish" : "bearish",
        htf_bias: verdict.verdict === "BUY" ? "bullish" : "bearish",
        ema50_position: "above",
        rejection_block_zone: `${rb.rbLow}-${rb.rbHigh}`,
        ce_price: verdict.ce,
        use_ce_entry: true,
        checklist_score: 0,
        checklist_passed: false,
        notes: `Auto-scanner: ${rb.autoType} RB from candles ${rb.candle1Index}-${rb.candle2Index + 1}`,
      })
      .select()
      .single();

    if (setupErr) {
      setError(setupErr.message);
      setSaving(false);
      return;
    }

    // 2. Save to rejection_block_setups
    const { error: detailErr } = await supabase
      .from("rejection_block_setups")
      .insert({
        user_id: user.id,
        setup_id: setup.id,
        pair,
        timeframe,
        zone_type: "fvg",
        zone_high: null,
        zone_low: null,
        zone_ce: null,
        rb_high: rb.rbHigh,
        rb_low: rb.rbLow,
        rb_ce: verdict.ce,
        rb_position: null,
        close_price: result.close ? parseFloat(result.close) : null,
        prior_close: priorClose ? parseFloat(priorClose) : null,
        premium_discount: verdict.side,
        verdict: verdict.verdict,
        strength: verdict.strength,
        rb_broken: verdict.rbBroken,
        reason: verdict.reason,
        entry: trade?.entry || null,
        sl: trade?.sl || null,
        tp: trade?.tp || null,
        lot_size: trade?.lotSize || null,
        risk_amount: trade?.riskAmount || null,
        pip_size: parseFloat(pipSize) || PIP_SIZE_DEFAULT,
        sl_pips: trade?.pips?.slDistance || null,
        tp_pips: trade?.pips?.tpDistance || null,
        atr_current: atr ? parseFloat(atr) : null,
        all_rbs_flipped: result.allFlipped?.allFlipped || false,
        all_rbs_flipped_direction: result.allFlipped?.direction || null,
        notes: `Auto-scanner (RB ${rb.rank})`,
      });

    if (detailErr) {
      setError(detailErr.message);
      setSaving(false);
      return;
    }

    // 3. Save RB to rejection_block_rbs
    const { error: rbErr } = await supabase
      .from("rejection_block_rbs")
      .insert({
        user_id: user.id,
        setup_id: setup.id,
        pair,
        rb_high: rb.rbHigh,
        rb_low: rb.rbLow,
        rb_ce: rb.ce,
        rb_position: null,
        rank: rb.rank,
        is_active: true,
      });

    if (rbErr) {
      setError(rbErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedId(setup.id);
    setTimeout(() => router.push(`/setups/${setup.id}`), 1200);
  }

  const close = result?.close;
  const flippedInfo = result?.allFlipped
    ? allFlippedInfo(result.allFlipped)
    : null;
  const best = result?.best;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">RB Scanner</h1>
          <p className="text-gray-400 text-sm">
            Paste candles → the algorithm finds every Rejection Block, ranks
            them, and grades the verdicts.
          </p>
        </div>

        {/* Config */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PairPicker value={pair} onChange={setPair} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="D1">D1</option>
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M30">M30</option>
                <option value="M15">M15</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={pipSize}
                onChange={(e) => setPipSize(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value={0.0001}>0.0001</option>
                <option value={0.001}>0.001</option>
                <option value={0.01}>0.01 (VOL)</option>
                <option value={0.1}>0.1</option>
                <option value={1}>1.0</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR
              </label>
              <input
                type="number"
                step="any"
                value={atr}
                onChange={(e) => setAtr(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Current close
              </label>
              <input
                type="number"
                step="any"
                value={currentClose}
                onChange={(e) => setCurrentClose(e.target.value)}
                placeholder="(blank = last candle close)"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Prior close
              </label>
              <input
                type="number"
                step="any"
                value={priorClose}
                onChange={(e) => setPriorClose(e.target.value)}
                placeholder="for reversal detect"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Account size
              </label>
              <input
                type="number"
                step="any"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Risk %
              </label>
              <input
                type="number"
                step="any"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Candle paste */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                Candles (paste CSV)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                One candle per line:{" "}
                <code className="text-gray-400">
                  time,open,high,low,close
                </code>{" "}
                (or{" "}
                <code className="text-gray-400">open,high,low,close</code>)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-800/40"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            placeholder={`2026-10-07 00:00, 209300, 209500, 209250, 209450\n2026-10-07 04:00, 209450, 209700, 209400, 209500\n...`}
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-xs font-mono"
          />

          <button
            type="button"
            onClick={handleScan}
            className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-bold"
          >
            🔍 Scan for Rejection Blocks
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-blue-400">
                  Scan summary
                </h2>
                {flippedInfo && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-bold ${flippedInfo.color}`}
                  >
                    {flippedInfo.emoji} {flippedInfo.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Candles</p>
                  <p className="font-bold tabular-nums">
                    {result.candles.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">RBs found</p>
                  <p className="font-bold tabular-nums text-blue-300">
                    {result.counts.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Resistance</p>
                  <p className="font-bold tabular-nums text-purple-300">
                    {result.counts.resistance}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Support</p>
                  <p className="font-bold tabular-nums text-orange-300">
                    {result.counts.support}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Close used:{" "}
                <strong className="tabular-nums">
                  {formatPrice(result.close)}
                </strong>
              </p>
            </div>

            {/* RB list */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
              <h2 className="text-sm font-semibold text-blue-400">
                Detected RBs (ranked by score)
              </h2>

              {result.rbs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  No valid RBs found. Try more candles or check the wick sizes.
                </p>
              ) : (
                <div className="space-y-2">
                  {result.rbs.map((rb) => {
                    const rankInfo = rbRankInfo(rb.rank);
                    const isBest = best?.id === rb.id;
                    const isSelected = selectedRbId === rb.id;
                    const v = rb.verdict;

                    return (
                      <button
                        key={rb.id}
                        type="button"
                        onClick={() => setSelectedRbId(rb.id)}
                        className={`w-full text-left p-3 rounded-lg border transition ${
                          isSelected
                            ? "border-blue-600 ring-1 ring-blue-600 bg-blue-950/20"
                            : "border-gray-800 bg-black hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isBest && (
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300 font-bold">
                                ⭐ Best
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${rankInfo.color}`}
                            >
                              {rankInfo.emoji} {rankInfo.label}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                rb.autoType === "resistance"
                                  ? "bg-purple-900/40 text-purple-300"
                                  : "bg-orange-900/40 text-orange-300"
                              }`}
                            >
                              {rb.autoType === "resistance"
                                ? "🔺 Resistance"
                                : "🔻 Support"}
                            </span>
                            {v && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  v.verdict === "BUY"
                                    ? "bg-green-900/40 text-green-300"
                                    : v.verdict === "SELL"
                                    ? "bg-red-900/40 text-red-300"
                                    : "bg-gray-800 text-gray-300"
                                }`}
                              >
                                {v.verdict}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums">
                            Score {rb.score}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">RB Low</p>
                            <p className="font-bold tabular-nums text-orange-300">
                              {rb.rbLow}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">RB High</p>
                            <p className="font-bold tabular-nums text-purple-300">
                              {rb.rbHigh}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">CE</p>
                            <p className="font-bold tabular-nums text-blue-300">
                              {rb.ce}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail */}
            {selectedDetail && (
              <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-blue-300">
                    Analysis of selected RB
                  </h2>
                  {selectedDetail.negotiation.strength && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        strengthInfo(selectedDetail.negotiation.strength)
                          .color
                      }`}
                    >
                      {
                        strengthInfo(selectedDetail.negotiation.strength)
                          .emoji
                      }{" "}
                      {
                        strengthInfo(selectedDetail.negotiation.strength)
                          .label
                      }
                    </span>
                  )}
                </div>

                {/* Verdict */}
                <div
                  className={`p-3 rounded-lg border ${
                    premiumDiscountVerdict(selectedDetail.negotiation).color
                  }`}
                >
                  <p className="text-2xl font-bold">
                    {
                      premiumDiscountVerdict(selectedDetail.negotiation)
                        .emoji
                    }{" "}
                    {
                      premiumDiscountVerdict(selectedDetail.negotiation)
                        .label
                    }
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {
                      premiumDiscountVerdict(selectedDetail.negotiation)
                        .description
                    }
                  </p>
                </div>

                {/* Trade params */}
                {selectedDetail.trade && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Entry (CE)</p>
                      <p className="font-bold tabular-nums text-yellow-400">
                        {formatPrice(selectedDetail.trade.entry)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stop Loss</p>
                      <p className="font-bold tabular-nums text-red-400">
                        {formatPrice(selectedDetail.trade.sl)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Take Profit (2R)</p>
                      <p className="font-bold tabular-nums text-green-400">
                        {formatPrice(selectedDetail.trade.tp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lot Size</p>
                      <p className="font-bold tabular-nums text-white">
                        {selectedDetail.trade.lotSize.toFixed(2)}
                      </p>
                    </div>
                    {selectedDetail.trade.pips && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">SL pips</p>
                          <p className="font-bold tabular-nums text-red-300">
                            {selectedDetail.trade.pips.slDistance}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">TP pips</p>
                          <p className="font-bold tabular-nums text-green-300">
                            {selectedDetail.trade.pips.tpDistance}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Reversal */}
                {selectedDetail.reversal && selectedDetail.nextTrade && (
                  <div className="p-3 rounded-lg border-2 border-purple-700 bg-purple-950/20 space-y-2">
                    <p className="text-sm font-bold text-purple-300">
                      🔄 Reversal candidate
                    </p>
                    <p className="text-xs text-purple-200">
                      {selectedDetail.reversal.reason}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Direction</p>
                        <p className="font-bold text-white">
                          {selectedDetail.nextTrade.direction}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entry</p>
                        <p className="font-bold tabular-nums text-yellow-400">
                          {formatPrice(selectedDetail.nextTrade.entry)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">TP</p>
                        <p className="font-bold tabular-nums text-green-400">
                          {formatPrice(selectedDetail.nextTrade.tp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAsSetup}
                  disabled={saving || !!savedId}
                  className={`w-full py-3 rounded-lg font-bold ${
                    savedId
                      ? "bg-gray-800 text-gray-500"
                      : "bg-green-800 hover:bg-green-700"
                  } disabled:opacity-60`}
                >
                  {saving
                    ? "Saving..."
                    : savedId
                    ? "✅ Saved — redirecting..."
                    : "💾 Save this RB as a Setup"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How the Scanner Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Sliding window</strong> — every adjacent pair of candles
              is checked
            </li>
            <li>
              <strong>Wick rule</strong> — first candle tip low, second tip
              higher = Resistance RB
            </li>
            <li>
              <strong>Or</strong> — first tip high, second tip lower = Support
              RB
            </li>
            <li>
              <strong>Ranking</strong> — RBs are ordered by freshness
              (current → previous → oldest)
            </li>
            <li>
              <strong>Scoring</strong> — strong verdicts and proximity to
              close rank highest
            </li>
            <li>
              <strong>Save</strong> — click any RB → save as a full setup with
              the journal linked
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}