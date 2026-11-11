/** Normal CDF via Abramowitz-Stegun 7.1.26. */
export function normCdf(x: number): number {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z));
  return 0.5 * (1 + sign * y);
}

export type SecondPrice = { t: number; p: number };

/**
 * Per-second EWMA volatility of log returns.
 * Gaps longer than 1 second are not treated as a single quiet return.
 */
export function ewmaSigma(
  points: SecondPrice[],
  lambda: number,
  nowSec: number,
  lookbackSec: number,
): { sigma: number; seconds: number } {
  const from = nowSec - lookbackSec;
  const bucket = new Map<number, number>();
  for (const pt of points) {
    if (!Number.isFinite(pt.p) || pt.p <= 0) continue;
    const sec = Math.floor(pt.t);
    if (sec < from || sec > nowSec) continue;
    bucket.set(sec, pt.p);
  }
  const secs = [...bucket.keys()].sort((a, b) => a - b);
  let v = 0;
  let n = 0;
  for (let i = 1; i < secs.length; i++) {
    if (secs[i] - secs[i - 1] !== 1) continue;
    const a = bucket.get(secs[i - 1])!;
    const b = bucket.get(secs[i])!;
    const r = Math.log(b / a);
    if (!Number.isFinite(r)) continue;
    v = n === 0 ? r * r : lambda * v + (1 - lambda) * r * r;
    n++;
  }
  return { sigma: n > 0 ? Math.sqrt(Math.max(v, 0)) : 0, seconds: secs.length };
}

/** Dollars per second over the recent path. Too little history returns 0. */
export function driftPerSec(points: SecondPrice[], nowSec: number, lookback = 30): number {
  const from = nowSec - lookback;
  const bucket = new Map<number, number>();
  for (const pt of points) {
    if (!Number.isFinite(pt.p)) continue;
    const sec = Math.floor(pt.t);
    if (sec < from || sec > nowSec) continue;
    bucket.set(sec, pt.p);
  }
  const secs = [...bucket.keys()].sort((a, b) => a - b);
  const need = lookback <= 8 ? 3 : 6;
  if (secs.length < need) return 0;
  const dt = secs[secs.length - 1] - secs[0];
  if (dt < need) return 0;
  const a = bucket.get(secs[0])!;
  const b = bucket.get(secs[secs.length - 1])!;
  return (b - a) / dt;
}

export type ModelIn = {
  S: number;
  K: number;
  tau: number;
  sigmaPerSec: number;
  tail: number;
  basis: number;
  driftPerSec: number;
  velShort?: number;
  velImpulse?: number;
  marketDelta?: number;
  /** Up mid, a probability. Not a price change. */
  marketP?: number | null;
  /** How long each velocity was measured. The forecast may not run longer than that. */
  pace?: { impulse: number; short: number; mid: number };
  askUp: number | null;
  askDown: number | null;
  bidUp: number | null;
  bidDown: number | null;
  feeRate: number;
  feeExp: number;
};

export type ModelOut = {
  S: number;
  K: number;
  gap: number;
  driftPerSec: number;
  velShort: number;
  velImpulse: number;
  marketDelta: number;
  accel: number;
  horizon: number;
  projectedGap: number;
  crossSec: number | null;
  sigma: number;
  tau: number;
  totalSd: number;
  z: number;
  /** Path chance only. This is the call. */
  pUp: number;
  /** Half path, half Up mid. Score only, never the call. */
  pBlend: number | null;
  /** Up mid used for the blend and the disagreement check. */
  marketP: number | null;
  midUp: number | null;
  midDown: number | null;
  pDown: number;
  askUp: number | null;
  askDown: number | null;
  feeUp: number | null;
  feeDown: number | null;
  edgeUp: number | null;
  edgeDown: number | null;
  spreadUp: number | null;
  spreadDown: number | null;
  /** Buy then sell at the bid, fees both ways, per share. This is not the hold-to-end edge. */
  roundTripUp: number | null;
  roundTripDown: number | null;
};

/** Fee in price units (USDC per share), crypto curve: rate * (p * (1-p))^exp. */
export function feePerShare(price: number, rate: number, exp: number): number {
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return 0;
  const x = price * (1 - price);
  return rate * Math.pow(x, exp);
}

/** 5-minute measurement windows. A velocity is not projected past the window that measured it. */
export const PACE_5 = { impulse: 6, short: 10, mid: 30 };
/**
 * 15-minute windows, the 5-minute set times 3.
 * This is a scale, not a fit. It has not been tuned on results.
 */
