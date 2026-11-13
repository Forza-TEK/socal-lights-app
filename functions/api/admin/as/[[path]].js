// /api/admin/as/<user route> — an Admin does anything a signed-in person can do, on that person's behalf (docs/admin-parity.md).
//   /api/admin/as/me/events/<submission id>          POST, DELETE   edit, photos, notice, copy, delete an event
//   /api/admin/as/me/homes/<post id>                 GET, POST, DELETE   edit, photos, take down, put back, delete a home
//   /api/admin/as/me/overview | profile | badges | newsletter | claims | featurable | sponsor      the person's own pages
//   /api/admin/as/auth/me | contests | contests/<slug>   who the page thinks is signed in, the contests list and one contest
//   /api/admin/as/drafts[/<id>]                      the person's saved drafts
//   /api/admin/as/contests/<slug>/(manage | entries | entries/<id> | entries/<id>/photos | mine | judges | staff | sponsors | invite | nudge | votes | changes | stats | export | sponsor-setup | logo)
//   /api/admin/as/installers/<slug>/(manage | logo | claim)
// Who it acts as: ?as=<user id or email> (always wins), otherwise the owner of the thing named in the path (the person who added the event or home, the contest's owner, the installer
// profile's owner). The route runs the very same code as the public route (same checks, limits, emails and change logs), with a signed header that getUser() trusts (actas.js).
// It sits behind the Cloudflare Access login like all of /api/admin and every call is written to the Admin log ("as"). Off unless ADMIN_AS_SECRET (or THROTTLE_SALT) is set.
import { json, err } from "../../../_lib/util.js";
import { signActAs, ACT_AS_HEADER, actAsSecret } from "../../../_lib/actas.js";
import { record } from "../../../_lib/adminlog.js";

