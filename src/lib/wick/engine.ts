import { apiPath, polyUrl, polymarketOpenUrl, windowStart } from "./format";
import {
  compactCurve,
  freshBook,
  markBook,
  present,
  resetBook as clearBook,
  resolve as resolveBook,
  signal,
  touchCurve,
  type Book,
  type BookView,
  type Fill,
  type Lane,
  type Pos,
} from "./desk";
import {
  brier,
  decide,
  driftPerSec,
  ewmaSigma,
  feePerShare,
  pairFills,
  PACE_15,
  PACE_5,
  runModel,
  summarizeTrades,
  type ModelOut,
  type SecondPrice,
  type SimReport,
  type SimTrade,
  type Gate,
} from "./math";
import type { WickCommand } from "./protocol";

export type Side = "up" | "down";
export type FeedChoice = "chainlink" | "coinbase" | "binance";

export type Settings = {
  lookbackSec: number;
  tail: number;
  basis: number;
  minEdge: number;
  minAsk: number;
  maxAsk: number | null;
  bankroll: number;
  kelly: number;
  feed: FeedChoice;
  sound: boolean;
};

export type Quote = { bid: number | null; ask: number | null; askSize?: number | null };

export type TapeMark = {
  windowStart: number;
  outcome: Side;
  confirmed: boolean;
  verdict: "up" | "down" | "skip";
  correct: boolean | null;
};

export type PaperTrade = {
  id: string;
  windowStart: number;
  side: Side;
  ask: number;
  fee: number;
  shares: number;
  cost: number;
  pnl: number | null;
  outcome: Side | null;
};

export type CalibRow = {
  windowStart: number;
  pUp: number;
  pBlend?: number | null;
  market: number;
  outcome: Side;
  confirmed: boolean;
  verdict: "up" | "down" | "skip";
};

export type Chip = { id: number; delta: number; at: number };

export type SimFill = {
  id: string;
  at: number;
  windowStart: number;
  action: "buy" | "sell" | "settle";
  side: Side;
  price: number;
  shares: number;
  fee: number;
  pnl: number | null;
  cash: number;
  pModel?: number | null;
  edge?: number | null;
  tau?: number | null;
  targetKind?: Snap["targetKind"];
  priceAgeMs?: number | null;
  reason?: string | null;
  span?: 300 | 900;
};

export type SimPoint = { t: number; pnl: number };

export type SimPos = {
  windowStart: number;
  side: Side;
  shares: number;
  cost: number;
  entry: number;
  pModel?: number | null;
  edge?: number | null;
  tau?: number | null;
  targetKind?: Snap["targetKind"];
  priceAgeMs?: number | null;
};

export type Snap = {
  booted: boolean;
  now: number;
  windowStart: number;
  phase: "loading" | "open" | "resolving" | "gap";
  pill: string;
  polyHref: string;
  marketError: string | null;
  up: Quote;
  down: Quote;
  quoteAgeMs: number | null;
  clobLive: boolean;
  price: number | null;
  sourceLabel: string;
  priceAgeMs: number | null;
  priceLive: boolean;
  target: number | null;
  targetKind: "polymarket" | "estimated" | "manual" | null;
  series: SecondPrice[];
  sigma: number;
  historySeconds: number;
  sigmaNote: string;
  model: ModelOut | null;
  verdict: "up" | "down" | "skip";
  call: "up" | "down" | null;
  reason: string | null;
  edge: number | null;
  ev: number | null;
  kellyFrac: number | null;
  kellyCapped: boolean;
  spark: { t: number; model: number; market: number }[];
  tape: TapeMark[];
  paper: PaperTrade[];
  paperPnl: number;
  paperHits: number;
  paperSettled: number;
  calibN: number;
  hitRate: number | null;
  hitN: number;
  brierModel: number | null;
  brierBlend: number | null;
  brierMarket: number | null;
  scoreN: number;
  beatsMarket: boolean | null;
  reconnects: number;
  feedNote: string | null;
  accepting: boolean;
  feesOn: boolean;
  shine: number;
  wipe: number;
  chips: Chip[];
  note: string | null;
  description: string;
  simCash: number;
  simEquity: number;
  simFees: number;
  simPos: SimPos | null;
  simFills: SimFill[];
  simTrades: SimTrade[];
  simReport: SimReport;
  simCurve: SimPoint[];
  strategies: { five: BookView; fifteen: BookView; combined: BookView; shadow: BookView };
  lane15: LaneSnap;
  gate: Gate | null;
  notices: Notice[];
  scratches: Scratch[];
  reliability: RelBin[];
  waiting5: WaitSnap | null;
  waiting15: WaitSnap | null;
  shadowLane: CallSnap;
  polySaved: boolean;
  trade: TradeDesk;
};

export type TradeDesk = {
  address: string | null;
  paused: boolean;
  cap: number;
  keySaved: boolean;
  signatureType: 0 | 1 | 2;
  note: string;
};

export type LiveJob = {
  windowStart: number;
  tokenId: string;
  ask: number;
  dollars: number;
  privateKey: string;
  apiKey: string;
  secret: string;
  passphrase: string;
  funder: string;
  signatureType: 0 | 1 | 2;
};

export type LaneSnap = {
  windowStart: number;
  phase: Snap["phase"];
  pill: string;
  polyHref: string;
  up: Quote;
  down: Quote;
  target: number | null;
  targetKind: Snap["targetKind"];
  model: ModelOut | null;
  verdict: "up" | "down" | "skip";
  call: "up" | "down" | null;
  reason: string | null;
  edge: number | null;
  tau: number;
  accepting: boolean;
  marketError: string | null;
  bookLive: boolean;
  gate: Gate | null;
};

export type Notice = { id: number; text: string; tone: "up" | "down" | "warn" };

export type Scratch = {
  windowStart: number;
  target: number | null;
  targetKind: Snap["targetKind"];
  series: SecondPrice[];
  spark: { t: number; model: number; market: number }[];
  verdict: "up" | "down" | "skip";
  reason: string | null;
  outcome: Side | null;
};

export type RelBin = { lo: number; n: number; up: number };

export type WaitSnap = { side: "up" | "down"; refused: number; now: number | null; holding: boolean };

export type CallSnap = {
  verdict: "up" | "down" | "skip";
  call: "up" | "down" | null;
  reason: string | null;
  edge: number | null;
  gate: Gate | null;
};

const DEFAULTS: Settings = {
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

const LAMBDA = 0.97;
const SIM_START = 100;
const SIM_STAKE = 0.1;

type Market = {
  windowStart: number;
  up: string;
  down: string;
  feeRate: number;
  feeExp: number;
  closed: boolean;
  accepting: boolean;
  description: string;
  outcomes: string[];
  outcomePrices: number[];
};

export type Persist = {
  settings: Settings;
  tape: TapeMark[];
  paper: PaperTrade[];
  calib: CalibRow[];
  targets: Record<string, number>;
  sim?: { cash: number; pos: SimPos | null; fills: SimFill[]; fees?: number; curve?: SimPoint[]; trades?: SimTrade[]; tradedWin?: number };
  books?: Partial<Record<"five" | "fifteen" | "combined" | "shadow", Book>>;
  scratches?: Scratch[];
  /** Worker-only. Never copy this onto the public snapshot. */
  poly?: { apiKey: string; secret: string; passphrase: string } | null;
  trade?: { address?: string | null; paused?: boolean; cap?: number; signatureType?: number; filledWin?: number; note?: string };
  /** Worker-only. Never copy this onto the public snapshot. */
  signer?: { privateKey: string } | null;
};

function emptyQuote(): Quote {
  return { bid: null, ask: null };
}

export function blankSnap(): Snap {
  return {
    booted: false,
    now: 0,
    windowStart: 0,
    phase: "loading",
    pill: "Finding the window",
    polyHref: "https://polymarket.com/event/btc-updown-5m",
    marketError: null,
    up: emptyQuote(),
    down: emptyQuote(),
    quoteAgeMs: null,
    clobLive: false,
    price: null,
    sourceLabel: "chainlink",
    priceAgeMs: null,
    priceLive: false,
    target: null,
    targetKind: null,
    series: [],
    sigma: 0,
    historySeconds: 0,
    sigmaNote: "waiting",
    model: null,
    verdict: "skip",
    call: null,
    reason: "Waiting for the market to load.",
    edge: null,
    ev: null,
    kellyFrac: null,
    kellyCapped: false,
    spark: [],
    tape: [],
    paper: [],
    paperPnl: 0,
    paperHits: 0,
    paperSettled: 0,
    calibN: 0,
    hitRate: null,
    hitN: 0,
    brierModel: null,
    brierBlend: null,
    brierMarket: null,
    scoreN: 0,
    beatsMarket: null,
    reconnects: 0,
    feedNote: null,
    accepting: false,
    feesOn: true,
    shine: 0,
    wipe: 0,
    chips: [],
    note: null,
    description: "",
    simCash: SIM_START,
    simEquity: SIM_START,
    simFees: 0,
    simPos: null,
    simFills: [],
    simTrades: [],
    simReport: summarizeTrades([]),
    simCurve: [],
    strategies: {
      five: present(freshBook("five"), SIM_START),
      fifteen: present(freshBook("fifteen"), SIM_START),
      combined: present(freshBook("combined"), SIM_START),
      shadow: present(freshBook("shadow"), SIM_START),
    },
    lane15: emptyLane(),
    gate: null,
    notices: [],
    scratches: [],
    reliability: [],
    waiting5: null,
    waiting15: null,
    shadowLane: { verdict: "skip", call: null, reason: null, edge: null, gate: null },
    polySaved: false,
    trade: { address: null, paused: true, cap: 25, keySaved: false, signatureType: 1, note: "" },
  };
}

function emptyLane(): LaneSnap {
  return {
    windowStart: 0,
    phase: "loading",
    pill: "Finding the 15-minute window",
    polyHref: "https://polymarket.com/event/btc-updown-15m",
    up: emptyQuote(),
    down: emptyQuote(),
    target: null,
    targetKind: null,
    model: null,
    verdict: "skip",
    call: null,
    reason: "Waiting for the 15-minute market.",
    edge: null,
    tau: 0,
    accepting: false,
    marketError: null,
    bookLive: false,
    gate: null,
  };
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v) as unknown;
      if (Array.isArray(j)) return j.map(String);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseMarket(ev: Record<string, unknown>, t: number): Market | null {
  const markets = ev.markets as Record<string, unknown>[] | undefined;
  const m = markets?.[0];
  if (!m) return null;
  const outcomes = asStrings(m.outcomes);
  const ids = asStrings(m.clobTokenIds);
  const upI = outcomes.findIndex((o) => o.toLowerCase() === "up");
  const downI = outcomes.findIndex((o) => o.toLowerCase() === "down");
  if (upI < 0 || downI < 0 || !ids[upI] || !ids[downI]) return null;
  let feeRate = 0.07;
  let feeExp = 1;
  const fee = m.feeSchedule as { rate?: number; exponent?: number } | string | undefined;
  if (fee && typeof fee === "object") {
    if (Number.isFinite(Number(fee.rate))) feeRate = Number(fee.rate);
    if (Number.isFinite(Number(fee.exponent))) feeExp = Number(fee.exponent);
  }
  const prices = asStrings(m.outcomePrices).map((x) => Number(x));
  return {
    windowStart: t,
    up: ids[upI],
    down: ids[downI],
    feeRate,
    feeExp,
    closed: Boolean(m.closed),
    accepting: m.acceptingOrders !== false && !m.closed,
    description: String(m.description ?? ev.description ?? ""),
    outcomes,
    outcomePrices: prices,
  };
}

function settledSide(m: Market): Side | null {
  if (!m.closed && m.accepting) return null;
  const upI = m.outcomes.findIndex((o) => o.toLowerCase() === "up");
  const downI = m.outcomes.findIndex((o) => o.toLowerCase() === "down");
  const up = m.outcomePrices[upI];
  const down = m.outcomePrices[downI];
  if (up > 0.9 && down < 0.1) return "up";
  if (down > 0.9 && up < 0.1) return "down";
  return null;
}

function bestOf(levels: { price: string; size: string }[] | undefined, side: "bid" | "ask"): number | null {
  if (!levels?.length) return null;
  let pick: number | null = null;
  for (const lv of levels) {
    const price = Number(lv.price);
    const size = Number(lv.size);
    if (!Number.isFinite(price) || size <= 0) continue;
    if (pick == null) pick = price;
    else if (side === "bid") pick = Math.max(pick, price);
    else pick = Math.min(pick, price);
  }
  return pick;
}

function bestAsk(levels: { price: string; size: string }[] | undefined): { price: number | null; size: number | null } {
  if (!levels?.length) return { price: null, size: null };
  let price: number | null = null;
  let size: number | null = null;
  for (const lv of levels) {
    const p = Number(lv.price);
    const s = Number(lv.size);
    if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0) continue;
    if (price == null || p < price) {
      price = p;
      size = s;
    }
  }
  return { price, size };
}

