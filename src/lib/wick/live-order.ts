import { privateKeyToAccount } from "viem/accounts";
import { AssetType, ClobClient, OrderType, Side, SignatureType } from "@polymarket/clob-client";
import type { LiveJob } from "./engine";

const SIG = {
  0: SignatureType.EOA,
  1: SignatureType.POLY_PROXY,
  2: SignatureType.POLY_GNOSIS_SAFE,
} as const;

/**
 * Signs and posts one fill-or-kill buy. The key stays in this process.
 * A failure string never includes the key.
 */
export async function postFiveBuy(job: LiveJob): Promise<string> {
  const client = clientFor(job);
  const tickSize = await client.getTickSize(job.tokenId);
  const negRisk = await client.getNegRisk(job.tokenId);
  const resp = (await client.createAndPostMarketOrder(
    {
      tokenID: job.tokenId,
      price: job.ask,
      amount: job.dollars,
      side: Side.BUY,
      orderType: OrderType.FOK,
    },
    { tickSize, negRisk },
    OrderType.FOK,
  )) as { success?: boolean; errorMsg?: string; error?: unknown; orderID?: string; status?: string | number };
  const refused = orderRefusal(resp);
  if (refused) throw new Error(refused);
  const id = resp.orderID ? `${resp.orderID.slice(0, 8)}…` : "sent";
  return `${resp.status || "ok"} ${id}`;
}

function orderRefusal(resp: { success?: boolean; errorMsg?: string; error?: unknown; orderID?: string; status?: string | number }): string | null {
  const status = typeof resp.status === "number" ? resp.status : Number(resp.status);
  const detail = clip(resp.errorMsg || resp.error);
  if (resp.success === false) return detail || "Order rejected";
  if (Number.isFinite(status) && status >= 400) return detail ? `Polymarket refused the order (${status}). ${detail}` : `Polymarket refused the order (${status}).`;
  if (resp.error) return detail || "Order rejected";
  if (!resp.orderID) return "Polymarket did not accept the order.";
  return null;
}

function clip(value: unknown): string {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

/** Collateral the funder can spend, in dollars. Null when neither source answers. */
export async function readCash(job: LiveJob): Promise<number | null> {
  const clob = await clobCash(job);
  const chain = job.funder ? await walletCash(job.funder) : null;
  if (clob == null && chain == null) return null;
  return Math.max(clob ?? 0, chain ?? 0);
}

async function clobCash(job: LiveJob): Promise<number | null> {
  try {
    const client = clientFor(job);
    try {
      await client.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    } catch {
      /* the read below still works */
    }
    const bal = (await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })) as {
      balance?: string;
      error?: string;
    };
    if (bal?.error) return null;
    return units(bal?.balance);
  } catch {
    return null;
  }
}

/** pUSD is what Polymarket holds now. USDC is only there on older deposits. */
async function walletCash(holder: string): Promise<number | null> {
  const tokens = [
    "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  ];
  const data = "0x70a08231" + holder.slice(2).toLowerCase().padStart(64, "0");
  let total = 0;
  let seen = false;
  for (const token of tokens) {
    const n = await tokenBalance(token, data);
    if (n == null) continue;
    seen = true;
    total += n;
  }
  return seen ? total : null;
}

async function tokenBalance(token: string, data: string): Promise<number | null> {
  for (const rpc of ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"]) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: token, data }, "latest"] }),
      });
      const body = (await res.json()) as { result?: string };
      if (typeof body.result !== "string" || !body.result.startsWith("0x")) continue;
      return Number(BigInt(body.result)) / 1_000_000;
    } catch {
      /* try the next endpoint */
    }
  }
  return null;
}

function units(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return String(raw).includes(".") ? n : n / 1_000_000;
}
export async function checkAccount(job: LiveJob): Promise<string> {
  if (job.privateKey) {
    const client = clientFor(job);
    const keys = (await client.getApiKeys()) as { error?: string; apiKeys?: unknown[] };
    if (keys?.error) throw new Error(clean(String(keys.error), job));
    let cash = "";
    try {
      const bal = (await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })) as {
        balance?: string;
        error?: string;
      };
      const n = Number(bal?.balance);
      if (Number.isFinite(n)) cash = ` Buying power $${(n / 1_000_000).toFixed(2)}.`;
    } catch {
      /* the key already matched */
    }
    return `API works.${cash} No order was sent.`;
  }
  const path = "/auth/api-keys";
  const ts = Math.floor(Date.now() / 1000);
  const signature = await hmac(job.secret, ts, "GET", path);
  const res = await fetch(`https://clob.polymarket.com${path}`, {
    headers: {
      POLY_ADDRESS: job.funder,
      POLY_SIGNATURE: signature,
      POLY_TIMESTAMP: String(ts),
      POLY_API_KEY: job.apiKey,
      POLY_PASSPHRASE: job.passphrase,
    },
  });
  if (res.status === 401) {
    throw new Error("Polymarket rejected this API key for that address. Save the private key and test again.");
  }
  if (!res.ok) throw new Error(`Polymarket said ${res.status}.`);
  return "API key works for this address. No order was sent.";
}

/** Recovers the trading key, secret and passphrase from the private key. No order is sent. */
export async function deriveCreds(privateKey: string): Promise<{ apiKey: string; secret: string; passphrase: string }> {
  const client = signerOnly(privateKey);
  const derived = readCreds(await client.deriveApiKey());
  if (derived) return derived;
  const created = readCreds(await client.createApiKey());
  if (created) return created;
  throw new Error("Polymarket did not accept this private key.");
}

function signerOnly(privateKey: string): ClobClient {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const signer = {
    account,
    signTypedData: (args: Parameters<typeof account.signTypedData>[0]) => account.signTypedData(args),
  };
  return new ClobClient("https://clob.polymarket.com", 137, signer as never);
}

function readCreds(raw: unknown): { apiKey: string; secret: string; passphrase: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { key?: string; apiKey?: string; secret?: string; passphrase?: string; error?: string };
  const apiKey = row.key || row.apiKey || "";
  if (!apiKey || !row.secret || !row.passphrase) return null;
  return { apiKey, secret: row.secret, passphrase: row.passphrase };
}
function clientFor(job: LiveJob): ClobClient {
  const account = privateKeyToAccount(job.privateKey as `0x${string}`);
  const signer = {
    account,
    signTypedData: (args: Parameters<typeof account.signTypedData>[0]) => account.signTypedData(args),
  };
  return new ClobClient(
    "https://clob.polymarket.com",
    137,
    signer as never,
    { key: job.apiKey, secret: job.secret, passphrase: job.passphrase },
    SIG[job.signatureType],
    job.funder || undefined,
  );
}

function clean(msg: string, job: LiveJob): string {
  return msg.split(job.secret).join("…").split(job.passphrase).join("…").split(job.apiKey).join("…").slice(0, 180);
}

async function hmac(secret: string, timestamp: number, method: string, requestPath: string): Promise<string> {
  const pad = secret.replace(/-/g, "+").replace(/_/g, "/");
  const key = Buffer.from(pad, "base64");
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", key).update(`${timestamp}${method}${requestPath}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_");
}
