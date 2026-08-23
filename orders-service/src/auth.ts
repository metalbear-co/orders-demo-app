import { readFile } from "node:fs/promises";

const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL ?? "http://localhost:8100";
const SA_TOKEN_PATH =
  process.env.SA_TOKEN_PATH ?? "/var/run/secrets/kubernetes.io/serviceaccount/token";

/** Refresh this many seconds before the access token actually expires. */
const REFRESH_SKEW_SECONDS = 5;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

/**
 * Returns an access token for calling pricing-service, exchanging this
 * workload's service account token for one when the cache is empty or the
 * cached token is close to expiry.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;

  if (cached && cached.expiresAt - REFRESH_SKEW_SECONDS > now) {
    return cached.accessToken;
  }

  const subjectToken = (await readFile(SA_TOKEN_PATH, "utf8")).trim();

  const res = await fetch(`${TOKEN_SERVICE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject_token: subjectToken }),
  });

  if (!res.ok) throw new Error(`token-service responded ${res.status}`);

  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    accessToken: body.access_token,
    expiresAt: Date.now() / 1000 + body.expires_in,
  };

  return cached.accessToken;
}