export type RecoverSummary = {
  five: BookSlice;
  fifteen: BookSlice;
  combined: BookSlice;
  shadow: BookSlice;
};

export type BookSlice = {
  cash: number;
  fees: number;
  positions: { windowStart: number; side: string; shares: number; span: number; entry: number }[];
};

export type EngineHost = {
  read: () => Persist | null;
  write: (data: Persist) => void;
  /** Worker fetches Polymarket directly. The browser proxy is only for a page. */
  directOpen?: boolean;
  /** Tests load state without opening market sockets. */
  feeds?: boolean;
  onRecover?: (summary: RecoverSummary) => void;
};

export type Engine = {
  start: () => void;
  stop: () => void;
  subscribe: (fn: () => void) => () => void;
  getSnapshot: () => Snap;
  getServerSnapshot: () => Snap;
  patchSettings: (p: Partial<Settings>) => void;
  setTarget: (n: number | null) => void;
  paper: (side: Side) => void;
  exportCsv: () => void;
  settings: () => Settings;
  resetSim: () => void;
  resetBook: (id: "five" | "fifteen" | "combined" | "shadow") => void;
  exportBooks: () => void;
  push: (cmd: WickCommand) => void;
  /** Real 5-minute order, or null when the desk is paused, missing a key, or already sent. */
  liveJob: () => LiveJob | null;
  markLive: (windowStart: number, note: string, filled: boolean) => void;
  /** Read-only Polymarket check. Null when nothing was asked, or the desk is missing a key. */
  takeCheck: () => LiveJob | null;
};

const NO_HOST: EngineHost = {
  read: () => null,
  write: () => {},
  directOpen: false,
  feeds: true,
};

