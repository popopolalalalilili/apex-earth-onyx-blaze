/** Messages between the website and the paper worker. No orders live here. */

export type BookName = "five" | "fifteen" | "combined" | "shadow";

export type WickCommand =
  | { kind: "settings"; patch: Record<string, unknown> }
  | { kind: "target"; price: number | null }
  | { kind: "paper"; side: "up" | "down" }
  | { kind: "reset"; book: BookName }
  | { kind: "import"; body: Record<string, unknown> };

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
  return null;
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
