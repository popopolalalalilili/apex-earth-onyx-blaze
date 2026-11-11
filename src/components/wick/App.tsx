import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RelBin, Settings, Side, SimFill, SimPoint, Snap } from "@/lib/wick/engine";
import type { BookId, BookView, Pos } from "@/lib/wick/desk";
import { centsLabel, chanceLabel, clock, dollars, formatWindow, remainParts, signedCents, signedDollars } from "@/lib/wick/format";
import { live } from "@/lib/wick/live";
import type { WorkerHealth } from "@/lib/wick/protocol";
import { ChartCard } from "./Chart";
import { RollingNumber, useTickDir } from "./Digits";
import { useReducedMotion } from "./motion";
import { RotatingWord } from "./Word";

type BookTab = "five" | "fifteen" | "combined" | "shadow" | "compare";

function readRoute(): { tab: "live" | "sim" | "trade"; which: BookTab } {
  if (typeof window === "undefined") return { tab: "live", which: "five" };
  const h = window.location.hash.replace(/^#/, "");
  if (h === "trade") return { tab: "trade", which: "five" };
  if (h === "sim") return { tab: "sim", which: "five" };
  if (h.startsWith("sim/")) {
    const w = h.slice(4);
    if (w === "five" || w === "fifteen" || w === "combined" || w === "shadow" || w === "compare") return { tab: "sim", which: w };
  }
  return { tab: "live", which: "five" };
}

function useWick(): Snap {
  const snap = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getServerSnapshot);
  useEffect(() => {
    live.start();
    return () => live.stop();
  }, []);
  return snap;
}

function useWorker(): WorkerHealth {
  return useSyncExternalStore(live.subscribe, live.getWorker, live.getServerWorker);
}