export function createEngine(host: EngineHost = NO_HOST): Engine {
  const serverSnap = blankSnap();
  let snap = serverSnap;
  const listeners = new Set<() => void>();
  const inbox: WickCommand[] = [];
  let users = 0;
  let settings: Settings = { ...DEFAULTS };
  let poly: { apiKey: string; secret: string; passphrase: string } | null = null;
  let tradeAddress: string | null = null;
  let tradePaused = true;
  let tradeCap = 25;
  let tradeSig: 0 | 1 | 2 = 1;
  let tradeNote = "";
  let signerKey: string | null = null;
  let liveFilledWin = 0;
  let liveLockWin = 0;
  let liveTriedAt = 0;
  let wantCheck = false;
  let tape: TapeMark[] = [];
  let paper: PaperTrade[] = [];
  let calib: CalibRow[] = [];
  let targets: Record<string, number> = {};

  let phase: Snap["phase"] = "loading";
  let win = 0;
  let market: Market | null = null;
  let nextMarket: Market | null = null;
  let marketError: string | null = null;
  let up = emptyQuote();
  let down = emptyQuote();
  let quoteAt = 0;
  let clobLive = false;
  let price: number | null = null;
  let priceAt = 0;
  let priceStamp = 0;
  let priceLive = false;
  let sourceLabel = "chainlink";
  let target: number | null = null;
  let targetKind: Snap["targetKind"] = null;
  let openLocked = false;
  let openGen = 0;
  let livePts: SecondPrice[] = [];
  let feedPts: SecondPrice[] = [];
  let volPts: SecondPrice[] = [];
  let seededFromBinance = false;
  let spark: Snap["spark"] = [];
  let reconnects = 0;
  let feedNote: string | null = null;
  let shine = 0;
  let wipe = 0;
  let chips: Chip[] = [];
  let chipAnchor: number | null = null;
  let note: string | null = null;
  let noteUntil = 0;
  let lastSparkSec = 0;
  let lastVerdictSide: Snap["verdict"] = "skip";
  let resolved = new Set<number>();
  let resolvingUntil = 0;
  let sawPriceThisWindow = false;
  let modelSnap: ModelOut | null = null;
  let verdictSnap: ReturnType<typeof decide> | null = null;

  let clob: WebSocket | null = null;
  let clobGen = 0;
  let clobTokens = "";
  let clobBackoff = 500;
  let priceWs: WebSocket | null = null;
  let priceGen = 0;
  let priceBackoff = 500;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let audio: AudioContext | null = null;
  let simCash = SIM_START;
  let simFees = 0;
  let simPos: SimPos | null = null;
  let simFills: SimFill[] = [];
  let simTrades: SimTrade[] = [];
  let simCurve: SimPoint[] = [];
  let curveDirty = false;
  let lastCurveSave = 0;
  let simWant: Side | "flat" = "flat";
  let simWantAt = 0;
  let simTradedWin = 0;
  let simExpire: { windowStart: number; side: Side; shares: number; outcome: Side } | null = null;
  let scratches: Scratch[] = [];
  let notices: Notice[] = [];
  let noticeSeq = 1;
  let seenFills = -1;
  let disagree5 = 0;
  let disagree15 = 0;
  let opposeKey = "";
  let wait5: { win: number; side: Side; refused: number; holding: boolean } | null = null;
  let wait15: { win: number; side: Side; refused: number; holding: boolean } | null = null;
  let shadowVerdict: ReturnType<typeof decide> | null = null;
  const books: Record<"five" | "fifteen" | "combined" | "shadow", Book> = {
    five: freshBook("five"),
    fifteen: freshBook("fifteen"),
    combined: freshBook("combined"),
    shadow: freshBook("shadow"),
  };
  const l15 = {
    win: 0,
    phase: "loading" as Snap["phase"],
    market: null as Market | null,
    next: null as Market | null,
    up: emptyQuote(),
    down: emptyQuote(),
    quoteAt: 0,
    clobLive: false,
    target: null as number | null,
    targetKind: null as Snap["targetKind"],
    openLocked: false,
    openGen: 0,
    error: null as string | null,
    saw: false,
    resolvingUntil: 0,
    clob: null as WebSocket | null,
    clobGen: 0,
    tokens: "",
    backoff: 500,
    model: null as ModelOut | null,
    verdict: decide({ model: null, feedAgeMs: null, historySeconds: 0, minEdge: 0.03, minAsk: 0.65, maxAsk: null, kelly: 0.25, accepting: false }),
    resolved: new Set<number>(),
    spark: [] as { t: number; market: number }[],
  };

  function emit() {
    snap = build();
    listeners.forEach((fn) => fn());
  }

  function load() {
    try {
      const data = host.read();
      if (data) applyPersist(data);
    } catch {
      /* ignore broken state */
    }
  }

  function applyPersist(data: Partial<Persist>) {
    try {
      if (data.settings) settings = sanitize({ ...DEFAULTS, ...data.settings });
      if (Array.isArray(data.tape)) tape = data.tape.slice(-60);
      if (Array.isArray(data.paper)) paper = data.paper.slice(-200);
      if (Array.isArray(data.calib)) calib = data.calib.slice(-200);
      if (data.targets && typeof data.targets === "object") targets = data.targets;
      if (data.sim && typeof data.sim.cash === "number" && Number.isFinite(data.sim.cash)) {
        simCash = data.sim.cash;
        simPos = data.sim.pos ?? null;
        if (Array.isArray(data.sim.fills)) simFills = data.sim.fills.slice(-80);
        simTrades = Array.isArray(data.sim.trades) ? readTrades(data.sim.trades) : pairFills(simFills);
        if (typeof data.sim.tradedWin === "number" && Number.isFinite(data.sim.tradedWin)) simTradedWin = data.sim.tradedWin;
        if (simPos) simTradedWin = simPos.windowStart;
        simCurve = readCurve(data.sim.curve);
        const summed = simFills.reduce((s, f) => s + (Number.isFinite(f.fee) ? f.fee : 0), 0);
        simFees = typeof data.sim.fees === "number" && Number.isFinite(data.sim.fees) ? data.sim.fees : summed;
        books.five.cash = simCash;
        books.five.fees = simFees;
        books.five.curve = simCurve.slice();
        books.five.trades = simTrades.slice();
        books.five.positions = simPos
          ? [{
              span: 300,
              windowStart: simPos.windowStart,
              side: simPos.side,
              shares: simPos.shares,
              cost: simPos.cost,
              entry: simPos.entry,
              pModel: simPos.pModel ?? null,
              edge: simPos.edge ?? null,
              tau: simPos.tau ?? null,
              targetKind: simPos.targetKind ?? null,
              priceAgeMs: simPos.priceAgeMs ?? null,
              openReason: null,
            }]
          : [];
        if (simPos) books.five.traded = [`300:${simPos.windowStart}`];
        else if (simTradedWin) books.five.traded = [`300:${simTradedWin}`];
        books.five.fills = simFills.map((f) => ({
          id: f.id,
          at: f.at,
          windowStart: f.windowStart,
          span: 300 as const,
          action: f.action,
          side: f.side,
          price: f.price,
          shares: f.shares,
          fee: f.fee,
          pnl: f.pnl,
          cash: f.cash,
          pModel: f.pModel ?? null,
          edge: f.edge ?? null,
          tau: f.tau ?? null,
          targetKind: f.targetKind ?? null,
          priceAgeMs: f.priceAgeMs ?? null,
          reason: f.reason ?? null,
        }));
      }
      const savedBooks = data.books;
      if (savedBooks?.fifteen) books.fifteen = mergeBook("fifteen", savedBooks.fifteen);
      if (savedBooks?.combined) books.combined = mergeBook("combined", savedBooks.combined);
      if (savedBooks?.five) books.five = mergeBook("five", savedBooks.five);
      if (savedBooks?.shadow) books.shadow = mergeBook("shadow", savedBooks.shadow);
      if (Array.isArray(data.scratches)) scratches = data.scratches.slice(-8);
      if ("poly" in data) poly = data.poly == null ? null : readPoly(data.poly) ?? poly;
      if (data.trade) {
        if ("address" in data.trade) tradeAddress = clipTradeAddress(data.trade.address);
        if (typeof data.trade.paused === "boolean") tradePaused = data.trade.paused;
        if (typeof data.trade.cap === "number" && data.trade.cap >= 1 && data.trade.cap <= 100000) tradeCap = data.trade.cap;
        if (data.trade.signatureType === 0 || data.trade.signatureType === 1 || data.trade.signatureType === 2) tradeSig = data.trade.signatureType;
        if (typeof data.trade.filledWin === "number") liveFilledWin = data.trade.filledWin;
        if (typeof data.trade.note === "string") tradeNote = data.trade.note.slice(0, 180);
      }
      if ("signer" in data) signerKey = data.signer?.privateKey && /^0x[a-fA-F0-9]{64}$/.test(data.signer.privateKey) ? data.signer.privateKey : null;
    } catch {
      /* ignore broken local storage */
    }
  }

  function save() {
    try {
      const data: Persist = {
        settings,
        tape: tape.slice(-60),
        paper: paper.slice(-200),
        calib: calib.slice(-200),
        targets,
        sim: {
          cash: books.five.cash,
          pos: books.five.positions[0]
            ? {
                windowStart: books.five.positions[0].windowStart,
                side: books.five.positions[0].side,
                shares: books.five.positions[0].shares,
                cost: books.five.positions[0].cost,
                entry: books.five.positions[0].entry,
                pModel: books.five.positions[0].pModel,
                edge: books.five.positions[0].edge,
                tau: books.five.positions[0].tau,
                targetKind: books.five.positions[0].targetKind as Snap["targetKind"],
                priceAgeMs: books.five.positions[0].priceAgeMs,
              }
            : null,
          fills: books.five.fills.slice(-80).map((f) => ({
            id: f.id,
            at: f.at,
            windowStart: f.windowStart,
            action: f.action,
            side: f.side,
            price: f.price,
            shares: f.shares,
            fee: f.fee,
            pnl: f.pnl,
            cash: f.cash,
            pModel: f.pModel,
            edge: f.edge,
            tau: f.tau,
            targetKind: f.targetKind as Snap["targetKind"],
            priceAgeMs: f.priceAgeMs,
          })),
          fees: books.five.fees,
          curve: books.five.curve,
          trades: books.five.trades.slice(-500),
          tradedWin: Number(books.five.traded[books.five.traded.length - 1]?.split(":")[1] ?? 0),
        },
        books: { five: books.five, fifteen: books.fifteen, combined: books.combined, shadow: books.shadow },
        scratches: scratches.slice(-8),
        poly,
        trade: { address: tradeAddress, paused: tradePaused, cap: tradeCap, signatureType: tradeSig, filledWin: liveFilledWin, note: tradeNote },
        signer: signerKey ? { privateKey: signerKey } : null,
      };
      try {
        host.write(data);
      } catch {
        /* ignore a full disk */
      }
      lastCurveSave = Date.now();
      curveDirty = false;
    } catch {
      /* ignore quota */
    }
  }

  function say(text: string) {
    note = text;
    noteUntil = Date.now() + 7000;
  }

  function blip() {
    if (!settings.sound) return;
    if (typeof AudioContext === "undefined") return;
    try {
      audio ??= new AudioContext();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = 660;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.07);
      o.stop(audio.currentTime + 0.08);
    } catch {
      /* autoplay blocked */
    }
  }

  function ingest(tSec: number, p: number, chart: boolean, quiet = false) {
    if (!Number.isFinite(p) || p < 1000 || p > 10_000_000) return;
    if (!Number.isFinite(tSec)) return;
    const sec = Math.round(tSec);
    const lastFeed = feedPts[feedPts.length - 1];
    if (lastFeed && lastFeed.t === sec) lastFeed.p = p;
    else if (!lastFeed || sec > lastFeed.t) feedPts.push({ t: sec, p });
    const feedCut = sec - Math.max(settings.lookbackSec, 90) - 5;
    if (feedPts.length > 4000) feedPts = feedPts.filter((x) => x.t >= feedCut);
    if (!chart) return;
    price = p;
    priceAt = Date.now();
    priceStamp = tSec * 1000;
    if (!quiet && chipAnchor != null && Math.abs(p - chipAnchor) >= 1) {
      chips = [...chips.filter((c) => Date.now() - c.at < 1400), { id: Date.now(), delta: p - chipAnchor, at: Date.now() }];
      chipAnchor = p;
    } else if (chipAnchor == null) chipAnchor = p;
    const w = win || windowStart(Date.now());
    if (tSec >= w - 1 && tSec <= w + 300) {
      const last = livePts[livePts.length - 1];
      if (last && Math.abs(tSec - last.t) < 0.2) {
        last.t = tSec;
        last.p = p;
      } else livePts.push({ t: tSec, p });
      if (livePts.length > 900) livePts = livePts.filter((x) => x.t >= w - 1);
      if (tSec >= w) sawPriceThisWindow = true;
    }
  }

  async function fetchMarket(t: number, span: 300 | 900 = 300): Promise<Market | null> {
    const slug = span === 900 ? "btc-updown-15m" : "btc-updown-5m";
    const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}-${t}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Polymarket ${res.status}`);
    const data = (await res.json()) as unknown;
    const ev = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!ev) return null;
    return parseMarket(ev, t);
  }

  async function fetchOpen(t: number, span: 300 | 900): Promise<{
    openPrice: number | null;
    closePrice: number | null;
    incomplete: boolean;
    completed: boolean;
  } | null> {
    try {
      const direct = host.directOpen === true;
      const url = direct ? polymarketOpenUrl(t, span) : apiPath(`/api/open?t=${t}&span=${span}`);
      const res = await fetch(
        url,
        direct
          ? { headers: { accept: "application/json", "user-agent": "wick-paper/1.0" } }
          : { cache: "no-store" },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        openPrice?: number | null;
        closePrice?: number | null;
        incomplete?: boolean;
        completed?: boolean;
      };
      return {
        openPrice: num(data.openPrice),
        closePrice: num(data.closePrice),
        incomplete: data.incomplete === true,
        completed: data.completed === true,
      };
    } catch {
      return null;
    }
  }

  async function loadOpen(t: number) {
    if (!t) return;
    if (targets[String(t)] != null) {
      target = targets[String(t)];
      targetKind = "manual";
      openLocked = true;
      return;
    }
    const gen = ++openGen;
    const data = await fetchOpen(t, 300);
    if (gen !== openGen || t !== win) return;
    if (data?.openPrice && data.openPrice > 1000 && targets[String(t)] == null) {
      target = data.openPrice;
      targetKind = "polymarket";
      openLocked = data.completed === true || data.incomplete === false;
      return;
    }
    if (gen !== openGen || t !== win) return;
    if (targetKind === "polymarket" || targetKind === "manual") return;
    try {
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1s&startTime=${t * 1000}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return;
      const rows = (await res.json()) as unknown[];
      const row = rows[0] as unknown[] | undefined;
      const open = num(row?.[1]);
      if (open && targets[String(t)] == null && target == null) {
        target = open;
        targetKind = "estimated";
      }
    } catch {
      /* no estimate */
    }
  }

  async function seedVol() {
    try {
      const start = Date.now() - settings.lookbackSec * 1000;
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1s&startTime=${start}&limit=1000`;
      const res = await fetch(url);
      if (!res.ok) return;
      const rows = (await res.json()) as unknown[][];
      const pts: SecondPrice[] = [];
      for (const row of rows) {
        const t = Math.floor(Number(row[0]) / 1000);
        const close = Number(row[4]);
        if (Number.isFinite(t) && Number.isFinite(close)) pts.push({ t, p: close });
      }
      if (pts.length) {
        volPts = pts.concat(volPts.filter((p) => p.t > pts[pts.length - 1].t));
        seededFromBinance = true;
      }
    } catch {
      /* vol builds from the live feed */
    }
  }

  async function refreshMarket(t: number, which: "now" | "next") {
    try {
      const m = await fetchMarket(t);
      marketError = null;
      if (which === "now") {
        market = m;
        if (m) {
          phase = phase === "resolving" ? phase : "open";
          const key = `${m.up}:${m.down}`;
          if (key !== clobTokens) connectClob(m);
        } else if (phase !== "resolving") {
          phase = "gap";
        }
      } else {
        nextMarket = m;
      }
    } catch {
      marketError = "Can't reach Polymarket. Retrying in 3s.";
      if (which === "now" && !market) phase = "gap";
    }
    emit();
  }

  function applyQuote(
    asset: string,
    bid: number | null,
    ask: number | null,
    size?: { known: boolean; shares: number | null },
  ) {
    if (!market) return;
    const qBid = bid != null && bid > 0 && bid < 1 ? bid : null;
    const qAsk = ask != null && ask > 0 && ask <= 1 ? ask : null;
    const prev = asset === market.up ? up : asset === market.down ? down : null;
    if (!prev) return;
    const nextBid = qBid ?? prev.bid;
    const nextAsk = qAsk ?? prev.ask;
    if (nextBid != null && nextAsk != null && nextBid > nextAsk) return;
    const askMoved = qAsk != null && prev.ask != null && Math.abs(qAsk - prev.ask) > 1e-6;
    const nextSize = size?.known ? size.shares : askMoved ? null : (prev.askSize ?? null);
    const next = { bid: nextBid, ask: nextAsk, askSize: nextSize };
    if (asset === market.up) up = next;
    else down = next;
    quoteAt = Date.now();
    clobLive = true;
    clobBackoff = 500;
  }

  function onClobMessage(raw: string) {
    if (raw === "PONG" || raw === "pong") return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const events = Array.isArray(data) ? data : [data];
    for (const ev of events) {
      if (!ev || typeof ev !== "object") continue;
      const e = ev as Record<string, unknown>;
      const type = String(e.event_type ?? "");
      if (type === "book" || (e.bids && e.asks)) {
        const askLv = bestAsk(e.asks as { price: string; size: string }[]);
        applyQuote(String(e.asset_id ?? ""), bestOf(e.bids as { price: string; size: string }[], "bid"), askLv.price, {
          known: true,
          shares: askLv.size,
        });
      } else if (type === "best_bid_ask") {
        applyQuote(String(e.asset_id ?? ""), num(e.best_bid), num(e.best_ask));
      } else if (type === "price_change" && Array.isArray(e.price_changes)) {
        for (const ch of e.price_changes as Record<string, unknown>[]) {
          applyQuote(String(ch.asset_id ?? ""), num(ch.best_bid), num(ch.best_ask));
        }
      }
    }
  }

  async function pollBooks() {
    if (!market || clobLive) return;
    try {
      const [a, b] = await Promise.all([book(market.up), book(market.down)]);
      if (a) applyQuote(market.up, a.bid, a.ask, { known: true, shares: a.askSize ?? null });
      if (b) applyQuote(market.down, b.bid, b.ask, { known: true, shares: b.askSize ?? null });
      clobLive = false;
      emit();
    } catch {
      marketError = "Can't reach Polymarket. Retrying in 3s.";
    }
  }

  async function book(token: string): Promise<Quote | null> {
    const res = await fetch(`https://clob.polymarket.com/book?token_id=${token}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { bids?: { price: string; size: string }[]; asks?: { price: string; size: string }[] };
    const askLv = bestAsk(data.asks);
    return { bid: bestOf(data.bids, "bid"), ask: askLv.price, askSize: askLv.size };
  }

  function connectClob(m: Market) {
    clobGen += 1;
    const my = clobGen;
    clobTokens = `${m.up}:${m.down}`;
    try {
      clob?.close();
    } catch {
      /* already closed */
    }
    const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");
    clob = ws;
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("PING");
    }, 10_000);
    ws.onopen = () => {
      if (my !== clobGen) return;
      ws.send(JSON.stringify({ assets_ids: [m.up, m.down], type: "market", custom_feature_enabled: true }));
    };
    ws.onmessage = (ev) => {
      if (my !== clobGen) return;
      onClobMessage(String(ev.data));
    };
    ws.onerror = () => {
      clobLive = false;
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (my !== clobGen) return;
      clobLive = false;
      reconnects += 1;
      const wait = clobBackoff;
      clobBackoff = Math.min(10_000, clobBackoff * 2);
      setTimeout(() => {
        if (my === clobGen && market) connectClob(market);
      }, wait);
    };
  }

  function connectPrice() {
    priceGen += 1;
    const my = priceGen;
    try {
      priceWs?.close();
    } catch {
      /* already closed */
    }
    const feed = settings.feed;
    const url =
      feed === "coinbase"
        ? "wss://ws-feed.exchange.coinbase.com"
        : feed === "binance"
          ? "wss://stream.binance.com:9443/ws/btcusdt@trade"
          : "wss://ws-live-data.polymarket.com";
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      feedNote = feed === "binance" ? "Binance refused the connection. Switch the feed in settings." : "Price socket failed. Retrying.";
      return;
    }
    priceWs = ws;
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && feed === "chainlink") {
        try {
          ws.send("PING");
        } catch {
          /* ignore */
        }
      }
    }, 10_000);
    ws.onopen = () => {
      if (my !== priceGen) return;
      priceLive = true;
      priceBackoff = 500;
      feedNote = null;
      if (feed === "chainlink") {
        sourceLabel = "chainlink 60s";
        ws.send(
          JSON.stringify({
            action: "subscribe",
            subscriptions: [
              { topic: "crypto_prices_twap_sixty", type: "*", filters: JSON.stringify({ symbol: "btc/usd" }) },
            ],
          }),
        );
      } else if (feed === "coinbase") {
        sourceLabel = "coinbase";
        ws.send(JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] }));
      } else {
        sourceLabel = "binance";
      }
    };
    ws.onmessage = (ev) => {
      if (my !== priceGen) return;
      const text = String(ev.data);
      if (text === "PONG") return;
      try {
        const msg = JSON.parse(text) as Record<string, unknown>;
        if (feed === "chainlink") onChainlink(msg);
        else if (feed === "coinbase") {
          if (msg.type === "ticker") {
            const p = num(msg.price);
            if (p) ingest(Date.now() / 1000, p, true);
          }
        } else {
          const p = num(msg.p);
          const t = num(msg.T);
          if (p) ingest((t ?? Date.now()) / 1000, p, true);
        }
        priceLive = true;
      } catch {
        /* non-json keepalive */
      }
    };
    ws.onerror = () => {
      priceLive = false;
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (my !== priceGen) return;
      priceLive = false;
      reconnects += 1;
      if (feed === "binance") {
        feedNote = "Binance refused the connection. Chainlink is the fallback.";
        settings = { ...settings, feed: "chainlink" };
        save();
        connectPrice();
        return;
      }
      const wait = priceBackoff;
      priceBackoff = Math.min(10_000, priceBackoff * 2);
      setTimeout(() => {
        if (my === priceGen) connectPrice();
      }, wait);
    };
  }

  function onChainlink(msg: Record<string, unknown>) {
    const payload = (msg.payload ?? msg) as Record<string, unknown>;
    if (!payload || typeof payload !== "object") return;
    sourceLabel = "chainlink 60s";
    const symbol = String(payload.symbol ?? "");
    if (symbol && !symbol.toLowerCase().includes("btc")) return;
    const data = payload.data;
    if (Array.isArray(data)) {
      const rows: { t: number; p: number }[] = [];
      for (const row of data) {
        if (!row || typeof row !== "object") continue;
        const r = row as { timestamp?: number; value?: number };
        const t = num(r.timestamp);
        const p = num(r.value);
        if (t && p) rows.push({ t: epochSec(t), p });
      }
      rows.sort((a, b) => a.t - b.t);
      for (const row of rows) ingest(row.t, row.p, true, true);
      if (price != null) chipAnchor = price;
      return;
    }
    const p = num(payload.value);
    const t = num(payload.timestamp);
    if (p) ingest(epochSec(t ?? Date.now()), p, true);
  }

  function mid(q: Quote): number | null {
    if (q.bid != null && q.ask != null) return (q.bid + q.ask) / 2;
    return q.ask ?? q.bid;
  }

  function seriesNow(): SecondPrice[] {
    return livePts
      .filter((p) => p.t >= win && p.t <= win + 300)
      .sort((a, b) => a.t - b.t);
  }

  function compute() {
    const now = Date.now();
    chips = chips.filter((c) => now - c.at < 4200);
    if (note && now > noteUntil) note = null;
    const tau = win ? Math.max(0, (win + 300) * 1000 - now) / 1000 : 0;
    const nowSec = Math.floor(now / 1000);
    const hist = feedPts.length >= 60 ? feedPts : volPts;
    const driftHist = feedPts.length >= 8 ? feedPts : hist;
    const vol = ewmaSigma(hist, LAMBDA, nowSec, settings.lookbackSec);
    const drift = driftPerSec(driftHist, nowSec, 30);
    const velShort = driftPerSec(driftHist, nowSec, 10);
    const velImpulse = driftPerSec(driftHist, nowSec, 6);
    const recentUp = spark.filter((p) => p.t <= nowSec && nowSec - p.t <= 12);
    const upNow = mid(up);
    const marketDelta =
      upNow != null && recentUp.length >= 3 && nowSec - recentUp[0].t >= 6 ? upNow - recentUp[0].market : 0;
    const S = price;
    const K = target;
    let model: ModelOut | null = null;
    if (S != null && K != null && win) {
      model = runModel({
        S,
        K,
        tau,
        sigmaPerSec: vol.sigma,
        tail: settings.tail,
        basis: settings.basis,
        driftPerSec: drift,
        velShort,
        velImpulse,
        marketDelta,
        marketP: upNow,
        pace: PACE_5,
        askUp: up.ask,
        askDown: down.ask,
        bidUp: up.bid,
        bidDown: down.bid,
        feeRate: market?.feeRate ?? 0.07,
        feeExp: market?.feeExp ?? 1,
      });
    }
    const age = priceAt ? now - priceAt : null;
    const verdict = decide({
      model,
      feedAgeMs: age,
      historySeconds: vol.seconds,
      minEdge: settings.minEdge,
      minAsk: settings.minAsk,
      maxAsk: settings.maxAsk,
      kelly: settings.kelly,
      accepting: phase === "open" && (market?.accepting ?? false),
      span: 300,
    });
    shadowVerdict = decide({
      model,
      feedAgeMs: age,
      historySeconds: vol.seconds,
      minEdge: settings.minEdge,
      minAsk: 0.55,
      maxAsk: settings.maxAsk,
      kelly: settings.kelly,
      accepting: phase === "open" && (market?.accepting ?? false),
      span: 300,
    });
    if (verdict.call && verdict.call !== lastVerdictSide) shine += 1;
    lastVerdictSide = verdict.call ?? "skip";
    if (model && Math.floor(now / 1000) !== lastSparkSec && phase === "open") {
      lastSparkSec = Math.floor(now / 1000);
      const mkt = mid(up);
      if (mkt != null) {
        spark = [...spark, { t: lastSparkSec, model: model.pUp, market: mkt }].filter((p) => p.t >= win);
      }
    }
    if (tau >= 8 && model && vol.seconds >= 60) {
      modelSnap = model;
      verdictSnap = verdict;
    }
    return { model, verdict, vol, age };
  }

  function feeRateNow(): { rate: number; exp: number } {
    return { rate: market?.feeRate ?? 0.07, exp: market?.feeExp ?? 1 };
  }

  function pushFill(fill: Omit<SimFill, "id" | "at" | "cash"> & { at?: number }) {
    simFees += Number.isFinite(fill.fee) ? fill.fee : 0;
    simFills = [
      ...simFills,
      { ...fill, id: `${fill.windowStart}-${fill.action}-${Date.now()}`, at: fill.at ?? Date.now(), cash: simCash },
    ].slice(-80);
  }

  function buySim(side: Side, model: ModelOut | null, ageMs: number | null): boolean {
    if (phase !== "open" || !market?.accepting || !win) return false;
    if (simTradedWin === win || simPos) return false;
    if (simCash < 1) return false;
    const q = side === "up" ? up : down;
    const ask = q.ask;
    if (ask == null || ask <= 0.01 || ask >= 0.99) return false;
    const { rate, exp } = feeRateNow();
    const fee = feePerShare(ask, rate, exp);
    const unit = ask + fee;
    if (unit <= 0) return false;
    const spend = Math.min(simCash, Math.max(1, simCash * SIM_STAKE));
    if (spend > simCash + 1e-9) return false;
    const shares = spend / unit;
    const pModel = model ? (side === "up" ? model.pUp : model.pDown) : null;
    const edge = model ? (side === "up" ? model.edgeUp : model.edgeDown) : null;
    const tau = model ? model.tau : null;
    simCash -= spend;
    simTradedWin = win;
    simPos = {
      windowStart: win,
      side,
      shares,
      cost: spend,
      entry: ask,
      pModel,
      edge,
      tau,
      targetKind,
      priceAgeMs: ageMs,
    };
    pushFill({
      windowStart: win,
      action: "buy",
      side,
      price: ask,
      shares,
      fee: fee * shares,
      pnl: null,
      pModel,
      edge,
      tau,
      targetKind,
      priceAgeMs: ageMs,
    });
    markCurve();
    save();
    return true;
  }

  function remember(exit: "sell" | "settle", pnl: number, exitFee: number) {
    if (!simPos) return;
    const entryFee = Math.max(0, simPos.cost - simPos.shares * simPos.entry);
    const trade: SimTrade = {
      windowStart: simPos.windowStart,
      side: simPos.side,
      ask: simPos.entry,
      shares: simPos.shares,
      cost: simPos.cost,
      fee: entryFee + Math.max(0, exitFee),
      pnl,
      pModel: finiteOrNull(simPos.pModel),
      edge: finiteOrNull(simPos.edge),
      tau: finiteOrNull(simPos.tau),
      targetKind: simPos.targetKind ?? null,
      priceAgeMs: finiteOrNull(simPos.priceAgeMs),
      exit,
    };
    simTrades = [...simTrades, trade].slice(-500);
  }

  function sellSim(): boolean {
    if (!simPos) return false;
    const q = simPos.side === "up" ? up : down;
    const bid = q.bid;
    if (bid == null || bid <= 0 || bid >= 1) return false;
    const { rate, exp } = feeRateNow();
    const fee = feePerShare(bid, rate, exp);
    const exitFee = fee * simPos.shares;
    const proceeds = simPos.shares * Math.max(0, bid - fee);
    const pnl = proceeds - simPos.cost;
    simCash += proceeds;
    simTradedWin = simPos.windowStart;
    remember("sell", pnl, exitFee);
    pushFill({
      windowStart: simPos.windowStart,
      action: "sell",
      side: simPos.side,
      price: bid,
      shares: simPos.shares,
      fee: exitFee,
      pnl,
      pModel: simPos.pModel ?? null,
      edge: simPos.edge ?? null,
      tau: simPos.tau ?? null,
      targetKind: simPos.targetKind ?? null,
      priceAgeMs: simPos.priceAgeMs ?? null,
    });
    simPos = null;
    markCurve();
    save();
    return true;
  }

  function expireSim(outcome: Side, closedWin: number) {
    if (!simPos || simPos.windowStart !== closedWin) return;
    const shares = simPos.shares;
    const won = simPos.side === outcome;
    const payout = won ? shares : 0;
    const pnl = payout - simPos.cost;
    simCash += payout;
    simTradedWin = closedWin;
    remember("settle", pnl, 0);
    simExpire = { windowStart: closedWin, side: simPos.side, shares, outcome };
    pushFill({
      windowStart: closedWin,
      action: "settle",
      side: simPos.side,
      price: won ? 1 : 0,
      shares,
      fee: 0,
      pnl,
      pModel: simPos.pModel ?? null,
      edge: simPos.edge ?? null,
      tau: simPos.tau ?? null,
      targetKind: simPos.targetKind ?? null,
      priceAgeMs: simPos.priceAgeMs ?? null,
    });
    simPos = null;
    markCurve();
    save();
  }

  function reviseSim(outcome: Side, closedWin: number) {
    reviseSpan(300, outcome, closedWin);
    save();
  }

  function reviseSpan(span: 300 | 900, outcome: Side, closedWin: number) {
    const list = span === 900 ? [books.fifteen, books.combined] : [books.five, books.combined, books.shadow];
    const reason = (won: boolean) => (won ? "Held to the end. The side won." : "Held to the end. The side lost.");
    for (const book of list) {
      for (let i = book.trades.length - 1; i >= 0; i--) {
        const t = book.trades[i];
        if ((t.span ?? 300) !== span || t.windowStart !== closedWin || t.exit !== "settle") continue;
        const won = t.side === outcome;
        const next = (won ? t.shares : 0) - t.cost;
        if (Math.abs(next - t.pnl) > 1e-6) book.cash += next - t.pnl;
        book.trades[i] = { ...t, pnl: next, reason: reason(won) };
        for (let f = book.fills.length - 1; f >= 0; f--) {
          const fill = book.fills[f];
          if (fill.action !== "settle" || fill.windowStart !== closedWin || fill.span !== span || fill.side !== t.side) continue;
          book.fills[f] = { ...fill, pnl: next, price: won ? 1 : 0, reason: reason(won) };
          break;
        }
        book.note = reason(won);
        break;
      }
    }
  }

  function simMark(): number {
    if (!simPos || simPos.windowStart !== win) return 0;
    const q = simPos.side === "up" ? up : down;
    const bid = q.bid ?? q.ask;
    if (bid == null) return simPos.cost;
    const { rate, exp } = feeRateNow();
    return simPos.shares * Math.max(0, bid - feePerShare(bid, rate, exp));
  }

  function markCurve(now = Date.now(), pnl = simCash + simMark() - SIM_START) {
    if (!Number.isFinite(pnl)) return;
    const last = simCurve[simCurve.length - 1];
    if (last && now - last.t < 1000) {
      if (Math.abs(last.pnl - pnl) < 0.005) return;
      last.pnl = pnl;
      curveDirty = true;
      return;
    }
    simCurve.push({ t: now, pnl });
    if (simCurve.length > 1200) simCurve = compactCurve(simCurve, 1100);
    curveDirty = true;
  }

  function flushCurve() {
    if (!curveDirty || Date.now() - lastCurveSave < 15000) return;
    save();
  }

  function simStep(side: "up" | "down" | "skip", model: ModelOut | null, ageMs: number | null, now: number) {
    void side;
    void model;
    void ageMs;
    void now;
  }

  function endRef(points: SecondPrice[], start: number, span: number, fallback: number | null): number | null {
    const end = start + span;
    let best: SecondPrice | null = null;
    for (const p of points) {
      if (p.t < start || p.t > end + 2 || !Number.isFinite(p.p)) continue;
      if (!best) {
        best = p;
        continue;
      }
      const next = Math.abs(p.t - end);
      const prev = Math.abs(best.t - end);
      if (next < prev || (next === prev && p.t > best.t)) best = p;
    }
    return best ? best.p : fallback;
  }

  async function officialSide(t: number, span: 300 | 900): Promise<Side | null> {
    const data = await fetchOpen(t, span);
    if (!data) return null;
    const open = data.openPrice;
    const close = data.closePrice;
    if (open == null || close == null) return null;
    if (data.completed !== true && data.incomplete !== false) return null;
    return close >= open ? "up" : "down";
  }

  function applyResult(span: 300 | 900, closedWin: number, side: Side, confirmed: boolean) {
    const list = span === 900 ? [books.fifteen, books.combined] : [books.five, books.combined, books.shadow];
    for (const book of list) {
      if (book.positions.some((p) => p.span === span && p.windowStart === closedWin)) resolveBook(book, span, closedWin, side);
    }
    reviseSpan(span, side, closedWin);
    if (span === 300) {
      tape = tape.map((row) =>
        row.windowStart === closedWin
          ? { ...row, outcome: side, confirmed, correct: row.verdict === "skip" ? null : row.verdict === side }
          : row,
      );
      calib = calib.map((row) => (row.windowStart === closedWin ? { ...row, outcome: side, confirmed } : row));
      scratches = scratches.map((s) => (s.windowStart === closedWin ? { ...s, outcome: side } : s));
      settle(closedWin, side);
    }
    for (const book of list) touchCurve(book, book.cash + markBook(book, []) - 100, Date.now());
    save();
    emit();
  }

  async function reconcileRecent() {
    const nowSec = Math.floor(Date.now() / 1000);
    const five = new Set<number>();
    const fifteen = new Set<number>();
    for (const row of tape) {
      if (!row.confirmed && nowSec - row.windowStart < 7200) five.add(row.windowStart);
    }
    for (const book of [books.five, books.fifteen, books.combined, books.shadow]) {
      for (const pos of book.positions) {
        if (pos.windowStart + pos.span + 2 >= nowSec || nowSec - pos.windowStart > 7200) continue;
        if (pos.span === 900) fifteen.add(pos.windowStart);
        else five.add(pos.windowStart);
      }
      for (const t of book.trades.slice(-12)) {
        if (t.exit !== "settle" || nowSec - t.windowStart > 7200) continue;
        const span = t.span ?? 300;
        if (span === 900) fifteen.add(t.windowStart);
        else five.add(t.windowStart);
      }
    }
    for (const win of five) {
      const side = await officialSide(win, 300);
      if (side) applyResult(300, win, side, true);
    }
    for (const win of fifteen) {
      const side = await officialSide(win, 900);
      if (side) applyResult(900, win, side, true);
    }
  }

  function beginResolve(closedWin: number) {
    simWant = "flat";
    simWantAt = Date.now();
    const K = target;
    const ref = endRef(feedPts, closedWin, 300, price);
    const outcome: Side | null = ref != null && K != null ? (ref >= K ? "up" : "down") : null;
    resolveBook(books.five, 300, closedWin, outcome);
    resolveBook(books.combined, 300, closedWin, outcome);
    resolveBook(books.shadow, 300, closedWin, outcome);
    const pts = livePts.filter((p) => p.t >= closedWin && p.t <= closedWin + 300);
    scratches = [
      ...scratches,
      {
        windowStart: closedWin,
        target,
        targetKind,
        series: thinSeries(pts),
        spark: spark.slice(-80),
        verdict: verdictSnap?.side ?? "skip",
        reason: verdictSnap?.reason ?? null,
        outcome,
      },
    ].slice(-8);
    touchCurve(books.five, books.five.cash + markBook(books.five, []) - 100, Date.now());
    touchCurve(books.combined, books.combined.cash + markBook(books.combined, []) - 100, Date.now());
    save();
    void confirmLater(closedWin, K);
    if (resolved.has(closedWin) || !sawPriceThisWindow) {
      resolved.add(closedWin);
      return;
    }
    resolved.add(closedWin);
    if (ref == null || K == null || outcome == null) return;
    const m = modelSnap;
    const v = verdictSnap;
    const marketPx = mid(up);
    const verdictSide = v?.side ?? "skip";
    const correct = verdictSide === "skip" ? null : verdictSide === outcome;
    tape = [...tape, { windowStart: closedWin, outcome, confirmed: false, verdict: verdictSide, correct }].slice(-60);
    if (m && marketPx != null) {
      calib = [
        ...calib.filter((c) => c.windowStart !== closedWin),
        {
          windowStart: closedWin,
          pUp: m.pUp,
          pBlend: m.pBlend,
          market: marketPx,
          outcome,
          confirmed: false,
          verdict: verdictSide,
        },
      ].slice(-200);
    }
    settle(closedWin, outcome);
    save();
  }

  function settle(closedWin: number, outcome: Side) {
    const rate = market?.feeRate ?? 0.07;
    paper = paper.map((tr) => {
      if (tr.windowStart !== closedWin) return tr;
      const fee = tr.fee || rate * (1 - tr.ask);
      const shares = tr.shares || 1 / tr.ask;
      const pnl = (tr.side === outcome ? shares : 0) - tr.cost - fee;
      return { ...tr, fee, shares, pnl, outcome };
    });
  }

  async function confirmLater(closedWin: number, openPx: number | null) {
    let announced: Side | null = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (users <= 0) return;
      const official = await officialSide(closedWin, 300);
      if (official) {
        applyResult(300, closedWin, official, true);
        return;
      }
      if (openPx == null) continue;
      const ref = endRef(feedPts, closedWin, 300, null);
      if (ref == null) continue;
      const side: Side = ref >= openPx ? "up" : "down";
      if (side === announced) continue;
      announced = side;
      applyResult(300, closedWin, side, false);
    }
  }

  function roll() {
    const now = Date.now();
    const w = windowStart(now);
    if (!win) {
      win = w;
      return;
    }
    if (w !== win && phase !== "resolving") {
      beginResolve(win);
      phase = "resolving";
      resolvingUntil = now + 1100;
      return;
    }
    if (phase === "resolving" && now >= resolvingUntil) {
      win = w;
      phase = "open";
      up = emptyQuote();
      down = emptyQuote();
      quoteAt = 0;
      spark = [];
      livePts = livePts.filter((p) => p.t >= w);
      sawPriceThisWindow = livePts.some((p) => p.t >= w);
      modelSnap = null;
      verdictSnap = null;
      lastVerdictSide = "skip";
      chipAnchor = price;
      wipe += 1;
      shine += 1;
      target = null;
      targetKind = null;
      openLocked = false;
      openGen += 1;
      if (nextMarket && nextMarket.windowStart === w) {
        market = nextMarket;
        nextMarket = null;
        connectClob(market);
      } else {
        market = null;
        void refreshMarket(w, "now");
      }
      void loadOpen(w);
    }
  }

  function laneOf(
    span: 300 | 900,
    winAt: number,
    open: boolean,
    upQ: Quote,
    downQ: Quote,
    model: ModelOut | null,
    side: "up" | "down" | "skip",
    reason: string | null,
    kind: Snap["targetKind"],
    ageMs: number | null,
    feeRate: number,
    feeExp: number,
    stake: number | null,
  ): Lane {
    return {
      span,
      win: winAt,
      open,
      up: upQ,
      down: downQ,
      model,
      side,
      reason,
      targetKind: kind,
      priceAgeMs: ageMs,
      feeRate,
      feeExp,
      stake,
    };
  }

  function tradeBooks(model: ModelOut | null, verdict: ReturnType<typeof decide>, age: number | null, now: number) {
    const fiveOpen = phase === "open" && (market?.accepting ?? false) && !(price != null && target == null);
    const five = laneOf(
      300,
      win,
      fiveOpen,
      up,
      down,
      model,
      fiveOpen ? verdict.side : "skip",
      fiveOpen ? verdict.reason : "This 5-minute window is not open for a buy.",
      targetKind,
      age,
      market?.feeRate ?? 0.07,
      market?.feeExp ?? 1,
      fiveOpen ? verdict.kellyFrac : null,
    );
    const c15 = compute15(now);
    const fifteenOpen = l15.phase === "open" && (l15.market?.accepting ?? false) && !(price != null && l15.target == null);
    const fifteen = laneOf(
      900,
      l15.win,
      fifteenOpen,
      l15.up,
      l15.down,
      c15.model,
      fifteenOpen ? c15.verdict.side : "skip",
      fifteenOpen ? c15.verdict.reason : "This 15-minute window is not open for a buy.",
      l15.targetKind,
      c15.age,
      l15.market?.feeRate ?? 0.07,
      l15.market?.feeExp ?? 1,
      fifteenOpen ? c15.verdict.kellyFrac : null,
    );
    const before =
      books.five.fills.length + books.fifteen.fills.length + books.combined.fills.length + books.shadow.fills.length;
    signal(books.fifteen, fifteen, now);
    signal(books.five, five, now);
    signal(books.shadow, {
      ...five,
      side: fiveOpen && shadowVerdict ? shadowVerdict.side : "skip",
      reason: shadowVerdict?.reason ?? five.reason,
      stake: fiveOpen ? shadowVerdict?.kellyFrac ?? null : null,
    }, now);
    signal(books.combined, fifteen, now);
    signal(books.combined, five, now);
    const lanes = [five, fifteen];
    for (const book of [books.five, books.fifteen, books.combined, books.shadow]) {
      touchCurve(book, book.cash + markBook(book, lanes) - 100, now);
    }
    curveDirty = true;
    const after =
      books.five.fills.length + books.fifteen.fills.length + books.combined.fills.length + books.shadow.fills.length;
    if (after !== before) save();
    return { five, fifteen };
  }

  function compute15(now: number) {
    const tau = l15.win ? Math.max(0, ((l15.win + 900) * 1000 - now) / 1000) : 0;
    const nowSec = Math.floor(now / 1000);
    const hist = feedPts.length >= 60 ? feedPts : volPts;
    const vol = ewmaSigma(hist, LAMBDA, nowSec, settings.lookbackSec);
    const drift = driftPerSec(hist, nowSec, PACE_15.mid);
    const velShort = driftPerSec(hist, nowSec, PACE_15.short);
    const velImpulse = driftPerSec(hist, nowSec, PACE_15.impulse);
    const upNow = mid(l15.up);
    const recent = l15.spark.filter((p) => nowSec - p.t <= 36 && p.t >= (l15.win || 0));
    const marketDelta = upNow != null && recent.length >= 3 && nowSec - recent[0].t >= 12 ? upNow - recent[0].market : 0;
    let model: ModelOut | null = null;
    if (price != null && l15.target != null && l15.win) {
      model = runModel({
        S: price,
        K: l15.target,
        tau,
        sigmaPerSec: vol.sigma,
        tail: settings.tail,
        basis: settings.basis,
        driftPerSec: drift,
        velShort,
        velImpulse,
        marketDelta,
        marketP: upNow,
        pace: PACE_15,
        askUp: l15.up.ask,
        askDown: l15.down.ask,
        bidUp: l15.up.bid,
        bidDown: l15.down.bid,
        feeRate: l15.market?.feeRate ?? 0.07,
        feeExp: l15.market?.feeExp ?? 1,
      });
    }
    const age = priceAt ? now - priceAt : null;
    const verdict = decide({
      model,
      feedAgeMs: age,
      historySeconds: vol.seconds,
      minEdge: settings.minEdge,
      minAsk: settings.minAsk,
      maxAsk: settings.maxAsk,
      kelly: settings.kelly,
      accepting: l15.phase === "open" && (l15.market?.accepting ?? false),
      span: 900,
    });
    l15.model = model;
    l15.verdict = verdict;
    if (model && upNow != null && l15.phase === "open") {
      const last = l15.spark[l15.spark.length - 1];
      if (!last || last.t !== nowSec) l15.spark = [...l15.spark, { t: nowSec, market: upNow }].filter((p) => p.t >= (l15.win || 0));
    }
    return { model, verdict, age, tau };
  }

  async function refresh15(t: number, which: "now" | "next") {
    try {
      const m = await fetchMarket(t, 900);
      l15.error = null;
      if (which === "now") {
        l15.market = m;
        if (m) {
          l15.phase = l15.phase === "resolving" ? l15.phase : "open";
          const key = `${m.up}:${m.down}`;
          if (key !== l15.tokens) connect15(m);
        } else if (l15.phase !== "resolving") l15.phase = "gap";
      } else l15.next = m;
    } catch {
      l15.error = "Can't reach the 15-minute market.";
      if (which === "now" && !l15.market) l15.phase = "gap";
    }
    emit();
  }

  async function loadOpen15(t: number) {
    if (!t) return;
    const gen = ++l15.openGen;
    const data = await fetchOpen(t, 900);
    if (gen !== l15.openGen || t !== l15.win) return;
    if (data?.openPrice && data.openPrice > 1000) {
      l15.target = data.openPrice;
      l15.targetKind = "polymarket";
      l15.openLocked = data.completed === true || data.incomplete === false;
      return;
    }
    if (gen !== l15.openGen || t !== l15.win || l15.targetKind === "polymarket") return;
    try {
      const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1s&startTime=${t * 1000}&limit=1`);
      if (!res.ok) return;
      const rows = (await res.json()) as unknown[];
      const open = num((rows[0] as unknown[] | undefined)?.[1]);
      if (open && l15.target == null) {
        l15.target = open;
        l15.targetKind = "estimated";
      }
    } catch {
      /* no estimate */
    }
  }

  function apply15(
    asset: string,
    bid: number | null,
    ask: number | null,
    size?: { known: boolean; shares: number | null },
  ) {
    if (!l15.market) return;
    const qBid = bid != null && bid > 0 && bid < 1 ? bid : null;
    const qAsk = ask != null && ask > 0 && ask <= 1 ? ask : null;
    const prev = asset === l15.market.up ? l15.up : asset === l15.market.down ? l15.down : null;
    if (!prev) return;
    const nextBid = qBid ?? prev.bid;
    const nextAsk = qAsk ?? prev.ask;
    if (nextBid != null && nextAsk != null && nextBid > nextAsk) return;
    const askMoved = qAsk != null && prev.ask != null && Math.abs(qAsk - prev.ask) > 1e-6;
    const nextSize = size?.known ? size.shares : askMoved ? null : (prev.askSize ?? null);
    const next = { bid: nextBid, ask: nextAsk, askSize: nextSize };
    if (asset === l15.market.up) l15.up = next;
    else l15.down = next;
    l15.quoteAt = Date.now();
    l15.clobLive = true;
    l15.backoff = 500;
  }

  function on15Message(raw: string) {
    if (raw === "PONG" || raw === "pong") return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const events = Array.isArray(data) ? data : [data];
    for (const ev of events) {
      if (!ev || typeof ev !== "object") continue;
      const e = ev as Record<string, unknown>;
      const type = String(e.event_type ?? "");
      if (type === "book" || (e.bids && e.asks)) {
        const askLv = bestAsk(e.asks as { price: string; size: string }[]);
        apply15(String(e.asset_id ?? ""), bestOf(e.bids as { price: string; size: string }[], "bid"), askLv.price, {
          known: true,
          shares: askLv.size,
        });
      } else if (type === "best_bid_ask") {
        apply15(String(e.asset_id ?? ""), num(e.best_bid), num(e.best_ask));
      } else if (type === "price_change" && Array.isArray(e.price_changes)) {
        for (const ch of e.price_changes as Record<string, unknown>[]) apply15(String(ch.asset_id ?? ""), num(ch.best_bid), num(ch.best_ask));
      }
    }
  }

  function connect15(m: Market) {
    l15.clobGen += 1;
    const my = l15.clobGen;
    l15.tokens = `${m.up}:${m.down}`;
    try {
      l15.clob?.close();
    } catch {
      /* already closed */
    }
    const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");
    l15.clob = ws;
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("PING");
    }, 10_000);
    ws.onopen = () => {
      if (my !== l15.clobGen) return;
      ws.send(JSON.stringify({ assets_ids: [m.up, m.down], type: "market", custom_feature_enabled: true }));
    };
    ws.onmessage = (ev) => {
      if (my !== l15.clobGen) return;
      on15Message(String(ev.data));
    };
    ws.onerror = () => {
      l15.clobLive = false;
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (my !== l15.clobGen) return;
      l15.clobLive = false;
      const wait = l15.backoff;
      l15.backoff = Math.min(10_000, l15.backoff * 2);
      setTimeout(() => {
        if (my === l15.clobGen && l15.market) connect15(l15.market);
      }, wait);
    };
  }

  function beginResolve15(closedWin: number) {
    const K = l15.target;
    const ref = endRef(feedPts, closedWin, 900, price);
    const outcome: Side | null = ref != null && K != null ? (ref >= K ? "up" : "down") : null;
    resolveBook(books.fifteen, 900, closedWin, outcome);
    resolveBook(books.combined, 900, closedWin, outcome);
    save();
    void confirmLater15(closedWin, K);
  }

  async function confirmLater15(closedWin: number, openPx: number | null) {
    let announced: Side | null = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (users <= 0) return;
      const official = await officialSide(closedWin, 900);
      if (official) {
        applyResult(900, closedWin, official, true);
        return;
      }
      if (openPx == null) continue;
      const ref = endRef(feedPts, closedWin, 900, null);
      if (ref == null) continue;
      const side: Side = ref >= openPx ? "up" : "down";
      if (side === announced) continue;
      announced = side;
      applyResult(900, closedWin, side, true);
    }
  }

  function roll15() {
    const now = Date.now();
    const w = windowStart(now, 900);
    if (!l15.win) {
      l15.win = w;
      return;
    }
    if (w !== l15.win && l15.phase !== "resolving") {
      beginResolve15(l15.win);
      l15.phase = "resolving";
      l15.resolvingUntil = now + 1100;
      return;
    }
    if (l15.phase === "resolving" && now >= l15.resolvingUntil) {
      l15.win = w;
      l15.phase = "open";
      l15.up = emptyQuote();
      l15.down = emptyQuote();
      l15.quoteAt = 0;
      l15.spark = [];
      l15.target = null;
      l15.targetKind = null;
      l15.openLocked = false;
      l15.openGen += 1;
      if (l15.next && l15.next.windowStart === w) {
        l15.market = l15.next;
        l15.next = null;
        connect15(l15.market);
      } else {
        l15.market = null;
        void refresh15(w, "now");
      }
      void loadOpen15(w);
    }
  }

  function lane15Snap(now: number): LaneSnap {
    const tau = l15.win ? Math.max(0, ((l15.win + 900) * 1000 - now) / 1000) : 0;
    const left = Math.floor(tau);
    const closed = l15.phase !== "open" || (price != null && l15.target == null);
    const v = l15.verdict;
    let why = v.reason;
    if (l15.phase === "resolving") why = "This 15-minute window just closed.";
    else if (l15.phase === "loading") why = "Waiting for the 15-minute market.";
    else if (l15.phase === "gap") why = l15.error ?? "The next 15-minute window is not open yet.";
    else if (price != null && l15.target == null) why = "Waiting for the 15-minute price to beat.";
    let pill = l15.win ? "" : "Finding the 15-minute window";
    if (l15.phase === "gap") pill = `Next 15-minute window in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    return {
      windowStart: l15.win,
      phase: l15.phase,
      pill,
      polyHref: l15.win ? polyUrl(l15.win, 900) : "https://polymarket.com/event/btc-updown-15m",
      up: { ...l15.up },
      down: { ...l15.down },
      target: l15.target,
      targetKind: l15.targetKind,
      model: l15.model,
      verdict: closed ? "skip" : v.side,
      call: closed ? null : v.call,
      reason: why,
      edge: closed ? null : v.edge,
      tau,
      accepting: l15.market?.accepting ?? false,
      marketError: l15.error,
      bookLive: l15.clobLive,
      gate: closed ? null : v.gate,
    };
  }

  async function pollBooks15() {
    if (!l15.market || l15.clobLive) return;
    try {
      const [a, b] = await Promise.all([book(l15.market.up), book(l15.market.down)]);
      if (a) apply15(l15.market.up, a.bid, a.ask, { known: true, shares: a.askSize ?? null });
      if (b) apply15(l15.market.down, b.bid, b.ask, { known: true, shares: b.askSize ?? null });
      l15.clobLive = false;
    } catch {
      l15.error = "Can't reach the 15-minute book.";
    }
  }

  async function settleStale() {
    const nowSec = Math.floor(Date.now() / 1000);
    const jobs = new Map<string, { span: 300 | 900; win: number }>();
    for (const book of [books.five, books.fifteen, books.combined, books.shadow]) {
      for (const pos of book.positions) {
        if (pos.windowStart + pos.span + 2 < nowSec) jobs.set(`${pos.span}:${pos.windowStart}`, { span: pos.span, win: pos.windowStart });
      }
    }
    let changed = false;
    for (const job of jobs.values()) {
      try {
        const m = await fetchMarket(job.win, job.span);
        const side = m ? settledSide(m) : null;
        if (!side) continue;
        resolveBook(books.five, job.span, job.win, side);
        resolveBook(books.fifteen, job.span, job.win, side);
        resolveBook(books.combined, job.span, job.win, side);
        resolveBook(books.shadow, job.span, job.win, side);
        changed = true;
      } catch {
        /* leave the position until the market reports a result */
      }
    }
    if (changed) {
      save();
      emit();
    }
  }

  function watch(nowMs: number, live: ReturnType<typeof decide> | null, liveModel: ModelOut | null) {
    notices = notices.filter((n) => nowMs - n.id < 14000);
    const say = (text: string, tone: Notice["tone"], sound: boolean) => {
      notices = [...notices, { id: nowMs + noticeSeq++, text, tone }].slice(-4);
      if (sound && settings.sound) blip();
    };
    if (live?.gate?.label === "Disagree" && win && disagree5 !== win) {
      disagree5 = win;
      say("5-minute model and the market disagree by more than 20¢.", "warn", false);
    }
    if (l15.verdict.gate?.label === "Disagree" && l15.win && disagree15 !== l15.win) {
      disagree15 = l15.win;
      say("15-minute model and the market disagree by more than 20¢.", "warn", false);
    }
    const right = l15.verdict.call;
    if (live?.call && right && live.call !== right) {
      const key = `${win}:${l15.win}:${live.call}:${right}`;
      if (key !== opposeKey) {
        opposeKey = key;
        say(`5-minute wants ${live.call}. 15-minute wants ${right}.`, "warn", false);
      }
    }
    const count = books.five.fills.length + books.fifteen.fills.length + books.combined.fills.length + books.shadow.fills.length;
    if (seenFills < 0) seenFills = count;
    else if (count > seenFills) {
      seenFills = count;
      const latest = [books.five, books.fifteen, books.combined, books.shadow]
        .map((book) => ({ book, fill: book.fills[book.fills.length - 1] }))
        .filter((row) => row.fill)
        .sort((a, b) => b.fill.at - a.fill.at)[0];
      if (latest) {
        const verb = latest.fill.action === "buy" ? "bought" : latest.fill.action === "sell" ? "sold" : "settled";
        const name = latest.book.id === "five" ? "5 min" : latest.book.id === "fifteen" ? "15 min" : latest.book.id === "shadow" ? "Shadow" : "Combined";
        say(`${name} ${verb} ${latest.fill.side}.`, latest.fill.side === "up" ? "up" : "down", true);
      }
    }
    wait5 = trackWait(wait5, live?.gate?.label ?? null, win, liveModel);
    wait15 = trackWait(wait15, l15.verdict.gate?.label ?? null, l15.win, l15.model);
  }

  function trackWait(
    prev: { win: number; side: Side; refused: number; holding: boolean } | null,
    gateLabel: string | null,
    windowStart: number,
    model: ModelOut | null,
  ): { win: number; side: Side; refused: number; holding: boolean } | null {
    if (!windowStart) return null;
    if (gateLabel === "Too early") {
      if (prev && prev.win === windowStart) return prev;
      const side: Side = model && model.pUp < 0.5 ? "down" : "up";
      const ask = askOf(model, side);
      if (ask == null) return null;
      return { win: windowStart, side, refused: ask, holding: true };
    }
    if (prev && prev.win === windowStart) return { ...prev, holding: false };
    return null;
  }

  function waitSnap(
    wait: { win: number; side: Side; refused: number; holding: boolean } | null,
    windowStart: number,
    model: ModelOut | null,
  ): WaitSnap | null {
    if (!wait || wait.win !== windowStart) return null;
    return { side: wait.side, refused: wait.refused, now: askOf(model, wait.side), holding: wait.holding };
  }

  function reliabilityBins(): RelBin[] {
    const rows = calib.filter((c) => c.pBlend != null && Number.isFinite(c.pUp));
    if (rows.length < 30) return [];
    const edges = [0, 0.2, 0.4, 0.6, 0.8];
    return edges.map((lo, i) => {
      const hi = i === edges.length - 1 ? 1.001 : edges[i + 1];
      const bin = rows.filter((c) => c.pUp >= lo && c.pUp < hi);
      const ups = bin.filter((c) => c.outcome === "up").length;
      return { lo, n: bin.length, up: bin.length ? ups / bin.length : 0 };
    });
  }

  function booksFresh(): boolean {
    return (["five", "fifteen", "combined", "shadow"] as const).every((id) => {
      const b = books[id];
      return Math.abs(b.cash - SIM_START) < 1e-9 && b.positions.length === 0 && b.trades.length === 0 && b.fills.length === 0;
    });
  }

  function recoverSummary(): RecoverSummary {
    const slice = (id: "five" | "fifteen" | "combined" | "shadow"): BookSlice => ({
      cash: books[id].cash,
      fees: books[id].fees,
      positions: books[id].positions.map((p) => ({
        windowStart: p.windowStart,
        side: p.side,
        shares: p.shares,
        span: p.span,
        entry: p.entry,
      })),
    });
    return { five: slice("five"), fifteen: slice("fifteen"), combined: slice("combined"), shadow: slice("shadow") };
  }

  function drain() {
    const batch = inbox.splice(0, inbox.length);
    for (const cmd of batch) {
      if (cmd.kind === "settings") api.patchSettings(cmd.patch as Partial<Settings>);
      else if (cmd.kind === "target") api.setTarget(cmd.price);
      else if (cmd.kind === "paper") api.paper(cmd.side);
      else if (cmd.kind === "reset") api.resetBook(cmd.book);
      else if (cmd.kind === "import" && booksFresh()) {
        applyPersist(cmd.body as Partial<Persist>);
        save();
        emit();
      } else if (cmd.kind === "poly") {
        poly = { apiKey: cmd.apiKey, secret: cmd.secret, passphrase: cmd.passphrase };
        save();
      } else if (cmd.kind === "poly-clear") {
        poly = null;
        save();
      } else if (cmd.kind === "trade-connect") {
        tradeAddress = cmd.address;
        save();
      } else if (cmd.kind === "trade-pause") {
        tradePaused = cmd.paused;
        save();
      } else if (cmd.kind === "trade-cap") {
        tradeCap = cmd.cap;
        save();
      } else if (cmd.kind === "trade-disconnect") {
        tradeAddress = null;
        tradePaused = true;
        save();
      } else if (cmd.kind === "trade-key") {
        signerKey = cmd.privateKey;
        tradeSig = cmd.signatureType;
        tradeNote = "Key saved. Resume to send 5-minute orders.";
        save();
      } else if (cmd.kind === "trade-key-clear") {
        signerKey = null;
        tradePaused = true;
        tradeNote = "Key removed.";
        save();
      } else if (cmd.kind === "trade-sig") {
        tradeSig = cmd.signatureType;
        save();
      } else if (cmd.kind === "trade-check") {
        wantCheck = true;
        tradeNote = "Checking the API. No order is sent.";
      }
    }
    if (batch.length) emit();
  }

  function tick() {
    drain();
    roll();
    roll15();
    const now = Date.now();
    const tau = win ? (win + 300) * 1000 - now : 99999;
    if (tau < 20_000 && tau > 0 && (!nextMarket || nextMarket.windowStart !== win + 300)) {
      void refreshMarket(win + 300, "next");
    }
    const tau15 = l15.win ? (l15.win + 900) * 1000 - now : 99999;
    if (tau15 < 20_000 && tau15 > 0 && (!l15.next || l15.next.windowStart !== l15.win + 900)) {
      void refresh15(l15.win + 900, "next");
    }
    emit();
  }

  function build(): Snap {
    const now = Date.now();
    const { model, verdict, vol, age } = win ? compute() : { model: null, verdict: decide({ model: null, feedAgeMs: null, historySeconds: 0, minEdge: settings.minEdge, minAsk: settings.minAsk, maxAsk: settings.maxAsk, kelly: settings.kelly, accepting: false }), vol: { sigma: 0, seconds: 0 }, age: null };
    const left = win ? Math.max(0, Math.floor(((win + 300) * 1000 - now) / 1000)) : 0;
    let pill = win ? "" : "Finding the window";
    if (phase === "gap") {
      pill = `Next window opens in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    } else if (phase === "resolving") {
      pill = win ? "" : "Resolving";
    }
    const settled = paper.filter((p) => p.pnl != null);
    const paperPnl = settled.reduce((s, p) => s + (p.pnl ?? 0), 0);
    const paperHits = settled.filter((p) => (p.pnl ?? 0) > 0).length;
    const called = calib.filter((c) => c.verdict !== "skip");
    const hitN = called.length;
    const hitRate = hitN ? called.filter((c) => c.verdict === c.outcome).length / hitN : null;
    const scored = calib.filter((c) => c.pBlend != null && Number.isFinite(c.pBlend));
    const yOf = (outcome: Side) => (outcome === "up" ? 1 : 0);
    const brierModel = brier(scored.map((c) => ({ p: c.pUp, y: yOf(c.outcome) })));
    const brierBlend = brier(scored.map((c) => ({ p: c.pBlend as number, y: yOf(c.outcome) })));
    const brierMarket = brier(scored.map((c) => ({ p: c.market, y: yOf(c.outcome) })));
    const beatsMarket = scored.length >= 30 && brierModel != null && brierMarket != null ? brierModel < brierMarket : null;
    const sigmaNote = feedPts.length >= 60 || !seededFromBinance ? sourceLabel : `${sourceLabel}, binance seed`;
    const forcedSkip = phase === "resolving" || phase === "loading" || phase === "gap" || (price != null && target == null);
    const reason =
      phase === "resolving"
        ? "This window just closed."
        : phase === "loading"
          ? "Waiting for the market to load."
          : phase === "gap"
            ? (marketError ?? "The next window is not open yet.")
            : price != null && target == null
              ? "Waiting for the price to beat."
              : verdict.reason;
    const lanes = tradeBooks(model, forcedSkip ? { ...verdict, side: "skip", reason } : verdict, age, now);
    const fiveMtm = markBook(books.five, [lanes.five, lanes.fifteen]);
    const fifteenMtm = markBook(books.fifteen, [lanes.five, lanes.fifteen]);
    const combinedMtm = markBook(books.combined, [lanes.five, lanes.fifteen]);
    const shadowMtm = markBook(books.shadow, [lanes.five, lanes.fifteen]);
    const fiveView = present(books.five, books.five.cash + fiveMtm);
    const fifteenView = present(books.fifteen, books.fifteen.cash + fifteenMtm);
    const combinedView = present(books.combined, books.combined.cash + combinedMtm);
    const shadowView = present(books.shadow, books.shadow.cash + shadowMtm);
    simCash = books.five.cash;
    simFees = books.five.fees;
    const simEquity = fiveView.equity;
    const held = books.five.positions[0] ?? null;
    simPos = held
      ? {
          windowStart: held.windowStart,
          side: held.side,
          shares: held.shares,
          cost: held.cost,
          entry: held.entry,
          pModel: held.pModel,
          edge: held.edge,
          tau: held.tau,
          targetKind: held.targetKind as Snap["targetKind"],
          priceAgeMs: held.priceAgeMs,
        }
      : null;
    simFills = books.five.fills.map(fillToSim);
    simTrades = books.five.trades.slice();
    simCurve = books.five.curve.slice();
    flushCurve();
    const gate = forcedSkip ? null : verdict.gate;
    const shadowNow = !win || !shadowVerdict ? null : shadowVerdict;
    const shadowLane: CallSnap = {
      verdict: !shadowNow || forcedSkip ? "skip" : shadowNow.side,
      call: !shadowNow || forcedSkip ? null : shadowNow.call,
      reason: !shadowNow ? "Waiting for the 5-minute market." : forcedSkip ? reason : shadowNow.reason,
      edge: !shadowNow || forcedSkip ? null : shadowNow.edge,
      gate: !shadowNow || forcedSkip ? null : shadowNow.gate,
    };
    watch(now, forcedSkip ? null : verdict, model);
    const lane = lane15Snap(now);
    return {
      booted: true,
      now,
      windowStart: win,
      phase,
      pill,
      polyHref: win ? polyUrl(win) : "https://polymarket.com/",
      marketError,
      up,
      down,
      quoteAgeMs: quoteAt ? now - quoteAt : null,
      clobLive,
      price,
      sourceLabel,
      priceAgeMs: age,
      priceLive,
      target,
      targetKind,
      series: seriesNow(),
      sigma: model?.sigma ?? Math.max(vol.sigma, 0) * settings.tail,
      historySeconds: vol.seconds,
      sigmaNote,
      model,
      verdict: forcedSkip ? "skip" : verdict.side,
      call: forcedSkip ? null : verdict.call,
      reason,
      edge: verdict.edge,
      ev: verdict.ev,
      kellyFrac: verdict.kellyFrac,
      kellyCapped: verdict.capped,
      spark: spark.slice(),
      tape: tape.slice(-12),
      paper: paper.slice(),
      paperPnl,
      paperHits,
      paperSettled: settled.length,
      calibN: calib.length,
      hitRate,
      hitN,
      brierModel,
      brierBlend,
      brierMarket,
      scoreN: scored.length,
      beatsMarket,
      reconnects,
      feedNote,
      accepting: market?.accepting ?? false,
      feesOn: (market?.feeRate ?? 0.07) > 0,
      shine,
      wipe,
      chips: chips.slice(),
      note,
      description: market?.description ?? "",
      simCash,
      simEquity,
      simFees,
      simPos: simPos ? { ...simPos } : null,
      simFills: simFills.slice(-40).reverse(),
      simTrades: simTrades.slice(-500),
      simReport: fiveView.report,
      simCurve: simCurve.slice(),
      strategies: { five: fiveView, fifteen: fifteenView, combined: combinedView, shadow: shadowView },
      lane15: lane,
      gate,
      notices: notices.filter((n) => now - n.id < 14000),
      scratches: scratches.slice(-8),
      reliability: reliabilityBins(),
      waiting5: waitSnap(wait5, win, model),
      waiting15: waitSnap(wait15, l15.win, l15.model),
      shadowLane,
      polySaved: poly != null,
      trade: {
        address: tradeAddress,
        paused: tradePaused,
        cap: tradeCap,
        keySaved: signerKey != null,
        signatureType: tradeSig,
        note: tradeNote,
      },
    };
  }

  function boot() {
    load();
    win = windowStart(Date.now());
    l15.win = windowStart(Date.now(), 900);
    drain();
    host.onRecover?.(recoverSummary());
    l15.phase = "loading";
    phase = "loading";
    sourceLabel = settings.feed === "coinbase" ? "coinbase" : settings.feed === "binance" ? "binance" : "chainlink 60s";
    if (host.feeds === false) {
      emit();
      return;
    }
    void seedVol();
    void refreshMarket(win, "now");
    void loadOpen(win);
    void refresh15(l15.win, "now");
    void loadOpen15(l15.win);
    void settleStale();
    void reconcileRecent();
    connectPrice();
    tickTimer = setInterval(tick, 200);
    pollTimer = setInterval(() => {
      if (!market || phase === "gap") void refreshMarket(win || windowStart(Date.now()), "now");
      if (!clobLive) void pollBooks();
      if (targetKind !== "manual" && !openLocked) void loadOpen(win);
      const w15 = l15.win || windowStart(Date.now(), 900);
      if (!l15.market || l15.phase === "gap") void refresh15(w15, "now");
      if (!l15.clobLive) void pollBooks15();
      if (!l15.openLocked) void loadOpen15(l15.win);
    }, 3000);
    emit();
  }

  function shutdown() {
    if (tickTimer) clearInterval(tickTimer);
    if (pollTimer) clearInterval(pollTimer);
    tickTimer = null;
    pollTimer = null;
    clobGen += 1;
    priceGen += 1;
    try {
      clob?.close();
    } catch {
      /* ignore */
    }
    try {
      priceWs?.close();
    } catch {
      /* ignore */
    }
    l15.clobGen += 1;
    try {
      l15.clob?.close();
    } catch {
      /* ignore */
    }
    clob = null;
    priceWs = null;
    l15.clob = null;
    save();
  }

  const api: Engine = {
    start() {
      users += 1;
      if (users === 1) boot();
    },
    stop() {
      users -= 1;
      if (users <= 0) {
        users = 0;
        shutdown();
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot() {
      return snap;
    },
    getServerSnapshot() {
      return serverSnap;
    },
    settings() {
      return settings;
    },
    patchSettings(p) {
      const next = sanitize({ ...settings, ...p });
      const feedChanged = next.feed !== settings.feed;
      settings = next;
      save();
      if (feedChanged && host.feeds !== false) {
        feedNote = null;
        feedPts = [];
        livePts = [];
        price = null;
        connectPrice();
      }
      emit();
    },
    setTarget(n) {
      if (!win) return;
      if (n == null || !Number.isFinite(n) || n < 1000) {
        delete targets[String(win)];
        target = null;
        targetKind = null;
        openLocked = false;
        void loadOpen(win);
      } else {
        targets[String(win)] = n;
        target = n;
        targetKind = "manual";
        openLocked = true;
      }
      save();
      emit();
    },
    paper(side) {
      if (phase !== "open" || !market?.accepting) {
        say(phase === "resolving" ? "This window just closed, so nothing was logged." : "This window is not open, so nothing was logged.");
        emit();
        return;
      }
      const q = side === "up" ? up : down;
      const ask = q.ask;
      if (ask == null || ask <= 0 || ask >= 1) {
        say(side === "up" ? "Up has no price right now, so nothing was logged." : "Down has no price right now, so nothing was logged.");
        emit();
        return;
      }
      if (paper.some((p) => p.windowStart === win && p.side === side && p.pnl == null)) {
        say(side === "up" ? "You already logged Up for this window." : "You already logged Down for this window.");
        emit();
        return;
      }
      const rate = market.feeRate;
      const exp = market.feeExp;
      const feePer = rate * Math.pow(ask * (1 - ask), exp);
      const shares = 1 / ask;
      const fee = feePer * shares;
      paper = [
        ...paper,
        {
          id: `${win}-${side}-${Date.now()}`,
          windowStart: win,
          side,
          ask,
          fee,
          shares,
          cost: 1,
          pnl: null,
          outcome: null,
        },
      ];
      blip();
      say(`Logged ${side === "up" ? "Up" : "Down"} at ${Math.round(ask * 100)}¢.`);
      save();
      emit();
    },
    exportCsv() {
      if (typeof document === "undefined") return;
      const header = "window_start,side,ask,fee,shares,cost,outcome,pnl";
      const lines = paper.map((p) =>
        [p.windowStart, p.side, p.ask, p.fee.toFixed(4), p.shares.toFixed(4), p.cost, p.outcome ?? "", p.pnl == null ? "" : p.pnl.toFixed(4)].join(","),
      );
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wick-paper.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    exportBooks() {
      if (typeof document === "undefined") return;
      const header = "time,book,span,side,ask,fee,shares,cost,pnl,p_model,edge,tau,reason,exit";
      const lines = (["five", "fifteen", "combined", "shadow"] as const).flatMap((id) =>
        books[id].trades.map((t) =>
          [
            t.windowStart,
            id,
            t.span ?? (id === "fifteen" ? 900 : 300),
            t.side,
            t.ask,
            t.fee.toFixed(4),
            t.shares.toFixed(4),
            t.cost.toFixed(4),
            t.pnl.toFixed(4),
            t.pModel ?? "",
            t.edge ?? "",
            t.tau ?? "",
            csvCell(t.reason ?? ""),
            t.exit,
          ].join(","),
        ),
      );
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wick-books.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    resetSim() {
      clearBook(books.five);
      simCash = books.five.cash;
      simFees = 0;
      simPos = null;
      simFills = [];
      simTrades = [];
      simCurve = books.five.curve.slice();
      curveDirty = false;
      simExpire = null;
      simWant = "flat";
      simWantAt = Date.now();
      simTradedWin = 0;
      save();
      emit();
    },
    resetBook(id) {
      clearBook(books[id]);
      save();
      emit();
    },
    push(cmd) {
      inbox.push(cmd);
      drain();
    },
    liveJob() {
      if (tradePaused || !signerKey || !poly || !tradeAddress) return null;
      if (phase !== "open" || !market?.accepting || !win) return null;
      if (liveFilledWin === win) return null;
      if (liveLockWin === win && Date.now() - liveTriedAt < 20_000) return null;
      const left = (win + 300) * 1000 - Date.now();
      if (left < 15_000) return null;
      const side = verdictSnap?.side;
      if (side !== "up" && side !== "down") return null;
      const ask = side === "up" ? up.ask : down.ask;
      if (ask == null || ask <= 0.01 || ask >= 0.99) return null;
      if (quoteAt && Date.now() - quoteAt > 8_000) return null;
      const tokenId = side === "up" ? market.up : market.down;
      if (!tokenId) return null;
      liveLockWin = win;
      liveTriedAt = Date.now();
      return {
        windowStart: win,
        tokenId,
        ask,
        dollars: tradeCap,
        privateKey: signerKey,
        apiKey: poly.apiKey,
        secret: poly.secret,
        passphrase: poly.passphrase,
        funder: tradeAddress,
        signatureType: tradeSig,
      };
    },
    markLive(windowStart, note, filled) {
      tradeNote = note.replace(/0x[a-fA-F0-9]{64}/g, "0x…").slice(0, 180);
      if (filled) liveFilledWin = windowStart;
      else if (liveLockWin === windowStart) liveLockWin = 0;
      save();
      emit();
    },
    takeCheck() {
      if (!wantCheck) return null;
      wantCheck = false;
      if (!poly) {
        tradeNote = "API key is not saved. Open Settings and save it first.";
        emit();
        return null;
      }
      if (!signerKey && !tradeAddress) {
        tradeNote = "Paste the wallet address, or save the private key, then test again.";
        emit();
        return null;
      }
      return {
        windowStart: 0,
        tokenId: "",
        ask: 0,
        dollars: 0,
        privateKey: signerKey ?? "",
        apiKey: poly.apiKey,
        secret: poly.secret,
        passphrase: poly.passphrase,
        funder: tradeAddress ?? "",
        signatureType: tradeSig,
      };
    },
  };
  return api;
}

function epochSec(t: number): number {
  return t > 1e11 ? t / 1000 : t;
}

function askOf(model: ModelOut | null, side: Side): number | null {
  if (!model) return null;
  const ask = side === "up" ? model.askUp : model.askDown;
  return ask != null && Number.isFinite(ask) && ask > 0 && ask < 1 ? ask : null;
}

function thinSeries(pts: SecondPrice[]): SecondPrice[] {
  if (pts.length <= 90) return pts.slice();
  const step = Math.ceil(pts.length / 90);
  const out: SecondPrice[] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1]?.t !== last.t) out.push(last);
  return out;
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function readCurve(raw: unknown): SimPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: SimPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const t = (row as SimPoint).t;
    const pnl = (row as SimPoint).pnl;
    if (typeof t === "number" && typeof pnl === "number" && Number.isFinite(t) && Number.isFinite(pnl)) out.push({ t, pnl });
  }
  out.sort((a, b) => a.t - b.t);
  return compactCurve(out, 1100);
}

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