export const PACE_15 = { impulse: 18, short: 30, mid: 90 };

export function projectedMove(
  tau: number,
  impulse: number,
  ten: number,
  mid: number,
  pace: { impulse: number; short: number; mid: number },
): { move: number; horizon: number } {
  const iH = Math.min(Math.max(0, tau), pace.impulse);
  const sH = Math.min(Math.max(0, tau), pace.short);
  const mH = Math.min(Math.max(0, tau), pace.mid);
  const fromI = impulse * iH;
  const fromS = ten * sH;
  const fromM = mid * mH;
  if (Math.abs(impulse) >= 0.2) return { move: fromI * 0.75 + fromS * 0.25, horizon: iH };
  return { move: fromS * 0.65 + fromM * 0.35, horizon: sH };
}

export function runModel(i: ModelIn): ModelOut {
  const sig = Math.max(i.sigmaPerSec, 1e-8) * Math.max(i.tail, 0);
  const tau = Math.max(0, i.tau);
  const mid = Number.isFinite(i.driftPerSec) ? i.driftPerSec : 0;
  const ten = Number.isFinite(i.velShort) ? (i.velShort as number) : mid;
  const impulse = Number.isFinite(i.velImpulse) ? (i.velImpulse as number) : ten;
  const marketDelta = Number.isFinite(i.marketDelta) ? (i.marketDelta as number) : 0;
  const accel = impulse - mid;
  const pace = i.pace ?? PACE_5;
  const cast = projectedMove(tau, impulse, ten, mid, pace);
  // No dollar cap on volatility. Capping it made a real gap look certain.
  const priceSigma = Math.max(sig * i.S, 1);
  const totalSd = Math.sqrt(priceSigma ** 2 * tau + Math.max(i.basis, 0) ** 2);
  const gap = i.S - i.K;
  const projectedGap = gap + cast.move;
  const horizon = cast.horizon;
  const lead = horizon > 0 ? cast.move / horizon : 0;
  let crossSec: number | null = null;
  if (Math.abs(lead) > 0.2 && gap * lead < 0) {
    const tCross = Math.abs(gap) / Math.abs(lead);
    if (tCross <= tau + 1) crossSec = tCross;
  }
  const pathRaw = clamp01(normCdf(totalSd > 0 ? projectedGap / totalSd : 0));
  // The curve hits 0 and 1 too easily. The call stops at 0.5% and 99.5%.
  const pUp = Math.min(0.995, Math.max(0.005, pathRaw));
  const marketP = i.marketP != null && Number.isFinite(i.marketP) ? clamp01(i.marketP) : null;
  const pBlend = marketP == null ? null : clamp01(pUp * 0.5 + marketP * 0.5);
  const z = totalSd > 0 ? projectedGap / totalSd : 0;
  const feeUp = i.askUp == null ? null : feePerShare(i.askUp, i.feeRate, i.feeExp);
  const feeDown = i.askDown == null ? null : feePerShare(i.askDown, i.feeRate, i.feeExp);
  const edgeUp = i.askUp == null || feeUp == null ? null : pUp - i.askUp - feeUp;
  const edgeDown = i.askDown == null || feeDown == null ? null : 1 - pUp - i.askDown - feeDown;
  const spread = (bid: number | null, ask: number | null) =>
    bid == null || ask == null ? null : Math.max(0, ask - bid);
  const midUp = quoteMid(i.bidUp, i.askUp);
  const midDown = quoteMid(i.bidDown, i.askDown);
  const round = (bid: number | null, ask: number | null, buyFee: number | null) => {
    if (bid == null || ask == null || buyFee == null) return null;
    const sellFee = feePerShare(bid, i.feeRate, i.feeExp);
    return bid - sellFee - ask - buyFee;
  };
  return {
    S: i.S,
    K: i.K,
    gap,
    driftPerSec: mid,
    velShort: ten,
    velImpulse: impulse,
    marketDelta,
    accel,
    horizon,
    projectedGap,
    crossSec,
    sigma: sig,
    tau,
    totalSd,
    z,
    pUp,
    pBlend,
    marketP,
    midUp,
    midDown,
    pDown: 1 - pUp,
    askUp: i.askUp,
    askDown: i.askDown,
    feeUp,
    feeDown,
    edgeUp,
    edgeDown,
    spreadUp: spread(i.bidUp, i.askUp),
    spreadDown: spread(i.bidDown, i.askDown),
    roundTripUp: round(i.bidUp, i.askUp, feeUp),
    roundTripDown: round(i.bidDown, i.askDown, feeDown),
  };
}

