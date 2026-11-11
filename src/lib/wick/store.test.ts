import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createStore } from "./store.ts";

async function dir() {
  return mkdtemp(join(tmpdir(), "wick-store-"));
}

test("balances survive a new store, and a second holder cannot overwrite them", async () => {
  const root = await dir();
  try {
    const a = createStore({ dir: root, databaseUrl: null });
    const b = createStore({ dir: root, databaseUrl: null });
    await a.migrate();
    const got = await a.acquire("a", 30);
    assert.equal(got.mine, true);
    const blocked = await b.acquire("b", 30);
    assert.equal(blocked.mine, false);
    a.save("a", { books: { five: { cash: 91.5 }, fifteen: { cash: 82.25 }, combined: { cash: 73.5 } } });
    await a.flush();
    b.save("b", { books: { five: { cash: 1 } } });
    await b.flush();
    const loaded = (await b.load()) as { books: { five: { cash: number }; fifteen: { cash: number }; combined: { cash: number } } };
    assert.equal(loaded.books.five.cash, 91.5);
    assert.equal(loaded.books.fifteen.cash, 82.25);
    assert.equal(loaded.books.combined.cash, 73.5);
    await a.release("a");
    const next = await b.acquire("b", 30);
    assert.equal(next.mine, true);
    await b.close();
    await a.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("commands are taken once", async () => {
  const root = await dir();
  try {
    const store = createStore({ dir: root, databaseUrl: null });
    await store.migrate();
    await store.enqueue({ kind: "paper", side: "down" });
    await store.enqueue({ kind: "reset", book: "fifteen" });
    const first = await store.takeCommands();
    assert.equal(first.length, 2);
    assert.equal(first[0].kind, "paper");
    assert.equal(first[1].kind, "reset");
    const second = await store.takeCommands();
    assert.equal(second.length, 0);
    await store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an expired lease can be taken over", async () => {
  const root = await dir();
  try {
    const a = createStore({ dir: root, databaseUrl: null });
    await a.migrate();
    assert.equal((await a.acquire("a", 1)).mine, true);
    await new Promise((r) => setTimeout(r, 1100));
    const b = createStore({ dir: root, databaseUrl: null });
    assert.equal((await b.acquire("b", 30)).mine, true);
    assert.equal(await a.beat("a", { lastSuccessAt: null, error: null, feedAgeMs: null, priceLive: false, clobLive: false, reconnects: 0 }, 30), false);
    assert.equal(await b.beat("b", { lastSuccessAt: Date.now(), error: null, feedAgeMs: 10, priceLive: true, clobLive: true, reconnects: 1 }, 30), true);
    await a.close();
    await b.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
