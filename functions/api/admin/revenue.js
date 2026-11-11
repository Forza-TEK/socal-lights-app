// GET /api/admin/revenue?days=30 — what the orders table adds up to for the last N days (7 to 365), by product. Read-only; Stripe stays the source of truth (functions/_lib/revenue.js).
import { json } from "../../_lib/util.js";
import { revenue } from "../../_lib/revenue.js";

export async function onRequestGet({ request, env }) {
  const d = Number(new URL(request.url).searchParams.get("days")) || 30;
  return json(await revenue(env, Math.min(365, Math.max(7, Math.round(d)))), { headers: { "cache-control": "no-store" } });
}