export function quoteMid(bid: number | null, ask: number | null): number | null {
  if (bid != null && ask != null && bid > 0 && ask > 0 && bid < 1 && ask < 1) return (bid + ask) / 2;
  if (ask != null && ask > 0 && ask < 1) return ask;
  if (bid != null && bid > 0 && bid < 1) return bid;
  return null;
}

/** The hold-to-end edge already subtracts the buy fee. The extra bar is the spread, not a second fee. */
export function edgeHurdle(minEdge: number, _fee: number | null, spread: number | null): number {
  const bar = Number.isFinite(minEdge) ? minEdge : 0;
  return Math.max(bar, Math.max(0, spread ?? 0));
}

/**
 * Sell early only when the bid, after the sell fee, beats our chance by 2¢ and is also above what we paid.
 * A lower bid is a loss. That is held to the end. A falling model is not a reason to lock it in.
 */
export function exitDecision(
  bid: number,
  sellFee: number,
  pModel: number,
  entry: number,
): { sell: boolean; reason: string | null } {
  if (!Number.isFinite(bid) || !Number.isFinite(sellFee) || !Number.isFinite(pModel) || !Number.isFinite(entry)) {
    return { sell: false, reason: null };
  }
  const net = bid - sellFee;
  if (!(net > pModel + 0.02)) return { sell: false, reason: null };
  if (!(net > entry)) {
    return { sell: false, reason: "The bid is under the price paid, so the loss is held to the end." };
  }
  return { sell: true, reason: "Sold because the bid, after the fee, is above our chance and above the price paid." };
}

/** @deprecated use exitDecision. True only when a sale would also clear the entry. */
export function exitBidBeatsModel(bid: number, sellFee: number, pModel: number, entry = 0): boolean {
  return exitDecision(bid, sellFee, pModel, entry).sell;
}

/**
 * The last few seconds are an execution floor, not a strategy.
 * Full stake starts at 3 minutes left on a 5-minute window and 12 minutes left on a 15-minute window.
 * Earlier than that is still allowed. The stake is smaller there, because those calls were weaker
 * and changed more often. That was measured on 18 hours of one Binance path, not on Polymarket bids,
 * and it is not a profit test.
 */
export function entryPolicy(span: 300 | 900): { span: 300 | 900; minTau: number; maxTau: number } {
  if (span === 900) return { span, minTau: 8, maxTau: 12 * 60 };
  return { span: 300, minTau: 8, maxTau: 3 * 60 };
}

/** 1 once the studied window is open. Down to 0.25 at the start of the window. Not a ban. */
export function timeScale(span: 300 | 900, tau: number): number {
  const life = span === 900 ? 900 : 300;
  const full = entryPolicy(span).maxTau;
  if (tau <= full) return 1;
  if (tau >= life) return 0.25;
  return 0.25 + 0.75 * ((life - tau) / (life - full));
}

/**
 * Half the Kelly fraction for a contract that pays $1, then cut for time and for a price under the safety.
 * Never a fixed 10%. Capped at 25% so one window cannot take the book.
 */
export function positionSize(input: {
  span: 300 | 900;
  tau: number;
  p: number;
  ask: number;
  fee: number;
  safetyAsk: number;
}): { frac: number; note: string; capped: boolean } {
  const scale = timeScale(input.span, input.tau);
  const safety = Math.max(input.safetyAsk, 0.05);
  const priceCut = input.ask >= safety ? 1 : Math.max(0.4, input.ask / safety);
  const cost = input.ask + Math.max(0, input.fee);
  const raw = cost > 0 && cost < 1 ? (input.p - cost) / (1 - cost) : 0;
  let frac = Math.max(0, raw) * 0.5 * scale * priceCut;
  const capped = frac > 0.25 + 1e-12;
  if (capped) frac = 0.25;
  const pct = formatPct(frac);
  const book = input.span === 900 ? "15-minute" : "5-minute";
  const fullMin = Math.round(entryPolicy(input.span).maxTau / 60);
  if (frac < 0.02) {
    const why =
      scale < 0.999
        ? `Only ${pct} of cash after the time cut. With more than ${fullMin} minutes left on a ${book} window the stake is smaller, and this one is too small to buy.`
        : priceCut < 0.999
          ? `Only ${pct} of cash. ${cents(input.ask)} is under the ${cents(safety)} safety, so the stake is smaller, and this one is too small to buy.`
          : `Only ${pct} of cash. The edge is too thin to size a buy.`;
    return { frac: 0, note: why, capped: false };
  }
  const bits = [`${pct} of cash.`];
  if (scale < 0.999) bits.push(`Smaller because ${Math.max(0, Math.round(input.tau / 60))} minutes are left on the ${book} window.`);
  if (priceCut < 0.999) bits.push(`Smaller because ${cents(input.ask)} is under the ${cents(safety)} safety.`);
  if (capped) bits.push("Capped at 25% so one window cannot take the book.");
  return { frac, note: bits.join(" "), capped };
}

