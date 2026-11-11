import { createFileRoute } from "@tanstack/react-router";
import { gateOpen } from "@/lib/wick/gate";

/**
 * Proxies Polymarket's public PnL series so the browser does not need CORS.
 * The chart on the trade page is this series, not a Wick simulation.
 */
export const Route = createFileRoute("/api/poly-pnl")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!gateOpen(request)) {
          return Response.json({ points: [], error: "locked" }, { status: 401, headers: { "cache-control": "no-store" } });
        }
        const url = new URL(request.url);
        const user = url.searchParams.get("user") ?? "";
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return Response.json({ points: [], error: "bad address" }, { status: 400, headers: { "cache-control": "no-store" } });
        }
        const interval = url.searchParams.get("interval") === "1d" ? "1d" : "1w";
        const remote = `https://data-api.polymarket.com/v2/user-pnl?user=${user}&interval=${interval}&fidelity=1h`;
        try {
          const res = await fetch(remote, { headers: { accept: "application/json" } });
          if (!res.ok) {
            return Response.json({ points: [], error: `polymarket ${res.status}` }, { status: 502, headers: { "cache-control": "no-store" } });
          }
          const body = (await res.json()) as { data?: { points?: unknown } };
          const raw = Array.isArray(body.data?.points) ? body.data.points : [];
          const points = raw
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const r = row as Record<string, unknown>;
              const t = Number(r.timestamp);
              const pnl = Number(r.economic_pnl ?? r.realized_pnl ?? r.position_pnl);
              if (!Number.isFinite(t) || !Number.isFinite(pnl)) return null;
              return { t: t < 10_000_000_000 ? t * 1000 : t, pnl };
            })
            .filter((p): p is { t: number; pnl: number } => p != null);
          return Response.json({ points }, { headers: { "cache-control": "no-store" } });
        } catch {
          return Response.json({ points: [], error: "unreachable" }, { status: 502, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
