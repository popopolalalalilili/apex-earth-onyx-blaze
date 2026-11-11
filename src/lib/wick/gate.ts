import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "wick_gate";

export function gatePassword(): string | null {
  const value = process.env.WICK_PASSWORD?.trim();
  return value ? value : null;
}

function token(password: string): string {
  return createHmac("sha256", password).update("wick-gate-v1").digest("base64url");
}

function cookieValue(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** True when the site has no password, or this request already unlocked it. */
export function gateOpen(request: Request): boolean {
  const password = gatePassword();
  if (!password) return true;
  const got = cookieValue(request.headers.get("cookie"));
  return got != null && same(got, token(password));
}

export function passwordMatches(input: string, password: string): boolean {
  return same(input, password);
}

export function gateCookie(password: string): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${token(password)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}
