// /api/contests/<slug>/sponsor-setup — "How sponsors pay you" and the sponsor invite link. Organizer or co-organizer only.
//   GET                                   { allowed, reason, pay_url, pay_text, levels, link: { on, url } }
//   POST { action: "save", pay, levels }  pay = the organizer's own payment link (https only) and/or plain-text instructions; levels = up to 3 { label, dollars } (display only: the site never charges)
//   POST { action: "link_on" | "link_off" | "link_new" }   the unlisted invite link https://socallights.app/s/<token>; "link_new" invalidates the old one
// Only for a live contest whose organizer we can trust (sponsors.js selfServiceReason) and that Admin has not switched off. The host of a saved payment link is written to the ops log for abuse review.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, getContest, isStaff } from "../../../_lib/contests.js";
import { selfServiceReason, payLink, plainText, parseLevels, levelsOf, newToken } from "../../../_lib/sponsors.js";
import { logOp } from "../../../_lib/oplog.js";
import { teamChanged } from "../../../_lib/changes.js";

const view = (c, origin) => { const reason = selfServiceReason(c); return { allowed: !reason, reason, pay_url: c.sponsor_pay_url || "", pay_text: c.sponsor_pay_text || "", pay_hidden: !!c.sponsor_pay_hidden, levels: levelsOf(c).map((l) => ({ label: l.label, dollars: l.cents == null ? "" : String(l.cents / 100) })), link: { on: !!c.sponsor_link_on && !!c.sponsor_token, url: c.sponsor_token ? `${origin}/s/${c.sponsor_token}` : "" } }; };

export async function onRequestGet({ params, request, env }) {
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const c = await getContest(env, params.slug);
  if (!c || !(await isStaff(env, c, user))) return err(404, "That contest isn't yours or doesn't exist.");
  return json(view(c, new URL(request.url).origin), { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const b = await request.json().catch(() => ({})), origin = new URL(request.url).origin, why = selfServiceReason(c);
  if (why) return err(403, why);
  if (b.action === "save") {
    const raw = String(b.pay ?? "").trim(), m = raw.match(/https?:\/\/\S+|^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i);
    // The field holds a link and/or plain instructions: the first web address in it is the link, the rest is the text.
    const link = m ? payLink(m[0].replace(/[.,;)]+$/, "")) : { url: "" };
    if (link.error) return err(400, link.error);
    const rest = link.url ? raw.replace(m[0], "") : raw;
    if (/\b(javascript|data|vbscript|file|blob):|[a-z][a-z0-9+.-]*:\/\//i.test(rest)) return err(400, "The instructions can't contain other links or script. Put one https:// link in the field, and plain words for the rest.");
    const text = plainText(rest, 300).replace(/\s+/g, " ").trim();
    const lv = parseLevels(b.levels || []); if (lv.error) return err(400, lv.error);
    await env.DB.prepare("UPDATE contests SET sponsor_pay_url = ?, sponsor_pay_text = ?, sponsor_levels = ?, updated_at = datetime('now') WHERE id = ?").bind(link.url, text, JSON.stringify(lv.levels), c.id).run();
    if (link.host) await logOp(env, "sponsor-pay-link", `contest ${c.slug}: payment link host ${link.host}`); // for abuse review (Admin > Usage log)
    await teamChanged(env, c, user, [{ label: "Sponsors", old: "", new: "Updated how sponsors pay you" }], waitUntil);
    return json(view({ ...c, sponsor_pay_url: link.url, sponsor_pay_text: text, sponsor_levels: JSON.stringify(lv.levels) }, origin));
  }
  if (["link_on", "link_off", "link_new"].includes(b.action)) {
    const token = b.action === "link_new" || !c.sponsor_token ? newToken() : c.sponsor_token, on = b.action === "link_off" ? 0 : 1;
    await env.DB.prepare("UPDATE contests SET sponsor_token = ?, sponsor_link_on = ?, updated_at = datetime('now') WHERE id = ?").bind(token, on, c.id).run();
    await teamChanged(env, c, user, [{ label: "Sponsors", old: "", new: b.action === "link_off" ? "Turned the sponsor invite link off" : b.action === "link_new" ? "Made a new sponsor invite link" : "Turned the sponsor invite link on" }], waitUntil);
    return json(view({ ...c, sponsor_token: token, sponsor_link_on: on }, origin));
  }
  return err(400, "Unknown action.");
}
