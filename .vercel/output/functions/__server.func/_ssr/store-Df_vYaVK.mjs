import { i as parseCommand, r as freshen } from "./router-C-ZeY3JB.mjs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
//#region node_modules/.nitro/vite/services/ssr/assets/store-Df_vYaVK.js
/**
* Shared paper state.
* Postgres when DATABASE_URL is set (Railway worker and the Vercel site).
* A directory of JSON files otherwise, so the preview worker and the site
* share one durable store without a database URL. Only the lease holder writes
* balances, so a second process cannot trade the same window.
*/
var LEASE_MS_DEFAULT = 2e4;
function createStore(opts) {
	const url = opts && "databaseUrl" in opts ? opts.databaseUrl : process.env.DATABASE_URL;
	if (url && url.trim()) return createPgStore(url.trim());
	return createFileStore(opts?.dir ?? process.env.WICK_DATA_DIR ?? join(process.cwd(), "data", "wick"));
}
var singleton = null;
function getStore() {
	singleton ??= createStore();
	return singleton;
}
function createFileStore(dir) {
	const statePath = join(dir, "state.json");
	const snapPath = join(dir, "snapshot.json");
	const leaderPath = join(dir, "leader.json");
	const cmdDir = join(dir, "commands");
	let chain = Promise.resolve();
	let pending = null;
	let writing = false;
	async function ensure() {
		await mkdir(cmdDir, { recursive: true });
	}
	async function withLock(fn) {
		const lock = join(dir, "lock");
		await ensure();
		for (let i = 0; i < 80; i++) try {
			await mkdir(lock);
			try {
				return await fn();
			} finally {
				await rm(lock, {
					recursive: true,
					force: true
				});
			}
		} catch (err) {
			if (err.code !== "EEXIST") throw err;
			await sleep(25);
		}
		throw new Error("Wick could not lock its store.");
	}
	async function readJson(path) {
		try {
			const text = await readFile(path, "utf8");
			return JSON.parse(text);
		} catch {
			return null;
		}
	}
	async function writeJson(path, value) {
		await mkdir(dirname(path), { recursive: true });
		const tmp = `${path}.${process.pid}.tmp`;
		await writeFile(tmp, JSON.stringify(value));
		await rename(tmp, path);
	}
	async function leaderStill(holder, now = Date.now()) {
		const row = await readJson(leaderPath);
		return Boolean(row && row.holder === holder && row.expiresAt > now);
	}
	async function drain() {
		if (writing) return;
		writing = true;
		try {
			while (pending) {
				const job = pending;
				pending = null;
				await withLock(async () => {
					if (!await leaderStill(job.holder)) return;
					await writeJson(statePath, job.data);
				});
			}
		} finally {
			writing = false;
			if (pending) chain = drain();
		}
	}
	return {
		async migrate() {
			await ensure();
		},
		async load() {
			return readJson(statePath);
		},
		save(holder, data) {
			pending = {
				holder,
				data
			};
			chain = drain().catch((err) => {
				console.error("[wick] save failed", err);
			});
		},
		async flush() {
			await chain;
			if (pending || writing) await drain();
			await chain;
		},
		async publish(holder, payload) {
			await withLock(async () => {
				if (!await leaderStill(holder)) return;
				await writeJson(snapPath, payload);
			});
		},
		async readLive(now) {
			const file = await readJson(snapPath);
			return freshen(file, now);
		},
		async enqueue(cmd) {
			await ensure();
			const name = `${Date.now()}-${randomBytes(4).toString("hex")}.json`;
			await writeJson(join(cmdDir, name), cmd);
		},
		async takeCommands() {
			return withLock(async () => {
				let names = [];
				try {
					names = (await readdir(cmdDir)).filter((n) => n.endsWith(".json")).sort();
				} catch {
					return [];
				}
				const out = [];
				for (const name of names) {
					const path = join(cmdDir, name);
					const raw = await readJson(path);
					await rm(path, { force: true });
					const cmd = parseCommand(raw);
					if (cmd) out.push(cmd);
				}
				return out;
			});
		},
		async acquire(holder, leaseSec = LEASE_MS_DEFAULT / 1e3) {
			return withLock(async () => {
				const now = Date.now();
				const row = await readJson(leaderPath);
				if (row && row.holder !== holder && row.expiresAt > now) return {
					mine: false,
					startedAt: row.startedAt
				};
				const startedAt = row && row.holder === holder ? row.startedAt : now;
				const next = {
					holder,
					startedAt,
					beatAt: now,
					expiresAt: now + leaseSec * 1e3,
					lastSuccessAt: row?.lastSuccessAt ?? null,
					status: "leading",
					error: null,
					feedAgeMs: row?.feedAgeMs ?? null,
					priceLive: row?.priceLive ?? false,
					clobLive: row?.clobLive ?? false,
					reconnects: row?.reconnects ?? 0
				};
				await writeJson(leaderPath, next);
				return {
					mine: true,
					startedAt
				};
			});
		},
		async beat(holder, health, leaseSec = LEASE_MS_DEFAULT / 1e3) {
			return withLock(async () => {
				const now = Date.now();
				const row = await readJson(leaderPath);
				if (!row || row.holder !== holder || row.expiresAt <= now) return false;
				const next = {
					...row,
					beatAt: now,
					expiresAt: now + leaseSec * 1e3,
					lastSuccessAt: health.lastSuccessAt ?? row.lastSuccessAt,
					status: "leading",
					error: health.error,
					feedAgeMs: health.feedAgeMs,
					priceLive: health.priceLive,
					clobLive: health.clobLive,
					reconnects: health.reconnects
				};
				await writeJson(leaderPath, next);
				return true;
			});
		},
		async release(holder) {
			await withLock(async () => {
				const row = await readJson(leaderPath);
				if (!row || row.holder !== holder) return;
				await writeJson(leaderPath, {
					...row,
					expiresAt: Date.now(),
					status: "stopped"
				});
			});
		},
		async close() {
			await chain;
		}
	};
}
function createPgStore(databaseUrl) {
	let poolPromise = null;
	let pending = null;
	let writing = false;
	let chain = Promise.resolve();
	async function pool() {
		poolPromise ??= (async () => {
			const { Pool } = await import("../_libs/pg.mjs").then((n) => n.t);
			return new Pool({
				connectionString: databaseUrl,
				max: 3
			});
		})();
		return poolPromise;
	}
	async function query(text, params = []) {
		return (await (await pool()).query(text, params)).rows;
	}
	async function drain() {
		if (writing) return;
		writing = true;
		try {
			while (pending) {
				const job = pending;
				pending = null;
				await query(`with ok as (
             select 1 from wick_leader where id = 1 and holder = $1 and expires_at > now()
           )
           insert into wick_state (id, body, updated_at)
           select 1, $2::jsonb, now() from ok
           on conflict (id) do update set body = excluded.body, updated_at = now()
           where exists (select 1 from ok)`, [job.holder, JSON.stringify(job.data)]);
			}
		} finally {
			writing = false;
			if (pending) chain = drain();
		}
	}
	return {
		async migrate() {
			const { readdir, readFile } = await import("node:fs/promises");
			const { fileURLToPath } = await import("node:url");
			const { dirname, join } = await import("node:path");
			const { pendingMigrations } = await import("./migration-plan-DQmqfyIg.mjs");
			const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "migrations");
			let entries = [];
			try {
				entries = await readdir(dir);
			} catch {
				return;
			}
			await query("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
			const applied = (await query("select name from _migrations")).map((r) => r.name);
			const client = await (await pool()).connect();
			try {
				for (const { name, path } of pendingMigrations(entries, applied)) {
					const text = await readFile(join(dir, path.split("/").pop() ?? name), "utf8");
					try {
						await client.query("begin");
						await client.query(text);
						await client.query("insert into _migrations (name) values ($1)", [name]);
						await client.query("commit");
					} catch (err) {
						try {
							await client.query("rollback");
						} catch {}
						throw err;
					}
				}
			} finally {
				client.release();
			}
		},
		async load() {
			return (await query("select body from wick_state where id = 1"))[0]?.body ?? null;
		},
		save(holder, data) {
			pending = {
				holder,
				data
			};
			chain = drain().catch((err) => {
				console.error("[wick] save failed", err);
			});
		},
		async flush() {
			await chain;
			if (pending || writing) await drain();
		},
		async publish(holder, payload) {
			await query(`with ok as (
           select 1 from wick_leader where id = 1 and holder = $1 and expires_at > now()
         )
         insert into wick_snapshot (id, body, updated_at)
         select 1, $2::jsonb, now() from ok
         on conflict (id) do update set body = excluded.body, updated_at = now()
         where exists (select 1 from ok)`, [holder, JSON.stringify(payload)]);
		},
		async readLive(now) {
			const rows = await query("select body from wick_snapshot where id = 1");
			return freshen(rows[0]?.body ?? null, now);
		},
		async enqueue(cmd) {
			await query("insert into wick_commands (kind, payload) values ($1, $2::jsonb)", [cmd.kind, JSON.stringify(cmd)]);
		},
		async takeCommands() {
			const rows = await query(`with grabbed as (
           select id from wick_commands order by id for update skip locked limit 40
         )
         delete from wick_commands c using grabbed g where c.id = g.id returning c.payload`);
			if (rows.length) return rows.map((r) => parseCommand(r.payload)).filter((c) => c != null);
			const client = await (await pool()).connect();
			try {
				await client.query("begin");
				const res = await client.query(`with grabbed as (
             select id from wick_commands order by id for update skip locked limit 40
           )
           delete from wick_commands c using grabbed g where c.id = g.id returning c.payload`);
				await client.query("commit");
				return res.rows.map((r) => parseCommand(r.payload)).filter((c) => c != null);
			} catch (err) {
				try {
					await client.query("rollback");
				} catch {}
				throw err;
			} finally {
				client.release();
			}
		},
		async acquire(holder, leaseSec = 20) {
			const row = (await query(`insert into wick_leader (id, holder, started_at, beat_at, expires_at, status, price_live, clob_live, reconnects)
         values (1, $1, now(), now(), now() + make_interval(secs => $2), 'leading', false, false, 0)
         on conflict (id) do update set
           holder = case when wick_leader.holder = excluded.holder or wick_leader.expires_at < now() then excluded.holder else wick_leader.holder end,
           started_at = case
             when wick_leader.holder = excluded.holder then wick_leader.started_at
             when wick_leader.expires_at < now() then now()
             else wick_leader.started_at end,
           beat_at = case when wick_leader.holder = excluded.holder or wick_leader.expires_at < now() then now() else wick_leader.beat_at end,
           expires_at = case when wick_leader.holder = excluded.holder or wick_leader.expires_at < now() then now() + make_interval(secs => $2) else wick_leader.expires_at end,
           status = case when wick_leader.holder = excluded.holder or wick_leader.expires_at < now() then 'leading' else wick_leader.status end
         returning holder, started_at`, [holder, leaseSec]))[0];
			const started = row?.started_at instanceof Date ? row.started_at.getTime() : Date.now();
			return {
				mine: row?.holder === holder,
				startedAt: started
			};
		},
		async beat(holder, health, leaseSec = 20) {
			return (await query(`update wick_leader set
           beat_at = now(),
           expires_at = now() + make_interval(secs => $2),
           last_success_at = coalesce($3::timestamptz, last_success_at),
           status = 'leading',
           error = $4,
           feed_age_ms = $5,
           price_live = $6,
           clob_live = $7,
           reconnects = $8
         where id = 1 and holder = $1 and expires_at > now()
         returning holder`, [
				holder,
				leaseSec,
				health.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : null,
				health.error,
				health.feedAgeMs,
				health.priceLive,
				health.clobLive,
				health.reconnects
			])).length > 0;
		},
		async release(holder) {
			await query("update wick_leader set expires_at = now(), status = 'stopped' where id = 1 and holder = $1", [holder]);
		},
		async close() {
			await chain;
			if (poolPromise) {
				await (await poolPromise).end();
				poolPromise = null;
			}
		}
	};
}
function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
//#endregion
export { getStore };