function fillToSim(f: Fill): SimFill {
  const kind = f.targetKind === "polymarket" || f.targetKind === "estimated" || f.targetKind === "manual" ? f.targetKind : null;
  return {
    id: f.id,
    at: f.at,
    windowStart: f.windowStart,
    action: f.action,
    side: f.side,
    price: f.price,
    shares: f.shares,
    fee: f.fee,
    pnl: f.pnl,
    cash: f.cash,
    pModel: f.pModel,
    edge: f.edge,
    tau: f.tau,
    targetKind: kind,
    priceAgeMs: f.priceAgeMs,
    reason: f.reason,
    span: f.span,
  };
}

function readPositions(raw: unknown): Pos[] {
  if (!Array.isArray(raw)) return [];
  const out: Pos[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const p = row as Pos;
    if ((p.side !== "up" && p.side !== "down") || (p.span !== 300 && p.span !== 900)) continue;
    if (!Number.isFinite(p.shares) || !Number.isFinite(p.cost) || !Number.isFinite(p.entry) || !Number.isFinite(p.windowStart)) continue;
    out.push({
      span: p.span,
      windowStart: Number(p.windowStart),
      side: p.side,
      shares: p.shares,
      cost: p.cost,
      entry: p.entry,
      pModel: finiteOrNull(p.pModel),
      edge: finiteOrNull(p.edge),
      tau: finiteOrNull(p.tau),
      targetKind: typeof p.targetKind === "string" ? p.targetKind : null,
      priceAgeMs: finiteOrNull(p.priceAgeMs),
      openReason: typeof p.openReason === "string" ? p.openReason : null,
    });
  }
  return out.slice(-4);
}

