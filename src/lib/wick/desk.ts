import {
  exitDecision,
  feePerShare,
  maxDrawdown,
  stakeFraction,
  positionSize,
  summarizeTrades,
  type ModelOut,
  type SimReport,
  type SimTrade,
} from "./math.ts";

export type Span = 300 | 900;
export type Side = "up" | "down";
export type BookId = "five" | "fifteen" | "combined" | "shadow";

export type Pos = {
  span: Span;
  windowStart: number;
  side: Side;
  shares: number;
  cost: number;
  entry: number;
  pModel: number | null;
  edge: number | null;
  tau: number | null;
  targetKind: string | null;
  priceAgeMs: number | null;
  openReason: string | null;
};

export type Fill = {
  id: string;
  at: number;
  windowStart: number;
  span: Span;
  action: "buy" | "sell" | "settle";
  side: Side;
  price: number;
  shares: number;
  fee: number;
  pnl: number | null;
  cash: number;
  pModel: number | null;
  edge: number | null;
  tau: number | null;
  targetKind: string | null;
  priceAgeMs: number | null;
  reason: string | null;
};

export type CurvePoint = { t: number; pnl: number };

export type Book = {
  id: BookId;
  cash: number;
  fees: number;
  positions: Pos[];
  fills: Fill[];
  trades: SimTrade[];
  curve: CurvePoint[];
  traded: string[];
  wants: Record<string, { side: string; at: number }>;
  note: string | null;
};

export type Quote = { bid: number | null; ask: number | null; askSize?: number | null };

export type Lane = {
  span: Span;
  win: number;
  open: boolean;
  up: Quote;
  down: Quote;
  model: ModelOut | null;
  side: "up" | "down" | "skip";
  reason: string | null;
  targetKind: string | null;
  priceAgeMs: number | null;
  feeRate: number;
  feeExp: number;
  /** Calculated fraction of cash, before the same-side cut. Null asks the book to size it. */
  stake?: number | null;
};

const START = 100;

export function freshBook(id: BookId): Book {
  return {
    id,
    cash: START,
    fees: 0,
    positions: [],
    fills: [],
    trades: [],
    curve: [],
    traded: [],
    wants: {},
    note: null,
  };
}

function key(span: Span, win: number): string {
  return `${span}:${win}`;
}

function allows(book: Book, span: Span): boolean {
  if (book.id === "five" || book.id === "shadow") return span === 300;
  if (book.id === "fifteen") return span === 900;
  return true;
}

function pushFill(book: Book, fill: Omit<Fill, "id" | "at" | "cash"> & { at?: number }) {
  book.fees += Number.isFinite(fill.fee) ? fill.fee : 0;
  book.fills = [
    ...book.fills,
    { ...fill, id: `${fill.span}-${fill.windowStart}-${fill.action}-${book.fills.length}-${fill.at ?? 0}`, at: fill.at ?? Date.now(), cash: book.cash },
  ].slice(-80);
}

function remember(book: Book, pos: Pos, exit: "sell" | "settle", pnl: number, exitFee: number, reason: string) {
  const entryFee = Math.max(0, pos.cost - pos.shares * pos.entry);
  const trade: SimTrade = {
    windowStart: pos.windowStart,
    side: pos.side,
    ask: pos.entry,
    shares: pos.shares,
    cost: pos.cost,
    fee: entryFee + Math.max(0, exitFee),
    pnl,
    pModel: pos.pModel,
    edge: pos.edge,
    tau: pos.tau,
    targetKind: pos.targetKind,
    priceAgeMs: pos.priceAgeMs,
    exit,
    span: pos.span,
    reason,
  };
  book.trades = [...book.trades, trade].slice(-500);
}