function formatPct(frac: number): string {
  const pct = frac * 100;
  if (pct >= 9.5) return `${Math.round(pct)}%`;
  return `${Math.round(pct * 10) / 10}%`;
}

export function stakeFraction(input: { base: number; sameSideAlready: boolean }): { frac: number; note: string } {
  if (!(input.base > 0)) return { frac: 0, note: "No stake." };
  if (input.sameSideAlready) {
    const frac = input.base / 2;
    return { frac, note: `${formatPct(frac)} of cash, half size because the other window is already on this side.` };
  }
  return { frac: input.base, note: `${formatPct(input.base)} of cash.` };
}

export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export type VerdictIn = {
  model: ModelOut | null;
  feedAgeMs: number | null;
  historySeconds: number;
  minEdge: number;
  minAsk: number;
  maxAsk: number | null;
  kelly: number;
  accepting: boolean;
  /** Which market this call belongs to. The clocks are not the same. */
  span?: 300 | 900;
};

export type Gate = { label: string; left: string; right: string };

export type Verdict = {
  side: "up" | "down" | "skip";
  call: "up" | "down" | null;
  reason: string | null;
  edge: number | null;
  ev: number | null;
  kellyFrac: number | null;
  capped: boolean;
  ask: number | null;
  gate: Gate | null;
};

export function decide(v: VerdictIn): Verdict {
  const m = v.model;
  if (!m) return skip("Waiting for the Bitcoin price.");
  if (!v.accepting) return skip("This window is not taking trades.");
  if (v.feedAgeMs == null || v.feedAgeMs > 5000) return skip("The Bitcoin price is late, so there is no call.");
  if (v.historySeconds < 60) return skip("Still learning the last minute of prices.");
  const policy = entryPolicy(v.span ?? 300);
  if (m.tau < policy.minTau) {
    return skip("Less than 8 seconds left. Too late to call.", {
      label: "Too late",
      left: `${Math.round(m.tau)}s left`,
      right: "needs 8s",
    });
  }

  const call: "up" | "down" = m.pUp >= 0.5 ? "up" : "down";
  const p = call === "up" ? m.pUp : m.pDown;
  const ask = call === "up" ? m.askUp : m.askDown;
  const edge = call === "up" ? m.edgeUp : m.edgeDown;
  const spread = call === "up" ? m.spreadUp : m.spreadDown;
  const fee = call === "up" ? m.feeUp : m.feeDown;
  const midPx = call === "up" ? m.midUp : m.midDown;
  const name = call === "up" ? "Up" : "Down";

  const early = m.crossSec != null && m.crossSec < Math.min(m.tau, 50) && Math.abs(m.projectedGap) > 4;
  if (Math.abs(m.pUp - 0.5) < (early ? 0.03 : 0.06)) {
    return finish("skip", null, "Too close to call. Bitcoin is almost on the price to beat.", edge, ask, p, v.kelly, {
      label: "Too close",
      left: `${Math.round(m.pUp * 100)}% up`,
      right: "needs a side",
    });
  }
  if (ask == null || ask <= 0 || ask >= 1 || edge == null) {
    return finish("skip", call, `Nobody is selling ${name} right now.`, edge, ask, p, v.kelly, {
      label: "No offer",
      left: name,
      right: "no ask",
    });
  }
  if (spread != null && spread > 0.04) {
    return finish("skip", call, "The buy and sell prices are too far apart.", edge, ask, p, v.kelly, {
      label: "Spread",
      left: cents(spread),
      right: "max 4¢",
    });
  }
  if (midPx != null && Math.abs(p - midPx) > 0.2 + 1e-6) {
    return finish("skip", call, "The model and the market disagree.", edge, ask, p, v.kelly, {
      label: "Disagree",
      left: `${Math.round(p * 100)}%`,
      right: cents(midPx),
    });
  }
  if (v.maxAsk != null && ask > v.maxAsk) {
    return finish("skip", call, `${name} is ${cents(ask)}. Buys stop at ${cents(v.maxAsk)}.`, edge, ask, p, v.kelly, {
      label: "Ask cap",
      left: cents(ask),
      right: cents(v.maxAsk),
    });
  }
  const hurdle = edgeHurdle(v.minEdge, fee, spread);
  if (!(edge > hurdle)) {
    const moved = moveLine(call, m);
    const blockedByCost = hurdle > v.minEdge && edge >= v.minEdge;
    const costLine = `${name} looks more likely, but the spread takes more than the remaining edge.`;
    const dear = moved
      ? `${moved} The price is already too high to buy it.`
      : (flipLine(call, m) ?? `${name} looks more likely, but that price is already too high.`);
    return finish("skip", call, blockedByCost ? costLine : dear, edge, ask, p, v.kelly, {
      label: "Edge",
      left: cents(edge),
      right: `needs ${cents(hurdle)}`,
    });
  }
  const size = positionSize({
    span: policy.span,
    tau: m.tau,
    p,
    ask,
    fee: fee ?? 0,
    safetyAsk: v.minAsk,
  });
  if (size.frac < 0.02) {
    return finish("skip", call, size.note, edge, ask, p, v.kelly, {
      label: "Size",
      left: "under 2%",
      right: "too small",
    });
  }
  return finish(
    call,
    call,
    `${size.note} ${buySentence(call, m)}`,
    edge,
    ask,
    p,
    v.kelly,
    { label: "Size", left: formatPct(size.frac), right: size.capped ? "cap 25%" : "of cash" },
    size,
  );
}

