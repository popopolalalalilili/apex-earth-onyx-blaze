import { createFileRoute } from "@tanstack/react-router";

/**
 * Polymarket's crypto open-price route does not send CORS headers.
 * The browser asks us, and we ask them. The timestamp is the only input.
 */
async function handleOpen(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const t = Number(url.searchParams.get("t"));
  const span = Number(url.searchParams.get("span") ?? "300");
  const step = span === 900 ? 900 : 300;
  if (!Number.isFinite(t) || t < 1_700_000_000 || t > 2_200_000_000 || t % step !== 0) {
    return Response.json({ openPrice: null, error: "bad window" }, { status: 400 });
  }
  const start = new Date(t * 1000).toISOString().replace(".000Z", "Z");
  const end = new Date((t + step) * 1000).toISOString().replace(".000Z", "Z");
  const variant = step === 900 ? "fifteenminute" : "fiveminute";
  const remote =
    "https://polymarket.com/api/crypto/crypto-price?symbol=BTC" +
    `&eventStartTime=${encodeURIComponent(start)}` +
    `&variant=${variant}&endDate=${encodeURIComponent(end)}` +
    "&twapEnabled=true&twapLookbackSeconds=60";
  try {
    const res = await fetch(remote, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) {
      return Response.json({ openPrice: null, error: "open price unavailable" }, { status: 502 });
    }
    const data = (await res.json()) as {
      openPrice?: unknown;
      closePrice?: unknown;
      incomplete?: unknown;
      completed?: unknown;
    };
    const openPrice = Number(data.openPrice);
    const closePrice = Number(data.closePrice);
    return Response.json(
      {
        openPrice: Number.isFinite(openPrice) ? openPrice : null,
        closePrice: Number.isFinite(closePrice) ? closePrice : null,
        incomplete: data.incomplete === true,
        completed: data.completed === true,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ openPrice: null, error: "open price unavailable" }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/open")({
  server: {
    handlers: {
      GET: ({ request }) => handleOpen(request),
    },
  },
});
