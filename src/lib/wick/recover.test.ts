import assert from "node:assert/strict";
import test from "node:test";
import { freshBook, type Pos } from "./desk.ts";
import { createEngine, type Persist, type RecoverSummary, type Settings } from "./engine.ts";
import { parseCommand } from "./protocol.ts";

const settings: Settings = {
  lookbackSec: 600,
  tail: 1.25,
  basis: 6,
  minEdge: 0.03,
  minAsk: 0.65,
  maxAsk: null,
  bankroll: 100,
  kelly: 0.25,
  feed: "chainlink",
  sound: false,
};

function pos(span: 300 | 900, windowStart: number, side: "up" | "down"): Pos {
  return {
    span,
    windowStart,
    side,
    shares: 4,
    cost: 3.2,
    entry: 0.99,
    pModel: 0.7,
    edge: 0.02,
    tau: 40,
    targetKind: "polymarket",
    priceAgeMs: 80,
    openReason: "seed",
  };
}

function seed(): Persist {
  const five = freshBook("five");
  five.cash = 91.5;
  five.fees = 0.11;
  five.positions = [pos(300, 1_700_000_000, "up")];
  five.traded = ["300:1700000000"];
  const fifteen = freshBook("fifteen");
  fifteen.cash = 82.25;
  fifteen.fees = 0.2;
  fifteen.positions = [pos(900, 1_700_000_100, "down")];
  fifteen.traded = ["900:1700000100"];
  const combined = freshBook("combined");
  combined.cash = 73.5;
  combined.fees = 0.3;
  combined.positions = [pos(300, 1_700_000_000, "up"), pos(900, 1_700_000_100, "down")];
  combined.traded = ["300:1700000000", "900:1700000100"];
  const shadow = freshBook("shadow");
  shadow.cash = 64;
  shadow.positions = [pos(300, 1_700_000_000, "down")];
  shadow.traded = ["300:1700000000"];
  return {
    settings,
    tape: [],
    paper: [],
    calib: [],
    targets: {},
    books: { five, fifteen, combined, shadow },
    scratches: [],
  };
}

function same(a: RecoverSummary, b: RecoverSummary) {
  for (const id of ["five", "fifteen", "combined"] as const) {
    assert.equal(a[id].cash, b[id].cash, id);
    assert.equal(a[id].positions.length, b[id].positions.length, id);
    for (let i = 0; i < a[id].positions.length; i++) {
      assert.equal(a[id].positions[i].windowStart, b[id].positions[i].windowStart);
      assert.equal(a[id].positions[i].side, b[id].positions[i].side);
      assert.equal(a[id].positions[i].shares, b[id].positions[i].shares);
      assert.equal(a[id].positions[i].span, b[id].positions[i].span);
    }
  }
}

test("a restarted engine reloads all three books and their open positions", () => {
  let saved = seed();
  let seen: RecoverSummary | null = null;
  const first = createEngine({
    read: () => saved,
    write: (data) => {
      saved = data;
    },
    directOpen: true,
    feeds: false,
    onRecover: (summary) => {
      seen = summary;
    },
  });
  first.start();
  assert.ok(seen);
  const loaded = seen as RecoverSummary;
  assert.equal(loaded.five.cash, 91.5);
  assert.equal(loaded.fifteen.cash, 82.25);
  assert.equal(loaded.combined.cash, 73.5);
  assert.equal(loaded.five.positions[0].side, "up");
  assert.equal(loaded.fifteen.positions[0].side, "down");
  assert.equal(loaded.combined.positions.length, 2);
  const snap = first.getSnapshot();
  assert.equal(snap.strategies.five.cash, 91.5);
  assert.equal(snap.strategies.fifteen.positions[0].windowStart, 1_700_000_100);
  assert.equal(snap.strategies.combined.positions.length, 2);
  first.stop();

  let again: RecoverSummary | null = null;
  const second = createEngine({
    read: () => saved,
    write: (data) => {
      saved = data;
    },
    directOpen: true,
    feeds: false,
    onRecover: (summary) => {
      again = summary;
    },
  });
  second.start();
  assert.ok(again);
  same(loaded, again as RecoverSummary);
  second.stop();
});

test("polymarket keys stay on the worker and are not copied onto the snapshot", () => {
  const secret = "test-secret-value";
  const cmd = parseCommand({
    kind: "poly",
    apiKey: "test-api-key",
    secret,
    passphrase: "test-pass-phrase",
  });
  assert.equal(cmd?.kind, "poly");
  assert.equal(parseCommand({ kind: "poly", apiKey: "short", secret, passphrase: "test-pass-phrase" }), null);

  let saved: Persist | null = null;
  let storedSecret: string | null = null;
  const engine = createEngine({
    read: () => saved,
    write: (data) => {
      saved = data;
      storedSecret = data.poly?.secret ?? null;
    },
    feeds: false,
  });
  engine.push(cmd!);
  engine.start();
  const snap = engine.getSnapshot();
  const published = JSON.stringify({ settings: engine.settings(), snap });
  assert.equal(snap.polySaved, true);
  assert.equal(published.includes(secret), false);
  assert.equal(storedSecret, secret);
  engine.push({ kind: "poly-clear" });
  engine.stop();
  engine.start();
  assert.equal(engine.getSnapshot().polySaved, false);
  assert.equal(storedSecret, null);
  const key = `0x${"ab".repeat(32)}`;
  engine.push({ kind: "trade-key", privateKey: key, signatureType: 1 });
  const after = engine.getSnapshot();
  assert.equal(after.trade.keySaved, true);
  assert.equal(JSON.stringify(after).includes(key.slice(2)), false);
  assert.equal(saved?.signer?.privateKey, key);
  engine.stop();
});