function readFills(raw: unknown): Fill[] {
  if (!Array.isArray(raw)) return [];
  const out: Fill[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const f = row as Fill;
    if ((f.side !== "up" && f.side !== "down") || (f.action !== "buy" && f.action !== "sell" && f.action !== "settle")) continue;
    if (!Number.isFinite(f.price) || !Number.isFinite(f.shares) || !Number.isFinite(f.windowStart)) continue;
    out.push({
      id: typeof f.id === "string" ? f.id : `fill-${out.length}`,
      at: Number.isFinite(f.at) ? f.at : 0,
      windowStart: Number(f.windowStart),
      span: f.span === 900 ? 900 : 300,
      action: f.action,
      side: f.side,
      price: f.price,
      shares: f.shares,
      fee: Number.isFinite(f.fee) ? f.fee : 0,
      pnl: f.pnl != null && Number.isFinite(f.pnl) ? f.pnl : null,
      cash: Number.isFinite(f.cash) ? f.cash : 0,
      pModel: finiteOrNull(f.pModel),
      edge: finiteOrNull(f.edge),
      tau: finiteOrNull(f.tau),
      targetKind: typeof f.targetKind === "string" ? f.targetKind : null,
      priceAgeMs: finiteOrNull(f.priceAgeMs),
      reason: typeof f.reason === "string" ? f.reason : null,
    });
  }
  return out.slice(-80);
}

