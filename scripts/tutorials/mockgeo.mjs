// Recording helper: the local dev server cannot reach the address lookup services (Census, OpenStreetMap), so for the "Add homes yourself"
// scenes the recorder stands in for them. Everything else is the real app: the page, the parsing, the "Already in" check against the
// local database, and the rows that appear afterwards (this helper writes them to the LOCAL database with the same columns the real
// endpoint uses). Demo addresses are public buildings, never real homes. Local only; never run against the live site.
import { execFileSync } from "node:child_process";
const SLUG = "maple-street-holiday-lights-2026";
// what the lookup would answer for each demo address: [matched text, lat, lng, street, zip]
export const GEO = {
  "1 civic center plaza": ["1 CIVIC CENTER PLZ, IRVINE, CA, 92606", 33.6862, -117.8264, "1 Civic Center Plaza", "92606"],
  "14301 yale ave": ["14301 YALE AVE, IRVINE, CA, 92604", 33.7066, -117.7898, "14301 Yale Ave", "92604"],
  "6950 marine way": ["6950 MARINE WAY, IRVINE, CA, 92618", 33.6776, -117.7326, "6950 Marine Way", "92618"],
  "9999 nowhere lane": null,
};
const key = (a) => String(a).split(",")[0].trim().toLowerCase();
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sql = (cmd) => execFileSync("npx", ["wrangler", "d1", "execute", "socal-lights", "--local", "--command", cmd], { stdio: "ignore" });
export async function fakeGeocode(page, userId = "u_org") {
  await page.route(`**/api/contests/${SLUG}/entries`, async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    const b = req.postDataJSON(), res = await route.fetch(), j = await res.json();
    const viewOf = (h, i) => { const g = GEO[key(h.address)]; return { index: i, address: h.address, street: g[3], city: "Irvine", matched: g[0], title: String(h.name || "").trim() || "Home at " + g[3] }; };
    const found = [], failed = [];
    b.homes.forEach((h, i) => {
      if ((j.skipped || []).some((s) => s.index === i)) return;
      const g = GEO[key(h.address)];
      if (g) found.push(viewOf(h, i)); else failed.push({ index: i, address: h.address, reason: "Not found. Check the number, street and city." });
    });
    if (b.dryRun) return route.fulfill({ json: { ok: true, dryRun: true, found, failed, skipped: j.skipped || [] } });
    const added = [];
    for (const f of found) {
      const g = GEO[key(f.address)], id = "p_added" + Math.random().toString(36).slice(2, 8);
      sql(`INSERT INTO posts (id,status,biz,title,city,county,lat,lng,web,phone,where_txt,descr,photos,contact_email,season,address,show_address,poster_type,street,state,zip,service_area,contest_id,category,user_id,added_by,entry_no,approved_at) VALUES (${q(id)},'approved',${q(f.title)},${q(f.title)},'Irvine','Orange',${g[1]},${g[2]},'','','',${q("Entry in Maple Street Holiday Lights 2026")},'[]','','christmas',${q(g[3] + ", Irvine, CA " + g[4])},1,'homeowner',${q(g[3])},'CA',${q(g[4])},'','c_demo','','',${q(userId)},(SELECT COALESCE(MAX(entry_no),0)+1 FROM posts WHERE contest_id='c_demo'),datetime('now'));`);
      added.push({ ...f, id });
    }
    return route.fulfill({ json: { ok: true, dryRun: false, added, failed, skipped: j.skipped || [] } });
  });
}
