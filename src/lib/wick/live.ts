import { blankSnap, type Settings, type Side, type Snap } from "./engine";
import { apiPath } from "./format";
import { blankWorker, type WickCommand, type WorkerHealth } from "./protocol";

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

const serverSnap = blankSnap();
const serverWorker = blankWorker();
let snap: Snap = serverSnap;
let settings: Settings = { ...DEFAULTS };
let worker: WorkerHealth = serverWorker;
const listeners = new Set<() => void>();
let users = 0;
let timer = 0;
let polling = false;

function emit() {
  listeners.forEach((fn) => fn());
}

async function pull() {
  if (polling) return;
  polling = true;
  try {
    const res = await fetch(apiPath("/api/wick"), { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as {
      snap?: Snap | null;
      settings?: Partial<Settings> | null;
      worker?: WorkerHealth;
    };
    if (body.snap && typeof body.snap === "object") snap = body.snap;
    if (body.settings && typeof body.settings === "object") settings = { ...DEFAULTS, ...body.settings };
    if (body.worker) worker = { ...blankWorker(), ...body.worker, paper: true };
    emit();
  } catch {
    /* worker or site store is briefly down */
  } finally {
    polling = false;
  }
}

async function send(cmd: WickCommand) {
  try {
    await fetch(apiPath("/api/wick"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cmd),
    });
  } catch {
    /* the worker applies it when the store is back */
  }
}

function sendImport() {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem("wick.v1.sent")) return;
  const raw = localStorage.getItem("wick.v1");
  if (!raw) return;
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    void send({ kind: "import", body }).then(() => {
      localStorage.setItem("wick.v1.sent", "1");
    });
  } catch {
    localStorage.setItem("wick.v1.sent", "1");
  }
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export const live = {
  start() {
    users += 1;
    if (users !== 1) return;
    void pull();
    sendImport();
    timer = window.setInterval(() => void pull(), 1000);
  },
  stop() {
    users -= 1;
    if (users > 0) return;
    users = 0;
    window.clearInterval(timer);
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot() {
    return snap;
  },
  getServerSnapshot() {
    return serverSnap;
  },
  getWorker() {
    return worker;
  },
  getServerWorker() {
    return serverWorker;
  },
  settings() {
    return settings;
  },
  patchSettings(patch: Partial<Settings>) {
    settings = { ...settings, ...patch };
    emit();
    void send({ kind: "settings", patch });
  },
  savePoly(apiKey: string, secret: string, passphrase: string) {
    void send({ kind: "poly", apiKey, secret, passphrase });
  },
  clearPoly() {
    void send({ kind: "poly-clear" });
  },
  connectTrade(address: string) {
    void send({ kind: "trade-connect", address });
  },
  disconnectTrade() {
    void send({ kind: "trade-disconnect" });
  },
  pauseTrade(paused: boolean) {
    void send({ kind: "trade-pause", paused });
  },
  setTradeCap(cap: number) {
    void send({ kind: "trade-cap", cap });
  },
  saveTradeKey(privateKey: string, signatureType: 0 | 1 | 2) {
    void send({ kind: "trade-key", privateKey, signatureType });
  },
  clearTradeKey() {
    void send({ kind: "trade-key-clear" });
  },
  setTarget(price: number | null) {
    void send({ kind: "target", price });
  },
  paper(side: Side) {
    void send({ kind: "paper", side });
  },
  resetBook(book: "five" | "fifteen" | "combined" | "shadow") {
    void send({ kind: "reset", book });
  },
  exportCsv() {
    const header = "window_start,side,ask,fee,shares,cost,outcome,pnl";
    const lines = snap.paper.map((p) =>
      [p.windowStart, p.side, p.ask, p.fee.toFixed(4), p.shares.toFixed(4), p.cost, p.outcome ?? "", p.pnl == null ? "" : p.pnl.toFixed(4)].join(","),
    );
    download("wick-paper.csv", [header, ...lines].join("\n"));
  },
  exportBooks() {
    const header = "time,book,span,side,ask,fee,shares,cost,pnl,p_model,edge,tau,reason,exit";
    const lines = (["five", "fifteen", "combined", "shadow"] as const).flatMap((id) =>
      snap.strategies[id].trades.map((t) =>
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
    download("wick-books.csv", [header, ...lines].join("\n"));
  },
};
