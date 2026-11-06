// Installer Sponsor placements: the banner ($50) and banner + top of the list card ($75). Prices are in featured.js (INSTALLER_PLANS), the only place they are set.
// Everything about WHEN a placement runs is here, once, and tested in tests/sponsor-rules.test.mjs. The checkout, the quote the page shows and the webhook all call these.
//
// THE SEASON RULE ("per season")
//   A placement runs from the day it starts to the last day of the season on the map that day falls in (the windows in public/seasons.js: for example
//   see SPONSOR SEASONS below: the Christmas season is Nov 3 to Jan 6).
// PRICE (owner decision): no proration. The plan's price (INSTALLER_PLANS in featured.js) whenever it is bought, and the placement runs until the season's last day.
// STACKING
//   Buying again while the same placement is running starts the day after it ends (the first day of the next season, so full price), never earlier: time is only added.
//   At most one season ahead can be booked: the horizon is the end of the season after the one a purchase made today would reach.
// UPGRADE
//   Banner -> banner + top, when the banner already runs to the end of the season the top card would reach, costs the difference between the two plans' prices (from INSTALLER_PLANS).
//   The top card starts today and runs to the end of the season; the banner stays as it is. If the banner would end sooner, it is the full price of the new plan.
// A refund or lost dispute switches the placement off again (revokeInstaller), putting back what an admin had set by hand and keeping time other paid orders still cover.
import { SEASONS, defaultSeason } from "../../public/seasons.js";
import { INSTALLER_PLANS, addDays } from "./featured.js";

const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400_000);
const maxStr = (list) => list.reduce((m, v) => (v && v > m ? v : m), "");

// SPONSOR SEASONS. They follow the map's season windows (public/seasons.js, which this file never changes) except around the new year, where the owner set them differently:
//   Christmas lights season: from the map's Christmas start (Nov 3) to Jan 6 (the map's own Christmas window ends Dec 26, and the map shows New Year's from Dec 27)
//   New Year's & Lunar New Year season: Jan 7 to the map window's end (Jan 31)
//   every other season: the map window, unchanged (Valentine's Feb 1-15, Spring Feb 16-May 15, Summer May 16-Aug 31, Halloween Sep 1-Nov 2)
// So a purchase on any date from Nov 3 through Jan 6 ends Jan 6, including purchases made Dec 27 to Jan 6 while the map shows New Year's.
export const SPONSOR_XMAS_END = "01-06";
export const sponsorSeasonTable = () => ({
  ...Object.fromEntries(Object.entries(SEASONS).map(([k, v]) => [k, v.window])),
  christmas: [SEASONS.christmas.window[0], SPONSOR_XMAS_END],
  newyear: [addDays("2001-" + SPONSOR_XMAS_END, 1).slice(5), SEASONS.newyear.window[1]],
});

// The sponsor season a date falls in with its first and last day (YYYY-MM-DD). A window that wraps the year end (Christmas: Nov 3 to Jan 6) takes its end year from the start date.
export function seasonOf(ymd) {
  const md = ymd.slice(5), y = Number(ymd.slice(0, 4)), table = sponsorSeasonTable();
  let key = defaultSeason(ymd);
  if (key === "newyear" && (md >= SEASONS.newyear.window[0] || md <= SPONSOR_XMAS_END)) key = "christmas"; // the map shows New Year's from Dec 27, the Christmas sponsor season runs on to Jan 6
  const [s, e] = table[key], wraps = s > e;
  const start = `${wraps && md <= e ? y - 1 : y}-${s}`, end = `${wraps && md >= s ? y + 1 : y}-${e}`;
  return { key, label: SEASONS[key].label, start, end, days: daysBetween(start, end) + 1 };
}

// When a placement of this plan would run if bought today, and what it costs. inst: { banner_until, top_until } (empty string = none).
// Returns { from, to, season, cents, days (days included, start day counted), upgrade, running (renewal), booked_to, full (already booked as far as it can be), horizon }.
export function sponsorWindow(plan, inst, today) {
  const p = INSTALLER_PLANS[plan], cur = (p.top ? inst.top_until : inst.banner_until) || "", running = !!cur && cur >= today;
  const from = running ? addDays(cur, 1) : today, s = seasonOf(from);
  const horizon = seasonOf(addDays(seasonOf(today).end, 1)).end; // one season beyond what a purchase today reaches
  const upgrade = p.top && !!inst.banner_until && inst.banner_until >= s.end; // the banner already covers this whole period (whether or not a top card is running): only the top card is new
  const cents = upgrade ? INSTALLER_PLANS.banner_top.cents - INSTALLER_PLANS.banner.cents : p.cents;
  return { from, to: s.end, season: s.label, cents, days: daysBetween(from, s.end) + 1, upgrade, running, booked_to: running ? cur : "", full: running && cur >= horizon, horizon };
}

// What the banner and the top card read after buying: never shorter than before.
export function applySponsor(plan, inst, today) {
  const w = sponsorWindow(plan, inst, today), top = INSTALLER_PLANS[plan].top;
  return { ...w, banner_until: maxStr([inst.banner_until, w.to]), top_until: top ? maxStr([inst.top_until, w.to]) : inst.top_until || "" };
}

