import { o as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as blankWorker } from "./router-C-ZeY3JB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dwfi3ZaA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TZ = "America/New_York";
function formatWindow(startSec, span = 300) {
	const step = span === 900 ? 900 : 300;
	const a = parts(startSec);
	const b = parts(startSec + step);
	if (a.ap === b.ap) return `Window ${a.hm} to ${b.hm} ${a.ap} ET`;
	return `Window ${a.hm} ${a.ap} to ${b.hm} ${b.ap} ET`;
}
function parts(sec) {
	const s = new Intl.DateTimeFormat("en-US", {
		timeZone: TZ,
		hour: "numeric",
		minute: "2-digit",
		hour12: true
	}).format(/* @__PURE__ */ new Date(sec * 1e3));
	const m = s.match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
	if (!m) return {
		hm: s,
		ap: ""
	};
	return {
		hm: m[1],
		ap: m[2].toUpperCase()
	};
}
function remainParts(nowMs, startSec, span = 300) {
	const left = Math.max(0, Math.floor(((startSec + (span === 900 ? 900 : 300)) * 1e3 - nowMs) / 1e3));
	return {
		m: Math.floor(left / 60),
		s: left % 60,
		total: left
	};
}
function clock(total) {
	const m = Math.floor(Math.max(0, total) / 60);
	const s = Math.max(0, total) % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}
