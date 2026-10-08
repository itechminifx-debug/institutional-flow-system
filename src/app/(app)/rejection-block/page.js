"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { createTradeFromSetup } from "@/lib/journalEngine";
import {
  ZONE_TYPES,
  zoneTypeInfo,
  computeCe,
  detectRbVsZone,
  rbVsZoneInfo,
  rankRejectionBlocks,
  rbRankInfo,
  findActiveRb,
  judgeRejectionBlock,
  premiumDiscountVerdict,
  strengthInfo,
  computeEmaDirection,
  emaInfo,
  emaAlignment,
  checkConditions,
  conditionSummary,
  detectAllRbsFlipped,
  allFlippedInfo,
  checkRbCompleteness,
  detectRbFromTwoCandles,
  checkDetectionVsClose,
  detectRbsInPath,
  blockerInfo,
  detectReversal,
  computeNextOpportunityTrade,
  atrFilter,
  computeRejectionBlockTrade,
  computePips,
  PIP_SIZE_DEFAULT,
  validateSetupInputs,
} from "@/lib/rejectionBlockEngine";
import { scorePathDanger, pathDangerBanner } from "@/lib/rbDangerEngine";
import PairPicker from "@/components/PairPicker";

function emptyRb() {
  return { id: Math.random().toString(36).slice(2), high: "", low: "" };
}
function emptyCandle() {
  return { open: "", high: "", low: "", close: "" };
}

