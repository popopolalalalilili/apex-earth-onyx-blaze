const TZ = "America/New_York";

export function windowStart(nowMs: number, span = 300): number {
  const sec = Math.floor(nowMs / 1000);
  const step = span === 900 ? 900 : 300;
  return sec - (sec % step);
}

export function formatWindow(startSec: number, span = 300): string {
  const step = span === 900 ? 900 : 300;
  const a = parts(startSec);
  const b = parts(startSec + step);
  if (a.ap === b.ap) return `Window ${a.hm} to ${b.hm} ${a.ap} ET`;
  return `Window ${a.hm} ${a.ap} to ${b.hm} ${b.ap} ET`;
}

function parts(sec: number): { hm: string; ap: string } {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(sec * 1000));
  const m = s.match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
  if (!m) return { hm: s, ap: "" };
  return { hm: m[1], ap: m[2].toUpperCase() };
}

export function remainParts(nowMs: number, startSec: number, span = 300): { m: number; s: number; total: number } {
  const step = span === 900 ? 900 : 300;
  const left = Math.max(0, Math.floor(((startSec + step) * 1000 - nowMs) / 1000));
  return { m: Math.floor(left / 60), s: left % 60, total: left };
}

export function clock(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function dollars(n: number, digits = 2): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function signedDollars(n: number, digits = 0): string {
  const v = digits === 0 ? Math.round(n) : n;
  const body = dollars(Math.abs(v), digits);
  if (v > 0) return `+$${body}`;
  if (v < 0) return `-$${body}`;
  return `$${body}`;
}

export function centsLabel(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "--";
  return `${Math.round(p * 100)}¢`;
}

/** 0.995 is the cap, not a sure thing. Do not print it as 100%. */
export function chanceLabel(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "--";
  if (p >= 0.995) return ">99%";
  if (p <= 0.005) return "<1%";
  return `${Math.round(p * 100)}%`;
}

export function signedCents(edge: number): string {
  const c = edge * 100;
  const body = Math.abs(c).toFixed(1);
  if (c > 0) return `+${body}¢`;
  if (c < 0) return `-${body}¢`;
  return "0.0¢";
}

export function pct(n: number): string {
  const v = n * 100;
  const body = Math.abs(v) >= 10 ? Math.abs(v).toFixed(0) : Math.abs(v).toFixed(1);
  if (v > 0) return `+${body}%`;
  if (v < 0) return `-${body}%`;
  return "0%";
}

export function polyUrl(startSec: number, span = 300): string {
  const slug = span === 900 ? "btc-updown-15m" : "btc-updown-5m";
  return `https://polymarket.com/event/${slug}-${startSec}`;
}

export function polymarketOpenUrl(startSec: number, span = 300): string {
  const step = span === 900 ? 900 : 300;
  const start = new Date(startSec * 1000).toISOString().replace(".000Z", "Z");
  const end = new Date((startSec + step) * 1000).toISOString().replace(".000Z", "Z");
  const variant = step === 900 ? "fifteenminute" : "fiveminute";
  return (
    "https://polymarket.com/api/crypto/crypto-price?symbol=BTC" +
    `&eventStartTime=${encodeURIComponent(start)}` +
    `&variant=${variant}&endDate=${encodeURIComponent(end)}` +
    "&twapEnabled=true&twapLookbackSeconds=60"
  );
}

export function apiPath(path: string): string {
  if (typeof window === "undefined") return path;
  const host = window.location.hostname.toLowerCase();
  const allowed =
    host === "preview.grok.genai.mil" || host === "preview.grok.mil" || host === "preview.grokgsac.com";
  if (!allowed) return path;
  const m = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+/i.exec(window.location.pathname);
  return m ? `${m[0]}${path}` : path;
}
