/* Chat to form hand-off (docs/ai-assistant-actions-design.md). The AI assistant's "Start this event" card opens /add-event?from=chat&name=...&city=...
   This module turns those query values into answers for the form, checking every one the way the form would. Nothing here is trusted: unknown or malformed
   values are dropped, text is length-limited, and the visitor reviews and confirms all of it in the form before it is published.
   The values are kept in this tab (sessionStorage) while the visitor signs in, then used once. */
var KEYS = { event: "scl-prefill-event", home: "scl-prefill-home", contest: "scl-prefill-contest" };
var DATE = /^\d{4}-\d{2}-\d{2}$/;
var txt = function (v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n); };

// params: URLSearchParams. seasons: the SEASONS object from /seasons.js. cities: array of known city names. Returns only the fields that passed.
export function eventPrefill(params, seasons, cities) {
  var out = {}, p = function (k) { return params.get(k); };
  var name = txt(p("name"), 120); if (name.length >= 4) out.name = name;
  var season = txt(p("season"), 20); if (seasons && seasons[season]) { out.season = season; var type = txt(p("type"), 20); if (seasons[season].types && seasons[season].types[type]) out.type = type; }
  var start = txt(p("start"), 10), end = txt(p("end"), 10);
  if (DATE.test(start) && !isNaN(Date.parse(start + "T12:00:00"))) { out.start = start; if (DATE.test(end) && end >= start && !isNaN(Date.parse(end + "T12:00:00"))) out.end = end; else out.end = start; }
  var city = txt(p("city"), 60); if (cities && cities.indexOf(city) >= 0) out.city = city;
  var free = txt(p("free"), 3); if (free === "yes" || free === "no") out.free = free;
  var hours = txt(p("hours"), 120); if (hours) out.hours = hours;
  var venue = txt(p("venue"), 120); if (venue) out.venue = venue;
  var street = txt(p("street"), 120); if (street) out.street = street;
  var blurb = txt(p("blurb"), 600); if (blurb) out.blurb = blurb;
  return out;
}
export function stash(values, kind) { try { sessionStorage.setItem(KEYS[kind || "event"], JSON.stringify(values)); } catch (e) {} }
export function take(kind) { try { var k = KEYS[kind || "event"], v = JSON.parse(sessionStorage.getItem(k) || "null"); sessionStorage.removeItem(k); return v && typeof v === "object" ? v : null; } catch (e) { return null; } }
// A home display: who is posting, names, season and address. Photos always stay in the form.
export function homePrefill(params, seasons, cities) {
  var out = {}, p = function (k) { return params.get(k); };
  if (p("kind") === "installer" || p("kind") === "homeowner") out.kind = p("kind");
  var biz = txt(p("biz"), 80); if (biz.length >= 2) out.biz = biz;
  var title = txt(p("title"), 90); if (title.length >= 3) out.title = title;
  var desc = txt(p("desc"), 600); if (desc.length >= 10) out.desc = desc;
  var season = txt(p("season"), 20); if (seasons && seasons[season]) out.season = season;
  var city = txt(p("city"), 60); if (cities && cities.indexOf(city) >= 0) out.city = city;
  var street = txt(p("street"), 120); if (street) out.street = street;
  var zip = txt(p("zip"), 5); if (/^\d{5}$/.test(zip)) out.zip = zip;
  return out;
}
// A contest: the three things the wizard asks first.
export function contestPrefill(params, cities) {
  var out = {}, p = function (k) { return params.get(k); };
  var name = txt(p("name"), 90); if (name.length >= 4) out.name = name;
  var org = txt(p("org"), 80); if (org.length >= 2) out.org = org;
  var city = txt(p("city"), 60); if (cities && cities.indexOf(city) >= 0) out.city = city;
  return out;
}
// Call first thing on the form page: if the page was opened by the chat, remember the values, tidy the address bar, and return true.
export function capture(seasons, cities, kind) {
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("from") !== "chat") return false;
    kind = kind || "event";
    var v = kind === "home" ? homePrefill(q, seasons, cities) : kind === "contest" ? contestPrefill(q, cities) : eventPrefill(q, seasons, cities); stash(v, kind);
    history.replaceState(null, "", location.pathname);
    return Object.keys(v).length > 0;
  } catch (e) { return false; }
}