export function signal(book: Book, lane: Lane, now: number): void {
  if (!allows(book, lane.span) || !lane.win) return;
  const held = book.positions.find((p) => p.span === lane.span && p.windowStart === lane.win);
  if (held) {
    if (!lane.open || !lane.model) return;
    const q = held.side === "up" ? lane.up : lane.down;
    const bid = q.bid;
    if (bid == null) return;
    const sellFee = feePerShare(bid, lane.feeRate, lane.feeExp);
    const pSide = held.side === "up" ? lane.model.pUp : lane.model.pDown;
    const decision = exitDecision(bid, sellFee, pSide, held.entry);
    if (!decision.sell || !decision.reason) {
      if (decision.reason) book.note = decision.reason;
      return;
    }
    const exitFee = sellFee * held.shares;
    const proceeds = held.shares * Math.max(0, bid - sellFee);
    const pnl = proceeds - held.cost;
    book.cash += proceeds;
    book.traded = [...new Set([...book.traded, key(lane.span, lane.win)])].slice(-40);
    remember(book, held, "sell", pnl, exitFee, decision.reason);
    pushFill(book, {
      windowStart: held.windowStart,
      span: held.span,
      action: "sell",
      side: held.side,
      price: bid,
      shares: held.shares,
      fee: exitFee,
      pnl,
      pModel: held.pModel,
      edge: held.edge,
      tau: held.tau,
      targetKind: held.targetKind,
      priceAgeMs: held.priceAgeMs,
      reason: decision.reason,
    });
    book.positions = book.positions.filter((p) => p !== held);
    book.note = decision.reason;
    return;
  }
  if (!lane.open) return;
  const id = key(lane.span, lane.win);
  if (book.traded.includes(id)) return;
  const want = lane.side === "up" || lane.side === "down" ? lane.side : "flat";
  const prev = book.wants[id];
  if (!prev || prev.side !== want) book.wants[id] = { side: want, at: now };
  const age = now - (book.wants[id]?.at ?? now);
  if (want === "flat" || age < 1200 || book.cash < 0.05) return;
  const q = want === "up" ? lane.up : lane.down;
  const ask = q.ask;
  if (ask == null || ask <= 0.01 || ask >= 0.99) return;
  const fee = feePerShare(ask, lane.feeRate, lane.feeExp);
  const unit = ask + fee;
  if (unit <= 0) return;
  const model = lane.model;
  const pModel = model ? (want === "up" ? model.pUp : model.pDown) : null;
  const edge = model ? (want === "up" ? model.edgeUp : model.edgeDown) : null;
  const tau = model?.tau ?? null;
  const base =
    lane.stake != null
      ? lane.stake
      : pModel == null
        ? 0
        : positionSize({ span: lane.span, tau: tau ?? 0, p: pModel, ask, fee, safetyAsk: 0 }).frac;
  if (!(base >= 0.02)) {
    book.note = "Skipped. The calculated stake is under 2% of cash.";
    return;
  }
  const sibling = book.positions.find((p) => p.span !== lane.span);
  const stake = stakeFraction({ base, sameSideAlready: Boolean(sibling && sibling.side === want) });
  const spend = Math.min(book.cash, book.cash * stake.frac);
  if (spend < 0.05) return;
  if (q.askSize != null && q.askSize > 0 && spend / unit > q.askSize + 1e-6) {
    book.note = "Skipped. The top offer is smaller than the order, and there is no deeper book to price.";
    return;
  }
  const openReason = [lane.reason, stake.note].filter(Boolean).join(" ");
  book.cash -= spend;
  book.traded = [...book.traded, id].slice(-40);
  const pos: Pos = {
    span: lane.span,
    windowStart: lane.win,
    side: want,
    shares: spend / unit,
    cost: spend,
    entry: ask,
    pModel,
    edge,
    tau,
    targetKind: lane.targetKind,
    priceAgeMs: lane.priceAgeMs,
    openReason,
  };
  book.positions = [...book.positions, pos];
  pushFill(book, {
    windowStart: lane.win,
    span: lane.span,
    action: "buy",
    side: want,
    price: ask,
    shares: pos.shares,
    fee: fee * pos.shares,
    pnl: null,
    pModel,
    edge,
    tau,
    targetKind: lane.targetKind,
    priceAgeMs: lane.priceAgeMs,
    reason: openReason,
    at: now,
  });
  book.note = openReason;
}

export function resolve(book: Book, span: Span, win: number, outcome: Side | null, at = Date.now()): void {
  const pos = book.positions.find((p) => p.span === span && p.windowStart === win);
  if (!pos) return;
  book.traded = [...new Set([...book.traded, key(span, win)])].slice(-40);
  if (!outcome) {
    const pnl = -pos.cost;
    remember(book, pos, "settle", pnl, 0, "No resolution price, so the stake is written off.");
    pushFill(book, {
      windowStart: win,
      span,
      action: "settle",
      side: pos.side,
      price: 0,
      shares: pos.shares,
      fee: 0,
      pnl,
      pModel: pos.pModel,
      edge: pos.edge,
      tau: pos.tau,
      targetKind: pos.targetKind,
      priceAgeMs: pos.priceAgeMs,
      reason: "No resolution price, so the stake is written off.",
      at,
    });
    book.positions = book.positions.filter((p) => p !== pos);
    return;
  }
  const won = pos.side === outcome;
  const payout = won ? pos.shares : 0;
  const pnl = payout - pos.cost;
  book.cash += payout;
  const reason = won ? "Held to the end. The side won." : "Held to the end. The side lost.";
  remember(book, pos, "settle", pnl, 0, reason);
  pushFill(book, {
    windowStart: win,
    span,
    action: "settle",
    side: pos.side,
    price: won ? 1 : 0,
    shares: pos.shares,
    fee: 0,
    pnl,
    pModel: pos.pModel,
    edge: pos.edge,
    tau: pos.tau,
    targetKind: pos.targetKind,
    priceAgeMs: pos.priceAgeMs,
    reason,
    at,
  });
  book.positions = book.positions.filter((p) => p !== pos);
  book.note = reason;
}

