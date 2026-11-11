/** Messages between the website and the paper worker. No orders live here. */

export type BookName = "five" | "fifteen" | "combined" | "shadow";

export type WickCommand =
  | { kind: "settings"; patch: Record<string, unknown> }
  | { kind: "target"; price: number | null }
  | { kind: "paper"; side: "up" | "down" }
  | { kind: "reset"; book: BookName }
  | { kind: "import"; body: Record<string, unknown> }
  | { kind: "poly"; apiKey: string; secret: string; passphrase: string }
  | { kind: "poly-clear" }
  | { kind: "trade-connect"; address: string }
  | { kind: "trade-pause"; paused: boolean }
  | { kind: "trade-cap"; cap: number }
  | { kind: "trade-disconnect" }
  | { kind: "trade-key"; privateKey: string; signatureType: 0 | 1 | 2 }
  | { kind: "trade-key-clear" }
  | { kind: "trade-sig"; signatureType: 0 | 1 | 2 }
  | { kind: "trade-check" };

export type WorkerHealth = {
  status: "starting" | "leading" | "standby" | "offline" | "stopped";
  holder: string | null;
  startedAt: number | null;
  beatAt: number | null;
  lastSuccessAt: number | null;
  feedAgeMs: number | null;
  priceLive: boolean;
  clobLive: boolean;
  book15Live: boolean;
  reconnects: number;
  error: string | null;
  paper: true;
};

export type LiveFile = {
  at: number;
  settings: Record<string, unknown> | null;
  worker: WorkerHealth;
  snap: unknown;
};

const SETTING_KEYS = [
  "lookbackSec",
  "tail",
  "basis",
  "minEdge",
  "minAsk",
  "maxAsk",
  "bankroll",
  "kelly",
  "feed",
  "sound",
] as const;

export function blankWorker(): WorkerHealth {
  return {
    status: "offline",
    holder: null,
    startedAt: null,
    beatAt: null,
    lastSuccessAt: null,
    feedAgeMs: null,
    priceLive: false,
    clobLive: false,
    book15Live: false,
    reconnects: 0,
    error: null,
    paper: true,
  };
}

export function parseCommand(raw: unknown): WickCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.kind === "settings" && row.patch && typeof row.patch === "object") {
    const src = row.patch as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const key of SETTING_KEYS) {
      if (key in src) patch[key] = src[key];
    }
    return { kind: "settings", patch };
  }
  if (row.kind === "target") {
    if (row.price == null) return { kind: "target", price: null };
    const price = Number(row.price);
    if (!Number.isFinite(price)) return null;
    return { kind: "target", price };
  }
  if (row.kind === "paper" && (row.side === "up" || row.side === "down")) {
    return { kind: "paper", side: row.side };
  }
  if (row.kind === "reset" && (row.book === "five" || row.book === "fifteen" || row.book === "combined" || row.book === "shadow")) {
    return { kind: "reset", book: row.book };
  }
  if (row.kind === "import" && row.body && typeof row.body === "object" && !Array.isArray(row.body)) {
    const body = row.body as Record<string, unknown>;
    if (JSON.stringify(body).length > 1_500_000) return null;
    return { kind: "import", body };
  }
  if (row.kind === "poly") {
    const apiKey = clipSecret(row.apiKey);
    const secret = clipSecret(row.secret);
    const passphrase = clipSecret(row.passphrase);
    if (!apiKey || !secret || !passphrase) return null;
    return { kind: "poly", apiKey, secret, passphrase };
  }
  if (row.kind === "poly-clear") return { kind: "poly-clear" };
  if (row.kind === "trade-connect") {
    const address = clipAddress(row.address);
    if (!address) return null;
    return { kind: "trade-connect", address };
  }
  if (row.kind === "trade-pause") return { kind: "trade-pause", paused: row.paused === true };
  if (row.kind === "trade-cap") {
    const cap = Number(row.cap);
    if (!Number.isFinite(cap) || cap < 1 || cap > 100000) return null;
    return { kind: "trade-cap", cap: Math.round(cap * 100) / 100 };
  }
  if (row.kind === "trade-disconnect") return { kind: "trade-disconnect" };
  if (row.kind === "trade-key") {
    const privateKey = clipKey(row.privateKey);
    const signatureType = row.signatureType === 0 || row.signatureType === 2 ? row.signatureType : row.signatureType === 1 ? 1 : null;
    if (!privateKey || signatureType == null) return null;
    return { kind: "trade-key", privateKey, signatureType };
  }
  if (row.kind === "trade-key-clear") return { kind: "trade-key-clear" };
  if (row.kind === "trade-sig") {
    const signatureType = row.signatureType === 0 || row.signatureType === 1 || row.signatureType === 2 ? row.signatureType : null;
    if (signatureType == null) return null;
    return { kind: "trade-sig", signatureType };
  }
  if (row.kind === "trade-check") return { kind: "trade-check" };
  return null;
}

function clipSecret(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < 8 || s.length > 256) return null;
  if (/[\u0000-\u001f]/.test(s)) return null;
  return s;
}

function clipAddress(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s) ? s : null;
}

function clipKey(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  const hex = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  return `0x${hex}`;
}

/** A dead process must not look like it is still leading. */
export function freshen(file: LiveFile | null, now = Date.now()): LiveFile {
  if (!file) {
    return { at: 0, settings: null, worker: blankWorker(), snap: null };
  }
  const beat = file.worker?.beatAt ?? 0;
  const stale = !beat || now - beat > 25_000;
  if (stale && file.worker.status !== "offline") {
    return { ...file, worker: { ...file.worker, status: "offline", paper: true } };
  }
  return file;
}
