import assert from "node:assert/strict";
import test from "node:test";
import {
  decide,
  edgeHurdle,
  exitBidBeatsModel,
  pairFills,
  runModel,
  summarizeTrades,
  type ModelOut,
  type SimTrade,
  type TradeFill,
} from "./math.ts";

function model(over: Partial<ModelOut> = {}): ModelOut {
  const base: ModelOut = {
    S: 100000,
    K: 100000,
    gap: 0,
    driftPerSec: 0,
    velShort: 0,
    velImpulse: 0,
    marketDelta: 0,
    accel: 0,
    horizon: 30,
    projectedGap: 0,
    crossSec: null,
    sigma: 0,
    tau: 120,
    totalSd: 10,
    z: 0,
    pUp: 0.8,
    pBlend: null,
    marketP: 0.76,
    midUp: 0.76,
    midDown: 0.24,
    pDown: 0.2,
    askUp: 0.7,
    askDown: 0.3,
    feeUp: 0.0147,
    feeDown: 0.0147,
    edgeUp: 0.0853,
    edgeDown: -0.1147,
    spreadUp: 0.01,
    spreadDown: 0.01,
    roundTripUp: -0.04,
    roundTripDown: -0.04,
  };
  return { ...base, ...over };
}

const gates = { feedAgeMs: 100, historySeconds: 120, minEdge: 0.03, minAsk: 0.65, maxAsk: null, kelly: 0.25, accepting: true };

test("a price change does not become the probability", () => {
  const shared = {
    S: 100000,
    K: 100000,
    tau: 60,
    sigmaPerSec: 1e-8,
    tail: 1.25,
    basis: 6,
    driftPerSec: 0,
    velShort: 0,
    velImpulse: 0,
    marketP: 0.12,
    askUp: 0.2,
    askDown: 0.1,
    bidUp: 0.18,
    bidDown: 0.08,
    feeRate: 0.07,
    feeExp: 1,
  };
  const calm = runModel({ ...shared, marketDelta: 0 });
  const dumped = runModel({ ...shared, marketDelta: -0.4 });
  assert.equal(calm.pUp, dumped.pUp);
  assert.ok(Math.abs(dumped.pUp - 0.5) < 1e-9, `path should be a coin flip, got ${dumped.pUp}`);
  assert.ok(dumped.pBlend != null);
  assert.ok(Math.abs((dumped.pBlend ?? 0) - 0.31) < 1e-9);
  const call = decide({
    model: dumped,
    feedAgeMs: 100,
    historySeconds: 120,
    minEdge: 0.03,
    minAsk: 0,
    maxAsk: null,
    kelly: 0.25,
    accepting: true,
  });
  assert.equal(call.side, "skip");
  assert.match(call.reason ?? "", /Too close to call/);
});

test("the path stays up when the contract price dumps", () => {
  const out = runModel({
    S: 100020,
    K: 100000,
    tau: 30,
    sigmaPerSec: 1e-8,
    tail: 1,
    basis: 6,
    driftPerSec: 0,
    velShort: 0,
    velImpulse: 0,
    marketDelta: -0.35,
    marketP: 0.15,
    askUp: 0.2,
    askDown: 0.1,
    bidUp: 0.18,
    bidDown: 0.08,
    feeRate: 0.07,
    feeExp: 1,
  });
  assert.ok(out.pUp > 0.9, `expected the path to stay up, got ${out.pUp}`);
  assert.ok((out.edgeDown ?? 1) < 0);
  const call = decide({
    model: out,
    feedAgeMs: 100,
    historySeconds: 120,
    minEdge: 0.03,
    minAsk: 0.65,
    maxAsk: null,
    kelly: 0.25,
    accepting: true,
  });
  assert.notEqual(call.side, "down");
});

test("skip when the model and the market are more than 20 cents apart", () => {
  const far = decide({ ...gates, model: model({ pUp: 0.85, pDown: 0.15, midUp: 0.15, askUp: 0.2, edgeUp: 0.6 }) });
  assert.equal(far.side, "skip");
  assert.equal(far.reason, "The model and the market disagree.");
  const exact = decide({
    ...gates,
    minEdge: 0.02,
    model: model({
      pUp: 0.9,
      pDown: 0.1,
      midUp: 0.7,
      askUp: 0.86,
      feeUp: 0.008,
      edgeUp: 0.032,
      spreadUp: 0.01,
    }),
  });
  assert.equal(exact.side, "up");
});

test("ask band and the fee plus spread are the entry bar", () => {
  const cheap = decide({
    ...gates,
    model: model({ pUp: 0.8, pDown: 0.2, midUp: 0.78, askUp: 0.4, edgeUp: 0.38, feeUp: 0.016, spreadUp: 0.01 }),
  });
  assert.equal(cheap.side, "up");
  assert.ok((cheap.kellyFrac ?? 0) > 0.02);
  assert.match(cheap.reason ?? "", /under the 65¢ safety/);

  const tight = decide({
    ...gates,
    minEdge: 0.01,
    model: model({
      pUp: 0.74,
      pDown: 0.26,
      midUp: 0.72,
      askUp: 0.7,
      feeUp: 0.0147,
      edgeUp: 0.74 - 0.7 - 0.0147,
      spreadUp: 0.03,
    }),
  });
  assert.equal(tight.side, "skip");
  assert.match(tight.reason ?? "", /spread takes more/);

  const ok = decide({ ...gates, model: model() });
  assert.equal(ok.side, "up");
  assert.ok((ok.kellyFrac ?? 0) > 0.02);
  assert.ok((ok.kellyFrac ?? 1) < 0.25 + 1e-9);
  assert.equal(edgeHurdle(0.03, 0.02, 0.03), 0.03);
  assert.equal(edgeHurdle(0.01, 0.02, 0.04), 0.04);
});