export default function RejectionBlockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const visitId = searchParams?.get("visit") || null;
  const isEdit = !!editId;
  const isVisit = !!visitId;
  const isLoadExisting = isEdit || isVisit;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneType: "fvg",
    zoneHigh: "",
    zoneLow: "",
    ema50Price: "",
    ema50Prior: "",
    closePrice: "",
    priorClose: "",
    atrCurrent: "",
    atrPrior: "",
    pipSize: PIP_SIZE_DEFAULT,
    notes: "",
  });

  const [rbs, setRbs] = useState([emptyRb()]);
  const [candle1, setCandle1] = useState(emptyCandle());
  const [candle2, setCandle2] = useState(emptyCandle());
  const [addedRbIds, setAddedRbIds] = useState([]);

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingDetailId, setExistingDetailId] = useState(null);

  // ============================================================
  // LOAD PROFILE + EXISTING SETUP
  // ============================================================
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      if (!isLoadExisting) return;

      const lookupId = isEdit ? editId : visitId;
      setLoadingEdit(true);

      const { data: setupData, error: setupErr } = await supabase
        .from("setups")
        .select("*")
        .eq("id", lookupId)
        .single();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: detailData } = await supabase
        .from("rejection_block_setups")
        .select("*")
        .eq("setup_id", lookupId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: detailData?.timeframe || f.timeframe,
        zoneType: detailData?.zone_type || f.zoneType,
        zoneHigh: detailData?.zone_high?.toString() || "",
        zoneLow: detailData?.zone_low?.toString() || "",
        ema50Price: isEdit ? detailData?.ema50_price?.toString() || "" : "",
        ema50Prior: isEdit ? detailData?.ema50_prior?.toString() || "" : "",
        closePrice: isEdit ? detailData?.close_price?.toString() || "" : "",
        priorClose: isEdit ? detailData?.prior_close?.toString() || "" : "",
        atrCurrent: isEdit ? detailData?.atr_current?.toString() || "" : "",
        atrPrior: isEdit ? detailData?.atr_prior?.toString() || "" : "",
        pipSize: detailData?.pip_size || PIP_SIZE_DEFAULT,
        notes: isEdit ? setupData.notes || "" : "",
      }));

      const savedC1 = detailData?.candle_1;
      const savedC2 = detailData?.candle_2;
      if (savedC1) {
        setCandle1({
          open: savedC1.open?.toString() || "",
          high: savedC1.high?.toString() || "",
          low: savedC1.low?.toString() || "",
          close: savedC1.close?.toString() || "",
        });
      }
      if (savedC2) {
        setCandle2({
          open: savedC2.open?.toString() || "",
          high: savedC2.high?.toString() || "",
          low: savedC2.low?.toString() || "",
          close: savedC2.close?.toString() || "",
        });
      }

      const { data: rbsData } = await supabase
        .from("rejection_block_rbs")
        .select("*")
        .eq("setup_id", lookupId)
        .order("created_at", { ascending: false });

      if (rbsData && rbsData.length > 0) {
        const restored = rbsData.map((rb, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: rb.rb_high?.toString() || "",
          low: rb.rb_low?.toString() || "",
          addedAt:
            rb.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
        setRbs(restored);
      }

      setExistingDetailId(detailData?.id || null);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, visitId]);

  // ============================================================
  // FORM HELPERS
  // ============================================================
  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateRb(id, field, value) {
    setRbs((prev) =>
      prev.map((rb) => (rb.id === id ? { ...rb, [field]: value } : rb))
    );
  }
  function addRb() {
    setRbs((prev) => [...prev, emptyRb()]);
  }
  function removeRb(id) {
    setRbs((prev) => prev.filter((rb) => rb.id !== id));
  }
  function updateC1(field, value) {
    setCandle1((c) => ({ ...c, [field]: value }));
  }
  function updateC2(field, value) {
    setCandle2((c) => ({ ...c, [field]: value }));
  }

  // ============================================================
  // RB LIST
  // ============================================================
  const rankedRbs = useMemo(() => {
    const cleaned = rbs
      .map((rb) => ({
        id: rb.id,
        high: parseFloat(rb.high),
        low: parseFloat(rb.low),
        addedAt: rb.addedAt || new Date().toISOString(),
      }))
      .filter((rb) => !isNaN(rb.high) && !isNaN(rb.low));
    return rankRejectionBlocks(cleaned);
  }, [rbs]);

  // ============================================================
  // TWO-CANDLE DETECTION
  // ============================================================
  const detection = useMemo(
    () => detectRbFromTwoCandles({ candle1, candle2 }),
    [candle1, candle2]
  );

  const detectionVsClose = useMemo(
    () =>
      checkDetectionVsClose({
        detection,
        closePrice: form.closePrice,
        pipSize: parseFloat(form.pipSize) || PIP_SIZE_DEFAULT,
      }),
    [detection, form.closePrice, form.pipSize]
  );

  function addDetectedToRbs(rb) {
    if (!rb || addedRbIds.includes(rb.id)) return;
    setRbs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        high: rb.rbHigh.toString(),
        low: rb.rbLow.toString(),
        addedAt: new Date().toISOString(),
      },
    ]);
    setAddedRbIds((prev) => [...prev, rb.id]);
  }

  // ============================================================
  // CORE COMPUTATIONS
  // ============================================================
  const zoneCe = computeCe(form.zoneHigh, form.zoneLow);

  const activeRb = useMemo(() => {
    if (!form.closePrice) return rankedRbs[0] || null;
    return findActiveRb(rankedRbs, form.closePrice);
  }, [rankedRbs, form.closePrice]);

  const activeRbCe = activeRb ? computeCe(activeRb.high, activeRb.low) : null;

  const activeRbPosition = activeRb
    ? detectRbVsZone({
        zoneHigh: form.zoneHigh,
        zoneLow: form.zoneLow,
        rbHigh: activeRb.high,
        rbLow: activeRb.low,
      })
    : null;
  const activeRbPosInfo = activeRbPosition
    ? rbVsZoneInfo(activeRbPosition)
    : null;

  const negotiation = activeRb
    ? judgeRejectionBlock({
        rbHigh: activeRb.high,
        rbLow: activeRb.low,
        closePrice: form.closePrice,
      })
    : null;
  const verdict = premiumDiscountVerdict(negotiation);
  const strength = negotiation ? strengthInfo(negotiation.strength) : null;

  // EMA 50 (with validation)
  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    emaPrior: form.ema50Prior,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);
  const alignment = negotiation
    ? emaAlignment({
        direction: ema.direction,
        position: ema.position,
        verdict: negotiation.verdict,
      })
    : null;

  // Conditions
  const conditions = useMemo(() => {
    if (!activeRb || !negotiation) return { above: [], below: [] };
    return checkConditions({
      activeRb,
      allRbs: rankedRbs,
      closePrice: form.closePrice,
      verdict: negotiation.verdict,
    });
  }, [activeRb, rankedRbs, form.closePrice, negotiation]);

  const condSummary = negotiation
    ? conditionSummary(conditions, negotiation.verdict)
    : null;

  const flipped = useMemo(
    () => detectAllRbsFlipped({ rankedRbs, closePrice: form.closePrice }),
    [rankedRbs, form.closePrice]
  );
  const flippedInfo = allFlippedInfo(flipped);

  const completeness = useMemo(
    () =>
      checkRbCompleteness({
        rankedRbs,
        atr: parseFloat(form.atrCurrent) || 0,
      }),
    [rankedRbs, form.atrCurrent]
  );

  // Reversal
  const reversal = useMemo(() => {
    if (!negotiation || negotiation.verdict === "WAIT") return null;
    const list =
      negotiation.verdict === "SELL" ? conditions.below : conditions.above;
    if (!list || list.length === 0) return null;
    return detectReversal({
      verdict: negotiation.verdict,
      conditionRbs: list,
      closePrice: form.closePrice,
      priorClose: form.priorClose,
    });
  }, [negotiation, conditions, form.closePrice, form.priorClose]);

  const nextTrade = reversal
    ? computeNextOpportunityTrade({
        newRb: reversal.newRb,
        newDirection: reversal.newDirection,
        sweepLevel: reversal.sweepLevel,
        accountSize: profile?.account_size || 0,
        riskPercent: profile?.risk_percent || 1,
        atr: parseFloat(form.atrCurrent) || 0,
        pipSize: parseFloat(form.pipSize) || PIP_SIZE_DEFAULT,
      })
    : null;

  const atr = atrFilter(form.atrCurrent, form.atrPrior);

  const trade =
    negotiation &&
    (negotiation.verdict === "BUY" || negotiation.verdict === "SELL")
      ? computeRejectionBlockTrade({
          rbHigh: activeRb.high,
          rbLow: activeRb.low,
          verdict: negotiation.verdict,
          accountSize: profile?.account_size || 0,
          riskPercent: profile?.risk_percent || 1,
          atr: parseFloat(form.atrCurrent) || 0,
          pipSize: parseFloat(form.pipSize) || PIP_SIZE_DEFAULT,
        })
      : null;

  const pathInfo = useMemo(() => {
    if (!trade || !negotiation) {
      return { pathRbs: [], hasBlockers: false, safeTp: null, safeTpPips: null };
    }
    return detectRbsInPath({
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      direction: trade.direction,
      rankedRbs,
      pipSize: parseFloat(form.pipSize) || PIP_SIZE_DEFAULT,
    });
  }, [trade, negotiation, rankedRbs, form.pipSize]);

  // ============================================================
  // DANGER ENGINE
  // ============================================================
  const zonePositionMap = useMemo(() => {
    const map = {};
    rankedRbs.forEach((rb) => {
      const pos = detectRbVsZone({
        zoneHigh: form.zoneHigh,
        zoneLow: form.zoneLow,
        rbHigh: rb.high,
        rbLow: rb.low,
      });
      map[rb.id] = pos || "inside";
    });
    return map;
  }, [rankedRbs, form.zoneHigh, form.zoneLow]);

  const rankMap = useMemo(() => {
    const map = {};
    rankedRbs.forEach((rb) => {
      map[rb.id] = rb.rank;
    });
    return map;
  }, [rankedRbs]);

  const pathDanger = useMemo(() => {
    if (!trade || !negotiation || !pathInfo.hasBlockers) return null;
    return scorePathDanger({
      pathRbs: pathInfo.pathRbs,
      verdict: trade.direction,
      entry: trade.entry,
      tp: trade.tp,
      close: form.closePrice ? parseFloat(form.closePrice) : null,
      atr: parseFloat(form.atrCurrent) || 0,
      pipSize: parseFloat(form.pipSize) || PIP_SIZE_DEFAULT,
      zonePositionMap,
      rankMap,
      ema: { direction: ema.direction, position: ema.position },
    });
  }, [
    trade,
    negotiation,
    pathInfo,
    form.closePrice,
    form.atrCurrent,
    form.pipSize,
    zonePositionMap,
    rankMap,
    ema,
  ]);

  const dangerBanner = pathDanger
    ? pathDangerBanner(pathDanger, trade?.direction)
    : null;

  const pathBlockerBadge = pathInfo.nearest
    ? blockerInfo({
        direction: trade?.direction,
        nearest: pathInfo.nearest,
        distanceRatio: pathInfo.nearest.distanceRatio,
      })
    : null;

  const pipSize = parseFloat(form.pipSize) || PIP_SIZE_DEFAULT;
  const tradePips = trade
    ? computePips({
        entry: trade.entry,
        sl: trade.sl,
        tp: trade.tp,
        pipSize,
      })
    : null;

  const zoneInfo = zoneTypeInfo(form.zoneType);

  // ============================================================
  // VALIDATION
  // ============================================================
  const validation = useMemo(
    () =>
      validateSetupInputs({
        closePrice: form.closePrice,
        rankedRbs,
        emaCurrent: form.ema50Price,
        emaPrior: form.ema50Prior,
        atrCurrent: form.atrCurrent,
        atrPrior: form.atrPrior,
      }),
    [
      form.closePrice,
      form.ema50Price,
      form.ema50Prior,
      form.atrCurrent,
      form.atrPrior,
      rankedRbs,
    ]
  );

  // ============================================================
  // SAVE
  // ============================================================
  async function handleSave() {
    if (!negotiation || !activeRb) {
      setError("Fill in the zone, at least one RB, and close price first.");
      return;
    }
    if (!validation.ok) {
      setError("Fix the validation errors before saving.");
      return;
    }

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

    // --- VISIT MODE ---
    if (isVisit) {
      const { data: parentRbs } = await supabase
        .from("rejection_block_rbs")
        .select("*")
        .eq("setup_id", visitId);

      let activeRbRowId = null;
      if (parentRbs && activeRb) {
        const match = parentRbs.find(
          (r) =>
            parseFloat(r.rb_high) === parseFloat(activeRb.high) &&
            parseFloat(r.rb_low) === parseFloat(activeRb.low)
        );
        activeRbRowId = match?.id || null;
      }

      const visitPayload = {
        user_id: user.id,
        setup_id: visitId,
        rb_id: activeRbRowId,
        rb_high: activeRb.high,
        rb_low: activeRb.low,
        rb_ce: negotiation.ce,
        close_price: form.closePrice ? parseFloat(form.closePrice) : null,
        prior_close: form.priorClose ? parseFloat(form.priorClose) : null,
        verdict: negotiation.verdict,
        strength: negotiation.strength,
        premium_discount: negotiation.side,
        rb_broken: negotiation.rbBroken,
        ema50_direction: ema.direction,
        ema50_position: ema.position,
        ema50_aligned: alignment?.key === "aligned",
        conditions_above: conditions.above,
        conditions_below: conditions.below,
        all_rbs_flipped: flipped.allFlipped,
        all_rbs_flipped_direction: flipped.direction,
        reversal_detected: !!reversal,
        reversal_direction: reversal?.newDirection || null,
        entry: trade?.entry || null,
        sl: trade?.sl || null,
        tp: trade?.tp || null,
        lot_size: trade?.lotSize || null,
        risk_amount: trade?.riskAmount || null,
        pip_size: pipSize,
        sl_pips: tradePips?.slDistance || null,
        tp_pips: tradePips?.tpDistance || null,
        notes: form.notes,
      };

      const { error: visitErr } = await supabase
        .from("rejection_block_visits")
        .insert(visitPayload);

      if (visitErr) {
        setError(visitErr.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => router.push(`/setups/${visitId}`), 800);
      return;
    }

    // --- NEW or EDIT ---
    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "rejection_block",
      d1_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${activeRb.low}-${activeRb.high}`,
      ce_price: negotiation.ce,
      use_ce_entry: true,
      checklist_score: 0,
      checklist_passed: false,
      notes: form.notes,
    };

    let setup;
    if (isEdit) {
      const { data, error: updErr } = await supabase
        .from("setups")
        .update(setupPayload)
        .eq("id", editId)
        .select()
        .single();
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("setups")
        .insert(setupPayload)
        .select()
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    }

    const detailPayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      zone_type: form.zoneType,
      zone_high: form.zoneHigh ? parseFloat(form.zoneHigh) : null,
      zone_low: form.zoneLow ? parseFloat(form.zoneLow) : null,
      zone_ce: zoneCe,
      rb_high: activeRb.high,
      rb_low: activeRb.low,
      rb_ce: negotiation.ce,
      rb_position: activeRbPosition,
      close_price: form.closePrice ? parseFloat(form.closePrice) : null,
      prior_close: form.priorClose ? parseFloat(form.priorClose) : null,
      premium_discount: negotiation.side,
      verdict: negotiation.verdict,
      strength: negotiation.strength,
      rb_broken: negotiation.rbBroken,
      reason: negotiation.reason,
      entry: trade?.entry || null,
      sl: trade?.sl || null,
      tp: trade?.tp || null,
      lot_size: trade?.lotSize || null,
      risk_amount: trade?.riskAmount || null,
      pip_size: pipSize,
      sl_pips: tradePips?.slDistance || null,
      tp_pips: tradePips?.tpDistance || null,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,
      atr_state: atr.key,
      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_prior: form.ema50Prior ? parseFloat(form.ema50Prior) : null,
      ema50_direction: ema.direction,
      ema50_position_field: ema.position,
      ema50_aligned: alignment?.key === "aligned",
      conditions_above: conditions.above,
      conditions_below: conditions.below,
      all_rbs_flipped: flipped.allFlipped,
      all_rbs_flipped_direction: flipped.direction,
      reversal_detected: !!reversal,
      reversal_direction: reversal?.newDirection || null,
      reversal_rb_high: reversal?.newRb?.high || null,
      reversal_rb_low: reversal?.newRb?.low || null,
      reversal_rb_ce: reversal?.newRb?.ce || null,
      reversal_sweep_level: reversal?.sweepLevel || null,
      reversal_entry: nextTrade?.entry || null,
      reversal_sl: nextTrade?.sl || null,
      reversal_tp: nextTrade?.tp || null,
      candle_1: {
        open: candle1.open ? parseFloat(candle1.open) : null,
        high: candle1.high ? parseFloat(candle1.high) : null,
        low: candle1.low ? parseFloat(candle1.low) : null,
        close: candle1.close ? parseFloat(candle1.close) : null,
      },
      candle_2: {
        open: candle2.open ? parseFloat(candle2.open) : null,
        high: candle2.high ? parseFloat(candle2.high) : null,
        low: candle2.low ? parseFloat(candle2.low) : null,
        close: candle2.close ? parseFloat(candle2.close) : null,
      },
      detection_result: detection.detected
        ? { rbs: detection.rbs, reason: detection.reason }
        : null,
      detection_vs_close_status: detectionVsClose?.status || null,
      detection_vs_close_level: detectionVsClose?.level || null,
      path_rbs: pathInfo.pathRbs,
      safe_tp: pathInfo.safeTp,
      safe_tp_pips: pathInfo.safeTpPips,
      has_blockers: pathInfo.hasBlockers,
      path_danger_score: pathDanger?.topScore || null,
      path_danger_tier: pathDanger?.topTier?.key || null,
      path_danger_summary: pathDanger?.summary || null,
      nearest_danger_rb: pathDanger?.rbs?.[0] || null,
      notes: form.notes,
    };

    if (isEdit && existingDetailId) {
      const { error: updErr } = await supabase
        .from("rejection_block_setups")
        .update(detailPayload)
        .eq("id", existingDetailId);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from("rejection_block_setups")
        .insert(detailPayload);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    if (isEdit) {
      await supabase
        .from("rejection_block_rbs")
        .delete()
        .eq("setup_id", setup.id);
    }

    const rbRows = rankedRbs.map((rb) => {
      const pos = detectRbVsZone({
        zoneHigh: form.zoneHigh,
        zoneLow: form.zoneLow,
        rbHigh: rb.high,
        rbLow: rb.low,
      });
      return {
        user_id: user.id,
        setup_id: setup.id,
        pair: form.pair,
        rb_high: rb.high,
        rb_low: rb.low,
        rb_ce: computeCe(rb.high, rb.low),
        rb_position: pos,
        rank: rb.rank,
        is_active: rb.id === activeRb.id,
      };
    });

    const { error: rbErr } = await supabase
      .from("rejection_block_rbs")
      .insert(rbRows);
    if (rbErr) {
      setError(rbErr.message);
      setSaving(false);
      return;
    }

    // Auto-create journal trade
    if (!isEdit) {
      await createTradeFromSetup({
        supabase,
        userId: user.id,
        setupId: setup.id,
        pair: form.pair,
        direction: negotiation.verdict === "BUY" ? "buy" : "sell",
        entry: trade?.entry,
        sl: trade?.sl,
        tp: trade?.tp,
        lotSize: trade?.lotSize,
        riskPercent: profile?.risk_percent || 1,
        rr: 2,
        extra: {
          ce_price: negotiation.ce,
          used_ce_entry: true,
          rb_verdict: negotiation.verdict,
          rb_verdict_price: form.closePrice
            ? parseFloat(form.closePrice)
            : null,
          rb_verdict_flipped: negotiation.verdict === "SELL",
        },
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading setup...</div>
      </main>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isVisit
              ? "Log Visit — Rejection Block Zone"
              : isEdit
              ? "Edit Rejection Block Setup"
              : "Rejection Block Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            Zones hold orders. Rejection Blocks make decisions.
          </p>
        </div>

        {isVisit && (
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-700">
            <p className="text-xs text-purple-200">
              🔄 Visit mode — logging a new reaction on the existing zone.
            </p>
          </div>
        )}

        {/* Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker
              value={form.pair}
              onChange={(pair) => update("pair", pair)}
              label="Pair"
            />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Timeframe
              </label>
              <select
                value={form.timeframe}
                onChange={(e) => update("timeframe", e.target.value)}
                disabled={isVisit}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
              >
                <option value="D1">D1</option>
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M30">M30</option>
                <option value="M15">M15</option>
              </select>
            </div>
          </div>
        </div>

        {/* Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Zone (where orders sit)
          </h2>
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Zone Type
            </label>
            <select
              value={form.zoneType}
              onChange={(e) => update("zoneType", e.target.value)}
              disabled={isVisit}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
            >
              {ZONE_TYPES.map((z) => (
                <option key={z.key} value={z.key}>
                  {z.emoji} {z.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.zoneLow}
                onChange={(e) => update("zoneLow", e.target.value)}
                disabled={isVisit}
                placeholder="e.g. 209400"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.zoneHigh}
                onChange={(e) => update("zoneHigh", e.target.value)}
                disabled={isVisit}
                placeholder="e.g. 209600"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
              />
            </div>
          </div>
          {zoneCe !== null && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
              <p className="text-xs text-blue-300 font-semibold">Zone CE</p>
              <p className="text-lg font-bold tabular-nums text-blue-200">
                {formatPrice(zoneCe)}
              </p>
            </div>
          )}
        </div>

        {/* Two-Candle Detection */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-400">
              Detect RB from Two Candles (Sweep + Reclaim)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Candle 2 sweeps beyond Candle 1's wick — body closes back
              inside. OHLC only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
              <p className="text-xs font-semibold text-gray-400">Candle 1</p>
              {["open", "high", "low", "close"].map((f) => (
                <input
                  key={f}
                  type="number"
                  step="any"
                  value={candle1[f]}
                  onChange={(e) => updateC1(f, e.target.value)}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                />
              ))}
            </div>

            <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
              <p className="text-xs font-semibold text-gray-400">Candle 2</p>
              {["open", "high", "low", "close"].map((f) => (
                <input
                  key={f}
                  type="number"
                  step="any"
                  value={candle2[f]}
                  onChange={(e) => updateC2(f, e.target.value)}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                />
              ))}
            </div>
          </div>

          {detection.detected ? (
            <div className="space-y-2">
              {detection.rbs.length === 2 && (
                <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-700">
                  <p className="text-sm font-bold text-purple-200">
                    ⚡ Dual sweep — dead candle
                  </p>
                  <p className="text-xs text-purple-300 mt-1">
                    {detection.reason}
                  </p>
                </div>
              )}

              {detection.rbs.map((rb) => {
                const alreadyAdded = addedRbIds.includes(rb.id);
                const isResistance = rb.type === "resistance";
                return (
                  <div
                    key={rb.id}
                    className={`p-3 rounded-lg border ${
                      isResistance
                        ? "bg-purple-950/30 border-purple-700"
                        : "bg-orange-950/30 border-orange-700"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-bold">
                        {isResistance
                          ? "🔺 Resistance RB detected"
                          : "🔻 Support RB detected"}
                      </p>
                      <span className="text-xs text-gray-400">
                        sweep {rb.sweepSize}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
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
                    <p className="text-xs text-gray-400 mt-2">{rb.reason}</p>

                    <button
                      type="button"
                      onClick={() => addDetectedToRbs(rb)}
                      disabled={alreadyAdded}
                      className={`w-full mt-3 py-2 rounded-lg font-bold ${
                        alreadyAdded
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                          : "bg-green-800 hover:bg-green-700"
                      }`}
                    >
                      {alreadyAdded
                        ? "✓ Already added to RBs"
                        : "+ Add to Rejection Blocks"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            (candle1.high ||
              candle1.low ||
              candle2.high ||
              candle2.low ||
              candle2.close) && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-800">
                <p className="text-xs text-red-300 font-semibold">
                  ❌ Not a valid RB
                </p>
                <p className="text-xs text-red-200 mt-1">
                  {detection.reason}
                </p>
              </div>
            )
          )}
        </div>

        {/* Validation Panel */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="p-4 rounded-lg border-2 border-red-700 bg-red-950/30 space-y-2">
            <p className="text-sm font-bold text-red-200">
              ⚠️ Fix these before saving
            </p>
            {validation.errors.length > 0 && (
              <ul className="text-xs text-red-200 space-y-1 list-disc ml-4">
                {validation.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.field}:</strong> {e.message}
                  </li>
                ))}
              </ul>
            )}
            {validation.warnings.length > 0 && (
              <div className="pt-2 border-t border-red-800/50">
                <p className="text-xs font-semibold text-yellow-200">
                  Warnings (non-blocking)
                </p>
                <ul className="text-xs text-yellow-200 space-y-1 list-disc ml-4 mt-1">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>
                      <strong>{w.field}:</strong> {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Detection vs Verdict Close */}
        {detectionVsClose && (
          <div
            className={`p-4 rounded-lg border-2 space-y-2 ${detectionVsClose.color}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold">
                {detectionVsClose.emoji} {detectionVsClose.label}
              </p>
              <span className="text-xs opacity-80">
                {detectionVsClose.rbType === "resistance"
                  ? "🔺 Resistance"
                  : "🔻 Support"}{" "}
                ·{" "}
                {detectionVsClose.distancePips > 0
                  ? `${detectionVsClose.distancePips} pips from edge`
                  : "inside range"}
              </span>
            </div>
            <p className="text-sm opacity-90">
              {detectionVsClose.description}
            </p>
            <p className="text-xs uppercase tracking-wider font-bold">
              Action:{" "}
              {detectionVsClose.action === "wait"
                ? "⏳ WAIT"
                : detectionVsClose.action === "confirmed"
                ? "✅ CONFIRMED — proceed"
                : "▶ Proceed"}
            </p>
          </div>
        )}

        {/* Rejection Blocks */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                Rejection Blocks (multiple)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                List every RB around the zone — none should be left off.
              </p>
            </div>
            {!isVisit && (
              <button
                type="button"
                onClick={addRb}
                className="text-xs px-3 py-1.5 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
              >
                + Add RB
              </button>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${completeness.color}`}>
            <p className="text-xs font-semibold">
              {completeness.emoji} {completeness.label}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {completeness.description}
            </p>
          </div>

          <div className="space-y-2">
            {rbs.map((rb) => {
              const ranked = rankedRbs.find((x) => x.id === rb.id);
              const rank = ranked ? rbRankInfo(ranked.rank) : null;
              const isActive = activeRb && activeRb.id === rb.id;
              const pos =
                rb.high && rb.low
                  ? detectRbVsZone({
                      zoneHigh: form.zoneHigh,
                      zoneLow: form.zoneLow,
                      rbHigh: rb.high,
                      rbLow: rb.low,
                    })
                  : null;
              const posInfo = pos ? rbVsZoneInfo(pos) : null;

              return (
                <div
                  key={rb.id}
                  className={`grid grid-cols-12 gap-2 items-end p-2 rounded border ${
                    isActive
                      ? "bg-green-950/20 border-green-700 ring-1 ring-green-700"
                      : "bg-black border-gray-800"
                  }`}
                >
                  <div className="col-span-3 flex flex-col gap-1">
                    {rank && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border text-center ${rank.color}`}
                      >
                        {rank.emoji} {rank.label}
                      </span>
                    )}
                    {posInfo && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border text-center ${posInfo.color}`}
                      >
                        {posInfo.emoji} {posInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs mb-1 text-gray-500">
                      RB Low
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rb.low}
                      onChange={(e) =>
                        updateRb(rb.id, "low", e.target.value)
                      }
                      disabled={isVisit}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs mb-1 text-gray-500">
                      RB High
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rb.high}
                      onChange={(e) =>
                        updateRb(rb.id, "high", e.target.value)
                      }
                      disabled={isVisit}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {!isVisit && rbs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRb(rb.id)}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                    {isActive && (
                      <span className="block text-xs text-green-400 font-semibold mt-1">
                        active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EMA + Close + ATR + Pip */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 · Verdict · Volatility · Pip
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                EMA 50 (current)
              </label>
              <input
                type="number"
                step="any"
                value={form.ema50Price}
                onChange={(e) => update("ema50Price", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                EMA 50 (prior)
              </label>
              <input
                type="number"
                step="any"
                value={form.ema50Prior}
                onChange={(e) => update("ema50Prior", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Prior Close
              </label>
              <input
                type="number"
                step="any"
                value={form.priorClose}
                onChange={(e) => update("priorClose", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Close Price (the verdict)
              </label>
              <input
                type="number"
                step="any"
                value={form.closePrice}
                onChange={(e) => update("closePrice", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR current
              </label>
              <input
                type="number"
                step="any"
                value={form.atrCurrent}
                onChange={(e) => update("atrCurrent", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR prior
              </label>
              <input
                type="number"
                step="any"
                value={form.atrPrior}
                onChange={(e) => update("atrPrior", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={form.pipSize}
                onChange={(e) =>
                  update("pipSize", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value={0.0001}>0.0001</option>
                <option value={0.001}>0.001</option>
                <option value={0.01}>0.01 (VOL)</option>
                <option value={0.1}>0.1</option>
                <option value={1}>1.0</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verdict */}
        {negotiation && (
          <div className={`p-4 rounded-lg border space-y-2 ${verdict.color}`}>
            <p className="text-xs opacity-80">Verdict (active RB)</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold">
                {verdict.emoji} {verdict.label}
              </p>
              {verdict.brokenBadge && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${verdict.brokenBadge.color}`}
                >
                  {verdict.brokenBadge.label}
                </span>
              )}
              {strength && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${strength.color}`}
                >
                  {strength.emoji} {strength.label}
                </span>
              )}
              {flippedInfo && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-bold ${flippedInfo.color}`}
                >
                  {flippedInfo.emoji} {flippedInfo.label}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90">{verdict.description}</p>
          </div>
        )}

        {/* Danger Banner */}
        {dangerBanner && (
          <div
            className={`p-4 rounded-lg border-2 space-y-2 ${dangerBanner.color}`}
          >
            <p className="text-sm font-bold">
              {dangerBanner.emoji} {dangerBanner.label}
            </p>
            <p className="text-sm opacity-90">{dangerBanner.description}</p>
          </div>
        )}

        {/* Trade Card */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-blue-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-blue-400">
                Trade Parameters
              </h2>
              <div className="flex items-center gap-2">
                {pathDanger && pathDanger.topScore > 0 && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-bold ${pathDanger.topTier.badge}`}
                  >
                    {pathDanger.topTier.emoji} Path {pathDanger.topScore}/10
                  </span>
                )}
                {alignment && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${alignment.color}`}
                  >
                    {alignment.label}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded-full font-bold ${
                    trade.direction === "BUY"
                      ? "bg-green-900/40 text-green-300"
                      : "bg-red-900/40 text-red-300"
                  }`}
                >
                  {trade.direction}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Entry (CE)</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {formatPrice(trade.entry)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {formatPrice(trade.sl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(trade.tp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">RR</p>
                <p className="font-bold tabular-nums text-white">1:2</p>
              </div>
              {tradePips && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">SL distance</p>
                    <p className="font-bold tabular-nums text-red-300">
                      {tradePips.slDistance} pips
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TP distance</p>
                    <p className="font-bold tabular-nums text-green-300">
                      {tradePips.tpDistance} pips
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pip size</p>
                    <p className="font-bold tabular-nums text-gray-300">
                      {tradePips.pipSize}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Path to Target */}
        {trade && pathInfo.hasBlockers && pathInfo.nearest && pathDanger && (
          <div className="p-4 rounded-lg bg-gray-900 border-2 border-yellow-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-yellow-300">
                ⚠️ RBs in the path
              </h2>
              {pathBlockerBadge && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-bold ${pathBlockerBadge.color}`}
                >
                  {pathBlockerBadge.emoji} {pathBlockerBadge.label}
                </span>
              )}
            </div>

            <p className="text-xs text-yellow-200">{pathDanger.summary}</p>

            <div className="space-y-2">
              {pathDanger.rbs.map((d, i) => (
                <div
                  key={d.rbId || i}
                  className={`p-3 rounded-lg border ${d.tier.color}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-bold">
                      {d.tier.emoji} {d.tier.label} · {d.score}/10
                    </span>
                    <span className="text-xs tabular-nums opacity-90">
                      {d.rbLow} – {d.rbHigh} (CE {d.ce})
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-1">{d.reason}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <p>
                      <span className="opacity-70">To entry:</span>{" "}
                      <span className="font-bold tabular-nums">
                        {d.distanceToEntryPips} pips
                      </span>
                    </p>
                    <p>
                      <span className="opacity-70">To TP:</span>{" "}
                      <span className="font-bold tabular-nums">
                        {d.distanceToTpPips} pips
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
              <p className="text-xs text-yellow-200 font-semibold">
                💡 Recommended:
              </p>
              <p className="text-xs text-yellow-100 mt-1">
                Full 2R target:{" "}
                <strong className="tabular-nums">
                  {formatPrice(trade.tp)}
                </strong>
              </p>
              <p className="text-xs text-yellow-100">
                Safe TP (before nearest RB):{" "}
                <strong className="tabular-nums">
                  {formatPrice(pathInfo.safeTp)}
                </strong>{" "}
                {pathInfo.safeTpPips !== null && (
                  <span className="text-yellow-300">
                    ({pathInfo.safeTpPips} pips)
                  </span>
                )}
              </p>
              {pathDanger.topScore >= 8 && (
                <p className="text-xs text-red-300 mt-2 font-bold">
                  🚨 Strongly consider the Safe TP — critical RB in path.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Next Opportunity */}
        {reversal && nextTrade && (
          <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-purple-300">
                🔄 Next Opportunity — Reversal
              </h2>
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${
                  nextTrade.direction === "BUY"
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {nextTrade.direction}
              </span>
            </div>
            <p className="text-xs text-purple-200">{reversal.reason}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">New RB</p>
                <p className="font-bold tabular-nums">
                  {nextTrade.newRbLow} – {nextTrade.newRbHigh}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">New CE</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {formatPrice(nextTrade.entry)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {formatPrice(nextTrade.sl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(nextTrade.tp)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={2}
            placeholder="Any observations..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ {isVisit ? "Visit logged" : isEdit ? "Updated" : "Saved"} —
            redirecting...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !negotiation ||
            negotiation.verdict === "WAIT" ||
            !activeRb ||
            !validation.ok
          }
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            isVisit
              ? "bg-purple-800 hover:bg-purple-700"
              : isEdit
              ? "bg-blue-700 hover:bg-blue-600"
              : negotiation?.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : negotiation?.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800"
          }`}
        >
          {saving
            ? "Saving..."
            : isVisit
            ? "📍 Log Visit"
            : isEdit
            ? "✏️ Update Setup"
            : negotiation?.verdict === "BUY"
            ? "✅ Save BUY Setup"
            : negotiation?.verdict === "SELL"
            ? "🔴 Save SELL Setup"
            : "Fill zone + RB + close to enable"}
        </button>

        {!validation.ok && (
          <p className="text-xs text-red-300 text-center">
            Fix the errors above to enable Save.
          </p>
        )}

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How the Rejection Block Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Detection</strong> — sweep + reclaim (Candle 2 sweeps
              beyond Candle 1's wick, closes back inside)
            </li>
            <li>
              <strong>Multiple RBs</strong> — inside, above, or below the
              zone
            </li>
            <li>
              <strong>Active RB</strong> — the one price is approaching
            </li>
            <li>
              <strong>EMA 50</strong> — aligns trade with higher-timeframe
              trend
            </li>
            <li>
              <strong>Danger Engine</strong> — scores every RB in the path
              0–10 by how likely it is to reject your trade
            </li>
            <li>
              <strong>Entry</strong> — CE of the active RB (50%)
            </li>
            <li>
              <strong>SL</strong> — beyond the active RB wick + ATR buffer
            </li>
            <li>
              <strong>TP</strong> — 2R from entry, or Safe TP before the
              nearest critical RB
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}