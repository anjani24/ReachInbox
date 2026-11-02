import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Different secret from login sessions, so a Slack state token can never be used as a login cookie
const STATE_SECRET = `${env.JWT_SECRET}:slack-state`;

export function isSlackConfigured(): boolean {
  return Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_REDIRECT_URI);
}

/**
 * The callback arrives on the ngrok domain, where our login cookie doesn't exist.
 * So we put the user id inside a signed, 10-minute "state" token instead.
 * That identifies the user AND protects against forged callbacks.
 */
export function buildSlackAuthUrl(userId: string): string {
  const state = jwt.sign({ sub: userId }, STATE_SECRET, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID!,
    scope: "incoming-webhook",
    redirect_uri: env.SLACK_REDIRECT_URI!,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export function verifySlackState(state: string): string | null {
  try {
    const payload = jwt.verify(state, STATE_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  incoming_webhook?: { url: string; channel?: string };
}

export async function exchangeSlackCode(code: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID!,
      client_secret: env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI!,
    }),
  });

  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.incoming_webhook?.url) {
    throw new Error(`Slack OAuth failed: ${data.error ?? "no webhook returned"}`);
  }
  return { webhookUrl: data.incoming_webhook.url, channel: data.incoming_webhook.channel ?? null };
}

export async function postSlackMessage(webhookUrl: string, payload: { text: string; blocks?: unknown[] }) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000), // never let Slack slow down the worker
  });
  if (!res.ok) throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
}