// What is missing before a profile can be sponsored. blocking: the banner needs an active profile with a phone or a website. advice: shown, never blocks.
export function profileGaps(inst) {
  const blocking = [], advice = [];
  if (inst.status !== "active") blocking.push({ key: "status", text: "This profile is hidden, so it cannot be shown. Email info@socallights.app to have it put back." });
  if (!String(inst.phone || "").trim() && !String(inst.web || "").trim()) blocking.push({ key: "contact", text: "Add a phone number or a website. The banner shows your company name and phone, and links your name to your website." });
  if (!String(inst.area || "").trim()) advice.push({ key: "area", text: "Add the areas you serve. The banner shows when those areas are in the map view; with none listed it shows everywhere." });
  return { blocking, advice };
}

// Why this installer cannot buy this plan today, or "" when it can. Mirrors the page. Order of checks: profile first, then the booking horizon.
export function sponsorProblem(inst, plan, today) {
  if (!INSTALLER_PLANS[plan]) return "Choose a plan.";
  const g = profileGaps(inst);
  if (g.blocking.length) return g.blocking[0].text;
  const w = sponsorWindow(plan, inst, today);
  if (w.full) return `This placement is already booked through ${w.booked_to}, as far ahead as we sell. Come back to renew once the season ends.`;
  return "";
}

// ---- Orders (feature_orders rows with target = 'installer'; event_id holds the installer's id) ----
// Columns used: applied_until = banner_until written, applied_top_until = top_until written (banner_top only), applied_featured = 1 (banner) or 2 (banner_top),
// applied_from = first day of the paid window, prev_banner_until / prev_top_until = what was set by hand before (not explained by a paid order), put back on a refund.
const orderRows = (db, id) => db.prepare("SELECT session_id, status, applied_until AS bu, applied_top_until AS tu FROM feature_orders WHERE target = 'installer' AND event_id = ? AND applied = 1").bind(id).all().then((r) => r.results);

// Applies one paid, unapplied order. Both statements act only while the order is still unapplied, so a retry cannot extend the placement twice.
export async function applyInstallerOrder(db, order, today) {
  const inst = await db.prepare("SELECT id, banner_until, top_until FROM installers WHERE id = ?").bind(order.event_id).first();
  if (!inst || !INSTALLER_PLANS[order.plan]) return null;
  const nf = applySponsor(order.plan, inst, today), rows = (await orderRows(db, inst.id)).filter((o) => o.status === "paid");
  const hand = (cur, key) => (cur && cur >= today && cur > maxStr(rows.map((o) => o[key]).filter((u) => u && u >= today)) ? cur : ""); // set by an admin, not by an order
  const top = INSTALLER_PLANS[order.plan].top;
  await db.batch([
    db.prepare("UPDATE installers SET banner_until=?, top_until=? WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)").bind(nf.banner_until, nf.top_until, inst.id, order.session_id),
    db.prepare("UPDATE feature_orders SET applied=1, applied_featured=?, applied_until=?, applied_top_until=?, applied_from=?, prev_banner_until=?, prev_top_until=? WHERE session_id=? AND applied=0")
      .bind(top ? 2 : 1, nf.banner_until, top ? nf.top_until : null, nf.from, hand(inst.banner_until, "bu"), top ? hand(inst.top_until, "tu") : null, order.session_id),
  ]);
  return { banner_until: nf.banner_until, top_until: nf.top_until, from: nf.from, to: nf.to, season: nf.season };
}

// Switches off what a refunded or lost-dispute order applied, without removing time other paid orders cover or a longer date an admin set by hand afterwards.
// Returns true when handled cleanly, false when a person has to look (the placement was left as it is).
export async function revokeInstaller(db, order, today) {
  const inst = await db.prepare("SELECT banner_until, top_until FROM installers WHERE id = ?").bind(order.event_id).first();
  if (!inst) return true;
  const rows = await orderRows(db, order.event_id), valid = rows.filter((o) => o.session_id !== order.session_id && o.status === "paid");
  const next = { banner_until: inst.banner_until || "", top_until: inst.top_until || "" };
  let clean = true;
  for (const [col, key, written, prev] of [["banner_until", "bu", order.applied_until, order.prev_banner_until], ["top_until", "tu", order.applied_top_until, order.prev_top_until]]) {
    const cur = next[col];
    if (!written || !cur || cur < today) continue; // this order did not write it, or nothing is running
    if (cur > maxStr(rows.map((o) => o[key]))) { clean = false; continue; } // runs longer than every order: set by hand, left on
    const keep = maxStr([maxStr(valid.map((o) => o[key]).filter((u) => u && u >= today)), prev && prev >= today ? prev : ""]);
    next[col] = keep < cur ? keep : cur;
  }
  if (next.banner_until === (inst.banner_until || "") && next.top_until === (inst.top_until || "")) return clean;
  const r = await db.prepare("UPDATE installers SET banner_until=?, top_until=? WHERE id=? AND banner_until=? AND top_until=?").bind(next.banner_until, next.top_until, order.event_id, inst.banner_until || "", inst.top_until || "").run();
  return clean && !!(r.meta && r.meta.changes);
}

// The latest dates paid orders still cover for an installer. Admin may not hand-set a date below these (it would cut off a paying customer).
export async function installerFloor(db, installerId, today) {
  const rows = (await orderRows(db, installerId)).filter((o) => o.status === "paid");
  return { banner: maxStr(rows.map((o) => o.bu).filter((u) => u && u >= today)), top: maxStr(rows.map((o) => o.tu).filter((u) => u && u >= today)) };
}
