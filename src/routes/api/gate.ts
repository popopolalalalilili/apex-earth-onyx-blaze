import { createFileRoute } from "@tanstack/react-router";
import { gateCookie, gateOpen, gatePassword, passwordMatches } from "@/lib/wick/gate";

export const Route = createFileRoute("/api/gate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const required = gatePassword() != null;
        return Response.json(
          { ok: gateOpen(request), required },
          { headers: { "cache-control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const password = gatePassword();
        if (!password) return Response.json({ ok: true });
        let given = "";
        try {
          const body = (await request.json()) as { password?: unknown };
          if (typeof body.password === "string") given = body.password;
        } catch {
          given = "";
        }
        if (!passwordMatches(given, password)) {
          return Response.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
        }
        return Response.json(
          { ok: true },
          { headers: { "cache-control": "no-store", "set-cookie": gateCookie(password) } },
        );
      },
    },
  },
});