const L = {
  meEvents: () => import("../../me/events/[id].js"), meHomes: () => import("../../me/homes/[id].js"), meOverview: () => import("../../me/overview.js"), meProfile: () => import("../../me/profile.js"),
  meBadges: () => import("../../me/badges.js"), meNewsletter: () => import("../../me/newsletter.js"), meClaims: () => import("../../me/claims.js"), meFeaturable: () => import("../../me/featurable.js"), meSponsor: () => import("../../me/sponsor.js"),
  draftsIndex: () => import("../../drafts/index.js"), draftsId: () => import("../../drafts/[id].js"),
  cManage: () => import("../../contests/[slug]/manage.js"), cEntries: () => import("../../contests/[slug]/entries/index.js"), cEntry: () => import("../../contests/[slug]/entries/[id].js"), cEntryPhotos: () => import("../../contests/[slug]/entries/[id]/photos.js"),
  cMine: () => import("../../contests/[slug]/mine.js"), cJudges: () => import("../../contests/[slug]/judges.js"), cStaff: () => import("../../contests/[slug]/staff.js"), cSponsors: () => import("../../contests/[slug]/sponsors.js"),
  cInvite: () => import("../../contests/[slug]/invite.js"), cNudge: () => import("../../contests/[slug]/nudge.js"), cVotes: () => import("../../contests/[slug]/votes.js"), cChanges: () => import("../../contests/[slug]/changes.js"),
  cStats: () => import("../../contests/[slug]/stats.js"), cExport: () => import("../../contests/[slug]/export.js"), cSponsorSetup: () => import("../../contests/[slug]/sponsor-setup.js"), cLogo: () => import("../../contests/[slug]/logo.js"),
  authMe: () => import("../../auth/me.js"), cDetail: () => import("../../contests/[slug].js"), cIndex: () => import("../../contests/index.js"),
  iManage: () => import("../../installers/[slug]/manage.js"), iLogo: () => import("../../installers/[slug]/logo.js"), iClaim: () => import("../../installers/[slug]/claim.js"),
};
const ID = "([A-Za-z0-9_-]{1,64})";
// [pattern, loader, parameter names, how to find the owner]
export const ROUTES = [
  [new RegExp(`^me/events/${ID}$`), L.meEvents, ["id"], "event"], [new RegExp(`^me/homes/${ID}$`), L.meHomes, ["id"], "home"],
  [/^me\/overview$/, L.meOverview, [], "as"], [/^me\/profile$/, L.meProfile, [], "as"], [/^me\/badges$/, L.meBadges, [], "as"], [/^me\/newsletter$/, L.meNewsletter, [], "as"],
  [/^me\/claims$/, L.meClaims, [], "as"], [/^me\/featurable$/, L.meFeaturable, [], "as"], [/^me\/sponsor$/, L.meSponsor, [], "as"],
  [/^auth\/me$/, L.authMe, [], "as"], [/^contests$/, L.cIndex, [], "as"], [new RegExp(`^contests/${ID}$`), L.cDetail, ["slug"], "contest"],
  [/^drafts$/, L.draftsIndex, [], "as"], [new RegExp(`^drafts/${ID}$`), L.draftsId, ["id"], "as"],
  [new RegExp(`^contests/${ID}/manage$`), L.cManage, ["slug"], "contest"], [new RegExp(`^contests/${ID}/entries$`), L.cEntries, ["slug"], "contest"],
  [new RegExp(`^contests/${ID}/entries/${ID}$`), L.cEntry, ["slug", "id"], "contest"], [new RegExp(`^contests/${ID}/entries/${ID}/photos$`), L.cEntryPhotos, ["slug", "id"], "contest"],
  [new RegExp(`^contests/${ID}/mine$`), L.cMine, ["slug"], "as"], [new RegExp(`^contests/${ID}/judges$`), L.cJudges, ["slug"], "contest"], [new RegExp(`^contests/${ID}/staff$`), L.cStaff, ["slug"], "contest"],
  [new RegExp(`^contests/${ID}/sponsors$`), L.cSponsors, ["slug"], "contest"], [new RegExp(`^contests/${ID}/invite$`), L.cInvite, ["slug"], "contest"], [new RegExp(`^contests/${ID}/nudge$`), L.cNudge, ["slug"], "contest"],
  [new RegExp(`^contests/${ID}/votes$`), L.cVotes, ["slug"], "contest"], [new RegExp(`^contests/${ID}/changes$`), L.cChanges, ["slug"], "contest"], [new RegExp(`^contests/${ID}/stats$`), L.cStats, ["slug"], "contest"],
  [new RegExp(`^contests/${ID}/export$`), L.cExport, ["slug"], "contest"], [new RegExp(`^contests/${ID}/sponsor-setup$`), L.cSponsorSetup, ["slug"], "contest"], [new RegExp(`^contests/${ID}/logo$`), L.cLogo, ["slug"], "contest"],
  [new RegExp(`^installers/${ID}/manage$`), L.iManage, ["slug"], "installer"], [new RegExp(`^installers/${ID}/logo$`), L.iLogo, ["slug"], "installer"], [new RegExp(`^installers/${ID}/claim$`), L.iClaim, ["slug"], "installer"],
];
export function matchRoute(rest) {
  for (const [re, load, names, owner] of ROUTES) { const m = re.exec(rest); if (m) return { load, params: Object.fromEntries(names.map((n, i) => [n, m[i + 1]])), owner }; }
  return null;
}
const userBy = (env, v) => (v ? env.DB.prepare(String(v).includes("@") ? "SELECT id, email FROM users WHERE lower(email) = lower(?)" : "SELECT id, email FROM users WHERE id = ?").bind(v).first() : null);
// The person the call is made as. { id, email } (id may be "" for an email that never signed in), or null.
export async function ownerOf(env, { owner, params }, asParam) {
  if (asParam) { const u = await userBy(env, asParam); return u || (asParam.includes("@") ? { id: "", email: asParam.toLowerCase() } : null); }
  if (owner === "event") { const s = await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE id = ?").bind(params.id).first(); return s ? (await userBy(env, s.contact_email)) || { id: "", email: String(s.contact_email).toLowerCase() } : null; }
  if (owner === "home") {
    const p = await env.DB.prepare("SELECT user_id, contact_email FROM posts WHERE id = ?").bind(params.id).first();
    if (!p) return null; if (p.user_id) return { id: p.user_id, email: String(p.contact_email || "").toLowerCase() };
    return p.contact_email ? (await userBy(env, p.contact_email)) || { id: "", email: String(p.contact_email).toLowerCase() } : null;
  }
  if (owner === "contest") { const c = await env.DB.prepare("SELECT owner_id FROM contests WHERE slug = ?").bind(params.slug).first(); return c && c.owner_id ? userBy(env, c.owner_id) : null; }
  if (owner === "installer") { const i = await env.DB.prepare("SELECT owner_email FROM installers WHERE slug = ?").bind(params.slug).first(); return i && i.owner_email ? (await userBy(env, i.owner_email)) || { id: "", email: String(i.owner_email).toLowerCase() } : null; }
  return null;
}

export async function onRequest(context) {
  const { request, env } = context, url = new URL(request.url), rest = (context.params.path || []).join("/");
  if (!actAsSecret(env)) return err(503, "Acting for someone is off: set ADMIN_AS_SECRET (a long random value) in the Cloudflare Pages settings.");
  const route = matchRoute(rest);
  if (!route) return err(404, "That is not a page a person can use, so there is nothing to act on.");
  const asParam = (url.searchParams.get("as") || "").trim().slice(0, 120);
  const who = await ownerOf(env, route, asParam);
  if (!who) return err(404, asParam ? "No person found for ?as=" : "Could not tell who owns that. Add ?as=<user id or email>.");
  const mod = await route.load(), name = "onRequest" + request.method[0] + request.method.slice(1).toLowerCase(), handler = mod[name] || mod.onRequest;
  if (!handler) return err(405, "That page does not do that.");
  const admin = (context.data && context.data.admin && context.data.admin.email) || "admin";
  await record(env, { admin, area: "as", action: "act", id: `${request.method} ${rest}`.slice(0, 120), label: `as ${who.email || who.id}` });
  // the same request, minus ?as=, with the signed header and no Admin credentials (the public route must not see them)
  url.searchParams.delete("as");
  const headers = new Headers(request.headers);
  headers.delete("cf-access-jwt-assertion"); headers.delete("cookie");
  headers.set(ACT_AS_HEADER, await signActAs(env, { id: who.id, email: who.email, admin }));
  const inner = new Request(`${url.origin}/api/${rest}${url.search}`, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, duplex: "half" });
  return handler({ request: inner, env, params: route.params, data: {}, waitUntil: context.waitUntil ? context.waitUntil.bind(context) : () => {}, next: () => new Response("Not found", { status: 404 }) });
}