function cents(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

function moveLine(side: "up" | "down", m: ModelOut): string | null {
  const cents = Math.round(Math.abs(m.marketDelta) * 100);
  if (cents < 7) return null;
  if (side === "down" && m.marketDelta < 0) return `Up fell ${cents}¢. The move turned down.`;
  if (side === "up" && m.marketDelta > 0) return `Up jumped ${cents}¢. The move turned up.`;
  return null;
}

function flipLine(side: "up" | "down", m: ModelOut): string | null {
  if (m.crossSec == null) return null;
  const secs = Math.max(1, Math.round(m.crossSec));
  if (side === "up" && m.gap < 0) {
    return `Still under the price to beat, but the trend is rising fast enough to cross in about ${secs}s.`;
  }
  if (side === "down" && m.gap > 0) {
    return `Still over the price to beat, but the trend is falling fast enough to cross in about ${secs}s.`;
  }
  return null;
}

function buySentence(side: "up" | "down", m: ModelOut): string {
  const moved = moveLine(side, m);
  if (moved) return moved;
  const above = m.gap >= 0;
  const rising = m.velImpulse > 0.25 || m.velShort > 0.35;
  const falling = m.velImpulse < -0.25 || m.velShort < -0.35;
  return (
    flipLine(side, m) ??
    (side === "up" && above
      ? "Bitcoin is above the price to beat. Up costs less than that chance."
      : side === "up" && rising
        ? "Bitcoin is climbing toward the price to beat. Up costs less than that chance."
        : side === "up"
          ? "Up looks more likely from the path so far, and the price is still low enough."
          : !above && falling
            ? "Bitcoin is below the price to beat and still falling. Down costs less than that chance."
            : !above
              ? "Bitcoin is below the price to beat. Down costs less than that chance."
              : falling
                ? "Bitcoin is slipping back to the price to beat. Down costs less than that chance."
                : "Down looks more likely from the path so far, and the price is still low enough.")
  );
}

function skip(reason: string, gate: Gate | null = null): Verdict {
  return { side: "skip", call: null, reason, edge: null, ev: null, kellyFrac: null, capped: false, ask: null, gate };
}

function finish(
  side: "up" | "down" | "skip",
  call: "up" | "down" | null,
  reason: string | null,
  edge: number | null,
  ask: number | null,
  p: number,
  kelly: number,
  gate: Gate | null = null,
  size: { frac: number; capped: boolean } | null = null,
): Verdict {
  const ev = edge != null && ask != null && ask > 0 ? edge / ask : null;
  const frac = size && side !== "skip" ? size.frac : null;
  return {
    side,
    call,
    reason,
    edge,
    ev,
    kellyFrac: frac,
    capped: Boolean(size?.capped) && side !== "skip",
    ask,
    gate,
  };
}

export function brier(rows: { p: number; y: number }[]): number | null {
  if (!rows.length) return null;
  let s = 0;
  for (const r of rows) s += (r.p - r.y) ** 2;
  return s / rows.length;
}

/** Time-weighted average. Tie vs K is decided by the caller with >=. */
export function twap(points: SecondPrice[], start: number, end: number): number | null {
  const inside = points
    .filter((p) => p.t >= start && p.t <= end && Number.isFinite(p.p))
    .sort((a, b) => a.t - b.t);
  if (!inside.length) return null;
  if (inside.length === 1) return inside[0].p;
  let acc = 0;
  let dur = 0;
  for (let i = 1; i < inside.length; i++) {
    const dt = inside[i].t - inside[i - 1].t;
    if (dt <= 0) continue;
    acc += inside[i - 1].p * dt;
    dur += dt;
  }
  const tail = Math.max(0, end - inside[inside.length - 1].t);
  if (tail > 0) {
    acc += inside[inside.length - 1].p * tail;
    dur += tail;
  }
  return dur > 0 ? acc / dur : inside[inside.length - 1].p;
}

export type TradeFill = {
  action: "buy" | "sell" | "settle";
  windowStart: number;
  side: "up" | "down";
  price: number;
  shares: number;
  fee: number;
  pnl: number | null;
  pModel?: number | null;
  edge?: number | null;
  tau?: number | null;
  targetKind?: string | null;
  priceAgeMs?: number | null;
};

export type SimTrade = {
  windowStart: number;
  side: "up" | "down";
  ask: number;
  shares: number;
  cost: number;
  fee: number;
  pnl: number;
  pModel: number | null;
  edge: number | null;
  tau: number | null;
  targetKind: string | null;
  priceAgeMs: number | null;
  exit: "sell" | "settle";
  /** Missing on older 5-minute rows. Those are 5-minute trades. */
  span?: 300 | 900;
  reason?: string | null;
};

export type SimBucket = { label: string; n: number; wins: number; pnl: number };

export type SimReport = {
  n: number;
  wins: number;
  losses: number;
  scratches: number;
  avgFee: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  predicted: number | null;
  predictedRealized: number | null;
  predictedN: number;
  realized: number;
  avgEdge: number | null;
  realizedEdge: number | null;
  brier: number | null;
  note: string;
  buckets: SimBucket[];
  timeBuckets: SimBucket[];
};

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

/** Pair a fill log into round trips. A later settle on the same trade is a correction, added to the pnl. */
export function pairFills(fills: TradeFill[]): SimTrade[] {
  const closed: SimTrade[] = [];
  let open: SimTrade | null = null;
  for (const f of fills) {
    if (f.action === "buy") {
      const fee = Number.isFinite(f.fee) ? f.fee : 0;
      const shares = Number.isFinite(f.shares) ? f.shares : 0;
      const ask = Number.isFinite(f.price) ? f.price : 0;
      open = {
        windowStart: f.windowStart,
        side: f.side,
        ask,
        shares,
        cost: shares * ask + fee,
        fee,
        pnl: 0,
        pModel: finiteOrNull(f.pModel),
        edge: finiteOrNull(f.edge),
        tau: finiteOrNull(f.tau),
        targetKind: f.targetKind ?? null,
        priceAgeMs: finiteOrNull(f.priceAgeMs),
        exit: "settle",
      };
      continue;
    }
    if (f.action !== "sell" && f.action !== "settle") continue;
    const fee = Number.isFinite(f.fee) ? f.fee : 0;
    const delta = f.pnl ?? 0;
    if (open && open.windowStart === f.windowStart && open.side === f.side) {
      open.fee += fee;
      open.pnl = delta;
      open.exit = f.action;
      if (open.pModel == null) open.pModel = finiteOrNull(f.pModel);
      if (open.edge == null) open.edge = finiteOrNull(f.edge);
      if (open.tau == null) open.tau = finiteOrNull(f.tau);
      if (open.targetKind == null) open.targetKind = f.targetKind ?? null;
      if (open.priceAgeMs == null) open.priceAgeMs = finiteOrNull(f.priceAgeMs);
      closed.push(open);
      open = null;
      continue;
    }
    const last = closed[closed.length - 1];
    if (last && f.action === "settle" && last.windowStart === f.windowStart && last.side === f.side) {
      last.pnl += delta;
      last.fee += fee;
    }
  }
  return closed;
}

export function summarizeTrades(trades: SimTrade[]): SimReport {
  const buckets: SimBucket[] = [
    { label: "Under 30¢", n: 0, wins: 0, pnl: 0 },
    { label: "30¢ to 65¢", n: 0, wins: 0, pnl: 0 },
    { label: "65¢ and up", n: 0, wins: 0, pnl: 0 },
  ];
  const timeBuckets: SimBucket[] = [
    { label: "Under 1 min left", n: 0, wins: 0, pnl: 0 },
    { label: "1 to 3 min left", n: 0, wins: 0, pnl: 0 },
    { label: "3 to 5 min left", n: 0, wins: 0, pnl: 0 },
    { label: "Over 5 min left", n: 0, wins: 0, pnl: 0 },
    { label: "Time not saved", n: 0, wins: 0, pnl: 0 },
  ];
  let wins = 0;
  let losses = 0;
  let scratches = 0;
  let feeSum = 0;
  let realized = 0;
  let pred = 0;
  let predReal = 0;
  let predN = 0;
  let edgeSum = 0;
  let winSum = 0;
  let lossSum = 0;
  let shareSum = 0;
  const brierRows: { p: number; y: number }[] = [];
  for (const t of trades) {
    const b = t.ask < 0.3 ? 0 : t.ask < 0.65 ? 1 : 2;
    buckets[b].n += 1;
    buckets[b].pnl += t.pnl;
    const tb = t.tau == null ? 4 : t.tau < 60 ? 0 : t.tau < 180 ? 1 : t.tau < 300 ? 2 : 3;
    timeBuckets[tb].n += 1;
    timeBuckets[tb].pnl += t.pnl;
    const won = t.pnl > 0;
    if (won) {
      wins += 1;
      winSum += t.pnl;
      buckets[b].wins += 1;
      timeBuckets[tb].wins += 1;
    } else if (t.pnl < 0) {
      losses += 1;
      lossSum += t.pnl;
    } else scratches += 1;
    feeSum += Number.isFinite(t.fee) ? t.fee : 0;
    realized += t.pnl;
    shareSum += Number.isFinite(t.shares) ? t.shares : 0;
    if (t.edge != null && Number.isFinite(t.shares)) {
      pred += t.edge * t.shares;
      predReal += t.pnl;
      predN += 1;
      edgeSum += t.edge;
    }
    if (t.exit === "settle" && t.pModel != null && t.shares > 0) {
      const sideWon = t.pnl + t.cost > t.shares * 0.5;
      const p = t.side === "up" ? t.pModel : 1 - t.pModel;
      brierRows.push({ p, y: sideWon ? 1 : 0 });
    }
  }
  const n = trades.length;
  return {
    n,
    wins,
    losses,
    scratches,
    avgFee: n ? feeSum / n : null,
    avgWin: wins ? winSum / wins : null,
    avgLoss: losses ? lossSum / losses : null,
    predicted: predN ? pred : null,
    predictedRealized: predN ? predReal : null,
    predictedN: predN,
    realized,
    avgEdge: predN ? edgeSum / predN : null,
    realizedEdge: shareSum > 0 ? realized / shareSum : null,
    brier: brier(brierRows),
    note: reportNote(n, realized),
    buckets,
    timeBuckets,
  };
}

export function maxDrawdown(points: { pnl: number }[]): number | null {
  if (!points.length) return null;
  let peak = 0;
  let worst = 0;
  for (const p of points) {
    if (p.pnl > peak) peak = p.pnl;
    const dd = peak - p.pnl;
    if (dd > worst) worst = dd;
  }
  return worst;
}

function reportNote(n: number, realized: number): string {
  if (n === 0) return "No finished trades yet.";
  if (n < 100) return `${n} finished ${n === 1 ? "trade" : "trades"}. Too few to say this is an edge.`;
  if (realized <= 0) return `After ${n} finished trades, fees included, this sample has no edge.`;
  return `After ${n} finished trades, fees included, the account is ahead. That is not proof of an edge.`;
}
