// Admin > Progress: live numbers counted from the database each time, refreshed every 30 seconds while the page is open.
// Sections: the map, trend lines (one point every half hour), season coverage against the working targets, Grok's work, the Admin redesign and what shipped.
import { esc } from "/admin/kit.js?v=20261116a";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const ago = (iso) => { const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); return s < 5 ? "just now" : s < 90 ? s + " seconds ago" : Math.round(s / 60) + " minutes ago"; };
const dtf = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
const dayf = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
let timer = 0, agoTimer = 0, last = null;

const tile = (k, n, u, id) => `<div class="pr-tile"><span class="pr-k">${esc(k)}</span><b class="pr-n" ${id ? `data-pr="${id}"` : ""}>${n}</b><span class="pr-u">${esc(u)}</span></div>`;

function spark(rows, key, label, f) {
  const W = 280, H = 64, m = 6, vals = rows.map((r) => Number(r[key]));
  const t0 = Date.parse(rows[0].at + ":00Z"), t1 = Date.parse(rows[rows.length - 1].at + ":00Z"), span = Math.max(1, t1 - t0);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = hi - lo || Math.max(1, hi * 0.1);
  const x = (r) => (rows.length > 1 ? m + ((Date.parse(r.at + ":00Z") - t0) / span) * (W - 2 * m) : W / 2), y = (v) => H - m - ((v - (lo - pad * 0.15)) / (hi - lo + pad * 0.3)) * (H - 2 * m);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(r).toFixed(1)} ${y(Number(r[key])).toFixed(1)}`).join(" ");
  const area = rows.length > 1 ? `<path d="${line} L${x(rows[rows.length - 1]).toFixed(1)} ${H - m} L${x(rows[0]).toFixed(1)} ${H - m} Z" class="pr-area"/><path d="${line}" class="pr-line"/>` : "";
  const dots = rows.map((r, i) => `<circle cx="${x(r).toFixed(1)}" cy="${y(Number(r[key])).toFixed(1)}" r="${i === rows.length - 1 ? 4 : 2.2}" class="pr-dot"><title>${esc(dtf.format(new Date(r.at + ":00Z")))}: ${esc(f(Number(r[key]), r))}</title></circle>`).join("");
  const cur = rows[rows.length - 1], first = rows[0], change = Number(cur[key]) - Number(first[key]);
  return `<div class="pr-spark"><span class="pr-k">${esc(label)}</span><b class="pr-n pr-sm">${esc(f(Number(cur[key]), cur))}</b>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(label)}: ${esc(f(Number(first[key]), first))} to ${esc(f(Number(cur[key]), cur))}"><line x1="${m}" x2="${W - m}" y1="${H - m}" y2="${H - m}" class="pr-grid"/>${area}${dots}</svg>
    <span class="pr-u">${rows.length > 1 ? `${change >= 0 ? "+" : ""}${f(change, cur).replace(/^[-+]/, "")} since ${esc(dtf.format(new Date(first.at + ":00Z")))}` : "first point " + esc(dtf.format(new Date(cur.at + ":00Z")))}</span></div>`;
}

function paint(main, d) {
  const h = d.history || [], recent = h.slice(-96); // the last two days at half-hour steps feel live; older ones fill the line when there is room
  const hist = h.length > 96 ? h.filter((_, i) => i % Math.ceil(h.length / 96) === 0 || i === h.length - 1) : h;
  const maxC = Math.max(1, ...d.counties.map((c) => c.confirmed + c.expected));
  const done = d.redesign.filter((r) => r.status === "done").length;
  const tag = (s) => `<span class="tag ${s === "done" ? "ok" : s === "next" ? "warn" : ""}">${s === "done" ? "Done" : s === "next" ? "Next" : "To do"}</span>`;
  const u = d.updates, i = d.intake;
  main.innerHTML = `<div class="rpage" id="pr-root">
    <div class="pghead"><div><h2>Progress</h2><p>Counted from the database each time this page opens, and again every 30 seconds while it stays open. Updated <b id="pr-ago">${ago(d.at)}</b>.</p></div><div class="pgacts"><span class="pr-live"><i></i>Live</span></div></div>
    <p class="pr-lead"><b>${fmt(d.upcoming)}</b> events are upcoming. <b>${pct(d.confirmed, d.upcoming)}%</b> are confirmed and <b>${pct(d.with_photo, d.upcoming)}%</b> have a photo. <b>${d.cats_ok}</b> of <b>${d.cats_total}</b> season categories meet their working target, and <b>${done}</b> of <b>${d.redesign.length}</b> Admin areas use the new format.</p>
    <div class="pr-tiles">${tile("Upcoming events", fmt(d.upcoming), "not yet ended")}${tile("Confirmed", fmt(d.confirmed), "date, time and place seen on a page")}${tile("Expected", fmt(d.expected), "estimated from earlier years")}${tile("With a photo", fmt(d.with_photo), "linked, hosted or the organizer's")}${tile("Added by Grok", fmt(d.from_grok), "ids that start grok-")}</div>

    <section class="rcard"><h3>Over time</h3>${hist.length ? `<div class="pr-sparks">${[["upcoming", "Upcoming events", (v) => fmt(v)], ["confirmed", "Confirmed", (v) => fmt(v)], ["with_photo", "With a photo", (v) => fmt(v)], ["from_grok", "Added by Grok", (v) => fmt(v)], ["cats_ok", "Categories at target", (v, r) => v + " of " + r.cats_total], ["updates_applied", "Grok updates applied", (v) => fmt(v)]].map(([k, l, f]) => spark(hist, k, l, f)).join("")}</div><p class="meta" style="margin:10px 0 0">One point every half hour. ${hist.length} point${hist.length === 1 ? "" : "s"} so far${recent.length ? "" : ""}; the lines fill in as time passes.</p>` : `<div class="empty">The first point is written when this page opens.</div>`}</section>

    <section class="rcard"><h3>Grok</h3><div class="pr-tiles pr-tight">${tile("Intake published", fmt(i.published), "events it added", "")}${tile("Held for you", fmt(i.held), "waiting in From Grok")}${tile("Updates applied", fmt(u.applied), `${fmt(u.applied_24h)} in the last 24 hours`)}${tile("Updates held", fmt(u.held), "need you in From Grok")}${tile("Events it tried", fmt(u.tried_total), `${fmt(u.tried_24h)} in the last 24 hours`)}</div></section>

    <section class="rcard"><h3>Season coverage against working targets</h3><p class="meta" style="margin:0 0 8px">Thinnest first. Targets are working estimates of what a well-covered region would hold, not facts.</p>${d.cats.map((c) => { const r = c.count / c.min, cls = r >= 1 ? "ok" : r >= 0.5 ? "warn" : "bad"; return `<div class="pr-row" role="img" aria-label="${esc(c.label)}: ${c.count} of ${c.min}"><div class="pr-lab">${esc(c.label)}<small>${esc(c.seasonLabel)}</small></div><div class="pr-track"><i class="pr-fill ${cls}" style="width:${Math.min(r, 1.5) / 1.5 * 100}%"></i><b class="pr-tick" style="left:${100 / 1.5}%"></b></div><div class="pr-val">${fmt(c.count)} <small>of ${fmt(c.min)}</small></div></div>`; }).join("")}</section>

    <section class="rcard"><h3>Upcoming events by county</h3>${d.counties.map((c) => `<div class="pr-row" role="img" aria-label="${esc(c.name)}: ${c.confirmed} confirmed, ${c.expected} expected"><div class="pr-lab">${esc(c.name)} County</div><div class="pr-track"><i class="pr-fill ok" style="width:${100 * c.confirmed / maxC}%;border-radius:6px 0 0 6px"></i><i class="pr-fill warn" style="left:${100 * c.confirmed / maxC}%;width:${100 * c.expected / maxC}%;border-radius:0 6px 6px 0"></i></div><div class="pr-val">${fmt(c.confirmed)} <small>+ ${fmt(c.expected)}</small></div></div>`).join("")}<p class="meta" style="margin:8px 0 0">Green is confirmed, amber is expected.</p></section>

    <section class="rcard"><h3>Admin redesign</h3><p style="margin:0"><b>${pct(done, d.redesign.length)}%</b> done: ${done} of ${d.redesign.length} areas.</p><div class="pr-bar" role="img" aria-label="${done} of ${d.redesign.length} Admin areas converted"><i style="width:${pct(done, d.redesign.length)}%"></i></div>
      <div class="dtw"><table class="dtab"><thead><tr><th>Area</th><th>Status</th><th>Finished</th></tr></thead><tbody>${d.redesign.map((r) => `<tr><td>${esc(r.area)}</td><td>${tag(r.status)}</td><td>${esc(r.finished)}</td></tr>`).join("")}</tbody></table></div></section>

    <section class="rcard"><h3>What shipped</h3><ol class="pr-miles">${d.shipped.map((s) => `<li><time datetime="${esc(s.date)}">${esc(dayf.format(new Date(s.date + "T12:00:00Z")))}</time><span>${esc(s.text)}</span></li>`).join("")}</ol></section></div>`;
}

export async function renderProgress(main) {
  clearInterval(timer);
  const load = async () => {
    const r = await fetch("/api/admin/progress", { credentials: "same-origin", cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not load the progress numbers.");
    return d;
  };
  last = await load(); paint(main, last);
  timer = setInterval(async () => {
    if (!document.getElementById("pr-root") || document.hidden) { if (!document.getElementById("pr-root")) clearInterval(timer); return; }
    try { last = await load(); const y = window.scrollY; paint(main, last); window.scrollTo(0, y); } catch {}
  }, 30000);
  clearInterval(agoTimer); agoTimer = setInterval(() => { const a = document.getElementById("pr-ago"); if (a && last) a.textContent = ago(last.at); }, 5000);
}
