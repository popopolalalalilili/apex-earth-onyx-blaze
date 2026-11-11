import assert from "node:assert/strict";
import test from "node:test";
import { compactCurve, freshBook, resolve, signal, touchCurve, type Lane } from "./desk.ts";
import type { ModelOut } from "./math.ts";

function lane(over: Partial<Lane> = {}): Lane {
  return {
    span: 300,
    win: 1_700_000_000,
    open: true,
    up: { bid: 0.74, ask: 0.76, askSize: 100 },
    down: { bid: 0.24, ask: 0.26, askSize: 100 },
    model: {
      pUp: 0.8,
      pDown: 0.2,
      edgeUp: 0.04,
      edgeDown: -0.1,
      tau: 80,
    } as ModelOut,
    side: "up",
    reason: "Up costs less than the chance.",
    targetKind: "polymarket",
    priceAgeMs: 200,
    feeRate: 0.07,
    feeExp: 1,
    ...over,
  };
}

test("one trade per window, and a loss is not sold just because the model fell", () => {
  const book = freshBook("five");
  const buy = lane();
  signal(book, buy, 0);
  signal(book, buy, 1300);
  assert.equal(book.positions.length, 1);
  assert.ok(book.cash < 96 && book.cash > 90);
  const entry = book.positions[0].entry;
  assert.equal(entry, 0.76);
  const scared = lane({
    up: { bid: 0.4, ask: 0.42, askSize: 100 },
    model: { pUp: 0.2, pDown: 0.8, edgeUp: -0.2, edgeDown: 0.1, tau: 40 } as ModelOut,
  });
  signal(book, scared, 4000);
  assert.equal(book.positions.length, 1);
  assert.match(book.note ?? "", /under the price paid/);
  signal(book, buy, 8000);
  assert.equal(book.positions.length, 1);
  resolve(book, 300, buy.win, "up", 9000);
  assert.equal(book.positions.length, 0);
  assert.ok(book.cash > 100);
  signal(book, buy, 12000);
  assert.equal(book.positions.length, 0);
});

test("a rich bid above the entry and above the model is sold, with the reason kept", () => {
  const book = freshBook("five");
  const buy = lane();
  signal(book, buy, 0);
  signal(book, buy, 1300);
  const rich = lane({
    up: { bid: 0.92, ask: 0.94, askSize: 100 },
    model: { pUp: 0.7, pDown: 0.3, edgeUp: 0.01, edgeDown: -0.2, tau: 40 } as ModelOut,
  });
  signal(book, rich, 4000);
  assert.equal(book.positions.length, 0);
  assert.equal(book.trades.length, 1);
  assert.equal(book.trades[0].exit, "sell");
  assert.match(book.trades[0].reason ?? "", /above our chance/);
  assert.ok((book.trades[0].pnl ?? 0) > 0);
});

test("combined halves the second same-side stake", () => {
  const book = freshBook("combined");
  const slow = lane({ span: 900, win: 1_700_000_100 });
  const fast = lane();
  signal(book, slow, 0);
  signal(book, slow, 1300);
  assert.equal(book.positions.length, 1);
  const afterFirst = book.cash;
  const firstSpend = 100 - afterFirst;
  signal(book, fast, 1300);
  signal(book, fast, 2600);
  assert.equal(book.positions.length, 2);
  const secondSpend = afterFirst - book.cash;
  assert.ok(Math.abs(secondSpend - (afterFirst * firstSpend) / 100 / 2) < 0.05);
  assert.match(book.positions[1].openReason ?? "", /half size/);
});

test("the 5-minute book ignores a 15-minute signal", () => {
  const book = freshBook("five");
  signal(book, lane({ span: 900 }), 5000);
  assert.equal(book.positions.length, 0);
  assert.equal(book.cash, 100);
});

test("an offer smaller than the order is not filled", () => {
  const book = freshBook("fifteen");
  const thin = lane({ span: 900, up: { bid: 0.74, ask: 0.76, askSize: 0.01 } });
  signal(book, thin, 0);
  signal(book, thin, 2000);
  assert.equal(book.positions.length, 0);
  assert.match(book.note ?? "", /top offer/);
});

test("the profit line keeps the start instead of only the last minutes", () => {
  const start = Date.parse("2026-11-10T18:00:00Z");
  const points = Array.from({ length: 3000 }, (_, i) => ({ t: start + i * 1000, pnl: i / 100 }));
  const slim = compactCurve(points, 1100);
  assert.equal(slim[0].t, start);
  assert.equal(slim[0].pnl, 0);
  assert.equal(slim[slim.length - 1].t, start + 2999 * 1000);
  assert.ok(slim.length <= 1100);
  assert.ok(slim.some((p) => p.t < start + 60_000));

  const book = freshBook("five");
  for (let i = 0; i < 1300; i++) touchCurve(book, i / 100, start + i * 1000);
  assert.equal(book.curve[0].t, start);
  assert.ok(book.curve.length <= 1200);
  assert.equal(book.curve[book.curve.length - 1].t, start + 1299 * 1000);
});
