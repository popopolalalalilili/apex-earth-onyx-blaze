/**
 * When does the live path model have skill, by time left, on one price series.
 * Binance 1-second prices are the path, the open, and the settlement.
 * This is not a Polymarket fill test and it does not change parameters by itself.
 * The first half of the windows and the second half are reported separately.
 */
import { driftPerSec, ewmaSigma, PACE_15, PACE_5, runModel, twap, type SecondPrice } from "../src/lib/wick/math.ts";

const HOURS = 18;
const LAMBDA = 0.97;
const TAIL = 1.25;
const BASIS = 6;
const FIVE_TAU = [270, 240, 180, 120, 60, 30, 15];
const FIFTEEN_TAU = [840, 720, 600, 420, 240, 120, 60, 30];

type Row = { win: number; tau: number; p: number; y: number; call: "up" | "down" | "flat"; gap: number; totalSd: number; horizon: number };

async function fetchChunk(startMs: number): Promise<[number, number][]> {
  const url = `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1s&startTime=${startMs}&limit=1000`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`binance ${res.status}`);
    const rows = (await res.json()) as unknown[][];
    return rows.map((row) => [Math.floor(Number(row[0]) / 1000), Number(row[4])] as [number, number]);
  }
  throw new Error(`binance failed at ${startMs}`);
}

async function loadPrices(startSec: number, endSec: number): Promise<Map<number, number>> {
  const prices = new Map<number, number>();
  const starts: number[] = [];
  for (let ms = startSec * 1000; ms < endSec * 1000; ms += 1000 * 1000) starts.push(ms);
  for (let i = 0; i < starts.length; i += 5) {
    const batch = starts.slice(i, i + 5);
    const parts = await Promise.all(batch.map((ms) => fetchChunk(ms)));
    for (const part of parts) {
      for (const [sec, px] of part) {
        if (sec >= startSec && sec < endSec && Number.isFinite(px)) prices.set(sec, px);
      }
    }
  }
  return prices;
}

function trailing(prices: Map<number, number>, sec: number): number | null {
  let s = 0;
  let n = 0;
  for (let t = sec - 59; t <= sec; t++) {
    const p = prices.get(t);
    if (p == null) continue;
    s += p;
    n += 1;
  }
  if (n < 48) return null;
  return s / n;
}

function scoreWindow(prices: Map<number, number>, tw: Map<number, number>, win: number, span: 300 | 900, taus: number[]): Row[] {
  const end = win + span;
  const settle = twap(
    [...prices.entries()].filter(([t]) => t >= win && t < end).map(([t, p]) => ({ t, p })),
    win,
    end - 1e-6,
  );
  const open = tw.get(win);
  if (settle == null || open == null) return [];
  const y = settle >= open ? 1 : 0;
  const pace = span === 900 ? PACE_15 : PACE_5;
  const rows: Row[] = [];
  for (const tau of taus) {
    const now = end - tau;
    const S = tw.get(now);
    if (S == null) continue;
    const pts: SecondPrice[] = [];
    for (let t = now - 600; t <= now; t++) {
      const p = tw.get(t);
      if (p != null) pts.push({ t, p });
    }
    if (pts.length < 60) continue;
    const vol = ewmaSigma(pts, LAMBDA, now, 600);
    if (vol.seconds < 60 || !(vol.sigma > 0)) continue;
    const model = runModel({
      S,
      K: open,
      tau,
      sigmaPerSec: vol.sigma,
      tail: TAIL,
      basis: BASIS,
      driftPerSec: driftPerSec(pts, now, pace.mid),
      velShort: driftPerSec(pts, now, pace.short),
      velImpulse: driftPerSec(pts, now, pace.impulse),
      marketDelta: 0,
      marketP: null,
      pace,
      askUp: null,
      askDown: null,
      bidUp: null,
      bidDown: null,
      feeRate: 0.07,
      feeExp: 1,
    });
    const call = Math.abs(model.pUp - 0.5) < 0.06 ? "flat" : model.pUp >= 0.5 ? "up" : "down";
    rows.push({ win, tau, p: model.pUp, y, call, gap: model.gap, totalSd: model.totalSd, horizon: model.horizon });
  }
  return rows;
}

function brier(rows: Row[]): number | null {
  if (!rows.length) return null;
  let s = 0;
  for (const r of rows) s += (r.p - r.y) ** 2;
  return s / rows.length;
}

function hits(rows: Row[]): { n: number; hit: number } {
  const called = rows.filter((r) => r.call !== "flat");
  const hit = called.filter((r) => (r.call === "up" ? r.y === 1 : r.y === 0)).length;
  return { n: called.length, hit };
}