test("a short burst is not projected for most of a minute", () => {
  const out = runModel({
    S: 100000,
    K: 100000,
    tau: 120,
    sigmaPerSec: 1e-8,
    tail: 1,
    basis: 6,
    driftPerSec: 0,
    velShort: 0,
    velImpulse: 2,
    askUp: 0.5,
    askDown: 0.5,
    bidUp: 0.49,
    bidDown: 0.49,
    feeRate: 0.07,
    feeExp: 1,
  });
  assert.ok(out.projectedGap < 20, `projected ${out.projectedGap}`);
  assert.ok(out.pUp < 0.995);
});

test("four minutes left is smaller on 5 minutes and full on 15", () => {
  const early5 = decide({ ...gates, span: 300, model: model({ tau: 240 }) });
  assert.equal(early5.side, "up");
  assert.match(early5.reason ?? "", /Smaller because 4 minutes/);
  const ready5 = decide({ ...gates, span: 300, model: model({ tau: 180 }) });
  assert.equal(ready5.side, "up");
  assert.ok((ready5.kellyFrac ?? 0) > (early5.kellyFrac ?? 1));
  const sameClock = decide({ ...gates, span: 900, model: model({ tau: 240 }) });
  assert.equal(sameClock.side, "up");
  assert.doesNotMatch(sameClock.reason ?? "", /Smaller because/);
  const early15 = decide({ ...gates, span: 900, model: model({ tau: 13 * 60 }) });
  assert.equal(early15.side, "up");
  assert.match(early15.reason ?? "", /15-minute/);
  assert.ok((early15.kellyFrac ?? 1) < (sameClock.kellyFrac ?? 0));
});

test("early sell does not lock in a loss", () => {
  assert.equal(exitBidBeatsModel(0.8, 0.01, 0.7, 0.6), true);
  assert.equal(exitBidBeatsModel(0.5, 0.01, 0.3, 0.7), false);
  assert.equal(exitBidBeatsModel(0.74, 0.02, 0.7, 0.6), false);
});

test("buckets and a settle correction stay honest", () => {
  const fills: TradeFill[] = [
    { action: "buy", windowStart: 1, side: "down", price: 0.1, shares: 10, fee: 0.06, pnl: null, edge: 0.3 },
    { action: "settle", windowStart: 1, side: "down", price: 0, shares: 10, fee: 0, pnl: -1.06 },
    { action: "buy", windowStart: 2, side: "down", price: 0.4, shares: 5, fee: 0.08, pnl: null, edge: 0.1 },
    { action: "sell", windowStart: 2, side: "down", price: 0.3, shares: 5, fee: 0.07, pnl: -0.7 },
    { action: "buy", windowStart: 3, side: "up", price: 0.29, shares: 4, fee: 0.05, pnl: null },
    { action: "settle", windowStart: 3, side: "up", price: 0, shares: 4, fee: 0, pnl: -1.21 },
    { action: "buy", windowStart: 4, side: "up", price: 0.7, shares: 2, fee: 0.04, pnl: null, edge: 0.05 },
    { action: "settle", windowStart: 4, side: "up", price: 1, shares: 2, fee: 0, pnl: 0.5 },
    { action: "settle", windowStart: 4, side: "up", price: 0, shares: 2, fee: 0, pnl: -2 },
    { action: "buy", windowStart: 5, side: "up", price: 0.65, shares: 2, fee: 0.04, pnl: null, edge: 0.04 },
    { action: "settle", windowStart: 5, side: "up", price: 1, shares: 2, fee: 0, pnl: 0.2 },
  ];
  const trades = pairFills(fills);
  assert.equal(trades.length, 5);
  assert.equal(trades[3].pnl, 0.5 - 2);
  const report = summarizeTrades(trades);
  assert.equal(report.n, 5);
  assert.equal(report.wins, 1);
  assert.equal(report.buckets[0].n, 2);
  assert.equal(report.buckets[0].wins, 0);
  assert.ok(Math.abs(report.buckets[0].pnl - (-1.06 - 1.21)) < 1e-9);
  assert.equal(report.buckets[1].n, 1);
  assert.equal(report.buckets[1].pnl, -0.7);
  assert.equal(report.buckets[2].n, 2);
  assert.equal(report.buckets[2].wins, 1);
  assert.match(report.note, /Too few/);
  const many: SimTrade[] = Array.from({ length: 100 }, (_, i) => ({
    windowStart: i,
    side: "up",
    ask: 0.7,
    shares: 1,
    cost: 0.72,
    fee: 0.02,
    pnl: -0.02,
    pModel: 0.8,
    edge: 0.05,
    tau: 100,
    targetKind: "polymarket",
    priceAgeMs: 200,
    exit: "settle",
  }));
  const bad = summarizeTrades(many);
  assert.match(bad.note, /no edge/);
  assert.ok((bad.predicted ?? 0) > 0);
  assert.ok((bad.predictedRealized ?? 0) < 0);
});