function mergeBook(id: "five" | "fifteen" | "combined" | "shadow", raw: unknown): Book {
  const base = freshBook(id);
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Partial<Book>;
  if (typeof row.cash === "number" && Number.isFinite(row.cash) && row.cash >= 0 && row.cash < 1_000_000) base.cash = row.cash;
  if (typeof row.fees === "number" && Number.isFinite(row.fees) && row.fees >= 0) base.fees = row.fees;
  base.note = typeof row.note === "string" ? row.note : null;
  base.positions = readPositions(row.positions);
  base.fills = readFills(row.fills);
  base.trades = Array.isArray(row.trades) ? readTrades(row.trades) : pairFills(base.fills);
  base.curve = readCurve(row.curve);
  base.traded = Array.isArray(row.traded) ? row.traded.filter((s): s is string => typeof s === "string").slice(-40) : [];
  return base;
}

function cleanMax(n: number | null | undefined): number | null {
  if (n == null) return null;
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0 || x >= 1) return null;
  return Math.min(0.99, Math.max(0.01, x));
}

function readTrades(raw: unknown): SimTrade[] {
  if (!Array.isArray(raw)) return [];
  const out: SimTrade[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const t = row as SimTrade;
    if ((t.side !== "up" && t.side !== "down") || (t.exit !== "sell" && t.exit !== "settle")) continue;
    if (!Number.isFinite(t.ask) || !Number.isFinite(t.shares) || !Number.isFinite(t.pnl) || !Number.isFinite(t.cost)) continue;
    out.push({
      windowStart: Number(t.windowStart),
      side: t.side,
      ask: t.ask,
      shares: t.shares,
      cost: t.cost,
      fee: Number.isFinite(t.fee) ? t.fee : 0,
      pnl: t.pnl,
      pModel: finiteOrNull(t.pModel),
      edge: finiteOrNull(t.edge),
      tau: finiteOrNull(t.tau),
      targetKind: typeof t.targetKind === "string" ? t.targetKind : null,
      priceAgeMs: finiteOrNull(t.priceAgeMs),
      exit: t.exit,
      span: t.span === 900 ? 900 : 300,
      reason: typeof t.reason === "string" ? t.reason : null,
    });
  }
  return out.slice(-500);
}

