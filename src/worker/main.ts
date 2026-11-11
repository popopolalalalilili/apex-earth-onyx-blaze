/**
 * Wick worker. Paper books always run here.
 * A real 5-minute order is sent only when Trade is resumed and a key is saved.
 * Balances live in Postgres when DATABASE_URL is set, otherwise in WICK_DATA_DIR.
 * A second copy waits on the lease.
 *
 * Railway: set DATABASE_URL. The health check is GET /health on PORT.
 * Optional: WICK_HEALTH_PORT overrides PORT. WICK_DATA_DIR overrides the file store.
 */
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createEngine, type Engine, type Persist } from "../lib/wick/engine.ts";
import { checkAccount, deriveCreds, postFiveBuy, readCash } from "../lib/wick/live-order.ts";
import { blankWorker, type LiveFile, type WorkerHealth } from "../lib/wick/protocol.ts";
import { createStore, type Store } from "../lib/wick/store.ts";

const holder = `wick-${process.pid}-${Date.now().toString(36)}`;
const LEASE_SEC = 20;
const port = Number(process.env.WICK_HEALTH_PORT || process.env.PORT || 8091);

let stopped = false;
let engine: Engine | null = null;
let store: Store | null = null;
let startedAt = 0;
let lastSuccessAt: number | null = null;
let lastError: string | null = null;
let status: WorkerHealth["status"] = "starting";
let liveBusy = false;
let cashAt = 0;

function healthBody() {
  const now = Date.now();
  return {
    ok: true,
    paper: true,
    status,
    holder,
    uptimeSec: startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0,
    lastSuccessAt,
    beatAt: status === "leading" ? now : null,
    error: lastError,
    priceLive: engine?.getSnapshot().priceLive ?? false,
    clobLive: engine?.getSnapshot().clobLive ?? false,
  };
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/health")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(healthBody()));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Wick worker. Paper only.");
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isFresh(data: Persist | null): boolean {
  if (!data?.books) return true;
  return (["five", "fifteen", "combined", "shadow"] as const).every((id) => {
    const b = data.books?.[id];
    if (!b) return true;
    const cash = typeof b.cash === "number" ? b.cash : 100;
    const positions = Array.isArray(b.positions) ? b.positions.length : 0;
    const trades = Array.isArray(b.trades) ? b.trades.length : 0;
    const fills = Array.isArray(b.fills) ? b.fills.length : 0;
    return Math.abs(cash - 100) < 1e-9 && positions === 0 && trades === 0 && fills === 0;
  });
}

async function shutdown(code = 0) {
  if (stopped) return;
  stopped = true;
  status = "stopped";
  try {
    engine?.stop();
  } catch (err) {
    console.error("[wick] stop failed", err);
  }
  try {
    await store?.flush();
    await store?.release(holder);
    await store?.close();
  } catch (err) {
    console.error("[wick] flush failed", err);
  }
  server.close();
  process.exit(code);
}

process.on("SIGTERM", () => {
  void shutdown(0);
});
process.on("SIGINT", () => {
  void shutdown(0);
});
process.on("unhandledRejection", (err) => {
  lastError = err instanceof Error ? err.message : String(err);
  console.error("[wick] unhandled", err);
});

