import { useEffect, useRef, useState } from "react";
import type { Chip, Snap } from "@/lib/wick/engine";
import { live } from "@/lib/wick/live";
import { clock, dollars, remainParts, signedDollars } from "@/lib/wick/format";
import { RollingNumber, useTickDir } from "./Digits";

export function ChartCard({ snap, reduced }: { snap: Snap; reduced: boolean }) {
  const plotRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const sparkWrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<PlotView>({ min: null, max: null, win: 0, price: null, sigma: null });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const priceKey = snap.price == null ? null : Math.round(snap.price * 100);
  const dir = useTickDir(priceKey);
  const left = snap.windowStart ? remainParts(snap.now, snap.windowStart) : { m: 0, s: 0, total: 0 };
  const minKey = snap.phase === "resolving" ? null : left.m;
  const secKey = snap.phase === "resolving" ? null : left.total;
  const minDir = useTickDir(minKey);
  const secDir = useTickDir(secKey);
  const gap = snap.price != null && snap.target != null ? snap.price - snap.target : null;

  const snapRef = useRef(snap);
  snapRef.current = snap;

  useEffect(() => {
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

  function commit(raw: string) {
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 1000) live.setTarget(n);
    setEditing(false);
  }

  return (
    <article className="card chart">
      <header className="hd">
        <div className="stat">
          <div className="k">{targetLabel}</div>
          {editing ? (
            <input
              className="target-input quote"
              autoFocus
              inputMode="decimal"
              aria-label="Price to beat"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(draft);
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="target-btn quote"
              onClick={() => {
                setDraft(snap.target != null ? String(Math.round(snap.target * 100) / 100) : "");
                setEditing(true);
              }}
            >
              {snap.target == null ? "--" : `$${dollars(snap.target, 2)}`}
            </button>
          )}
        </div>
        <span className="vdiv" aria-hidden="true" />
        <div className="stat">
          <div className="k orange k-row">
            <span>Current price</span>
            {gap != null && (
              <span className={`gap ${gap >= 0 ? "pos" : "neg"}`}>
                <Caret up={gap >= 0} />
                {`$${Math.abs(Math.round(gap)).toLocaleString("en-US")}`}
              </span>
            )}
          </div>
          <div className={`quote live ${dir > 0 ? "flash-up" : dir < 0 ? "flash-down" : ""}`}>
            <RollingNumber text={snap.price == null ? "--" : `$${dollars(snap.price, 2)}`} dir={dir} />
          </div>
        </div>
        <div className={`count ${snap.phase === "open" && left.total > 0 && left.total <= 180 ? "hot" : "quiet"}`} aria-label={`${left.m} minutes ${left.s} seconds left`}>
          <div>
            <b>
              <RollingNumber text={String(left.m).padStart(2, "0")} dir={minDir} />
            </b>
            <small>mins</small>
          </div>
          <div>
            <b>
              <RollingNumber text={String(left.s).padStart(2, "0")} dir={secDir} />
            </b>
            <small>secs</small>
          </div>
        </div>
      </header>
      <p className="distance">{distance}</p>
      <div className="plot" ref={wrapRef}>
        <canvas ref={plotRef} />
        <Chips chips={snap.chips} now={snap.now} />
      </div>
      <div className="range-note">
        <i className="sw hot" />
        <i className="sw pale" />
        <span>The brighter band is the tighter range. It narrows as time runs out and widens when Bitcoin moves faster. The paler band is the wider range.</span>
      </div>
      <div className="spark-key">
        <span className="m">Our chance</span>
        <span className="kkt">Market</span>
      </div>
      <div className="sparkline" ref={sparkWrapRef}>
        <canvas ref={sparkRef} />
      </div>
    </article>
  );
}

function Chips({ chips, now }: { chips: Chip[]; now: number }) {
  return (
    <div className="chips" aria-hidden="true">
      {chips.map((c) => (
        <span key={c.id} className={c.delta >= 0 ? "chip pos" : "chip neg"} style={{ opacity: Math.max(0, 1 - (now - c.at) / 4200) }}>
          {signedDollars(c.delta, 0)}
        </span>
      ))}
    </div>
  );
}

function Caret({ up }: { up: boolean }) {
  return (
    <svg className="caret" viewBox="0 0 10 10" aria-hidden="true">
      {up ? <path d="M5 1.5 L9 8 H1 Z" fill="currentColor" /> : <path d="M1 2 H9 L5 8.5 Z" fill="currentColor" />}
    </svg>
  );
}

type PlotView = { min: number | null; max: number | null; win: number; price: number | null; sigma: number | null };

function drawPlot(ctx: CanvasRenderingContext2D, w: number, h: number, snap: Snap, reduced: boolean, view: PlotView) {
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
  const nowSec = start ? Math.min(end, Math.max(start, Date.now() / 1000)) : 0;
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
    view.min += (min - view.min) * 0.12;
    view.max += (max - view.max) * 0.12;
    if (S != null) {
      if (view.price == null) view.price = S;
      else view.price += (S - view.price) * 0.1;
    }
  }
  const yMin = view.min ?? min;
  const yMax = Math.max(view.max ?? max, yMin + 1);
  const shown = view.price ?? S;
  const xOf = (t: number) => padL + ((t - start) / 300) * plotW;
  const yOf = (p: number) => padT + ((yMax - p) / (yMax - yMin)) * plotH;
  const xNow = start ? xOf(nowSec) : padL;
  const rawSigma = shown == null ? 2 : Math.min(Math.max((snap.model?.sigma ?? snap.sigma) * shown, 0.45), 5);
  if (view.sigma == null || windowChanged) view.sigma = rawSigma;
  else view.sigma += (rawSigma - view.sigma) * (reduced ? 1 : 0.06);
  const priceSigma = view.sigma ?? rawSigma;

  ctx.strokeStyle = "#242728";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#8d9398";
  ctx.font = "11px 'Geist Mono Variable', ui-monospace, monospace";
  ctx.textAlign = "right";
  const yTarget = K == null ? null : yOf(K);
  for (let i = 0; i <= 3; i++) {
    const p = yMin + ((yMax - yMin) * i) / 3;
    const y = yOf(p);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    if (yTarget != null && Math.abs(y - yTarget) < 14) continue;
    ctx.fillText(Math.round(p).toLocaleString("en-US"), padL - 8, y + 3);
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
    ctx.rect(padL, padT - 2, plotW, plotH + 4);
    ctx.clip();
    const fan = (mult: number, alpha: string) => {
      const steps = 28;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = (tau * i) / steps;
        const sd = Math.sqrt(priceSigma ** 2 * u + basis ** 2) * mult;
        const x = xOf(nowSec + u);
        const y = yOf(shown + sd);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const u = (tau * i) / steps;
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
    const bx = padL + 8;
    const by = Math.min(padT + plotH - 24, Math.max(padT + 4, y - 11));
    roundRect(ctx, bx, by, tw + 12, 20, 999);
    ctx.fillStyle = "#121212";
    ctx.fill();
    ctx.strokeStyle = "#242728";
    ctx.stroke();
    ctx.fillStyle = "#c2c7ca";
    ctx.textAlign = "left";
    ctx.fillText(label, bx + 6, by + 14);
  }

  if (pts.length && start) {
    ctx.beginPath();
    ctx.strokeStyle = "#ff9317";
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const head = shown ?? pts[pts.length - 1].p;
    const drawn = pts.map((p, i) => (i === pts.length - 1 ? { t: p.t, p: head } : p));
    smoothLine(ctx, drawn, xOf, yOf);
    const last = drawn[drawn.length - 1];
    if (nowSec > last.t) ctx.lineTo(xNow, yOf(head));
    ctx.stroke();
  }

  if (shown != null && start) {
    const y = yOf(shown);
    const pulse = reduced ? 0 : (Math.sin(performance.now() / 280) + 1) / 2;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,147,23,${0.28 - pulse * 0.16})`;
    ctx.arc(xNow, y, 8 + pulse * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ff9317";
    ctx.arc(xNow, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function smoothLine(
  ctx: CanvasRenderingContext2D,
  pts: { t: number; p: number }[],
  xOf: (t: number) => number,
  yOf: (p: number) => number,
) {
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

function drawSpark(ctx: CanvasRenderingContext2D, w: number, h: number, snap: Snap) {
  const pts = snap.spark;
  ctx.strokeStyle = "#242728";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 0.5);
  ctx.lineTo(w, h - 0.5);
  ctx.stroke();
  if (pts.length < 2 || !snap.windowStart) return;
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const xOf = (t: number) => ((t - t0) / (t1 - t0)) * (w - 8) + 4;
  const yOf = (p: number) => 6 + (1 - Math.min(1, Math.max(0, p))) * (h - 12);
  const line = (pick: (p: { model: number; market: number }) => number, color: string) => {
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

function readLine(snap: Snap): string {
  const left = snap.windowStart ? remainParts(snap.now, snap.windowStart) : { m: 0, s: 0, total: 0 };
  if (snap.price == null) return "Waiting for the Bitcoin price.";
  if (snap.target == null) return "Waiting for the price to beat.";
  const gap = snap.price - snap.target;
  const dollarsOff = Math.abs(Math.round(gap));
  const where =
    dollarsOff < 1
      ? "right on the price to beat"
      : gap > 0
        ? `$${dollarsOff.toLocaleString("en-US")} above the price to beat`
        : `$${dollarsOff.toLocaleString("en-US")} below the price to beat`;
  const vel = snap.model?.driftPerSec ?? 0;
  const move = Math.abs(vel) < 0.35 ? "" : vel > 0 ? " and rising" : " and falling";
  return `Bitcoin is ${where}${move}, with ${clock(left.total)} left.`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