function dollars(n, digits = 2) {
	return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function signedDollars(n, digits = 0) {
	const v = digits === 0 ? Math.round(n) : n;
	const body = dollars(Math.abs(v), digits);
	if (v > 0) return `+$${body}`;
	if (v < 0) return `-$${body}`;
	return `$${body}`;
}
function centsLabel(p) {
	if (p == null || !Number.isFinite(p)) return "--";
	return `${Math.round(p * 100)}¢`;
}
/** 0.995 is the cap, not a sure thing. Do not print it as 100%. */
function chanceLabel(p) {
	if (p == null || !Number.isFinite(p)) return "--";
	if (p >= .995) return ">99%";
	if (p <= .005) return "<1%";
	return `${Math.round(p * 100)}%`;
}
function signedCents(edge) {
	const c = edge * 100;
	const body = Math.abs(c).toFixed(1);
	if (c > 0) return `+${body}¢`;
	if (c < 0) return `-${body}¢`;
	return "0.0¢";
}
function apiPath(path) {
	if (typeof window === "undefined") return path;
	const host = window.location.hostname.toLowerCase();
	if (!(host === "preview.grok.genai.mil" || host === "preview.grok.mil" || host === "preview.grokgsac.com")) return path;
	const m = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+/i.exec(window.location.pathname);
	return m ? `${m[0]}${path}` : path;
}
function brier(rows) {
	if (!rows.length) return null;
	let s = 0;
	for (const r of rows) s += (r.p - r.y) ** 2;
	return s / rows.length;
}
function summarizeTrades(trades) {
	const buckets = [
		{
			label: "Under 30¢",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "30¢ to 65¢",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "65¢ and up",
			n: 0,
			wins: 0,
			pnl: 0
		}
	];
	const timeBuckets = [
		{
			label: "Under 1 min left",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "1 to 3 min left",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "3 to 5 min left",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "Over 5 min left",
			n: 0,
			wins: 0,
			pnl: 0
		},
		{
			label: "Time not saved",
			n: 0,
			wins: 0,
			pnl: 0
		}
	];
	let wins = 0;
	let losses = 0;
	let scratches = 0;
	let feeSum = 0;
	let realized = 0;
	let pred = 0;
	let predReal = 0;
	let predN = 0;
	let edgeSum = 0;
	let winSum = 0;
	let lossSum = 0;
	let shareSum = 0;
	const brierRows = [];
	for (const t of trades) {
		const b = t.ask < .3 ? 0 : t.ask < .65 ? 1 : 2;
		buckets[b].n += 1;
		buckets[b].pnl += t.pnl;
		const tb = t.tau == null ? 4 : t.tau < 60 ? 0 : t.tau < 180 ? 1 : t.tau < 300 ? 2 : 3;
		timeBuckets[tb].n += 1;
		timeBuckets[tb].pnl += t.pnl;
		if (t.pnl > 0) {
			wins += 1;
			winSum += t.pnl;
			buckets[b].wins += 1;
			timeBuckets[tb].wins += 1;
		} else if (t.pnl < 0) {
			losses += 1;
			lossSum += t.pnl;
		} else scratches += 1;
		feeSum += Number.isFinite(t.fee) ? t.fee : 0;
		realized += t.pnl;
		shareSum += Number.isFinite(t.shares) ? t.shares : 0;
		if (t.edge != null && Number.isFinite(t.shares)) {
			pred += t.edge * t.shares;
			predReal += t.pnl;
			predN += 1;
			edgeSum += t.edge;
		}
		if (t.exit === "settle" && t.pModel != null && t.shares > 0) {
			const sideWon = t.pnl + t.cost > t.shares * .5;
			const p = t.side === "up" ? t.pModel : 1 - t.pModel;
			brierRows.push({
				p,
				y: sideWon ? 1 : 0
			});
		}
	}
	const n = trades.length;
	return {
		n,
		wins,
		losses,
		scratches,
		avgFee: n ? feeSum / n : null,
		avgWin: wins ? winSum / wins : null,
		avgLoss: losses ? lossSum / losses : null,
		predicted: predN ? pred : null,
		predictedRealized: predN ? predReal : null,
		predictedN: predN,
		realized,
		avgEdge: predN ? edgeSum / predN : null,
		realizedEdge: shareSum > 0 ? realized / shareSum : null,
		brier: brier(brierRows),
		note: reportNote(n, realized),
		buckets,
		timeBuckets
	};
}
function maxDrawdown(points) {
	if (!points.length) return null;
	let peak = 0;
	let worst = 0;
	for (const p of points) {
		if (p.pnl > peak) peak = p.pnl;
		const dd = peak - p.pnl;
		if (dd > worst) worst = dd;
	}
	return worst;
}
function reportNote(n, realized) {
	if (n === 0) return "No finished trades yet.";
	if (n < 100) return `${n} finished ${n === 1 ? "trade" : "trades"}. Too few to say this is an edge.`;
	if (realized <= 0) return `After ${n} finished trades, fees included, this sample has no edge.`;
	return `After ${n} finished trades, fees included, the account is ahead. That is not proof of an edge.`;
}
var START = 100;
function freshBook(id) {
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
		note: null
	};
}
var NAMES = {
	five: "5 min",
	fifteen: "15 min",
	combined: "Combined",
	shadow: "Shadow"
};
function present(book, equity) {
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
		note: book.note
	};
}
var SIM_START = 100;
function emptyQuote() {
	return {
		bid: null,
		ask: null
	};
}
function blankSnap() {
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
			shadow: present(freshBook("shadow"), SIM_START)
		},
		lane15: emptyLane(),
		gate: null,
		notices: [],
		scratches: [],
		reliability: [],
		waiting5: null,
		waiting15: null,
		shadowLane: {
			verdict: "skip",
			call: null,
			reason: null,
			edge: null,
			gate: null
		}
	};
}
function emptyLane() {
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
		gate: null
	};
}
var DEFAULTS = {
	lookbackSec: 600,
	tail: 1.25,
	basis: 6,
	minEdge: .03,
	minAsk: .65,
	maxAsk: null,
	bankroll: 100,
	kelly: .25,
	feed: "chainlink",
	sound: false
};
var serverSnap = blankSnap();
var serverWorker = blankWorker();
var snap = serverSnap;
var settings = { ...DEFAULTS };
var worker = serverWorker;
var listeners = /* @__PURE__ */ new Set();
var users = 0;
var timer = 0;
var polling = false;
function emit() {
	listeners.forEach((fn) => fn());
}
async function pull() {
	if (polling) return;
	polling = true;
	try {
		const res = await fetch(apiPath("/api/wick"), { cache: "no-store" });
		if (!res.ok) return;
		const body = await res.json();
		if (body.snap && typeof body.snap === "object") snap = body.snap;
		if (body.settings && typeof body.settings === "object") settings = {
			...DEFAULTS,
			...body.settings
		};
		if (body.worker) worker = {
			...blankWorker(),
			...body.worker,
			paper: true
		};
		emit();
	} catch {} finally {
		polling = false;
	}
}
async function send(cmd) {
	try {
		await fetch(apiPath("/api/wick"), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(cmd)
		});
	} catch {}
}
function sendImport() {
	if (typeof localStorage === "undefined") return;
	if (localStorage.getItem("wick.v1.sent")) return;
	const raw = localStorage.getItem("wick.v1");
	if (!raw) return;
	try {
		send({
			kind: "import",
			body: JSON.parse(raw)
		}).then(() => {
			localStorage.setItem("wick.v1.sent", "1");
		});
	} catch {
		localStorage.setItem("wick.v1.sent", "1");
	}
}
function download(name, text) {
	const blob = new Blob([text], { type: "text/csv" });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	a.click();
	URL.revokeObjectURL(a.href);
}
function csvCell(v) {
	if (/[",\n]/.test(v)) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
var live = {
	start() {
		users += 1;
		if (users !== 1) return;
		pull();
		sendImport();
		timer = window.setInterval(() => void pull(), 1e3);
	},
	stop() {
		users -= 1;
		if (users > 0) return;
		users = 0;
		window.clearInterval(timer);
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
	getWorker() {
		return worker;
	},
	getServerWorker() {
		return serverWorker;
	},
	settings() {
		return settings;
	},
	patchSettings(patch) {
		settings = {
			...settings,
			...patch
		};
		emit();
		send({
			kind: "settings",
			patch
		});
	},
	setTarget(price) {
		send({
			kind: "target",
			price
		});
	},
	paper(side) {
		send({
			kind: "paper",
			side
		});
	},
	resetBook(book) {
		send({
			kind: "reset",
			book
		});
	},
	exportCsv() {
		download("wick-paper.csv", ["window_start,side,ask,fee,shares,cost,outcome,pnl", ...snap.paper.map((p) => [
			p.windowStart,
			p.side,
			p.ask,
			p.fee.toFixed(4),
			p.shares.toFixed(4),
			p.cost,
			p.outcome ?? "",
			p.pnl == null ? "" : p.pnl.toFixed(4)
		].join(","))].join("\n"));
	},
	exportBooks() {
		download("wick-books.csv", ["time,book,span,side,ask,fee,shares,cost,pnl,p_model,edge,tau,reason,exit", ...[
			"five",
			"fifteen",
			"combined",
			"shadow"
		].flatMap((id) => snap.strategies[id].trades.map((t) => [
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
			t.exit
		].join(",")))].join("\n"));
	}
};
function useReducedMotion() {
	const [reduced, setReduced] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduced(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);
	return reduced;
}
function useTickDir(n) {
	const prev = (0, import_react.useRef)(n);
	const [dir, setDir] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const before = prev.current;
		prev.current = n;
		if (n == null || before == null || n === before) return;
		setDir(n > before ? 1 : -1);
		const id = window.setTimeout(() => setDir(0), 900);
		return () => window.clearTimeout(id);
	}, [n]);
	return dir;
}
function RollingNumber({ text, dir }) {
	const chars = [...text];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "roll",
		children: chars.map((ch, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollChar, {
			ch,
			dir
		}, chars.length - 1 - i))
	});
}
function RollChar({ ch, dir }) {
	const reduced = useReducedMotion();
	const [view, setView] = (0, import_react.useState)({
		ch,
		from: null,
		dir: 0,
		n: 0
	});
	if (ch !== view.ch) setView({
		ch,
		from: reduced || !/\d/.test(ch) ? null : view.ch,
		dir,
		n: view.n + 1
	});
	(0, import_react.useEffect)(() => {
		if (view.from == null) return;
		const id = window.setTimeout(() => setView((v) => ({
			...v,
			from: null
		})), 700);
		return () => window.clearTimeout(id);
	}, [view.n, view.from]);
	if (!/\d/.test(ch)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "dcol static",
		children: ch
	});
	const way = view.dir >= 0 ? "up" : "down";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "dcol",
		children: [view.from != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `dout ${way}`,
			children: view.from
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: view.from != null ? `din ${way}` : void 0,
			children: ch
		})]
	});
}
function ChartCard({ snap, reduced }) {
	const plotRef = (0, import_react.useRef)(null);
	const wrapRef = (0, import_react.useRef)(null);
	const sparkRef = (0, import_react.useRef)(null);
	const sparkWrapRef = (0, import_react.useRef)(null);
	const viewRef = (0, import_react.useRef)({
		min: null,
		max: null,
		win: 0,
		price: null,
		sigma: null
	});
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const dir = useTickDir(snap.price == null ? null : Math.round(snap.price * 100));
	const left = snap.windowStart ? remainParts(snap.now, snap.windowStart) : {
		m: 0,
		s: 0,
		total: 0
	};
	const minKey = snap.phase === "resolving" ? null : left.m;
	const secKey = snap.phase === "resolving" ? null : left.total;
	const minDir = useTickDir(minKey);
	const secDir = useTickDir(secKey);
	const gap = snap.price != null && snap.target != null ? snap.price - snap.target : null;
	const snapRef = (0, import_react.useRef)(snap);
	snapRef.current = snap;
	(0, import_react.useEffect)(() => {
		const canvas = plotRef.current;
		const wrap = wrapRef.current;
		const spark = sparkRef.current;
		const sparkWrap = sparkWrapRef.current;
		if (!canvas || !wrap) return;
		const ctx = canvas.getContext("2d");
		const sctx = spark?.getContext("2d") ?? null;
		if (!ctx) return;
		let frame = 0;
		let live = true;
		const paint = () => {
			if (!live) return;
			const current = snapRef.current;
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = wrap.clientWidth;
			const h = wrap.clientHeight;
			if (w > 8 && h > 8) {
				const pw = Math.floor(w * dpr);
				const ph = Math.floor(h * dpr);
				if (canvas.width !== pw || canvas.height !== ph) {
					canvas.width = pw;
					canvas.height = ph;
				}
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.clearRect(0, 0, w, h);
				drawPlot(ctx, w, h, current, reduced, viewRef.current);
			}
			if (sctx && spark && sparkWrap) {
				const sw = sparkWrap.clientWidth;
				const sh = sparkWrap.clientHeight;
				if (sw > 8 && sh > 8) {
					const pw = Math.floor(sw * dpr);
					const ph = Math.floor(sh * dpr);
					if (spark.width !== pw || spark.height !== ph) {
						spark.width = pw;
						spark.height = ph;
					}
					sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
					sctx.clearRect(0, 0, sw, sh);
					drawSpark(sctx, sw, sh, current);
				}
			}
			if (!reduced) frame = requestAnimationFrame(paint);
		};
		paint();
		return () => {
			live = false;
			cancelAnimationFrame(frame);
		};
	}, [reduced]);
	const targetLabel = snap.targetKind === "polymarket" || snap.targetKind == null ? "Price to beat" : "Estimated open";
	const distance = readLine(snap);
	function commit(raw) {
		const n = Number(raw.replace(/,/g, ""));
		if (Number.isFinite(n) && n > 1e3) live.setTarget(n);
		setEditing(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card chart",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "hd",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "k",
							children: targetLabel
						}), editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "target-input quote",
							autoFocus: true,
							inputMode: "decimal",
							"aria-label": "Price to beat",
							value: draft,
							onChange: (e) => setDraft(e.target.value),
							onBlur: () => commit(draft),
							onKeyDown: (e) => {
								if (e.key === "Enter") commit(draft);
								if (e.key === "Escape") setEditing(false);
							}
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "target-btn quote",
							onClick: () => {
								setDraft(snap.target != null ? String(Math.round(snap.target * 100) / 100) : "");
								setEditing(true);
							},
							children: snap.target == null ? "--" : `$${dollars(snap.target, 2)}`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "vdiv",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "k orange k-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current price" }), gap != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `gap ${gap >= 0 ? "pos" : "neg"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Caret, { up: gap >= 0 }), `$${Math.abs(Math.round(gap)).toLocaleString("en-US")}`]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `quote live ${dir > 0 ? "flash-up" : dir < 0 ? "flash-down" : ""}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollingNumber, {
								text: snap.price == null ? "--" : `$${dollars(snap.price, 2)}`,
								dir
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `count ${snap.phase === "open" && left.total > 0 && left.total <= 180 ? "hot" : "quiet"}`,
						"aria-label": `${left.m} minutes ${left.s} seconds left`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollingNumber, {
							text: String(left.m).padStart(2, "0"),
							dir: minDir
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "mins" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollingNumber, {
							text: String(left.s).padStart(2, "0"),
							dir: secDir
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "secs" })] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "distance",
				children: distance
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "plot",
				ref: wrapRef,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: plotRef }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
					chips: snap.chips,
					now: snap.now
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "range-note",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "sw hot" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "sw pale" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "The brighter band is the tighter range. It narrows as time runs out and widens when Bitcoin moves faster. The paler band is the wider range." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "spark-key",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "m",
					children: "Our chance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "kkt",
					children: "Market"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sparkline",
				ref: sparkWrapRef,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: sparkRef })
			})
		]
	});
}
function Chips({ chips, now }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "chips",
		"aria-hidden": "true",
		children: chips.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: c.delta >= 0 ? "chip pos" : "chip neg",
			style: { opacity: Math.max(0, 1 - (now - c.at) / 4200) },
			children: signedDollars(c.delta, 0)
		}, c.id))
	});
}
function Caret({ up }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		className: "caret",
		viewBox: "0 0 10 10",
		"aria-hidden": "true",
		children: up ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M5 1.5 L9 8 H1 Z",
			fill: "currentColor"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M1 2 H9 L5 8.5 Z",
			fill: "currentColor"
		})
	});
}
function drawPlot(ctx, w, h, snap, reduced, view) {
	const padL = 64;
	const padR = 16;
	const padT = 16;
	const padB = 28;
	const plotW = Math.max(10, w - padL - padR);
	const plotH = Math.max(10, h - padT - padB);
	const start = snap.windowStart;
	const end = start + 300;
	const pts = snap.series;
	const S = snap.price;
	const K = snap.target;
	const basis = live.settings().basis;
	const nowSec = start ? Math.min(end, Math.max(start, Date.now() / 1e3)) : 0;
	const tau = start ? Math.max(0, end - nowSec) : 0;
	let min = Infinity;
	let max = -Infinity;
	for (const p of pts) {
		min = Math.min(min, p.p);
		max = Math.max(max, p.p);
	}
	if (S != null) {
		min = Math.min(min, S);
		max = Math.max(max, S);
	}
	if (K != null) {
		min = Math.min(min, K);
		max = Math.max(max, K);
	}
	if (!Number.isFinite(min) || min === max) {
		const mid = S ?? K ?? 0;
		min = mid - 45;
		max = mid + 45;
	}
	const span = Math.max(max - min, 140);
	const midP = (max + min) / 2;
	min = midP - span / 2 - 6;
	max = midP + span / 2 + 6;
	const windowChanged = view.win !== start;
	if (windowChanged || view.min == null || view.max == null) {
		view.win = start;
		view.min = min;
		view.max = max;
		view.price = S;
		view.sigma = null;
	} else if (reduced) {
		view.min = min;
		view.max = max;
		view.price = S;
	} else {
		view.min += (min - view.min) * .12;
		view.max += (max - view.max) * .12;
		if (S != null) {
			if (view.price == null) view.price = S;
			else view.price += (S - view.price) * .1;
		}
	}
	const yMin = view.min ?? min;
	const yMax = Math.max(view.max ?? max, yMin + 1);
	const shown = view.price ?? S;
	const xOf = (t) => padL + (t - start) / 300 * plotW;
	const yOf = (p) => padT + (yMax - p) / (yMax - yMin) * plotH;
	const xNow = start ? xOf(nowSec) : padL;
	const rawSigma = shown == null ? 2 : Math.min(Math.max((snap.model?.sigma ?? snap.sigma) * shown, .45), 5);
	if (view.sigma == null || windowChanged) view.sigma = rawSigma;
	else view.sigma += (rawSigma - view.sigma) * (reduced ? 1 : .06);
	const priceSigma = view.sigma ?? rawSigma;
	ctx.strokeStyle = "#242728";
	ctx.lineWidth = 1;
	ctx.fillStyle = "#8d9398";
	ctx.font = "11px 'Geist Mono Variable', ui-monospace, monospace";
	ctx.textAlign = "right";
	const yTarget = K == null ? null : yOf(K);
	for (let i = 0; i <= 3; i++) {
		const p = yMin + (yMax - yMin) * i / 3;
		const y = yOf(p);
		ctx.beginPath();
		ctx.moveTo(padL, y);
		ctx.lineTo(padL + plotW, y);
		ctx.stroke();
		if (yTarget != null && Math.abs(y - yTarget) < 14) continue;
		ctx.fillText(Math.round(p).toLocaleString("en-US"), 56, y + 3);
	}
	if (start) {
		ctx.textAlign = "center";
		ctx.fillStyle = "#8d9398";
		for (let s = 0; s <= 300; s += 60) {
			const remain = 300 - s;
			const label = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
			ctx.fillText(label, xOf(start + s), h - 8);
		}
		ctx.strokeStyle = "rgba(244,244,246,0.28)";
		ctx.beginPath();
		ctx.moveTo(xNow, padT);
		ctx.lineTo(xNow, padT + plotH);
		ctx.stroke();
	}
	if (shown != null && priceSigma > 0 && start && tau > 0) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(padL, 14, plotW, plotH + 4);
		ctx.clip();
		const fan = (mult, alpha) => {
			const steps = 28;
			ctx.beginPath();
			for (let i = 0; i <= steps; i++) {
				const u = tau * i / steps;
				const sd = Math.sqrt(priceSigma ** 2 * u + basis ** 2) * mult;
				const x = xOf(nowSec + u);
				const y = yOf(shown + sd);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			for (let i = steps; i >= 0; i--) {
				const u = tau * i / steps;
				const sd = Math.sqrt(priceSigma ** 2 * u + basis ** 2) * mult;
				ctx.lineTo(xOf(nowSec + u), yOf(shown - sd));
			}
			ctx.closePath();
			ctx.fillStyle = alpha;
			ctx.fill();
		};
		fan(2, "rgba(255,147,23,0.10)");
		fan(1, "rgba(255,147,23,0.22)");
		ctx.restore();
	}
	if (K != null && start) {
		const y = yOf(K);
		ctx.save();
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(244,244,246,0.55)";
		ctx.beginPath();
		ctx.moveTo(padL, y);
		ctx.lineTo(padL + plotW, y);
		ctx.stroke();
		ctx.restore();
		const label = snap.targetKind === "estimated" ? "Target est." : "Price to beat";
		ctx.font = "11px 'Geist Mono Variable', ui-monospace, monospace";
		const tw = ctx.measureText(label).width;
		const bx = 72;
		const by = Math.min(padT + plotH - 24, Math.max(20, y - 11));
		roundRect(ctx, bx, by, tw + 12, 20, 999);
		ctx.fillStyle = "#121212";
		ctx.fill();
		ctx.strokeStyle = "#242728";
		ctx.stroke();
		ctx.fillStyle = "#c2c7ca";
		ctx.textAlign = "left";
		ctx.fillText(label, 78, by + 14);
	}
	if (pts.length && start) {
		ctx.beginPath();
		ctx.strokeStyle = "#ff9317";
		ctx.lineWidth = 1.75;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		const head = shown ?? pts[pts.length - 1].p;
		const drawn = pts.map((p, i) => i === pts.length - 1 ? {
			t: p.t,
			p: head
		} : p);
		smoothLine(ctx, drawn, xOf, yOf);
		if (nowSec > drawn[drawn.length - 1].t) ctx.lineTo(xNow, yOf(head));
		ctx.stroke();
	}
	if (shown != null && start) {
		const y = yOf(shown);
		const pulse = reduced ? 0 : (Math.sin(performance.now() / 280) + 1) / 2;
		ctx.beginPath();
		ctx.fillStyle = `rgba(255,147,23,${.28 - pulse * .16})`;
		ctx.arc(xNow, y, 8 + pulse * 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.fillStyle = "#ff9317";
		ctx.arc(xNow, y, 3.5, 0, Math.PI * 2);
		ctx.fill();
	}
}
function smoothLine(ctx, pts, xOf, yOf) {
	ctx.moveTo(xOf(pts[0].t), yOf(pts[0].p));
	if (pts.length === 1) return;
	if (pts.length === 2) {
		ctx.lineTo(xOf(pts[1].t), yOf(pts[1].p));
		return;
	}
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		const x1 = xOf(p1.t);
		const y1 = yOf(p1.p);
		const x2 = xOf(p2.t);
		const y2 = yOf(p2.p);
		const c1x = x1 + (xOf(p2.t) - xOf(p0.t)) / 6;
		const c1y = y1 + (yOf(p2.p) - yOf(p0.p)) / 6;
		const c2x = x2 - (xOf(p3.t) - xOf(p1.t)) / 6;
		const c2y = y2 - (yOf(p3.p) - yOf(p1.p)) / 6;
		ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2);
	}
}
function drawSpark(ctx, w, h, snap) {
	const pts = snap.spark;
	ctx.strokeStyle = "#242728";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, h - .5);
	ctx.lineTo(w, h - .5);
	ctx.stroke();
	if (pts.length < 2 || !snap.windowStart) return;
	const t0 = pts[0].t;
	const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
	const xOf = (t) => (t - t0) / (t1 - t0) * (w - 8) + 4;
	const yOf = (p) => 6 + (1 - Math.min(1, Math.max(0, p))) * (h - 12);
	const line = (pick, color) => {
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		pts.forEach((p, i) => {
			const x = xOf(p.t);
			const y = yOf(pick(p));
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
		ctx.stroke();
	};
	line((p) => p.market, "#78787c");
	line((p) => p.model, "#57c1ff");
}
function readLine(snap) {
	const left = snap.windowStart ? remainParts(snap.now, snap.windowStart) : {
		m: 0,
		s: 0,
		total: 0
	};
	if (snap.price == null) return "Waiting for the Bitcoin price.";
	if (snap.target == null) return "Waiting for the price to beat.";
	const gap = snap.price - snap.target;
	const dollarsOff = Math.abs(Math.round(gap));
	const where = dollarsOff < 1 ? "right on the price to beat" : gap > 0 ? `$${dollarsOff.toLocaleString("en-US")} above the price to beat` : `$${dollarsOff.toLocaleString("en-US")} below the price to beat`;
	const vel = snap.model?.driftPerSec ?? 0;
	return `Bitcoin is ${where}${Math.abs(vel) < .35 ? "" : vel > 0 ? " and rising" : " and falling"}, with ${clock(left.total)} left.`;
}
function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}
function RotatingWord({ locked }) {
	const reduced = useReducedMotion();
	const [cycle, setCycle] = (0, import_react.useState)("up");
	const shown = locked ?? cycle;
	const [prev, setPrev] = (0, import_react.useState)(null);
	const [tick, setTick] = (0, import_react.useState)(0);
	const last = (0, import_react.useRef)(shown);
	(0, import_react.useEffect)(() => {
		if (locked || reduced) return;
		const id = window.setInterval(() => setCycle((w) => w === "up" ? "down" : "up"), 5200);
		return () => window.clearInterval(id);
	}, [locked, reduced]);
	if (shown !== last.current) {
		setPrev(reduced ? null : last.current);
		last.current = shown;
		setTick((n) => n + 1);
	}
	(0, import_react.useEffect)(() => {
		if (prev == null) return;
		const id = window.setTimeout(() => setPrev(null), 1e3);
		return () => window.clearTimeout(id);
	}, [tick, prev]);
	const measure = (0, import_react.useRef)(null);
	const [width, setWidth] = (0, import_react.useState)(0);
	(0, import_react.useLayoutEffect)(() => {
		if (measure.current) setWidth(measure.current.offsetWidth);
	}, [shown]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "word-slot",
		style: { width: width ? `${width}px` : void 0 },
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "word-measure",
				ref: measure,
				children: shown
			}),
			prev != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "word leave",
				children: prev
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: prev != null ? "word enter" : "word",
				children: shown
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "uline" })
		]
	});
}
function readRoute() {
	if (typeof window === "undefined") return {
		tab: "live",
		which: "five"
	};
	const h = window.location.hash.replace(/^#/, "");
	if (h === "sim") return {
		tab: "sim",
		which: "five"
	};
	if (h.startsWith("sim/")) {
		const w = h.slice(4);
		if (w === "five" || w === "fifteen" || w === "combined" || w === "shadow" || w === "compare") return {
			tab: "sim",
			which: w
		};
	}
	return {
		tab: "live",
		which: "five"
	};
}
function useWick() {
	const snap = (0, import_react.useSyncExternalStore)(live.subscribe, live.getSnapshot, live.getServerSnapshot);
	(0, import_react.useEffect)(() => {
		live.start();
		return () => live.stop();
	}, []);
	return snap;
}
function useWorker() {
	return (0, import_react.useSyncExternalStore)(live.subscribe, live.getWorker, live.getServerWorker);
}
function WickApp() {
	const snap = useWick();
	const worker = useWorker();
	const reduced = useReducedMotion();
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("live");
	const [which, setWhich] = (0, import_react.useState)("five");
	(0, import_react.useEffect)(() => {
		const route = readRoute();
		setTab(route.tab);
		setWhich(route.which);
		const onHash = () => {
			const next = readRoute();
			setTab(next.tab);
			setWhich(next.which);
		};
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);
	function go(nextTab, nextWhich = which) {
		setTab(nextTab);
		setWhich(nextWhich);
		const hash = nextTab === "live" ? "#live" : `#sim/${nextWhich}`;
		if (window.location.hash !== hash) history.replaceState(null, "", hash);
	}
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const el = e.target;
			if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === "u" || e.key === "U") {
				e.preventDefault();
				live.paper("up");
			} else if (e.key === "d" || e.key === "D") {
				e.preventDefault();
				live.paper("down");
			} else if (e.key === "s" || e.key === "S") {
				e.preventDefault();
				setSettingsOpen(true);
			} else if (e.key === "Escape") setSettingsOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!snap.booted || !snap.windowStart) {
			document.title = "Predicting up or down";
			return;
		}
		const ck = clock(remainParts(snap.now, snap.windowStart).total);
		const open = openTitle(snap);
		if (open) document.title = `${open} ${ck}`;
		else if (snap.phase === "resolving") document.title = `Resolving ${ck}`;
		else if (snap.call === "up") document.title = `Up ${centsLabel(mid(snap.up))} ${ck}`;
		else if (snap.call === "down") document.title = `Down ${centsLabel(mid(snap.down))} ${ck}`;
		else document.title = `No trade ${ck}`;
	}, [snap]);
	const pill = snap.pill || (snap.windowStart ? formatWindow(snap.windowStart) : "Finding the window");
	const head = snap.phase === "resolving" ? "Resolving" : snap.verdict === "up" ? "Buy Up" : snap.verdict === "down" ? "Buy Down" : "No trade";
	const upCents = centsOf(snap.up);
	const downCents = centsOf(snap.down);
	const upDir = useTickDir(upCents);
	const downDir = useTickDir(downCents);
	const waiting = snap.price == null && snap.phase !== "resolving";
	const fiveLeft = snap.windowStart ? remainParts(snap.now, snap.windowStart, 300).total : 0;
	const modelP = snap.call === "down" ? snap.model?.pDown : snap.model?.pUp;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "wick",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mark",
					children: "wick"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "tabs mode",
					"aria-label": "Sections",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: tab === "live" ? "on" : "",
						onClick: () => go("live"),
						children: "Live"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: tab === "sim" ? "on" : "",
						onClick: () => go("sim", which),
						children: "Simulation"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "worker-line",
				children: workerLine(worker, snap.now)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stage hero",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "pill",
						href: snap.polyHref,
						target: "_blank",
						rel: "noreferrer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pill }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "pill-go",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowIcon, {})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						"aria-label": "Predicting up or down",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "lead",
								children: "Predicting"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotatingWord, { locked: snap.call }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "period",
								children: "."
							})
						]
					}),
					(snap.marketError || snap.feedNote) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "alert",
						children: snap.marketError || snap.feedNote
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `tiles ${snap.wipe ? "wipe" : ""}`,
						role: "group",
						"aria-label": "Market prices",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
								side: "up",
								cents: snap.phase === "resolving" ? null : upCents,
								solid: snap.call === "up",
								dir: upDir,
								resolving: snap.phase === "resolving",
								shine: snap.shine,
								ask: snap.call === "up" ? snap.up.ask : null,
								modelP: snap.call === "up" ? modelP ?? null : null
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
								side: "down",
								cents: snap.phase === "resolving" ? null : downCents,
								solid: snap.call === "down",
								dir: downDir,
								resolving: snap.phase === "resolving",
								shine: snap.shine,
								ask: snap.call === "down" ? snap.down.ask : null,
								modelP: snap.call === "down" ? modelP ?? null : null
							}),
							waiting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rider",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							})
						]
					}, snap.wipe),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bar beamed",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "beam-spin",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bar-in",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "vtext",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: head }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "reason",
									children: snap.reason ?? ""
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "keys",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "keycap",
										onClick: () => live.paper("up"),
										title: "Log a personal $1 Up. This is not a book trade.",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "U" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "$1" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "keycap",
										onClick: () => live.paper("down"),
										title: "Log a personal $1 Down. This is not a book trade.",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "D" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "$1" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "keycap",
										onClick: () => setSettingsOpen(true),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "set" })]
									})
								]
							})]
						})]
					})
				]
			}),
			tab === "live" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "strip",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
						snap,
						reduced
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "clocks",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClockLane, {
							label: "5 min",
							tau: fiveLeft,
							openAt: 180,
							call: snap.phase === "resolving" ? "skip" : snap.verdict,
							gate: snap.gate,
							href: snap.polyHref
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClockLane, {
							label: "15 min",
							tau: snap.lane15.tau,
							openAt: 720,
							call: snap.lane15.phase === "resolving" ? "skip" : snap.lane15.verdict,
							gate: snap.lane15.gate,
							href: snap.lane15.polyHref
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pair",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathCard, { snap }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TapeCard, { snap })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScratchCard, { snap })
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SimPanel, {
				snap,
				which,
				onWhich: (id) => go("sim", id)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "foot",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Paper numbers only. Not financial advice. Not affiliated with Polymarket." }), tab === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A 5-minute Bitcoin market is close to a coin flip. This shows the math, not a promise." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rule",
					children: "Resolves Up if the Chainlink 60-second price at the end of the window is greater than or equal to the price at the start. Otherwise Down. A tie is Up. The chart uses that same 60-second price. The model uses the latest price, not a promise of how the window ends. The 15-minute book uses the same end-versus-start rule on its own window."
				})] })]
			}),
			snap.notices.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "toasts",
				"aria-live": "polite",
				children: snap.notices.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `toast ${n.tone}`,
					children: n.text
				}, n.id))
			}),
			snap.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "note",
				children: snap.note
			}),
			settingsOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
				snap,
				onClose: () => setSettingsOpen(false)
			})
		]
	});
}
function SimPanel({ snap, which, onWhich }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "sim",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sim-tools",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "tabs subtabs",
				"aria-label": "Simulations",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: which === "five" ? "on" : "",
						onClick: () => onWhich("five"),
						children: "5 MIN"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: which === "fifteen" ? "on" : "",
						onClick: () => onWhich("fifteen"),
						children: "15 MIN"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: which === "combined" ? "on" : "",
						onClick: () => onWhich("combined"),
						children: "COMBINED"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: which === "shadow" ? "on" : "",
						onClick: () => onWhich("shadow"),
						children: "SHADOW"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: which === "compare" ? "on" : "",
						onClick: () => onWhich("compare"),
						children: "Compare"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "text-btn",
				onClick: () => live.exportBooks(),
				children: "Download books"
			})]
		}), which === "compare" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compare, { snap }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookDash, {
			snap,
			id: which
		})]
	});
}
function BookDash({ snap, id }) {
	const view = snap.strategies[id];
	const change = view.equity - 100;
	const tone = change > .005 ? "pos" : change < -.005 ? "neg" : "";
	const [armed, setArmed] = (0, import_react.useState)(false);
	const [flash, setFlash] = (0, import_react.useState)("");
	const prevEq = (0, import_react.useRef)(view.equity);
	(0, import_react.useEffect)(() => {
		if (Math.abs(prevEq.current - view.equity) > .004) {
			setFlash(view.equity >= prevEq.current ? "flash-up" : "flash-down");
			const t = window.setTimeout(() => setFlash(""), 1100);
			prevEq.current = view.equity;
			return () => window.clearTimeout(t);
		}
		prevEq.current = view.equity;
	}, [view.equity]);
	const marks = view.fills.filter((f) => f.action === "buy").map((f) => f.at);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "sim-top",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `sim-bal ${tone} ${flash}`,
				children: usd(view.equity)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card side sim-chart",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "sim-chart-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "card-title",
						children: "Profit and loss"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `pnl-now ${tone}`,
						children: Math.abs(change) < .005 ? "$0.00" : signedDollars(change, 2)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PnlChart, {
					points: view.curve,
					marks
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "cal pnl-note",
					children: "The left edge stays on the minute this book started, so the whole line stays in view. Dots mark entries. Above zero is ahead of the $100 start. Fees are already out. An open trade is marked at the bid, minus the fee to sell. It is held to the end unless that bid, after the fee, beats our chance by 2¢ and is also above the price paid."
				})
			]
		}),
		id === "combined" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sim-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCard, {
				title: "5-minute call",
				snap,
				span: 300
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCard, {
				title: "15-minute call",
				snap,
				span: 900
			})]
		}) : id === "shadow" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCard, {
			title: "Shadow call",
			snap,
			span: 300,
			shadow: true
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallCard, {
			title: "Current call",
			snap,
			span: id === "fifteen" ? 900 : 300
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sim-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card side",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "card-title",
						children: "Open positions"
					}),
					view.positions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "empty",
						children: "Flat. Nothing is open."
					}) : view.positions.map((pos) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PositionRows, {
						pos,
						snap,
						view
					}, `${pos.span}-${pos.windowStart}`)),
					view.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "cal",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FadeText, { text: view.note })
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card side",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "card-title",
					children: "How it trades"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "empty",
					children: rulesCopy(id)
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordCard, { view }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card side sim-log",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sim-chart-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "card-title",
					children: "Trades"
				}), armed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "confirm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reset to $100?" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-btn",
							onClick: () => {
								live.resetBook(id);
								setArmed(false);
							},
							children: "Reset"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-btn",
							onClick: () => setArmed(false),
							children: "Cancel"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-btn sim-reset",
					onClick: () => setArmed(true),
					children: "Reset"
				})]
			}), view.fills.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty",
				children: "Buys and sells show up here after a call is taken."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "fills",
				children: view.fills.map((fill) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FillText, { fill }) }, fill.id))
			})]
		})
	] });
}
function rulesCopy(id) {
	const exit = "One trade per window. A second buy was not added: early and late calls disagreed about a third of the time, and there is no old order book to price an add. It is held to the end. An early sell happens only when the bid, after the sell fee, is at least 2¢ above our own chance and also above the price paid.";
	const fee = "The fee is Polymarket's crypto fee, 7% of price times one minus price, on the buy and again if it is sold. A share held to the end pays $1 or $0. Nothing is sent to Polymarket.";
	if (id === "shadow") return `${exit} Shadow is the 5-minute book with a 55¢ size safety instead of 65¢. Under that price the stake is smaller, not banned. Same calculated stake as the other books: half the Kelly fraction from the chance, the price, and the fee, cut when the window is still early, and never more than 25% of cash. It is not mixed into the other lines. ${fee}`;
	if (id === "fifteen") return `${exit} There is no fixed 12-minute gate. With more than 12 minutes left the stake is smaller, because those calls were weaker. At 12 minutes and after, the size is the full calculated fraction. A price under 65¢ is smaller too, not refused. ${fee} Pace is 18s, 30s, and 90s, the 5-minute windows times 3, and that scale was not fit. The 20¢ disagreement skip still applies.`;
	if (id === "combined") return `${exit} Each market keeps its own calculated stake. The 15-minute signal is checked first. If the other window is already on the same side, the second trade is half of that stake, so the same Bitcoin move is not sized twice. An opposite side stays at the full calculated stake. ${fee}`;
	return `${exit} There is no fixed 3-minute gate and no fixed 10% stake. With more than 3 minutes left the stake is smaller. A price under 65¢ is smaller too, not refused. The percent is half the Kelly fraction from the chance, the price, and the fee, capped at 25% of cash. The call is the path chance, not a blend with the Up price. ${fee}`;
}
function CallCard({ snap, span, title, shadow = false }) {
	const lane = span === 900 ? snap.lane15 : null;
	const model = lane ? lane.model : snap.model;
	const verdict = shadow ? snap.shadowLane.verdict : lane ? lane.verdict : snap.verdict;
	const reason = shadow ? snap.shadowLane.reason : lane ? lane.reason : snap.reason;
	const edge = shadow ? snap.shadowLane.edge : lane ? lane.edge : snap.edge;
	const gate = shadow ? snap.shadowLane.gate : lane ? lane.gate : snap.gate;
	const tau = span === 900 ? snap.lane15.tau : snap.windowStart ? remainParts(snap.now, snap.windowStart, 300).total : 0;
	const href = lane ? lane.polyHref : snap.polyHref;
	const head = verdict === "up" ? "Buy Up" : verdict === "down" ? "Buy Down" : "No trade";
	const towardDown = verdict === "down" || verdict !== "up" && model != null && model.pUp < .5;
	const p = model ? towardDown ? model.pDown : model.pUp : null;
	const midPx = model ? towardDown ? model.midDown : model.midUp : null;
	const shownEdge = verdict === "skip" ? null : edge;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "term",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Prediction",
						v: head
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Model chance",
						v: chanceLabel(p)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Polymarket chance",
						v: centsLabel(midPx)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Predicted edge",
						v: shownEdge == null ? "--" : signedCents(shownEdge)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Time left",
						v: clock(Math.floor(tau))
					})
				]
			}),
			gate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateChip, { gate }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "cal",
				children: [
					reason ?? "Waiting.",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href,
						target: "_blank",
						rel: "noreferrer",
						children: "Polymarket"
					})
				]
			})
		]
	});
}
function PositionRows({ pos, snap, view }) {
	const ended = snap.now > (pos.windowStart + pos.span) * 1e3;
	const openPnl = view.positions.length === 1 ? view.equity - view.cash - pos.cost : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "term pos-block",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Market",
				v: pos.span === 900 ? "15 min" : "5 min"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Holding",
				v: pos.side === "up" ? "Up" : "Down"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Bought at",
				v: `${Math.round(pos.entry * 100)}¢`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Shares",
				v: pos.shares.toFixed(2)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Spent",
				v: usd(pos.cost)
			}),
			pos.pModel != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Model at entry",
				v: chanceLabel(pos.pModel)
			}),
			pos.edge != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Edge at entry",
				v: signedCents(pos.edge)
			}),
			pos.tau != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Seconds left then",
				v: String(Math.round(pos.tau))
			}),
			openPnl != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "If sold now",
				v: signedDollars(openPnl, 2)
			}),
			ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				k: "Status",
				v: "Window ended. Waiting for the result."
			}),
			pos.openReason && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: pos.openReason
			})
		]
	});
}
function RecordCard({ view }) {
	const r = view.report;
	const winrate = r.n ? `${Math.round(r.wins / r.n * 100)}%` : "--";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side sim-log",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: "Record"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "term",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Finished",
						v: String(r.n)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Won",
						v: r.n ? `${r.wins} of ${r.n}` : "--"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Lost",
						v: r.n ? String(r.losses) : "--"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Win rate",
						v: winrate
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Realized",
						v: r.n ? signedDollars(r.realized, 2) : "--"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Fees",
						v: usd(view.fees)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Average win",
						v: r.avgWin == null ? "--" : signedDollars(r.avgWin, 2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Average loss",
						v: r.avgLoss == null ? "--" : signedDollars(r.avgLoss, 2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Max drawdown",
						v: view.drawdown == null ? "--" : usd(view.drawdown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Average predicted edge",
						v: r.avgEdge == null ? "--" : `${signedCents(r.avgEdge)} a share`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Realized edge",
						v: r.realizedEdge == null ? "--" : `${signedCents(r.realizedEdge)} a share`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Brier, settled only",
						v: r.brier == null ? "--" : r.brier.toFixed(3)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Predicted edge, dollars",
						v: r.predicted == null ? "Not saved" : signedDollars(r.predicted, 2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Those trades, realized",
						v: r.predictedRealized == null ? "--" : signedDollars(r.predictedRealized, 2)
					}),
					r.buckets.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: b.label,
						v: b.n ? `${b.wins} of ${b.n}, ${signedDollars(b.pnl, 2)}` : "0 trades"
					}, b.label)),
					r.timeBuckets.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: b.label,
						v: b.n ? `${b.wins} of ${b.n}, ${signedDollars(b.pnl, 2)}` : "0 trades"
					}, b.label))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BucketBars, { buckets: [...r.buckets, ...r.timeBuckets.filter((b) => b.label !== "Time not saved" || b.n > 0)] }),
			weakness(r) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: weakness(r)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: r.note
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: "Win rate is not profit. A favorite bought at 80¢ can win most of the time and still lose money."
			})
		]
	});
}
function Compare({ snap }) {
	const cols = [
		snap.strategies.five,
		snap.strategies.fifteen,
		snap.strategies.combined
	];
	const cell = (v) => v;
	const ret = (view) => signedDollars(view.equity - 100, 2);
	const rate = (view) => view.report.n ? `${Math.round(view.report.wins / view.report.n * 100)}%` : "--";
	const edge = (n) => n == null ? "--" : signedCents(n);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "compare-curves",
		children: cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card side",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: c.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PnlChart, {
				points: c.curve,
				compact: true
			})]
		}, c.id))
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: "Side by side"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "compare-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "compare",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: " " }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: c.name }, c.id))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Return" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: cell(ret(c)) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Balance" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: usd(c.equity) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Cash" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: usd(c.cash) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Open" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: String(c.positions.length) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Trades" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: String(c.report.n) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Won" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: String(c.report.wins) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Lost" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: String(c.report.losses) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Win rate" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: rate(c) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Realized" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.report.n ? signedDollars(c.report.realized, 2) : "--" }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Fees" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: usd(c.fees) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Avg win" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.report.avgWin == null ? "--" : signedDollars(c.report.avgWin, 2) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Avg loss" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.report.avgLoss == null ? "--" : signedDollars(c.report.avgLoss, 2) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Max drawdown" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.drawdown == null ? "--" : usd(c.drawdown) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Avg predicted edge" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: edge(c.report.avgEdge) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Realized edge" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: edge(c.report.realizedEdge) }, c.id))] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: "Brier" }), cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.report.brier == null ? "--" : c.report.brier.toFixed(3) }, c.id))] })
					] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: compareNote(cols)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: "These lines are live paper from the minute each book started. There is no historical fill test. The order book at the decision second is not public, so bids, asks, fees, and profit were not invented. The two clocks came from an 18-hour Binance path study, 215 five-minute windows and 71 fifteen-minute windows, not from profit. Under 30 finished trades, do not rank them. Win rate is not profit."
			})
		]
	})] });
}
function compareNote(views) {
	const ready = views.filter((v) => v.report.n >= 30);
	if (!ready.length) return "None of the three has 30 finished trades. A ranking now would be noise. A high win rate is not the same thing as making money.";
	const byReturn = [...ready].sort((a, b) => b.equity - a.equity)[0];
	const byWin = [...ready].sort((a, b) => b.report.wins / b.report.n - a.report.wins / a.report.n)[0];
	const byDd = [...ready].sort((a, b) => (a.drawdown ?? 0) - (b.drawdown ?? 0))[0];
	const scored = ready.filter((v) => v.report.brier != null).sort((a, b) => (a.report.brier ?? 1) - (b.report.brier ?? 1));
	const scoreLine = scored.length ? `${scored[0].name} has the closer settled probability score.` : "Settled probabilities are not saved yet, so there is no score to rank.";
	return `Among books with at least 30 finished trades, ${byReturn.name} has the highest balance, ${byWin.name} has the highest win rate, and ${byDd.name} has the smallest drawdown. ${scoreLine} That is this sample, not proof.`;
}
function PnlChart({ points, marks = [], compact = false }) {
	const gid = (0, import_react.useId)().replace(/:/g, "");
	const box = (0, import_react.useRef)(null);
	const [w, setW] = (0, import_react.useState)(0);
	(0, import_react.useLayoutEffect)(() => {
		const el = box.current;
		if (!el) return;
		const read = () => {
			const next = Math.max(280, Math.round(el.clientWidth));
			setW((prev) => Math.abs(prev - next) < 2 ? prev : next);
		};
		read();
		const ro = new ResizeObserver(read);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const h = compact ? 96 : 176;
	const padL = 58;
	const padR = 12;
	const padT = 16;
	const padB = 26;
	const first = points[0];
	const lastPoint = points[points.length - 1];
	let body = first ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pnl-wait" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "empty",
		children: "The line shows up as soon as the balance is marked."
	});
	if (first && lastPoint && w > 0) {
		const last = lastPoint.pnl;
		let dataHi = 0;
		let dataLo = 0;
		for (const p of points) {
			if (p.pnl > dataHi) dataHi = p.pnl;
			if (p.pnl < dataLo) dataLo = p.pnl;
		}
		const pad = Math.max(dataHi - dataLo, .25) * .18;
		const hi = dataHi + pad;
		const lo = dataLo - pad;
		const plot = points.length === 1 ? [first, {
			t: first.t + 6e4,
			pnl: first.pnl
		}] : points;
		const t0 = plot[0].t;
		const t1 = plot[plot.length - 1].t;
		const spanT = Math.max(1, t1 - t0);
		const innerW = w - padL - padR;
		const innerH = h - padT - padB;
		const xOf = (t) => padL + (t - t0) / spanT * innerW;
		const yOf = (v) => padT + (hi - v) / (hi - lo) * innerH;
		const coords = plot.map((p) => ({
			x: xOf(p.t),
			y: yOf(p.pnl)
		}));
		const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
		const zeroY = yOf(0);
		const end = coords[coords.length - 1];
		const area = `${line} L${end.x.toFixed(1)} ${zeroY.toFixed(1)} L${coords[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
		const markDots = compact ? [] : marks.filter((t) => t >= t0 && t <= t1).map((t) => {
			let pnl = plot[0].pnl;
			for (let i = 1; i < plot.length; i++) {
				if (plot[i].t >= t) {
					const a = plot[i - 1];
					const b = plot[i];
					const u = (t - a.t) / Math.max(1, b.t - a.t);
					pnl = a.pnl + (b.pnl - a.pnl) * u;
					break;
				}
				pnl = plot[i].pnl;
			}
			return {
				x: xOf(t),
				y: yOf(pnl)
			};
		});
		const hasPos = dataHi > .005;
		const hasNeg = dataLo < -.005;
		const both = hasPos && hasNeg;
		const stroke = both ? `url(#${gid}-stroke)` : hasNeg ? "#ff6161" : "#3dce7a";
		const fill = both ? `url(#${gid}-fill)` : hasNeg ? "rgba(255,97,97,0.16)" : "rgba(61,206,122,0.16)";
		const pct = Math.max(0, Math.min(99.6, (zeroY - padT) / innerH * 100));
		const labels = [];
		for (const c of [
			{
				v: dataHi,
				y: yOf(dataHi)
			},
			{
				v: 0,
				y: zeroY
			},
			{
				v: dataLo,
				y: yOf(dataLo)
			}
		]) {
			if (labels.some((u) => Math.abs(u.y - c.y) < 16)) continue;
			labels.push(c);
		}
		const tLabel = (t) => new Date(t).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit"
		});
		body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: w,
			height: h,
			viewBox: `0 0 ${w} ${h}`,
			role: "img",
			"aria-label": `Profit and loss ${usd(last)} from the $100 start.`,
			children: [
				both && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: `${gid}-fill`,
					gradientUnits: "userSpaceOnUse",
					x1: "0",
					y1: padT,
					x2: "0",
					y2: padT + innerH,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: "#3dce7a",
							stopOpacity: "0.28"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: `${pct}%`,
							stopColor: "#3dce7a",
							stopOpacity: "0.05"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: `${pct + .4}%`,
							stopColor: "#ff6161",
							stopOpacity: "0.05"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#ff6161",
							stopOpacity: "0.28"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: `${gid}-stroke`,
					gradientUnits: "userSpaceOnUse",
					x1: "0",
					y1: padT,
					x2: "0",
					y2: padT + innerH,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: "#3dce7a"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: `${pct}%`,
							stopColor: "#3dce7a"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: `${pct + .4}%`,
							stopColor: "#ff6161"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#ff6161"
						})
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padL,
					y1: zeroY,
					x2: w - padR,
					y2: zeroY,
					stroke: "rgba(139,144,150,0.55)",
					strokeDasharray: "3 4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: area,
					fill
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: line,
					fill: "none",
					stroke,
					strokeWidth: "2",
					strokeLinejoin: "round",
					strokeLinecap: "round"
				}),
				markDots.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: d.x,
					cy: d.y,
					r: "2.4",
					fill: "#f4f4f6",
					stroke: "#0c0d0f",
					strokeWidth: "1"
				}, `${d.x}-${d.y}`)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: end.x,
					cy: end.y,
					r: "3.2",
					fill: last < -.005 ? "#ff6161" : "#3dce7a"
				}),
				labels.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: 50,
					y: c.y + 3.5,
					textAnchor: "end",
					fill: "#8b9096",
					fontSize: "11",
					fontFamily: "var(--mono)",
					children: axisMoney(c.v)
				}, `${c.v}-${c.y}`)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: padL,
					y: h - 8,
					fill: "#8b9096",
					fontSize: "11",
					fontFamily: "var(--mono)",
					children: compact ? "" : tLabel(first.t)
				}),
				!compact && points.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: w - padR,
					y: h - 8,
					textAnchor: "end",
					fill: "#8b9096",
					fontSize: "11",
					fontFamily: "var(--mono)",
					children: tLabel(lastPoint.t)
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figure", {
		className: "pnl-fig",
		ref: box,
		children: body
	});
}
function axisMoney(n) {
	const abs = Math.abs(n);
	const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
	if (abs < .005) return "$0";
	const body = dollars(abs, digits);
	return n > 0 ? `+$${body}` : `-$${body}`;
}
function FillText({ fill }) {
	const side = fill.side === "up" ? "Up" : "Down";
	const px = fill.action === "settle" ? fill.price >= 1 ? "$1" : "$0" : `${Math.round(fill.price * 100)}¢`;
	const when = new Date(fill.at).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit"
	});
	if (fill.action === "buy") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: ["Bought ", side] }),
		" at ",
		px,
		". Fee ",
		usd(fill.fee),
		" of ",
		usd(fill.shares * fill.price + fill.fee),
		" spent. Cash ",
		usd(fill.cash),
		".",
		" ",
		fill.span === 900 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "15 min" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "5 min" }),
		" ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: when }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FillMeta, { fill }),
		fill.reason && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "fill-why",
			children: fill.reason
		})
	] });
	const pnl = fill.pnl ?? 0;
	const verb = fill.action === "sell" ? "Sold" : "Settled";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
			className: pnl >= 0 ? "pos" : "neg",
			children: [
				verb,
				" ",
				side
			]
		}),
		" ",
		"at ",
		px,
		". ",
		fill.action === "sell" && fill.fee > 5e-4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			"Fee ",
			usd(fill.fee),
			". "
		] }) : null,
		pnl >= 0 ? "Made" : "Lost",
		" ",
		usd(Math.abs(pnl)),
		fill.action === "sell" ? " after fees" : "",
		". Cash ",
		usd(fill.cash),
		".",
		" ",
		fill.span === 900 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "15 min" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "5 min" }),
		" ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: when }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FillMeta, { fill }),
		fill.reason && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "fill-why",
			children: fill.reason
		})
	] });
}
function FillMeta({ fill }) {
	if (fill.pModel == null && fill.edge == null && fill.tau == null && fill.priceAgeMs == null && !fill.targetKind) return null;
	const bits = [
		fill.pModel == null ? null : `model ${Math.round(fill.pModel * 100)}%`,
		fill.edge == null ? null : `edge ${signedCents(fill.edge)}`,
		fill.tau == null ? null : `${Math.round(fill.tau)}s left`,
		fill.targetKind ? targetWord(fill.targetKind) : null,
		fill.priceAgeMs == null ? null : `price ${(Math.max(0, fill.priceAgeMs) / 1e3).toFixed(1)}s old`
	].filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "fill-meta",
		children: bits.join(", ")
	});
}
function targetWord(k) {
	if (k === "polymarket") return "polymarket open";
	if (k === "estimated") return "estimated open";
	if (k === "manual") return "typed open";
	return k;
}
function usd(n) {
	const body = dollars(Math.abs(n), 2);
	return n < -.004 ? `-$${body}` : `$${body}`;
}
function Tile({ side, cents, solid, dir, resolving, shine, ask, modelP }) {
	const label = side === "up" ? "Up" : "Down";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: solid ? "beam-wrap" : "tile-slot",
		children: [solid && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "beam-spin",
			"aria-hidden": "true"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `tile ${side} ${solid ? "solid" : ""} ${dir !== 0 ? "pop" : ""}`,
			"aria-label": resolving ? `${label} resolving` : `${label} ${cents ?? "--"} cents`,
			children: [
				shine > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shine",
					"aria-hidden": "true"
				}, shine),
				resolving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "resolving",
					children: "Resolving"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: `num ${!solid && dir > 0 ? "flash-up" : ""} ${!solid && dir < 0 ? "flash-down" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollingNumber, {
						text: cents == null ? "--" : String(cents),
						dir
					}), cents != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cent",
						children: "¢"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "side",
					children: label
				}),
				solid && ask != null && modelP != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "edge-tick",
					"aria-hidden": "true",
					title: "Ask against the model chance",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
						className: "model",
						style: { left: `${Math.max(0, Math.min(100, modelP * 100))}%` }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
						className: "ask",
						style: { left: `${Math.max(0, Math.min(100, ask * 100))}%` }
					})]
				})
			]
		})]
	});
}
function MathCard({ snap }) {
	const m = snap.model;
	const s = live.settings();
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: "Math"
			}),
			!m ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty",
				children: "Waiting for a price and a price to beat."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "term",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up chance",
						v: chanceLabel(m.pUp)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down chance",
						v: chanceLabel(m.pDown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Gap",
						v: signedDollars(m.gap, 2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Read",
						v: snap.call === "up" ? "Up" : snap.call === "down" ? "Down" : "No call"
					})
				]
			}),
			m && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "text-btn math-toggle",
				onClick: () => setOpen((v) => !v),
				"aria-expanded": open,
				children: open ? "Hide the inputs" : "All the inputs"
			}),
			m && open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "term",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "term-h",
						children: "Price"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Price",
						v: `$${dollars(m.S, 2)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Price to beat",
						v: `$${dollars(m.K, 2)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Gap",
						v: signedDollars(m.gap, 2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Seconds left",
						v: m.tau.toFixed(0)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "History",
						v: `${snap.historySeconds}s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "term-h",
						children: "Path"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "6s trend",
						v: moveLabel(m.velImpulse)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "10s trend",
						v: moveLabel(m.velShort)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "30s trend",
						v: moveLabel(m.driftPerSec)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Acceleration",
						v: accelLabel(m.accel)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Projected gap",
						v: signedDollars(m.projectedGap, 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Cross in",
						v: m.crossSec == null ? "Not toward the line" : `${Math.max(1, Math.round(m.crossSec))}s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Lookahead",
						v: `${Math.round(m.horizon)}s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Wobble",
						v: `${(m.sigma * m.S).toFixed(2)} $/s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Tail",
						v: s.tail.toFixed(2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Basis",
						v: `$${s.basis.toFixed(0)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Range left",
						v: `$${m.totalSd.toFixed(0)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "z",
						v: m.z.toFixed(2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "term-h",
						children: "Market"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up just moved",
						v: signedCents(m.marketDelta)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up mid",
						v: centsLabel(m.midUp)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down mid",
						v: centsLabel(m.midDown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Blend up, not used",
						v: m.pBlend == null ? "--" : `${Math.round(m.pBlend * 100)}%`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up ask",
						v: centsLabel(m.askUp)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down ask",
						v: centsLabel(m.askDown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up fee",
						v: m.feeUp == null ? "--" : signedCents(m.feeUp).replace("+", "")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down fee",
						v: m.feeDown == null ? "--" : signedCents(m.feeDown).replace("+", "")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up edge",
						v: m.edgeUp == null ? "--" : signedCents(m.edgeUp)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down edge",
						v: m.edgeDown == null ? "--" : signedCents(m.edgeDown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up round trip",
						v: m.roundTripUp == null ? "--" : signedCents(m.roundTripUp)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down round trip",
						v: m.roundTripDown == null ? "--" : signedCents(m.roundTripDown)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Up spread",
						v: m.spreadUp == null ? "--" : signedCents(m.spreadUp).replace("+", "")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Down spread",
						v: m.spreadDown == null ? "--" : signedCents(m.spreadDown).replace("+", "")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "term-h",
						children: "Rules"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Min edge",
						v: signedCents(s.minEdge).replace("+", "")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Size safety",
						v: `${Math.round(s.minAsk * 100)}¢`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Buy up to",
						v: s.maxAsk == null ? "No cap" : `${Math.round(s.maxAsk * 100)}¢`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Stake",
						v: snap.kellyFrac == null ? "Calculated" : `${Math.round(snap.kellyFrac * 1e3) / 10}% of cash`
					})
				]
			}),
			m && open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: "Round trip is the bid minus the ask, with the fee both ways. The call uses the hold-to-end edge, which only pays the buy fee. A chance at the cap is shown as over 99% or under 1%, not as 100%."
			})
		]
	});
}
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "trow",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: k }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: v })]
	});
}
function moveLabel(v) {
	if (Math.abs(v) < .35) return "Flat";
	const body = `$${Math.abs(v).toFixed(2)}/s`;
	return v > 0 ? `Up ${body}` : `Down ${body}`;
}
function accelLabel(v) {
	if (Math.abs(v) < .15) return "Steady";
	return v > 0 ? "Turning up" : "Turning down";
}
function TapeCard({ snap }) {
	const rows = snap.tape.slice().reverse();
	const hits = snap.hitRate == null ? 0 : Math.round(snap.hitRate * snap.hitN);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "card-title",
				children: "Tape"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "accuracy",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "k",
						children: "Wick accuracy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: snap.hitN > 0 && snap.hitRate != null ? `${Math.round(snap.hitRate * 100)}%` : "--" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: snap.hitN > 0 ? `${hits} of ${snap.hitN} ${snap.hitN === 1 ? "call" : "calls"}` : "Shows after wick calls a side and the window closes." })
				]
			}),
			rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty",
				children: "Past windows show up here after they close."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "tape-list",
				children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `tm ${row.outcome} ${row.correct === false ? "miss" : ""}`,
					children: [
						shortTime(row.windowStart),
						" ",
						row.outcome === "up" ? "Up" : "Down",
						row.correct == null ? "" : row.correct ? " hit" : " miss",
						row.confirmed ? "" : " provisional"
					]
				}, row.windowStart))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "cal",
				children: scoreText(snap)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reliability, { bins: snap.reliability }),
			snap.paperSettled > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "cal",
				children: [
					"Personal $1 log ",
					snap.paperPnl >= 0 ? "+" : "-",
					"$",
					Math.abs(snap.paperPnl).toFixed(2),
					" from ",
					snap.paperSettled,
					" finished",
					" ",
					snap.paperSettled === 1 ? "note" : "notes",
					". This is not a book."
				]
			}),
			snap.paper.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "text-btn",
				onClick: () => live.exportCsv(),
				children: "Download $1 log"
			})
		]
	});
}
function scoreText(snap) {
	const n = snap.scoreN;
	const path = snap.brierModel == null ? "--" : snap.brierModel.toFixed(3);
	const blend = snap.brierBlend == null ? "--" : snap.brierBlend.toFixed(3);
	const market = snap.brierMarket == null ? "--" : snap.brierMarket.toFixed(3);
	const older = snap.calibN > n ? ` ${snap.calibN - n} older windows are left out, because their saved chance treated a price change as a probability.` : "";
	if (n === 0) return `Path, blend, and market scores show up after a window closes. Lower is closer.${older}`;
	let tail = "Under 30 windows, so this does not pick a winner.";
	if (n >= 30 && snap.brierModel != null && snap.brierBlend != null && snap.brierMarket != null) {
		const rows = [
			["path", snap.brierModel],
			["blend", snap.brierBlend],
			["market", snap.brierMarket]
		];
		rows.sort((a, b) => a[1] - b[1]);
		const best = rows[0][0];
		tail = best === "path" ? "The path score is the lowest. Calls use the path." : best === "market" ? "The market score is lower. Calls still use the path. Copying the Up price leaves nothing to trade." : "The blend score is lower. Calls still use the path, so mixing in the Up price is only a score.";
	}
	return `Score, lower is closer. Path ${path}, blend ${blend}, market ${market}, over ${n} windows. The blend is half the path and half the Up price.${older} ${tail}`;
}
function workerLine(w, now) {
	const clock = now > 0 ? now : 0;
	const updated = clock && w.lastSuccessAt ? `updated ${ago(clock - w.lastSuccessAt)}` : "no update yet";
	if (w.status !== "leading") {
		const last = clock && w.lastSuccessAt ? ` Last update ${ago(clock - w.lastSuccessAt)}.` : "";
		return `Worker ${w.status}.${last} Saved balances stay put. Paper only.`;
	}
	const up = clock && w.startedAt ? `up ${spanLabel(clock - w.startedAt)}` : "up";
	const price = w.priceLive ? "price live" : "price reconnecting";
	const book = w.clobLive ? "5m book live" : "5m book resting";
	const book15 = w.book15Live ? "15m book live" : "15m book resting";
	return `Worker leading, ${up}, ${updated}, ${price}${w.feedAgeMs != null ? `, feed ${Math.max(0, Math.round(w.feedAgeMs / 100) / 10)}s` : ""}, ${book}, ${book15}. Paper only. This page can close.`;
}
function ago(ms) {
	const s = Math.max(0, Math.round(ms / 1e3));
	if (s < 60) return `${s}s ago`;
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m ago`;
	return `${Math.round(m / 60)}h ago`;
}
function spanLabel(ms) {
	const s = Math.max(0, Math.round(ms / 1e3));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m`;
	return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function shortTime(startSec) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		hour: "numeric",
		minute: "2-digit"
	}).format(/* @__PURE__ */ new Date(startSec * 1e3));
}
function Settings({ snap, onClose }) {
	const [form, setForm] = (0, import_react.useState)(() => live.settings());
	function patch(p) {
		const next = {
			...form,
			...p
		};
		setForm(next);
		live.patchSettings(p);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "scrim",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "drawer",
			role: "dialog",
			"aria-label": "Settings",
			onMouseDown: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "drawer-h",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "gear",
						onClick: onClose,
						"aria-label": "Close settings",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseIcon, {})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "health",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Price ",
							snap.sourceLabel,
							" ",
							snap.priceLive ? "live" : "reconnecting",
							snap.priceAgeMs != null ? ` ${Math.max(0, Math.round(snap.priceAgeMs / 100) / 10)}s` : ""
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Book ", snap.clobLive ? "live" : "rest"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Reconnects ", snap.reconnects] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Lookback, seconds",
					value: form.lookbackSec,
					step: 30,
					onChange: (n) => patch({ lookbackSec: n })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Extra caution on the wobble",
					value: form.tail,
					step: .05,
					onChange: (n) => patch({ tail: n })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Exchange gap, dollars",
					value: form.basis,
					step: 1,
					onChange: (n) => patch({ basis: n })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "How much cheaper, cents",
					value: Math.round(form.minEdge * 1e3) / 10,
					step: .5,
					onChange: (n) => patch({ minEdge: n / 100 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Size safety, cents",
					value: Math.round(form.minAsk * 1e3) / 10,
					step: 1,
					onChange: (n) => patch({ minAsk: n / 100 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "field",
					children: ["Highest buy, cents", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						step: 1,
						placeholder: "No cap",
						value: form.maxAsk == null ? "" : Math.round(form.maxAsk * 1e3) / 10,
						onChange: (e) => {
							const raw = e.target.value.trim();
							if (raw === "") patch({ maxAsk: null });
							else {
								const n = Number(raw);
								if (Number.isFinite(n)) patch({ maxAsk: n / 100 });
							}
						}
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "field",
					children: ["Price source", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: form.feed,
						onChange: (e) => patch({ feed: e.target.value }),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "chainlink",
								children: "Chainlink 60s average"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "coinbase",
								children: "Coinbase"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "binance",
								children: "Binance"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "check",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: form.sound,
						onChange: (e) => patch({ sound: e.target.checked })
					}), "Soft click on a book fill and on a $1 log"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hint",
					children: "The stake is half the Kelly fraction from the chance, the price, and the fee. It is smaller when the window is still early, and smaller under this safety price. It is not a ban, and it is not 10%. The cap is 25% of that book's cash. Combined uses half of that when the other window is already on the same side. Shadow uses 55¢ as its safety price. A buy still has to clear this extra edge, and also the fee plus the spread. Leave the highest buy empty for no cap. U and D log a personal $1. That log is not a book. Settings and resets are sent to the worker. The books keep running when this page is closed. Nothing here is sent to Polymarket. Chainlink 60s is the price their chart uses."
				})
			]
		})
	});
}
function Field({ label, value, step, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "field",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "number",
			step,
			value: Number.isFinite(value) ? value : 0,
			onChange: (e) => {
				const n = Number(e.target.value);
				if (Number.isFinite(n)) onChange(n);
			}
		})]
	});
}
function mid(q) {
	if (q.bid != null && q.ask != null) return (q.bid + q.ask) / 2;
	return q.ask ?? q.bid;
}
function centsOf(q) {
	const m = mid(q);
	if (m == null) return null;
	return Math.round(m * 100);
}
function ArrowIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 12 12",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M3.2 8.8 L8.8 3.2 M5 3.2 H8.8 V7",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.4",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		})
	});
}
function CloseIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 16 16",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M4 4 L12 12 M12 4 L4 12",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.4",
			strokeLinecap: "round"
		})
	});
}
function openTitle(snap) {
	for (const [id, name] of [
		["five", "5 min"],
		["fifteen", "15 min"],
		["combined", "Combined"],
		["shadow", "Shadow"]
	]) {
		const pos = snap.strategies[id].positions[0];
		if (pos) return `${name} ${pos.side === "up" ? "Up" : "Down"} open`;
	}
	return null;
}
function GateChip({ gate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `gate-chip ${gate.label === "Cleared" ? "ok" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: gate.label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: gate.left }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["vs ", gate.right] })
		]
	});
}
function ClockLane({ label, tau, openAt, call, gate, href }) {
	const total = Math.max(0, Math.floor(tau));
	const hot = total > 0 && total <= openAt;
	const head = call === "up" ? "Buy Up" : call === "down" ? "Buy Down" : "No trade";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		className: `clock-lane ${hot ? "hot" : "quiet"}`,
		href,
		target: "_blank",
		rel: "noreferrer",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "k",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: clock(total) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `call ${call}`,
				children: head
			}),
			gate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateChip, { gate })
		]
	});
}
function FadeText({ text }) {
	const [shown, setShown] = (0, import_react.useState)(text);
	const [on, setOn] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		if (text === shown) return;
		setOn(false);
		const t = window.setTimeout(() => {
			setShown(text);
			setOn(true);
		}, 140);
		return () => window.clearTimeout(t);
	}, [text, shown]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: on ? "fade-in" : "fade-out",
		children: shown
	});
}
function weakness(r) {
	const ready = [...r.buckets, ...r.timeBuckets].filter((b) => b.n >= 20);
	if (!ready.length) return null;
	const worst = [...ready].sort((a, b) => a.pnl / a.n - b.pnl / b.n)[0];
	if (worst.pnl >= -.005) return null;
	return `${worst.label} is the weak pocket so far: ${worst.wins} of ${worst.n}, ${signedDollars(worst.pnl, 2)}. That is this sample, not a new rule.`;
}
function BucketBars({ buckets }) {
	const max = Math.max(1, ...buckets.map((b) => b.n));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "buckets",
		children: buckets.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bucket",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b.label }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "bar",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${b.n / max * 100}%` } })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b.n ? `${b.wins}/${b.n}` : "0" })
			]
		}, b.label))
	});
}
function Reliability({ bins }) {
	if (!bins.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "cal",
		children: "Reliability waits for 30 closed windows with a saved blend score. It does not change the call."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rel",
		"aria-label": "Path chance against how often Up won",
		children: bins.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rel-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${Math.round(Math.max(b.n ? 4 : 0, b.up * 100))}%` } }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [Math.round(b.lo * 100), "%"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b.n ? `${Math.round(b.up * 100)}% up` : "empty" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["n ", b.n] })
			]
		}, b.lo))
	});
}
function ScratchCard({ snap }) {
	const rows = snap.scratches.slice().reverse();
	if (!rows.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card side scratch-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "card-title",
			children: "Recent windows"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "scratch-grid",
			children: rows.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "scratch",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "k",
						children: shortTime(s.windowStart)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScratchSpark, {
						series: s.series,
						target: s.target
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						s.verdict === "skip" ? "No trade" : s.verdict === "up" ? "Called Up" : "Called Down",
						s.outcome ? ` · closed ${s.outcome === "up" ? "Up" : "Down"}` : "",
						s.targetKind && s.targetKind !== "polymarket" ? " · estimated open" : ""
					] })
				]
			}, s.windowStart))
		})]
	});
}
function ScratchSpark({ series, target }) {
	if (series.length < 2) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "scratch-empty",
		children: "No path saved"
	});
	let lo = series[0].p;
	let hi = series[0].p;
	for (const p of series) {
		if (p.p < lo) lo = p.p;
		if (p.p > hi) hi = p.p;
	}
	if (target != null) {
		lo = Math.min(lo, target);
		hi = Math.max(hi, target);
	}
	const span = Math.max(1e-6, hi - lo);
	const w = 160;
	const h = 42;
	const d = series.map((p, i) => {
		const x = i / (series.length - 1) * w;
		const y = h - (p.p - lo) / span * 38 - 2;
		return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
	}).join(" ");
	const yT = target == null ? null : h - (target - lo) / span * 38 - 2;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${w} ${h}`,
		"aria-hidden": "true",
		children: [yT != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
			x1: "0",
			y1: yT,
			x2: w,
			y2: yT,
			stroke: "rgba(139,144,150,0.7)",
			strokeDasharray: "2 3"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d,
			fill: "none",
			stroke: "#ff9317",
			strokeWidth: "1.4"
		})]
	});
}
var SplitComponent = WickApp;
//#endregion
export { SplitComponent as component };