async function lead(store: Store) {
  let cache = (await store.load()) as Persist | null;
  const fresh = isFresh(cache);
  engine = createEngine({
    read: () => cache,
    write: (data) => {
      cache = data;
      store.save(holder, data);
    },
    directOpen: true,
    feeds: true,
    onRecover: (summary) => {
      const line = `wick recovered ${JSON.stringify(summary)}`;
      console.log(line);
      const dir = process.env.WICK_DATA_DIR || join(process.cwd(), "data", "wick");
      try {
        writeFileSync(join(dir, "recovered.json"), JSON.stringify(summary));
      } catch (err) {
        console.error("[wick] could not write recovered.json", err);
      }
    },
  });
  if (fresh) {
    const until = Date.now() + 12_000;
    while (!stopped && Date.now() < until) {
      await store.beat(holder, {
        lastSuccessAt,
        error: lastError,
        feedAgeMs: null,
        priceLive: false,
        clobLive: false,
        reconnects: 0,
      }, LEASE_SEC);
      await store.publish(holder, {
        at: Date.now(),
        settings: null,
        snap: null,
        worker: {
          ...blankWorker(),
          status: "leading",
          holder,
          startedAt,
          beatAt: Date.now(),
          lastSuccessAt,
          error: lastError,
        },
      });
      const cmds = await store.takeCommands();
      for (const cmd of cmds) engine.push(cmd);
      if (cmds.some((cmd) => cmd.kind === "import")) break;
      await sleep(400);
    }
  }
  if (stopped) return;
  engine.start();
  console.log("[wick] leading. Paper books keep running. Live orders follow Combined: 15-minute first, then 5-minute, half size when both want the same side.");
  while (!stopped) {
    try {
      const cmds = await store.takeCommands();
      for (const cmd of cmds) engine.push(cmd);
      const pending = engine.takeDerive();
      if (pending) {
        try {
          const creds = await deriveCreds(pending);
          engine.push({ kind: "poly", apiKey: creds.apiKey, secret: creds.secret, passphrase: creds.passphrase });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not derive the trading key";
          engine.dropCheck();
          engine.markLive(0, msg.slice(0, 180), false);
        }
      }
      const check = engine.takeCheck();
      if (check) {
        try {
          const line = await checkAccount(check);
          engine.markLive(0, line, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "API check failed";
          engine.markLive(0, msg.slice(0, 180), false);
        }
      }
      if (Date.now() - cashAt > 20_000) {
        const account = engine.account();
        if (account) {
          cashAt = Date.now();
          try {
            const cash = await readCash(account);
            if (cash != null) engine.setCash(cash);
          } catch {
            /* keep the last balance */
          }
        }
      }
      if (!liveBusy) {
        const job = engine.liveJob();
        if (job) {
          liveBusy = true;
          try {
            const line = await postFiveBuy(job);
            engine.markLive(job.windowStart, `Order ${line}`, true, job.span);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "order failed";
            engine.markLive(job.windowStart, msg.slice(0, 180), false, job.span);
          } finally {
            liveBusy = false;
          }
        }
      }
      const snap = engine.getSnapshot();
      const healthy = snap.priceLive || snap.clobLive;
      if (healthy) lastSuccessAt = Date.now();
      const beatOk = await store.beat(holder, {
        lastSuccessAt,
        error: lastError,
        feedAgeMs: snap.priceAgeMs,
        priceLive: snap.priceLive,
        clobLive: snap.clobLive,
        reconnects: snap.reconnects,
      }, LEASE_SEC);
      if (!beatOk) {
        console.error("[wick] lost the lease, stopping trades");
        break;
      }
      const worker: WorkerHealth = {
        ...blankWorker(),
        status: "leading",
        holder,
        startedAt,
        beatAt: Date.now(),
        lastSuccessAt,
        feedAgeMs: snap.priceAgeMs,
        priceLive: snap.priceLive,
        clobLive: snap.clobLive,
        book15Live: snap.lane15.bookLive,
        reconnects: snap.reconnects,
        error: lastError,
      };
      const payload: LiveFile = {
        at: Date.now(),
        settings: { ...engine.settings() },
        worker,
        snap,
      };
      await store.publish(holder, payload);
      lastError = null;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error("[wick] loop", err);
    }
    await sleep(400);
  }
  try {
    engine.stop();
  } catch {
    /* already stopped */
  }
  engine = null;
  await store.flush();
}

async function main() {
  store = createStore();
  await store.migrate();
  server.listen(port, "0.0.0.0", () => {
    console.log(`[wick] health on ${port}`);
  });
  while (!stopped) {
    const got = await store.acquire(holder, LEASE_SEC);
    if (!got.mine) {
      status = "standby";
      console.log("[wick] another worker holds the lease");
      await sleep(2000);
      continue;
    }
    startedAt = got.startedAt;
    status = "leading";
    lastError = null;
    try {
      await lead(store);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error("[wick] lead failed", err);
      try {
        engine?.stop();
      } catch {
        /* ignore */
      }
      engine = null;
    }
    if (stopped) break;
    status = "standby";
    await sleep(1500);
  }
}

void main().catch((err) => {
  console.error("[wick] fatal", err);
  process.exit(1);
});