export function WickApp() {
  const snap = useWick();
  const worker = useWorker();
  const reduced = useReducedMotion();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<"live" | "sim" | "trade">("live");
  const [which, setWhich] = useState<BookTab>("five");

  useEffect(() => {
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

  function go(nextTab: "live" | "sim" | "trade", nextWhich: BookTab = which) {
    setTab(nextTab);
    setWhich(nextWhich);
    const hash = nextTab === "live" ? "#live" : nextTab === "trade" ? "#trade" : `#sim/${nextWhich}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
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
      } else if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!snap.booted || !snap.windowStart) {
      document.title = "Predicting up or down";
      return;
    }
    const left = remainParts(snap.now, snap.windowStart);
    const ck = clock(left.total);
    const open = openTitle(snap);
    if (open) document.title = `${open} ${ck}`;
    else if (snap.phase === "resolving") document.title = `Resolving ${ck}`;
    else if (snap.call === "up") document.title = `Up ${centsLabel(mid(snap.up))} ${ck}`;
    else if (snap.call === "down") document.title = `Down ${centsLabel(mid(snap.down))} ${ck}`;
    else document.title = `No trade ${ck}`;
  }, [snap]);

  const pill = snap.pill || (snap.windowStart ? formatWindow(snap.windowStart) : "Finding the window");
  const head =
    snap.phase === "resolving" ? "Resolving" : snap.verdict === "up" ? "Buy Up" : snap.verdict === "down" ? "Buy Down" : "No trade";
  const upCents = centsOf(snap.up);
  const downCents = centsOf(snap.down);
  const upDir = useTickDir(upCents);
  const downDir = useTickDir(downCents);
  const waiting = snap.price == null && snap.phase !== "resolving";
  const fiveLeft = snap.windowStart ? remainParts(snap.now, snap.windowStart, 300).total : 0;
  const modelP = snap.call === "down" ? snap.model?.pDown : snap.model?.pUp;

  return (
    <div className="wick">
      <header className="topbar">
        <div className="mark">wick</div>
        <nav className="tabs mode" aria-label="Sections">
          <button type="button" className={tab === "live" ? "on" : ""} onClick={() => go("live")}>
            Live
          </button>
          <button type="button" className={tab === "sim" ? "on" : ""} onClick={() => go("sim", which)}>
            Simulation
          </button>
          <button type="button" className={tab === "trade" ? "on" : ""} onClick={() => go("trade")}>
            Trade
          </button>
          <button type="button" data-build="settings-2" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </nav>
      </header>
      <p className="worker-line">{workerLine(worker, snap.now)}</p>

      <div className="stage hero">
        <a className="pill" href={snap.polyHref} target="_blank" rel="noreferrer">
          <span>{pill}</span>
          <span className="pill-go" aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
        <h1 aria-label="Predicting up or down">
          <span className="lead">Predicting</span>
          <RotatingWord locked={snap.call} />
          <span className="period">.</span>
        </h1>
        {(snap.marketError || snap.feedNote) && <p className="alert">{snap.marketError || snap.feedNote}</p>}

        <div className={`tiles ${snap.wipe ? "wipe" : ""}`} key={snap.wipe} role="group" aria-label="Market prices">
          <Tile
            side="up"
            cents={snap.phase === "resolving" ? null : upCents}
            solid={snap.call === "up"}
            dir={upDir}
            resolving={snap.phase === "resolving"}
            shine={snap.shine}
            ask={snap.call === "up" ? snap.up.ask : null}
            modelP={snap.call === "up" ? modelP ?? null : null}
          />
          <Tile
            side="down"
            cents={snap.phase === "resolving" ? null : downCents}
            solid={snap.call === "down"}
            dir={downDir}
            resolving={snap.phase === "resolving"}
            shine={snap.shine}
            ask={snap.call === "down" ? snap.down.ask : null}
            modelP={snap.call === "down" ? modelP ?? null : null}
          />
          {waiting && (
            <div className="rider" aria-hidden="true">
              <i />
            </div>
          )}
        </div>

        <div className="bar beamed">
          <span className="beam-spin" aria-hidden="true" />
          <div className="bar-in">
            <div className="vtext">
              <b>{head}</b>
              <span className="reason">{snap.reason ?? ""}</span>
            </div>
            <div className="keys">
              <button type="button" className="keycap" onClick={() => live.paper("up")} title="Log a personal $1 Up. This is not a book trade.">
                <span>U</span>
                <small>$1</small>
              </button>
              <button type="button" className="keycap" onClick={() => live.paper("down")} title="Log a personal $1 Down. This is not a book trade.">
                <span>D</span>
                <small>$1</small>
              </button>
              <button type="button" className="keycap" onClick={() => setSettingsOpen(true)}>
                <span>S</span>
                <small>set</small>
              </button>
            </div>
          </div>
        </div>
      </div>

      {tab === "live" ? (
        <div className="strip">
          <ChartCard snap={snap} reduced={reduced} />
          <div className="clocks">
            <ClockLane
              label="5 min"
              tau={fiveLeft}
              openAt={180}
              call={snap.phase === "resolving" ? "skip" : snap.verdict}
              gate={snap.gate}
              href={snap.polyHref}
            />
            <ClockLane
              label="15 min"
              tau={snap.lane15.tau}
              openAt={720}
              call={snap.lane15.phase === "resolving" ? "skip" : snap.lane15.verdict}
              gate={snap.lane15.gate}
              href={snap.lane15.polyHref}
            />
          </div>
          <div className="pair">
            <MathCard snap={snap} />
            <TapeCard snap={snap} />
          </div>
          <ScratchCard snap={snap} />
        </div>
      ) : tab === "trade" ? (
        <TradeDesk snap={snap} />
      ) : (
        <SimPanel snap={snap} which={which} onWhich={(id) => go("sim", id)} />
      )}

      <footer className="foot">
        <p>Paper numbers only. Not financial advice. Not affiliated with Polymarket.</p>
        {tab === "live" && (
          <>
            <p>A 5-minute Bitcoin market is close to a coin flip. This shows the math, not a promise.</p>
            <p className="rule">
              Resolves Up if the Chainlink 60-second price at the end of the window is greater than or equal to the
              price at the start. Otherwise Down. A tie is Up. The chart uses that same 60-second price. The model uses
              the latest price, not a promise of how the window ends. The 15-minute book uses the same end-versus-start
              rule on its own window.
            </p>
          </>
        )}
      </footer>

      {snap.notices.length > 0 && (
        <div className="toasts" aria-live="polite">
          {snap.notices.map((n) => (
            <p key={n.id} className={`toast ${n.tone}`}>
              {n.text}
            </p>
          ))}
        </div>
      )}
      {snap.note && <p className="note">{snap.note}</p>}

      {settingsOpen && <Settings snap={snap} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function SimPanel({ snap, which, onWhich }: { snap: Snap; which: BookTab; onWhich: (id: BookTab) => void }) {
  return (
    <section className="sim">
      <div className="sim-tools">
        <nav className="tabs subtabs" aria-label="Simulations">
          <button type="button" className={which === "five" ? "on" : ""} onClick={() => onWhich("five")}>
            5 MIN
          </button>
          <button type="button" className={which === "fifteen" ? "on" : ""} onClick={() => onWhich("fifteen")}>
            15 MIN
          </button>
          <button type="button" className={which === "combined" ? "on" : ""} onClick={() => onWhich("combined")}>
            COMBINED
          </button>
          <button type="button" className={which === "shadow" ? "on" : ""} onClick={() => onWhich("shadow")}>
            SHADOW
          </button>
          <button type="button" className={which === "compare" ? "on" : ""} onClick={() => onWhich("compare")}>
            Compare
          </button>
        </nav>
        <button type="button" className="text-btn" onClick={() => live.exportBooks()}>
          Download books
        </button>
      </div>
      {which === "compare" ? <Compare snap={snap} /> : <BookDash snap={snap} id={which} />}
    </section>
  );
}

function TradeDesk({ snap }: { snap: Snap }) {
  const desk = snap.trade ?? { address: null, paused: true, cap: 25, cash: null as number | null, keySaved: false, signatureType: 1 as const, note: "" };
  const [address, setAddress] = useState(desk.address ?? "");
  const [cap, setCap] = useState(String(desk.cap));
  const [key, setKey] = useState("");
  const [sig, setSig] = useState<"0" | "1" | "2">(String(desk.signatureType ?? 1) as "0" | "1" | "2");
  const [points, setPoints] = useState<{ t: number; pnl: number }[]>([]);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [press, setPress] = useState<"" | "test" | "pause" | "save">("");

  useEffect(() => {
    if (desk.address) setAddress(desk.address);
  }, [desk.address]);

  useEffect(() => {
    if (press !== "test" && press !== "save") return;
    if (desk.note.startsWith("Checking")) return;
    setPress("");
  }, [desk.note, press]);

  useEffect(() => {
    if (!desk.address) {
      setPoints([]);
      return;
    }
    let stop = false;
    async function pull() {
      setBusy(true);
      try {
        const res = await fetch(`/api/poly-pnl?user=${desk.address}&interval=1w`);
        const body = (await res.json()) as { points?: { t: number; pnl: number }[]; error?: string };
        if (stop) return;
        setPoints(Array.isArray(body.points) ? body.points : []);
      } catch {
        if (!stop) setHint("Profit chart did not load.");
      } finally {
        if (!stop) setBusy(false);
      }
    }
    void pull();
    const id = window.setInterval(pull, 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [desk.address]);

  const last = points.length ? points[points.length - 1].pnl : null;
  const tone = last == null ? "" : last > 0.005 ? "pos" : last < -0.005 ? "neg" : "";
  const checking = press === "test" || press === "save" || desk.note.startsWith("Checking");
  const api = describeApi(checking ? "Checking" : desk.note, snap.polySaved);

  function saveAll() {
    const addr = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setHint("Paste the wallet address.");
      return;
    }
    const raw = key.trim();
    const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
    const keyFilled = /^[a-fA-F0-9]{64}$/.test(hex);
    if (raw !== "" && !keyFilled) {
      setHint("The private key should be 64 hex characters.");
      return;
    }
    if (!keyFilled && !desk.keySaved) {
      setHint("Paste the private key.");
      return;
    }
    const n = Number(cap);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      setHint("The percent has to be between 1 and 100.");
      return;
    }
    setHint("");
    setPress("save");
    void live.saveAccount({
      address: addr,
      cap: n,
      signatureType: Number(sig) as 0 | 1 | 2,
      privateKey: keyFilled ? `0x${hex}` : undefined,
    });
    setKey("");
  }

  return (
    <section className="sim trade-desk">
      <div className="sim-tools">
        <div>
          <h2 className="card-title">5 minute account</h2>
          <p className="cal">Orders use a percent of your Polymarket balance. Nothing is bought while paused.</p>
        </div>
        <div className="trade-actions">
          <button type="button" className={press === "save" ? "modal-btn is-down" : "modal-btn"} onClick={saveAll} disabled={press === "save"}>
            {press === "save" && <Spinner />}
            Save
          </button>
          <button
            type="button"
            className={press === "test" ? "modal-btn is-down" : "modal-btn"}
            onClick={() => {
              setHint("");
              setPress("test");
              live.checkTrade();
            }}
            disabled={press === "test" || press === "save"}
          >
            {press === "test" && <Spinner />}
            Test again
          </button>
          <button
            type="button"
            className={press === "pause" ? "modal-btn is-down" : "modal-btn"}
            disabled={!desk.address}
            onClick={() => {
              setPress("pause");
              window.setTimeout(() => setPress((cur) => (cur === "pause" ? "" : cur)), 700);
              live.pauseTrade(!desk.paused);
            }}
          >
            {press === "pause" && <Spinner />}
            {desk.paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div className="trade-flags">
        <span className={`trade-flag ${api.kind}`}>{api.kind === "wait" && <Spinner />}{api.label}</span>
        <span className="trade-flag">{desk.cash == null ? "Balance unknown" : `Balance ${signedDollars(desk.cash, 2).replace("+", "")}`}</span>
        <span className={`trade-flag ${snap.polySaved && desk.keySaved ? "ok" : ""}`}>
          {snap.polySaved && desk.keySaved ? "Saved" : "Not saved"}
        </span>
      </div>
      {(hint || api.hint) && <p className="cal trade-hint">{hint || api.hint}</p>}
      <p className="cal trade-hint">{orderLine("15 min", snap.lane15.kellyFrac, desk.cash ?? null, desk.cap, desk.paused, snap.lane15.reason, desk.note)}</p>
      <p className="cal trade-hint">{orderLine("5 min", snap.kellyFrac, desk.cash ?? null, desk.cap, desk.paused, snap.reason, desk.note)}</p>

      <div className="trade-form">
        <label>
          Wallet
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" />
        </label>
        <label>
          Max % of balance
          <input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Private key
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={desk.keySaved ? "Saved" : "0x…"} autoComplete="off" spellCheck={false} />
        </label>
        <label>
          Login
          <select value={sig} onChange={(e) => setSig(e.target.value as "0" | "1" | "2")}>
            <option value="1">Email</option>
            <option value="2">Browser wallet</option>
            <option value="0">Key is the wallet</option>
          </select>
        </label>
      </div>

      <div className="sim-top">
        <div className={`sim-bal ${tone}`}>{last == null ? (busy ? "…" : "--") : signedDollars(last, 2)}</div>
      </div>
      <article className="card side sim-chart">
        <div className="sim-chart-head">
          <h2 className="card-title">Account profit</h2>
          <span className={`pnl-now ${tone}`}>{desk.paused ? "Paused" : "Watching"}</span>
        </div>
        <PnlChart points={points} />
        <p className="cal pnl-note">Polymarket account. Not the simulation.</p>
      </article>
    </section>
  );
}

function orderLine(label: string, frac: number | null, cash: number | null, cap: number, paused: boolean, reason: string | null, note: string): string {
  const refusal = /refused|rejected|did not accept|403|401/.test(note) ? note : "";
  if (paused) {
    if (label !== "15 min") return "";
    return refusal ? `Paused. ${refusal}` : "Paused. Press Resume to buy.";
  }
  if (cash == null) return `${label}: balance has not loaded yet.`;
  if (frac == null || frac < 0.02) return reason ? `${label}: no buy. ${reason}` : `${label}: no buy this window.`;
  const use = Math.min(frac, cap / 100);
  const dollars = Math.round(cash * use * 100) / 100;
  const pct = `${Math.round(use * 1000) / 10}%`;
  if (dollars < 1) return `${label}: ${pct} of the balance is under $1, so nothing is bought.`;
  return refusal || `${label}: about $${dollars.toFixed(2)} (${pct}). If the other window is already on this side, this one is half.`;
}

function describeApi(raw: string, saved: boolean): { kind: "idle" | "wait" | "ok" | "bad"; label: string; hint: string } {
  if (raw.startsWith("Checking")) return { kind: "wait", label: "Checking", hint: "" };
  if (raw.startsWith("API works") || raw.startsWith("API key works")) return { kind: "ok", label: "API works", hint: "" };
  if (!saved || raw.includes("not saved")) return { kind: "bad", label: "No key", hint: "Paste the private key and press Save." };
  if (raw.includes("rejected") || raw.includes("Unauthorized") || raw.includes("Invalid") || raw.includes("did not accept") || raw.includes("failed") || raw.includes("Polymarket said")) {
    return { kind: "bad", label: "API does not work", hint: "Polymarket did not accept this private key." };
  }
  return { kind: "idle", label: "Not checked", hint: "" };
}

function Spinner() {
  return <i className="btn-spin" aria-hidden="true" />;
}

function BookDash({ snap, id }: { snap: Snap; id: BookId }) {
  const view = snap.strategies[id];
  const change = view.equity - 100;
  const tone = change > 0.005 ? "pos" : change < -0.005 ? "neg" : "";
  const [armed, setArmed] = useState(false);
  const [flash, setFlash] = useState<"" | "flash-up" | "flash-down">("");
  const prevEq = useRef(view.equity);
  useEffect(() => {
    if (Math.abs(prevEq.current - view.equity) > 0.004) {
      setFlash(view.equity >= prevEq.current ? "flash-up" : "flash-down");
      const t = window.setTimeout(() => setFlash(""), 1100);
      prevEq.current = view.equity;
      return () => window.clearTimeout(t);
    }
    prevEq.current = view.equity;
  }, [view.equity]);
  const marks = view.fills.filter((f) => f.action === "buy").map((f) => f.at);
  return (
    <>
      <div className="sim-top">
        <div className={`sim-bal ${tone} ${flash}`}>{usd(view.equity)}</div>
      </div>
      <article className="card side sim-chart">
        <div className="sim-chart-head">
          <h2 className="card-title">Profit and loss</h2>
          <span className={`pnl-now ${tone}`}>{Math.abs(change) < 0.005 ? "$0.00" : signedDollars(change, 2)}</span>
        </div>
        <PnlChart points={view.curve} marks={marks} />
        <p className="cal pnl-note">
          The left edge stays on the minute this book started, so the whole line stays in view. Dots mark entries. Above
          zero is ahead of the $100 start. Fees are already out. An open trade is marked at the bid, minus the fee to
          sell. It is held to the end unless that bid, after the fee, beats our chance by 2¢ and is also above the price
          paid.
        </p>
      </article>
      {id === "combined" ? (
        <div className="sim-grid">
          <CallCard title="5-minute call" snap={snap} span={300} />
          <CallCard title="15-minute call" snap={snap} span={900} />
        </div>
      ) : id === "shadow" ? (
        <CallCard title="Shadow call" snap={snap} span={300} shadow />
      ) : (
        <CallCard title="Current call" snap={snap} span={id === "fifteen" ? 900 : 300} />
      )}
      <div className="sim-grid">
        <article className="card side">
          <h2 className="card-title">Open positions</h2>
          {view.positions.length === 0 ? (
            <p className="empty">Flat. Nothing is open.</p>
          ) : (
            view.positions.map((pos) => <PositionRows key={`${pos.span}-${pos.windowStart}`} pos={pos} snap={snap} view={view} />)
          )}
          {view.note && (
            <p className="cal">
              <FadeText text={view.note} />
            </p>
          )}
        </article>
        <article className="card side">
          <h2 className="card-title">How it trades</h2>
          <p className="empty">{rulesCopy(id)}</p>
        </article>
      </div>
      <RecordCard view={view} />
      <article className="card side sim-log">
        <div className="sim-chart-head">
          <h2 className="card-title">Trades</h2>
          {armed ? (
            <span className="confirm">
              <span>Reset to $100?</span>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  live.resetBook(id);
                  setArmed(false);
                }}
              >
                Reset
              </button>
              <button type="button" className="text-btn" onClick={() => setArmed(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="text-btn sim-reset" onClick={() => setArmed(true)}>
              Reset
            </button>
          )}
        </div>
        {view.fills.length === 0 ? (
          <p className="empty">Buys and sells show up here after a call is taken.</p>
        ) : (
          <ul className="fills">
            {view.fills.map((fill) => (
              <li key={fill.id}>
                <FillText fill={fill as SimFill} />
              </li>
            ))}
          </ul>
        )}
      </article>
    </>
  );
}

function rulesCopy(id: BookId): string {
  const exit =
    "One trade per window. A second buy was not added: early and late calls disagreed about a third of the time, and there is no old order book to price an add. It is held to the end. An early sell happens only when the bid, after the sell fee, is at least 2¢ above our own chance and also above the price paid.";
  const fee =
    "The fee is Polymarket's crypto fee, 7% of price times one minus price, on the buy and again if it is sold. A share held to the end pays $1 or $0. Nothing is sent to Polymarket.";
  if (id === "shadow") {
    return `${exit} Shadow is the 5-minute book with a 55¢ size safety instead of 65¢. Under that price the stake is smaller, not banned. Same calculated stake as the other books: half the Kelly fraction from the chance, the price, and the fee, cut when the window is still early, and never more than 25% of cash. It is not mixed into the other lines. ${fee}`;
  }
  if (id === "fifteen") {
    return `${exit} There is no fixed 12-minute gate. With more than 12 minutes left the stake is smaller, because those calls were weaker. At 12 minutes and after, the size is the full calculated fraction. A price under 65¢ is smaller too, not refused. ${fee} Pace is 18s, 30s, and 90s, the 5-minute windows times 3, and that scale was not fit. The 20¢ disagreement skip still applies.`;
  }
  if (id === "combined") {
    return `${exit} Each market keeps its own calculated stake. The 15-minute signal is checked first. If the other window is already on the same side, the second trade is half of that stake, so the same Bitcoin move is not sized twice. An opposite side stays at the full calculated stake. ${fee}`;
  }
  return `${exit} There is no fixed 3-minute gate and no fixed 10% stake. With more than 3 minutes left the stake is smaller. A price under 65¢ is smaller too, not refused. The percent is half the Kelly fraction from the chance, the price, and the fee, capped at 25% of cash. The call is the path chance, not a blend with the Up price. ${fee}`;
}

function CallCard({ snap, span, title, shadow = false }: { snap: Snap; span: 300 | 900; title: string; shadow?: boolean }) {
  const lane = span === 900 ? snap.lane15 : null;
  const model = lane ? lane.model : snap.model;
  const verdict = shadow ? snap.shadowLane.verdict : lane ? lane.verdict : snap.verdict;
  const reason = shadow ? snap.shadowLane.reason : lane ? lane.reason : snap.reason;
  const edge = shadow ? snap.shadowLane.edge : lane ? lane.edge : snap.edge;
  const gate = shadow ? snap.shadowLane.gate : lane ? lane.gate : snap.gate;
  const tau = span === 900 ? snap.lane15.tau : snap.windowStart ? remainParts(snap.now, snap.windowStart, 300).total : 0;
  const href = lane ? lane.polyHref : snap.polyHref;
  const head = verdict === "up" ? "Buy Up" : verdict === "down" ? "Buy Down" : "No trade";
  const towardDown = verdict === "down" || (verdict !== "up" && model != null && model.pUp < 0.5);
  const p = model ? (towardDown ? model.pDown : model.pUp) : null;
  const midPx = model ? (towardDown ? model.midDown : model.midUp) : null;
  const shownEdge = verdict === "skip" ? null : edge;
  return (
    <article className="card side">
      <h2 className="card-title">{title}</h2>
      <div className="term">
        <Row k="Prediction" v={head} />
        <Row k="Model chance" v={chanceLabel(p)} />
        <Row k="Polymarket chance" v={centsLabel(midPx)} />
        <Row k="Predicted edge" v={shownEdge == null ? "--" : signedCents(shownEdge)} />
        <Row k="Time left" v={clock(Math.floor(tau))} />
      </div>
      {gate && <GateChip gate={gate} />}
      <p className="cal">
        {reason ?? "Waiting."}{" "}
        <a href={href} target="_blank" rel="noreferrer">
          Polymarket
        </a>
      </p>
    </article>
  );
}

function PositionRows({ pos, snap, view }: { pos: Pos; snap: Snap; view: BookView }) {
  const ended = snap.now > (pos.windowStart + pos.span) * 1000;
  const alone = view.positions.length === 1;
  const openPnl = alone ? view.equity - view.cash - pos.cost : null;
  return (
    <div className="term pos-block">
      <Row k="Market" v={pos.span === 900 ? "15 min" : "5 min"} />
      <Row k="Holding" v={pos.side === "up" ? "Up" : "Down"} />
      <Row k="Bought at" v={`${Math.round(pos.entry * 100)}¢`} />
      <Row k="Shares" v={pos.shares.toFixed(2)} />
      <Row k="Spent" v={usd(pos.cost)} />
      {pos.pModel != null && <Row k="Model at entry" v={chanceLabel(pos.pModel)} />}
      {pos.edge != null && <Row k="Edge at entry" v={signedCents(pos.edge)} />}
      {pos.tau != null && <Row k="Seconds left then" v={String(Math.round(pos.tau))} />}
      {openPnl != null && <Row k="If sold now" v={signedDollars(openPnl, 2)} />}
      {ended && <Row k="Status" v="Window ended. Waiting for the result." />}
      {pos.openReason && <p className="cal">{pos.openReason}</p>}
    </div>
  );
}

function RecordCard({ view }: { view: BookView }) {
  const r = view.report;
  const winrate = r.n ? `${Math.round((r.wins / r.n) * 100)}%` : "--";
  return (
    <article className="card side sim-log">
      <h2 className="card-title">Record</h2>
      <div className="term">
        <Row k="Finished" v={String(r.n)} />
        <Row k="Won" v={r.n ? `${r.wins} of ${r.n}` : "--"} />
        <Row k="Lost" v={r.n ? String(r.losses) : "--"} />
        <Row k="Win rate" v={winrate} />
        <Row k="Realized" v={r.n ? signedDollars(r.realized, 2) : "--"} />
        <Row k="Fees" v={usd(view.fees)} />
        <Row k="Average win" v={r.avgWin == null ? "--" : signedDollars(r.avgWin, 2)} />
        <Row k="Average loss" v={r.avgLoss == null ? "--" : signedDollars(r.avgLoss, 2)} />
        <Row k="Max drawdown" v={view.drawdown == null ? "--" : usd(view.drawdown)} />
        <Row k="Average predicted edge" v={r.avgEdge == null ? "--" : `${signedCents(r.avgEdge)} a share`} />
        <Row k="Realized edge" v={r.realizedEdge == null ? "--" : `${signedCents(r.realizedEdge)} a share`} />
        <Row k="Brier, settled only" v={r.brier == null ? "--" : r.brier.toFixed(3)} />
        <Row k="Predicted edge, dollars" v={r.predicted == null ? "Not saved" : signedDollars(r.predicted, 2)} />
        <Row k="Those trades, realized" v={r.predictedRealized == null ? "--" : signedDollars(r.predictedRealized, 2)} />
        {r.buckets.map((b) => (
          <Row key={b.label} k={b.label} v={b.n ? `${b.wins} of ${b.n}, ${signedDollars(b.pnl, 2)}` : "0 trades"} />
        ))}
        {r.timeBuckets.map((b) => (
          <Row key={b.label} k={b.label} v={b.n ? `${b.wins} of ${b.n}, ${signedDollars(b.pnl, 2)}` : "0 trades"} />
        ))}
      </div>
      <BucketBars buckets={[...r.buckets, ...r.timeBuckets.filter((b) => b.label !== "Time not saved" || b.n > 0)]} />
      {weakness(r) && <p className="cal">{weakness(r)}</p>}
      <p className="cal">{r.note}</p>
      <p className="cal">Win rate is not profit. A favorite bought at 80¢ can win most of the time and still lose money.</p>
    </article>
  );
}

function Compare({ snap }: { snap: Snap }) {
  const cols = [snap.strategies.five, snap.strategies.fifteen, snap.strategies.combined];
  const cell = (v: string) => v;
  const ret = (view: BookView) => signedDollars(view.equity - 100, 2);
  const rate = (view: BookView) => (view.report.n ? `${Math.round((view.report.wins / view.report.n) * 100)}%` : "--");
  const edge = (n: number | null) => (n == null ? "--" : signedCents(n));
  return (
    <>
      <div className="compare-curves">
        {cols.map((c) => (
          <article key={c.id} className="card side">
            <h2 className="card-title">{c.name}</h2>
            <PnlChart points={c.curve} compact />
          </article>
        ))}
      </div>
      <article className="card side">
        <h2 className="card-title">Side by side</h2>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th> </th>
                {cols.map((c) => (
                  <th key={c.id}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Return</td>
                {cols.map((c) => (
                  <td key={c.id}>{cell(ret(c))}</td>
                ))}
              </tr>
              <tr>
                <td>Balance</td>
                {cols.map((c) => (
                  <td key={c.id}>{usd(c.equity)}</td>
                ))}
              </tr>
              <tr>
                <td>Cash</td>
                {cols.map((c) => (
                  <td key={c.id}>{usd(c.cash)}</td>
                ))}
              </tr>
              <tr>
                <td>Open</td>
                {cols.map((c) => (
                  <td key={c.id}>{String(c.positions.length)}</td>
                ))}
              </tr>
              <tr>
                <td>Trades</td>
                {cols.map((c) => (
                  <td key={c.id}>{String(c.report.n)}</td>
                ))}
              </tr>
              <tr>
                <td>Won</td>
                {cols.map((c) => (
                  <td key={c.id}>{String(c.report.wins)}</td>
                ))}
              </tr>
              <tr>
                <td>Lost</td>
                {cols.map((c) => (
                  <td key={c.id}>{String(c.report.losses)}</td>
                ))}
              </tr>
              <tr>
                <td>Win rate</td>
                {cols.map((c) => (
                  <td key={c.id}>{rate(c)}</td>
                ))}
              </tr>
              <tr>
                <td>Realized</td>
                {cols.map((c) => (
                  <td key={c.id}>{c.report.n ? signedDollars(c.report.realized, 2) : "--"}</td>
                ))}
              </tr>
              <tr>
                <td>Fees</td>
                {cols.map((c) => (
                  <td key={c.id}>{usd(c.fees)}</td>
                ))}
              </tr>
              <tr>
                <td>Avg win</td>
                {cols.map((c) => (
                  <td key={c.id}>{c.report.avgWin == null ? "--" : signedDollars(c.report.avgWin, 2)}</td>
                ))}
              </tr>
              <tr>
                <td>Avg loss</td>
                {cols.map((c) => (
                  <td key={c.id}>{c.report.avgLoss == null ? "--" : signedDollars(c.report.avgLoss, 2)}</td>
                ))}
              </tr>
              <tr>
                <td>Max drawdown</td>
                {cols.map((c) => (
                  <td key={c.id}>{c.drawdown == null ? "--" : usd(c.drawdown)}</td>
                ))}
              </tr>
              <tr>
                <td>Avg predicted edge</td>
                {cols.map((c) => (
                  <td key={c.id}>{edge(c.report.avgEdge)}</td>
                ))}
              </tr>
              <tr>
                <td>Realized edge</td>
                {cols.map((c) => (
                  <td key={c.id}>{edge(c.report.realizedEdge)}</td>
                ))}
              </tr>
              <tr>
                <td>Brier</td>
                {cols.map((c) => (
                  <td key={c.id}>{c.report.brier == null ? "--" : c.report.brier.toFixed(3)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="cal">{compareNote(cols)}</p>
        <p className="cal">
          These lines are live paper from the minute each book started. There is no historical fill test. The order book
          at the decision second is not public, so bids, asks, fees, and profit were not invented. The two clocks came
          from an 18-hour Binance path study, 215 five-minute windows and 71 fifteen-minute windows, not from profit.
          Under 30 finished trades, do not rank them. Win rate is not profit.
        </p>
      </article>
    </>
  );
}

function compareNote(views: BookView[]): string {
  const ready = views.filter((v) => v.report.n >= 30);
  if (!ready.length) {
    return "None of the three has 30 finished trades. A ranking now would be noise. A high win rate is not the same thing as making money.";
  }
  const byReturn = [...ready].sort((a, b) => b.equity - a.equity)[0];
  const byWin = [...ready].sort((a, b) => b.report.wins / b.report.n - a.report.wins / a.report.n)[0];
  const byDd = [...ready].sort((a, b) => (a.drawdown ?? 0) - (b.drawdown ?? 0))[0];
  const scored = ready.filter((v) => v.report.brier != null).sort((a, b) => (a.report.brier ?? 1) - (b.report.brier ?? 1));
  const scoreLine = scored.length ? `${scored[0].name} has the closer settled probability score.` : "Settled probabilities are not saved yet, so there is no score to rank.";
  return `Among books with at least 30 finished trades, ${byReturn.name} has the highest balance, ${byWin.name} has the highest win rate, and ${byDd.name} has the smallest drawdown. ${scoreLine} That is this sample, not proof.`;
}

function PnlChart({ points, marks = [], compact = false }: { points: SimPoint[]; marks?: number[]; compact?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const box = useRef<HTMLElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const next = Math.max(280, Math.round(el.clientWidth));
      setW((prev) => (Math.abs(prev - next) < 2 ? prev : next));
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
  let body = first ? <div className="pnl-wait" /> : <p className="empty">The line shows up as soon as the balance is marked.</p>;
  if (first && lastPoint && w > 0) {
    const last = lastPoint.pnl;
    let dataHi = 0;
    let dataLo = 0;
    for (const p of points) {
      if (p.pnl > dataHi) dataHi = p.pnl;
      if (p.pnl < dataLo) dataLo = p.pnl;
    }
    const span = Math.max(dataHi - dataLo, 0.25);
    const pad = span * 0.18;
    const hi = dataHi + pad;
    const lo = dataLo - pad;
    const plot = points.length === 1 ? [first, { t: first.t + 60_000, pnl: first.pnl }] : points;
    const t0 = plot[0].t;
    const t1 = plot[plot.length - 1].t;
    const spanT = Math.max(1, t1 - t0);
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const xOf = (t: number) => padL + ((t - t0) / spanT) * innerW;
    const yOf = (v: number) => padT + ((hi - v) / (hi - lo)) * innerH;
    const coords = plot.map((p) => ({ x: xOf(p.t), y: yOf(p.pnl) }));
    const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const zeroY = yOf(0);
    const end = coords[coords.length - 1];
    const area = `${line} L${end.x.toFixed(1)} ${zeroY.toFixed(1)} L${coords[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    const markDots = compact
      ? []
      : marks
          .filter((t) => t >= t0 && t <= t1)
          .map((t) => {
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
            return { x: xOf(t), y: yOf(pnl) };
          });
    const hasPos = dataHi > 0.005;
    const hasNeg = dataLo < -0.005;
    const both = hasPos && hasNeg;
    const stroke = both ? `url(#${gid}-stroke)` : hasNeg ? "#ff6161" : "#3dce7a";
    const fill = both ? `url(#${gid}-fill)` : hasNeg ? "rgba(255,97,97,0.16)" : "rgba(61,206,122,0.16)";
    const pct = Math.max(0, Math.min(99.6, ((zeroY - padT) / innerH) * 100));
    const labels: { v: number; y: number }[] = [];
    for (const c of [
      { v: dataHi, y: yOf(dataHi) },
      { v: 0, y: zeroY },
      { v: dataLo, y: yOf(dataLo) },
    ]) {
      if (labels.some((u) => Math.abs(u.y - c.y) < 16)) continue;
      labels.push(c);
    }
    const tLabel = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    body = (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Profit and loss ${usd(last)} from the $100 start.`}>
        {both && (
          <defs>
            <linearGradient id={`${gid}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1={padT} x2="0" y2={padT + innerH}>
              <stop offset="0%" stopColor="#3dce7a" stopOpacity="0.28" />
              <stop offset={`${pct}%`} stopColor="#3dce7a" stopOpacity="0.05" />
              <stop offset={`${pct + 0.4}%`} stopColor="#ff6161" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ff6161" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id={`${gid}-stroke`} gradientUnits="userSpaceOnUse" x1="0" y1={padT} x2="0" y2={padT + innerH}>
              <stop offset="0%" stopColor="#3dce7a" />
              <stop offset={`${pct}%`} stopColor="#3dce7a" />
              <stop offset={`${pct + 0.4}%`} stopColor="#ff6161" />
              <stop offset="100%" stopColor="#ff6161" />
            </linearGradient>
          </defs>
        )}
        <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="rgba(139,144,150,0.55)" strokeDasharray="3 4" />
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {markDots.map((d) => (
          <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="2.4" fill="#f4f4f6" stroke="#0c0d0f" strokeWidth="1" />
        ))}
        <circle cx={end.x} cy={end.y} r="3.2" fill={last < -0.005 ? "#ff6161" : "#3dce7a"} />
        {labels.map((c) => (
          <text key={`${c.v}-${c.y}`} x={padL - 8} y={c.y + 3.5} textAnchor="end" fill="#8b9096" fontSize="11" fontFamily="var(--mono)">
            {axisMoney(c.v)}
          </text>
        ))}
        <text x={padL} y={h - 8} fill="#8b9096" fontSize="11" fontFamily="var(--mono)">
          {compact ? "" : tLabel(first.t)}
        </text>
        {!compact && points.length > 1 && (
          <text x={w - padR} y={h - 8} textAnchor="end" fill="#8b9096" fontSize="11" fontFamily="var(--mono)">
            {tLabel(lastPoint.t)}
          </text>
        )}
      </svg>
    );
  }
  return (
    <figure className="pnl-fig" ref={box}>
      {body}
    </figure>
  );
}

function axisMoney(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  if (abs < 0.005) return "$0";
  const body = dollars(abs, digits);
  return n > 0 ? `+$${body}` : `-$${body}`;
}

function FillText({ fill }: { fill: SimFill }) {
  const side = fill.side === "up" ? "Up" : "Down";
  const px = fill.action === "settle" ? (fill.price >= 1 ? "$1" : "$0") : `${Math.round(fill.price * 100)}¢`;
  const when = new Date(fill.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  if (fill.action === "buy") {
    return (
      <>
        <b>Bought {side}</b> at {px}. Fee {usd(fill.fee)} of {usd(fill.shares * fill.price + fill.fee)} spent. Cash {usd(fill.cash)}.{" "}
        {fill.span === 900 ? <span>15 min</span> : <span>5 min</span>} <span>{when}</span>
        <FillMeta fill={fill} />
        {fill.reason && <span className="fill-why">{fill.reason}</span>}
      </>
    );
  }
  const pnl = fill.pnl ?? 0;
  const verb = fill.action === "sell" ? "Sold" : "Settled";
  return (
    <>
      <b className={pnl >= 0 ? "pos" : "neg"}>
        {verb} {side}
      </b>{" "}
      at {px}. {fill.action === "sell" && fill.fee > 0.0005 ? <>Fee {usd(fill.fee)}. </> : null}
      {pnl >= 0 ? "Made" : "Lost"} {usd(Math.abs(pnl))}
      {fill.action === "sell" ? " after fees" : ""}. Cash {usd(fill.cash)}.{" "}
      {fill.span === 900 ? <span>15 min</span> : <span>5 min</span>} <span>{when}</span>
      <FillMeta fill={fill} />
      {fill.reason && <span className="fill-why">{fill.reason}</span>}
    </>
  );
}

function FillMeta({ fill }: { fill: SimFill }) {
  if (fill.pModel == null && fill.edge == null && fill.tau == null && fill.priceAgeMs == null && !fill.targetKind) return null;
  const bits = [
    fill.pModel == null ? null : `model ${Math.round(fill.pModel * 100)}%`,
    fill.edge == null ? null : `edge ${signedCents(fill.edge)}`,
    fill.tau == null ? null : `${Math.round(fill.tau)}s left`,
    fill.targetKind ? targetWord(fill.targetKind) : null,
    fill.priceAgeMs == null ? null : `price ${(Math.max(0, fill.priceAgeMs) / 1000).toFixed(1)}s old`,
  ].filter(Boolean);
  return <span className="fill-meta">{bits.join(", ")}</span>;
}

function targetWord(k: string): string {
  if (k === "polymarket") return "polymarket open";
  if (k === "estimated") return "estimated open";
  if (k === "manual") return "typed open";
  return k;
}

function usd(n: number): string {
  const body = dollars(Math.abs(n), 2);
  return n < -0.004 ? `-$${body}` : `$${body}`;
}

function Tile({
  side,
  cents,
  solid,
  dir,
  resolving,
  shine,
  ask,
  modelP,
}: {
  side: Side;
  cents: number | null;
  solid: boolean;
  dir: 1 | -1 | 0;
  resolving: boolean;
  shine: number;
  ask: number | null;
  modelP: number | null;
}) {
  const label = side === "up" ? "Up" : "Down";
  return (
    <div className={solid ? "beam-wrap" : "tile-slot"}>
      {solid && <span className="beam-spin" aria-hidden="true" />}
      <div className={`tile ${side} ${solid ? "solid" : ""} ${dir !== 0 ? "pop" : ""}`} aria-label={resolving ? `${label} resolving` : `${label} ${cents ?? "--"} cents`}>
        {shine > 0 && <span key={shine} className="shine" aria-hidden="true" />}
        {resolving ? (
          <span className="resolving">Resolving</span>
        ) : (
          <span className={`num ${!solid && dir > 0 ? "flash-up" : ""} ${!solid && dir < 0 ? "flash-down" : ""}`}>
            <RollingNumber text={cents == null ? "--" : String(cents)} dir={dir} />
            {cents != null && <span className="cent">¢</span>}
          </span>
        )}
        <span className="side">{label}</span>
        {solid && ask != null && modelP != null && (
          <span className="edge-tick" aria-hidden="true" title="Ask against the model chance">
            <i className="model" style={{ left: `${Math.max(0, Math.min(100, modelP * 100))}%` }} />
            <i className="ask" style={{ left: `${Math.max(0, Math.min(100, ask * 100))}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}

function MathCard({ snap }: { snap: Snap }) {
  const m = snap.model;
  const s = live.settings();
  const [open, setOpen] = useState(false);
  return (
    <article className="card side">
      <h2 className="card-title">Math</h2>
      {!m ? (
        <p className="empty">Waiting for a price and a price to beat.</p>
      ) : (
        <div className="term">
          <Row k="Up chance" v={chanceLabel(m.pUp)} />
          <Row k="Down chance" v={chanceLabel(m.pDown)} />
          <Row k="Gap" v={signedDollars(m.gap, 2)} />
          <Row k="Read" v={snap.call === "up" ? "Up" : snap.call === "down" ? "Down" : "No call"} />
        </div>
      )}
      {m && (
        <button type="button" className="text-btn math-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Hide the inputs" : "All the inputs"}
        </button>
      )}
      {m && open && (
        <div className="term">
          <div className="term-h">Price</div>
          <Row k="Price" v={`$${dollars(m.S, 2)}`} />
          <Row k="Price to beat" v={`$${dollars(m.K, 2)}`} />
          <Row k="Gap" v={signedDollars(m.gap, 2)} />
          <Row k="Seconds left" v={m.tau.toFixed(0)} />
          <Row k="History" v={`${snap.historySeconds}s`} />
          <div className="term-h">Path</div>
          <Row k="6s trend" v={moveLabel(m.velImpulse)} />
          <Row k="10s trend" v={moveLabel(m.velShort)} />
          <Row k="30s trend" v={moveLabel(m.driftPerSec)} />
          <Row k="Acceleration" v={accelLabel(m.accel)} />
          <Row k="Projected gap" v={signedDollars(m.projectedGap, 1)} />
          <Row k="Cross in" v={m.crossSec == null ? "Not toward the line" : `${Math.max(1, Math.round(m.crossSec))}s`} />
          <Row k="Lookahead" v={`${Math.round(m.horizon)}s`} />
          <Row k="Wobble" v={`${(m.sigma * m.S).toFixed(2)} $/s`} />
          <Row k="Tail" v={s.tail.toFixed(2)} />
          <Row k="Basis" v={`$${s.basis.toFixed(0)}`} />
          <Row k="Range left" v={`$${m.totalSd.toFixed(0)}`} />
          <Row k="z" v={m.z.toFixed(2)} />
          <div className="term-h">Market</div>
          <Row k="Up just moved" v={signedCents(m.marketDelta)} />
          <Row k="Up mid" v={centsLabel(m.midUp)} />
          <Row k="Down mid" v={centsLabel(m.midDown)} />
          <Row k="Blend up, not used" v={m.pBlend == null ? "--" : `${Math.round(m.pBlend * 100)}%`} />
          <Row k="Up ask" v={centsLabel(m.askUp)} />
          <Row k="Down ask" v={centsLabel(m.askDown)} />
          <Row k="Up fee" v={m.feeUp == null ? "--" : signedCents(m.feeUp).replace("+", "")} />
          <Row k="Down fee" v={m.feeDown == null ? "--" : signedCents(m.feeDown).replace("+", "")} />
          <Row k="Up edge" v={m.edgeUp == null ? "--" : signedCents(m.edgeUp)} />
          <Row k="Down edge" v={m.edgeDown == null ? "--" : signedCents(m.edgeDown)} />
          <Row k="Up round trip" v={m.roundTripUp == null ? "--" : signedCents(m.roundTripUp)} />
          <Row k="Down round trip" v={m.roundTripDown == null ? "--" : signedCents(m.roundTripDown)} />
          <Row k="Up spread" v={m.spreadUp == null ? "--" : signedCents(m.spreadUp).replace("+", "")} />
          <Row k="Down spread" v={m.spreadDown == null ? "--" : signedCents(m.spreadDown).replace("+", "")} />
          <div className="term-h">Rules</div>
          <Row k="Min edge" v={signedCents(s.minEdge).replace("+", "")} />
          <Row k="Size safety" v={`${Math.round(s.minAsk * 100)}¢`} />
          <Row k="Buy up to" v={s.maxAsk == null ? "No cap" : `${Math.round(s.maxAsk * 100)}¢`} />
          <Row k="Stake" v={snap.kellyFrac == null ? "Calculated" : `${Math.round(snap.kellyFrac * 1000) / 10}% of cash`} />
        </div>
      )}
      {m && open && (
        <p className="cal">
          Round trip is the bid minus the ask, with the fee both ways. The call uses the hold-to-end edge, which only pays
          the buy fee. A chance at the cap is shown as over 99% or under 1%, not as 100%.
        </p>
      )}
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="trow">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function moveLabel(v: number): string {
  if (Math.abs(v) < 0.35) return "Flat";
  const body = `$${Math.abs(v).toFixed(2)}/s`;
  return v > 0 ? `Up ${body}` : `Down ${body}`;
}

function accelLabel(v: number): string {
  if (Math.abs(v) < 0.15) return "Steady";
  return v > 0 ? "Turning up" : "Turning down";
}

function TapeCard({ snap }: { snap: Snap }) {
  const rows = snap.tape.slice().reverse();
  const hits = snap.hitRate == null ? 0 : Math.round(snap.hitRate * snap.hitN);
  return (
    <article className="card side">
      <h2 className="card-title">Tape</h2>
      <div className="accuracy">
        <span className="k">Wick accuracy</span>
        <b>{snap.hitN > 0 && snap.hitRate != null ? `${Math.round(snap.hitRate * 100)}%` : "--"}</b>
        <span>
          {snap.hitN > 0
            ? `${hits} of ${snap.hitN} ${snap.hitN === 1 ? "call" : "calls"}`
            : "Shows after wick calls a side and the window closes."}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">Past windows show up here after they close.</p>
      ) : (
        <div className="tape-list">
          {rows.map((row) => (
            <div key={row.windowStart} className={`tm ${row.outcome} ${row.correct === false ? "miss" : ""}`}>
              {shortTime(row.windowStart)} {row.outcome === "up" ? "Up" : "Down"}
              {row.correct == null ? "" : row.correct ? " hit" : " miss"}
              {row.confirmed ? "" : " provisional"}
            </div>
          ))}
        </div>
      )}
      <p className="cal">{scoreText(snap)}</p>
      <Reliability bins={snap.reliability} />
      {snap.paperSettled > 0 && (
        <p className="cal">
          Personal $1 log {snap.paperPnl >= 0 ? "+" : "-"}${Math.abs(snap.paperPnl).toFixed(2)} from {snap.paperSettled} finished{" "}
          {snap.paperSettled === 1 ? "note" : "notes"}. This is not a book.
        </p>
      )}
      {snap.paper.length > 0 && (
        <button type="button" className="text-btn" onClick={() => live.exportCsv()}>
          Download $1 log
        </button>
      )}
    </article>
  );
}

function scoreText(snap: Snap): string {
  const n = snap.scoreN;
  const path = snap.brierModel == null ? "--" : snap.brierModel.toFixed(3);
  const blend = snap.brierBlend == null ? "--" : snap.brierBlend.toFixed(3);
  const market = snap.brierMarket == null ? "--" : snap.brierMarket.toFixed(3);
  const older = snap.calibN > n ? ` ${snap.calibN - n} older windows are left out, because their saved chance treated a price change as a probability.` : "";
  if (n === 0) {
    return `Path, blend, and market scores show up after a window closes. Lower is closer.${older}`;
  }
  let tail = "Under 30 windows, so this does not pick a winner.";
  if (n >= 30 && snap.brierModel != null && snap.brierBlend != null && snap.brierMarket != null) {
    const rows: [string, number][] = [
      ["path", snap.brierModel],
      ["blend", snap.brierBlend],
      ["market", snap.brierMarket],
    ];
    rows.sort((a, b) => a[1] - b[1]);
    const best = rows[0][0];
    tail =
      best === "path"
        ? "The path score is the lowest. Calls use the path."
        : best === "market"
          ? "The market score is lower. Calls still use the path. Copying the Up price leaves nothing to trade."
          : "The blend score is lower. Calls still use the path, so mixing in the Up price is only a score.";
  }
  return `Score, lower is closer. Path ${path}, blend ${blend}, market ${market}, over ${n} windows. The blend is half the path and half the Up price.${older} ${tail}`;
}

function workerLine(w: WorkerHealth, now: number): string {
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
  const age = w.feedAgeMs != null ? `, feed ${Math.max(0, Math.round(w.feedAgeMs / 100) / 10)}s` : "";
  return `Worker leading, ${up}, ${updated}, ${price}${age}, ${book}, ${book15}. Paper only. This page can close.`;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function spanLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function shortTime(startSec: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startSec * 1000));
}

function Settings({ snap, onClose }: { snap: Snap; onClose: () => void }) {
  const [form, setForm] = useState<Settings>(() => live.settings());

  function patch(p: Partial<Settings>) {
    const next = { ...form, ...p };
    setForm(next);
    live.patchSettings(p);
  }

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawer-h">
          <h2>Settings</h2>
          <button type="button" className="gear" onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>
        <div className="health">
          <span>
            Price {snap.sourceLabel} {snap.priceLive ? "live" : "reconnecting"}
            {snap.priceAgeMs != null ? ` ${Math.max(0, Math.round(snap.priceAgeMs / 100) / 10)}s` : ""}
          </span>
          <span>Book {snap.clobLive ? "live" : "rest"}</span>
          <span>Reconnects {snap.reconnects}</span>
        </div>
        <Field label="Lookback, seconds" value={form.lookbackSec} step={30} onChange={(n) => patch({ lookbackSec: n })} />
        <Field label="Extra caution on the wobble" value={form.tail} step={0.05} onChange={(n) => patch({ tail: n })} />
        <Field label="Exchange gap, dollars" value={form.basis} step={1} onChange={(n) => patch({ basis: n })} />
        <Field label="How much cheaper, cents" value={Math.round(form.minEdge * 1000) / 10} step={0.5} onChange={(n) => patch({ minEdge: n / 100 })} />
        <Field label="Size safety, cents" value={Math.round(form.minAsk * 1000) / 10} step={1} onChange={(n) => patch({ minAsk: n / 100 })} />
        <label className="field">
          Highest buy, cents
          <input
            type="number"
            step={1}
            placeholder="No cap"
            value={form.maxAsk == null ? "" : Math.round(form.maxAsk * 1000) / 10}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") patch({ maxAsk: null });
              else {
                const n = Number(raw);
                if (Number.isFinite(n)) patch({ maxAsk: n / 100 });
              }
            }}
          />
        </label>
        <label className="field">
          Price source
          <select value={form.feed} onChange={(e) => patch({ feed: e.target.value as Settings["feed"] })}>
            <option value="chainlink">Chainlink 60s average</option>
            <option value="coinbase">Coinbase</option>
            <option value="binance">Binance</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.sound} onChange={(e) => patch({ sound: e.target.checked })} />
          Soft click on a book fill and on a $1 log
        </label>
        <p className="hint">
          The stake is half the Kelly fraction from the chance, the price, and the fee. It is smaller when the window is still early, and smaller under this safety price. It is not a ban, and it is not 10%. The cap is 25% of that book's cash. Combined uses half of that when the other window is already on the same side. Shadow uses 55¢ as its safety price. A buy still has to clear this extra edge, and also the fee plus the spread. Leave the highest buy empty for no cap. U and D log a personal $1. That log is not a book. Settings and resets are sent to the worker. The books keep running when this page is closed. Chainlink 60s is the price their chart uses.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (n: number) => void }) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

function mid(q: { bid: number | null; ask: number | null }): number | null {
  if (q.bid != null && q.ask != null) return (q.bid + q.ask) / 2;
  return q.ask ?? q.bid;
}

function centsOf(q: { bid: number | null; ask: number | null }): number | null {
  const m = mid(q);
  if (m == null) return null;
  return Math.round(m * 100);
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.2 8.8 L8.8 3.2 M5 3.2 H8.8 V7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function openTitle(snap: Snap): string | null {
  const names: [BookId, string][] = [
    ["five", "5 min"],
    ["fifteen", "15 min"],
    ["combined", "Combined"],
    ["shadow", "Shadow"],
  ];
  for (const [id, name] of names) {
    const pos = snap.strategies[id].positions[0];
    if (pos) return `${name} ${pos.side === "up" ? "Up" : "Down"} open`;
  }
  return null;
}

function GateChip({ gate }: { gate: { label: string; left: string; right: string } }) {
  return (
    <span className={`gate-chip ${gate.label === "Cleared" ? "ok" : ""}`}>
      <b>{gate.label}</b>
      <span>{gate.left}</span>
      <span>vs {gate.right}</span>
    </span>
  );
}

function ClockLane({
  label,
  tau,
  openAt,
  call,
  gate,
  href,
}: {
  label: string;
  tau: number;
  openAt: number;
  call: "up" | "down" | "skip";
  gate: { label: string; left: string; right: string } | null;
  href: string;
}) {
  const total = Math.max(0, Math.floor(tau));
  const hot = total > 0 && total <= openAt;
  const head = call === "up" ? "Buy Up" : call === "down" ? "Buy Down" : "No trade";
  return (
    <a className={`clock-lane ${hot ? "hot" : "quiet"}`} href={href} target="_blank" rel="noreferrer">
      <span className="k">{label}</span>
      <b>{clock(total)}</b>
      <span className={`call ${call}`}>{head}</span>
      {gate && <GateChip gate={gate} />}
    </a>
  );
}

function FadeText({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (text === shown) return;
    setOn(false);
    const t = window.setTimeout(() => {
      setShown(text);
      setOn(true);
    }, 140);
    return () => window.clearTimeout(t);
  }, [text, shown]);
  return <span className={on ? "fade-in" : "fade-out"}>{shown}</span>;
}

function weakness(r: BookView["report"]): string | null {
  const ready = [...r.buckets, ...r.timeBuckets].filter((b) => b.n >= 20);
  if (!ready.length) return null;
  const worst = [...ready].sort((a, b) => a.pnl / a.n - b.pnl / b.n)[0];
  if (worst.pnl >= -0.005) return null;
  return `${worst.label} is the weak pocket so far: ${worst.wins} of ${worst.n}, ${signedDollars(worst.pnl, 2)}. That is this sample, not a new rule.`;
}

function BucketBars({ buckets }: { buckets: { label: string; n: number; wins: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <div className="buckets">
      {buckets.map((b) => (
        <div key={b.label} className="bucket">
          <span>{b.label}</span>
          <span className="bar">
            <i style={{ width: `${(b.n / max) * 100}%` }} />
          </span>
          <span>{b.n ? `${b.wins}/${b.n}` : "0"}</span>
        </div>
      ))}
    </div>
  );
}

function Reliability({ bins }: { bins: RelBin[] }) {
  if (!bins.length) {
    return <p className="cal">Reliability waits for 30 closed windows with a saved blend score. It does not change the call.</p>;
  }
  return (
    <div className="rel" aria-label="Path chance against how often Up won">
      {bins.map((b) => (
        <div key={b.lo} className="rel-col">
          <i style={{ height: `${Math.round(Math.max(b.n ? 4 : 0, b.up * 100))}%` }} />
          <span>{Math.round(b.lo * 100)}%</span>
          <span>{b.n ? `${Math.round(b.up * 100)}% up` : "empty"}</span>
          <span>n {b.n}</span>
        </div>
      ))}
    </div>
  );
}

function ScratchCard({ snap }: { snap: Snap }) {
  const rows = snap.scratches.slice().reverse();
  if (!rows.length) return null;
  return (
    <article className="card side scratch-card">
      <h2 className="card-title">Recent windows</h2>
      <div className="scratch-grid">
        {rows.map((s) => (
          <div key={s.windowStart} className="scratch">
            <div className="k">{shortTime(s.windowStart)}</div>
            <ScratchSpark series={s.series} target={s.target} />
            <div>
              {s.verdict === "skip" ? "No trade" : s.verdict === "up" ? "Called Up" : "Called Down"}
              {s.outcome ? ` · closed ${s.outcome === "up" ? "Up" : "Down"}` : ""}
              {s.targetKind && s.targetKind !== "polymarket" ? " · estimated open" : ""}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ScratchSpark({ series, target }: { series: { t: number; p: number }[]; target: number | null }) {
  if (series.length < 2) return <div className="scratch-empty">No path saved</div>;
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
  const d = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((p.p - lo) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const yT = target == null ? null : h - ((target - lo) / span) * (h - 4) - 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {yT != null && <line x1="0" y1={yT} x2={w} y2={yT} stroke="rgba(139,144,150,0.7)" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke="#ff9317" strokeWidth="1.4" />
    </svg>
  );
}