function readPoly(raw: unknown): { apiKey: string; secret: string; passphrase: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const apiKey = typeof row.apiKey === "string" ? row.apiKey.trim() : "";
  const secret = typeof row.secret === "string" ? row.secret.trim() : "";
  const passphrase = typeof row.passphrase === "string" ? row.passphrase.trim() : "";
  if (apiKey.length < 8 || secret.length < 8 || passphrase.length < 8) return null;
  if (apiKey.length > 256 || secret.length > 256 || passphrase.length > 256) return null;
  return { apiKey, secret, passphrase };
}

function clipTradeAddress(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s) ? s : null;
}

function sanitize(s: Settings): Settings {
  const feed: FeedChoice = s.feed === "coinbase" || s.feed === "binance" ? s.feed : "chainlink";
  return {
    lookbackSec: clamp(s.lookbackSec, 60, 1800),
    tail: clamp(s.tail, 1, 3),
    basis: clamp(s.basis, 0, 100),
    minEdge: clamp(s.minEdge, 0, 0.25),
    minAsk: clamp(Number.isFinite(s.minAsk) ? s.minAsk : 0.65, 0, 0.99),
    maxAsk: cleanMax(s.maxAsk),
    bankroll: clamp(s.bankroll, 1, 1_000_000),
    kelly: clamp(s.kelly, 0, 1),
    feed,
    sound: Boolean(s.sound),
  };
}

function clamp(n: number, a: number, b: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.min(b, Math.max(a, x));
}
