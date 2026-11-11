import { privateKeyToAccount } from "viem/accounts";
import { ClobClient, OrderType, Side, SignatureType } from "@polymarket/clob-client";
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
  const account = privateKeyToAccount(job.privateKey as `0x${string}`);
  const signer = {
    account,
    signTypedData: (args: Parameters<typeof account.signTypedData>[0]) => account.signTypedData(args),
  };
  const client = new ClobClient(
    "https://clob.polymarket.com",
    137,
    signer as never,
    { key: job.apiKey, secret: job.secret, passphrase: job.passphrase },
    SIG[job.signatureType],
    job.funder,
  );
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
  )) as { success?: boolean; errorMsg?: string; orderID?: string; status?: string };
  if (resp?.success === false) throw new Error(resp.errorMsg || "Order rejected");
  const id = resp?.orderID ? `${resp.orderID.slice(0, 8)}…` : "sent";
  return `${resp?.status || "ok"} ${id}`;
}
