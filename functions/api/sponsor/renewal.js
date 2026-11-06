// The cancel link in every renewal email. No login needed: the unguessable token in the link is the proof.
//   GET  /api/sponsor/renewal?t=<token>            -> what would be cancelled (company, plan, next charge date, price). Changes nothing (mail scanners open links).
//   POST /api/sponsor/renewal { t }  (or ?t=)      -> cancels automatic renewal. The placement already paid for stays.
import { json, err } from "../../_lib/util.js";
import { renewalByToken, cancelRenewal, usd } from "../../_lib/renewal.js";
import { INSTALLER_PLANS } from "../../_lib/featured.js";

async function load(env, t) {
  const row = await renewalByToken(env, t);
  if (!row) return { res: err(404, "This cancel link isn't valid. If you copied it, check that the whole link was pasted, or sign in and use the button in your dashboard.") };
  const inst = await env.DB.prepare("SELECT name, slug FROM installers WHERE id = ?").bind(row.installer_id).first();
  return { row, inst };
}
export async function onRequestGet({ request, env }) {
  const { row, inst, res } = await load(env, new URL(request.url).searchParams.get("t") || "");
  if (res) return res;
  const p = INSTALLER_PLANS[row.plan] || INSTALLER_PLANS.banner;
  return json({ installer: inst ? inst.name : "", slug: inst ? inst.slug : "", plan: p.label, price: usd(p.cents), next_charge_date: row.next_charge_date, status: row.status, on: row.enabled === 1 && row.status === "active" }, { headers: { "cache-control": "no-store" } });
}
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const { row, res } = await load(env, String(b.t || new URL(request.url).searchParams.get("t") || ""));
  if (res) return res;
  const was = await cancelRenewal(env, row, "email link");
  return json({ ok: true, cancelled: true, was_on: was });
}
