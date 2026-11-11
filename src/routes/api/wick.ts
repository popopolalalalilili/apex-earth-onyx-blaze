import { createFileRoute } from "@tanstack/react-router";
import { freshen, parseCommand } from "@/lib/wick/protocol";

/**
 * The site reads the worker's latest snapshot and leaves commands for it.
 * This route does not trade.
 */
export const Route = createFileRoute("/api/wick")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getStore } = await import("@/lib/wick/store");
          const body = await getStore().readLive();
          return Response.json(freshen(body), { headers: { "cache-control": "no-store" } });
        } catch {
          return Response.json(freshen(null), { status: 200, headers: { "cache-control": "no-store" } });
        }
      },
      POST: async ({ request }) => {
        let raw: unknown = null;
        try {
          raw = await request.json();
        } catch {
          raw = null;
        }
        const cmd = parseCommand(raw);
        if (!cmd) return Response.json({ ok: false }, { status: 400 });
        try {
          const { getStore } = await import("@/lib/wick/store");
          await getStore().enqueue(cmd);
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false }, { status: 503 });
        }
      },
    },
  },
});