function report(label: string, rows: Row[], taus: number[]) {
  const wins = [...new Set(rows.map((r) => r.win))].sort((a, b) => a - b);
  const mid = wins[Math.floor(wins.length / 2)] ?? 0;
  console.log(`\n${label}  windows ${wins.length}`);
  console.log("tau  life   n  brier  brier1  brier2  calls  hit1  hit2  mean|p-0.5|");
  for (const tau of taus) {
    const all = rows.filter((r) => r.tau === tau);
    const a = all.filter((r) => r.win < mid);
    const b = all.filter((r) => r.win >= mid);
    const ha = hits(a);
    const hb = hits(b);
    const hc = hits(all);
    const life = all[0] ? tau / (label.startsWith("15") ? 900 : 300) : 0;
    const conf = all.length ? all.reduce((s, r) => s + Math.abs(r.p - 0.5), 0) / all.length : 0;
    const fmt = (n: number | null) => (n == null ? "  -- " : n.toFixed(3));
    const rate = (h: { n: number; hit: number }) => (h.n ? `${Math.round((h.hit / h.n) * 100)}%/${h.n}` : "--");
    console.log(
      `${String(tau).padStart(4)}  ${life.toFixed(2)}  ${String(all.length).padStart(3)}  ${fmt(brier(all))}  ${fmt(brier(a))}  ${fmt(brier(b))}  ${String(hc.n).padStart(4)}  ${rate(ha).padStart(8)}  ${rate(hb).padStart(8)}  ${conf.toFixed(3)}`,
    );
  }
  const early = rows.filter((r) => r.tau === taus[0]);
  const late = rows.filter((r) => r.tau === taus[taus.length - 1]);
  let both = 0;
  let flip = 0;
  for (const e of early) {
    const l = late.find((r) => r.win === e.win);
    if (!l || e.call === "flat" || l.call === "flat") continue;
    both += 1;
    if (e.call !== l.call) flip += 1;
  }
  console.log(`side flips from first sample to last, among windows with a call both times: ${flip} of ${both}`);
}

async function polyBasis(prices: Map<number, number>, wins: number[], span: 300 | 900) {
  const gaps: number[] = [];
  for (const t of wins.slice(-8)) {
    const start = new Date(t * 1000).toISOString().replace(".000Z", "Z");
    const end = new Date((t + span) * 1000).toISOString().replace(".000Z", "Z");
    const variant = span === 900 ? "fifteenminute" : "fiveminute";
    const url =
      "https://polymarket.com/api/crypto/crypto-price?symbol=BTC" +
      `&eventStartTime=${encodeURIComponent(start)}` +
      `&variant=${variant}&endDate=${encodeURIComponent(end)}` +
      "&twapEnabled=true&twapLookbackSeconds=60";
    try {
      const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const data = (await res.json()) as { openPrice?: number; completed?: boolean };
      const open = Number(data.openPrice);
      const bin = prices.get(t);
      if (data.completed && Number.isFinite(open) && bin != null) gaps.push(open - bin);
    } catch {
      /* skip */
    }
  }
  if (!gaps.length) {
    console.log(`polymarket open vs binance spot at the same second (${span}s): no sample`);
    return;
  }
  const abs = gaps.map((g) => Math.abs(g)).sort((a, b) => a - b);
  const mid = abs[Math.floor(abs.length / 2)];
  console.log(
    `polymarket open minus binance spot, last ${gaps.length} ${span}s windows: median abs $${mid.toFixed(1)}, mean $${(gaps.reduce((s, g) => s + g, 0) / gaps.length).toFixed(1)}`,
  );
}

async function main() {
  const endSec = Math.floor(Date.now() / 1000);
  const startSec = endSec - HOURS * 3600 - 700;
  console.log(`loading binance 1s from ${startSec} to ${endSec}`);
  const prices = await loadPrices(startSec, endSec);
  console.log(`prices ${prices.size}`);
  const tw = new Map<number, number>();
  for (let t = startSec + 60; t < endSec; t++) {
    const v = trailing(prices, t);
    if (v != null) tw.set(t, v);
  }
  const first5 = Math.ceil((startSec + 700) / 300) * 300;
  const last5 = Math.floor(endSec / 300) * 300 - 300;
  const five: Row[] = [];
  const fifteen: Row[] = [];
  const wins5: number[] = [];
  const wins15: number[] = [];
  for (let w = first5; w <= last5; w += 300) {
    const rows = scoreWindow(prices, tw, w, 300, FIVE_TAU);
    if (rows.length) {
      five.push(...rows);
      wins5.push(w);
    }
  }
  const first15 = Math.ceil((startSec + 700) / 900) * 900;
  const last15 = Math.floor(endSec / 900) * 900 - 900;
  for (let w = first15; w <= last15; w += 900) {
    const rows = scoreWindow(prices, tw, w, 900, FIFTEEN_TAU);
    if (rows.length) {
      fifteen.push(...rows);
      wins15.push(w);
    }
  }
  report("5m", five, FIVE_TAU);
  report("15m", fifteen, FIFTEEN_TAU);
  await polyBasis(prices, wins5, 300);
  await polyBasis(prices, wins15, 900);
  console.log("Not a profit test. No bids, asks, or fees. Parameters were not changed to improve this table.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