export function markBook(book: Book, lanes: Lane[]): number {
  let mtm = 0;
  for (const pos of book.positions) {
    const lane = lanes.find((l) => l.span === pos.span && l.win === pos.windowStart);
    if (!lane) {
      mtm += pos.cost;
      continue;
    }
    const q = pos.side === "up" ? lane.up : lane.down;
    const bid = q.bid ?? q.ask;
    if (bid == null) {
      mtm += pos.cost;
      continue;
    }
    mtm += pos.shares * Math.max(0, bid - feePerShare(bid, lane.feeRate, lane.feeExp));
  }
  return mtm;
}

export function touchCurve(book: Book, pnl: number, now: number) {
  if (!Number.isFinite(pnl)) return;
  const last = book.curve[book.curve.length - 1];
  if (last && now - last.t < 1000) {
    if (Math.abs(last.pnl - pnl) < 0.005) return;
    last.pnl = pnl;
    return;
  }
  book.curve.push({ t: now, pnl });
  if (book.curve.length > 1200) book.curve = compactCurve(book.curve, 1100);
}

/**
 * The first point is the start of the book and is never dropped.
 * The last 15 minutes stay at one point a second. Older time is thinned so the whole line still fits.
 */
export function compactCurve(points: CurvePoint[], max = 1100): CurvePoint[] {
  if (points.length <= max) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  const recentFrom = last.t - 15 * 60 * 1000;
  const recent = points.filter((p) => p.t >= recentFrom);
  const older = points.filter((p) => p.t < recentFrom);
  const room = Math.max(2, max - Math.min(recent.length, max - 2));
  const kept: CurvePoint[] = [];
  if (older.length) {
    const step = Math.max(1, Math.ceil(older.length / room));
    for (let i = 0; i < older.length; i += step) kept.push(older[i]);
    if (kept[0].t !== first.t) kept.unshift(first);
    const tail = older[older.length - 1];
    if (kept[kept.length - 1].t !== tail.t) kept.push(tail);
  } else {
    kept.push(first);
  }
  const merged = kept.concat(recent.filter((p) => p.t !== kept[kept.length - 1]?.t));
  if (merged[merged.length - 1]?.t !== last.t) merged.push(last);
  if (merged.length <= max) return merged;
  const head = merged[0];
  const tail = merged[merged.length - 1];
  const mid = merged.slice(1, -1);
  const step = Math.max(1, Math.ceil(mid.length / (max - 2)));
  const slim = [head];
  for (let i = 0; i < mid.length; i += step) slim.push(mid[i]);
  slim.push(tail);
  return slim;
}

export type BookView = {
  id: BookId;
  name: string;
  cash: number;
  equity: number;
  fees: number;
  positions: Pos[];
  fills: Fill[];
  trades: SimTrade[];
  report: SimReport;
  curve: CurvePoint[];
  drawdown: number | null;
  note: string | null;
};

const NAMES: Record<BookId, string> = { five: "5 min", fifteen: "15 min", combined: "Combined", shadow: "Shadow" };

export function present(book: Book, equity: number): BookView {
  return {
    id: book.id,
    name: NAMES[book.id],
    cash: book.cash,
    equity,
    fees: book.fees,
    positions: book.positions.map((p) => ({ ...p })),
    fills: book.fills.slice(-40).reverse(),
    trades: book.trades.slice(-500),
    report: summarizeTrades(book.trades),
    curve: book.curve.slice(),
    drawdown: maxDrawdown(book.curve),
    note: book.note,
  };
}

export function resetBook(book: Book, now = Date.now()): void {
  const id = book.id;
  const next = freshBook(id);
  next.curve = [{ t: now, pnl: 0 }];
  Object.assign(book, next);
}
