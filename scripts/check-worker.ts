/**
 * Starts the paper worker with no browser, checks the price feed, restarts it,
 * and checks that the three books and their open positions come back.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshBook, type Pos } from "../src/lib/wick/desk.ts";
import type { Persist, Settings } from "../src/lib/wick/engine.ts";
import { createStore } from "../src/lib/wick/store.ts";

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
    shares: span === 900 ? 2.5 : 4,
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
  five.positions = [pos(300, 1_700_000_000, "up")];
  five.traded = ["300:1700000000"];
  const fifteen = freshBook("fifteen");
  fifteen.cash = 82.25;
  fifteen.positions = [pos(900, 1_700_000_100, "down")];
  fifteen.traded = ["900:1700000100"];
  const combined = freshBook("combined");
  combined.cash = 73.5;
  combined.positions = [pos(300, 1_700_000_000, "up"), pos(900, 1_700_000_100, "down")];
  combined.traded = ["300:1700000000", "900:1700000100"];
  const shadow = freshBook("shadow");
  shadow.cash = 64;
  shadow.positions = [pos(300, 1_700_000_000, "down")];
  return { settings, tape: [], paper: [], calib: [], targets: {}, books: { five, fifteen, combined, shadow }, scratches: [] };
}

function start(dir: string, port: number): ChildProcess {
  const env = { ...process.env, WICK_DATA_DIR: dir, WICK_HEALTH_PORT: String(port) };
  delete env.DATABASE_URL;
  return spawn("node", ["--import", "tsx", "src/worker/main.ts"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stop(child: ChildProcess) {
  if (child.exitCode != null || child.signalCode != null) return;
  child.kill("SIGTERM");
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  const killer = setTimeout(() => child.kill("SIGKILL"), 8000);
  await exited;
  clearTimeout(killer);
}

async function waitFor(path: string, ms: number) {
  const startAt = Date.now();
  while (Date.now() - startAt < ms) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`timed out waiting for ${path}`);
}

async function waitHealth(port: number, ms: number) {
  const startAt = Date.now();
  let last = "";
  while (Date.now() - startAt < ms) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      last = await res.text();
      const body = JSON.parse(last) as { status?: string; priceLive?: boolean; paper?: boolean };
      if (body.paper === true && body.status === "leading" && body.priceLive) return body;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`worker did not go live: ${last}`);
}

type Summary = {
  five: { cash: number; positions: { windowStart: number; side: string; shares: number }[] };
  fifteen: { cash: number; positions: { windowStart: number; side: string; shares: number }[] };
  combined: { cash: number; positions: { windowStart: number; side: string; shares: number }[] };
};

function expectBooks(got: Summary, label: string) {
  const want = {
    five: { cash: 91.5, n: 1, side: "up" },
    fifteen: { cash: 82.25, n: 1, side: "down" },
    combined: { cash: 73.5, n: 2, side: "up" },
  };
  for (const id of ["five", "fifteen", "combined"] as const) {
    if (got[id].cash !== want[id].cash) throw new Error(`${label} ${id} cash ${got[id].cash}`);
    if (got[id].positions.length !== want[id].n) throw new Error(`${label} ${id} positions ${got[id].positions.length}`);
    if (got[id].positions[0].side !== want[id].side) throw new Error(`${label} ${id} side ${got[id].positions[0].side}`);
  }
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "wick-worker-"));
  const port = 23000 + Math.floor(Math.random() * 1000);
  const store = createStore({ dir, databaseUrl: null });
  await store.migrate();
  await store.acquire("seed", 1);
  store.save("seed", seed());
  await store.flush();
  await store.release("seed");
  await store.close();

  const first = start(dir, port);
  let log = "";
  first.stdout?.on("data", (b) => {
    log += String(b);
  });
  first.stderr?.on("data", (b) => {
    log += String(b);
  });
  try {
    const loaded = (await waitFor(join(dir, "recovered.json"), 15000)) as Summary;
    expectBooks(loaded, "first boot");
    const health = await waitHealth(port, 30000);
    if (!health.priceLive) throw new Error("price feed did not go live without a browser");
    await stop(first);
    await unlink(join(dir, "recovered.json"));

    const saved = JSON.parse(await readFile(join(dir, "state.json"), "utf8")) as Persist;
    for (const id of ["five", "fifteen", "combined"] as const) {
      const book = saved.books?.[id];
      if (!book || typeof book.cash !== "number") throw new Error(`state missing ${id} after shutdown`);
    }

    const second = start(dir, port);
    second.stdout?.on("data", (b) => {
      log += String(b);
    });
    second.stderr?.on("data", (b) => {
      log += String(b);
    });
    try {
      const again = (await waitFor(join(dir, "recovered.json"), 15000)) as Summary;
      for (const id of ["five", "fifteen", "combined"] as const) {
        const book = saved.books?.[id];
        if (!book) throw new Error(`missing ${id}`);
        if (Math.abs((book.cash ?? 0) - again[id].cash) > 1e-6) {
          throw new Error(`restart ${id} cash ${again[id].cash} != saved ${book.cash}`);
        }
        const positions = book.positions ?? [];
        if (positions.length !== again[id].positions.length) {
          throw new Error(`restart ${id} positions ${again[id].positions.length} != saved ${positions.length}`);
        }
        for (let i = 0; i < positions.length; i++) {
          if (positions[i].windowStart !== again[id].positions[i].windowStart) throw new Error(`restart ${id} window`);
          if (positions[i].side !== again[id].positions[i].side) throw new Error(`restart ${id} side`);
          if (positions[i].shares !== again[id].positions[i].shares) throw new Error(`restart ${id} shares`);
        }
      }
      if (!again.five.positions.some((p) => p.windowStart === 1_700_000_000 && p.side === "up")) {
        throw new Error("5-minute open position was not recovered");
      }
      if (!again.fifteen.positions.some((p) => p.windowStart === 1_700_000_100 && p.side === "down")) {
        throw new Error("15-minute open position was not recovered");
      }
      if (again.combined.positions.length < 2) throw new Error("combined open positions were not recovered");
      console.log("worker restart ok", JSON.stringify({
        five: again.five.cash,
        fifteen: again.fifteen.cash,
        combined: again.combined.cash,
        positions: [again.five.positions.length, again.fifteen.positions.length, again.combined.positions.length],
      }));
    } finally {
      await stop(second);
    }
  } catch (err) {
    console.error(log.slice(-4000));
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
