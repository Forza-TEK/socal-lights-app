// Removes an account and everything tied to it. Used by "delete my account" (DELETE /api/me) and the admin Users tab.
// Removes sign-ins, drafts, profile picture, contest entries (with their photos) and votes, closes contests the person
// runs (unannounced ones are closed; announced ones keep their frozen results, owner-less; both leave the map), and blanks their email on homes and events they posted.
export async function deleteAccount(env, id, email) {
  const all = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const contests = await all("SELECT id, event_id FROM contests WHERE owner_id = ?", id);
  const entries = await all("SELECT photos FROM posts WHERE user_id = ?", id);
  let avatar = ""; try { avatar = ((await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(id).first()) || {}).avatar || ""; } catch {}
  for (const e of entries) for (const k of JSON.parse(e.photos || "[]")) await env.PHOTOS.delete(k).catch(() => {});
  if (avatar) await env.PHOTOS.delete(avatar).catch(() => {});

  // Homes this person entered in announced contests: scrub them from the frozen results (name, address, city, coordinates, photos) so no page
  // can show them; the placeholder is drawn wherever the snapshot is read. Vote tallies, ranks and judge values stay, so results don't change.
  const snaps = [];
  try {
    const mine = new Set((await all("SELECT id FROM posts WHERE user_id = ?", id)).map((r) => r.id));
    for (const c of await all("SELECT id, results FROM contests WHERE announced = 1 AND results != '' AND id IN (SELECT contest_id FROM posts WHERE user_id = ? AND contest_id IS NOT NULL)", id)) {
      let snap; try { snap = JSON.parse(c.results); } catch { continue; }
      if (!snap || !Array.isArray(snap.entries)) continue;
      for (const e of snap.entries) if (mine.has(e.id)) Object.assign(e, { name: "", biz: "", address: "", city: "", lat: null, lng: null, photos: [], removed: true });
      snaps.push(env.DB.prepare("UPDATE contests SET results = ? WHERE id = ?").bind(JSON.stringify(snap), c.id));
    }
  } catch {}

  const stmts = [...snaps,
    env.DB.prepare("DELETE FROM votes WHERE user_id = ? OR post_id IN (SELECT id FROM posts WHERE user_id = ?)").bind(id, id),
    env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(id),
    env.DB.prepare("UPDATE posts SET contact_email = '' WHERE contest_id IS NULL AND lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("UPDATE event_submissions SET contact_email = '' WHERE lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("DELETE FROM contest_staff WHERE contest_id IN (SELECT id FROM contests WHERE owner_id = ?)").bind(id),
    env.DB.prepare("UPDATE contest_changes SET by_email = '', by_name = '' WHERE lower(by_email) = lower(?)").bind(email),
    // Announced contests stay 'live' (frozen results, winner crowns and the Past results page stay); the organizer's personal data goes either way.
    env.DB.prepare("UPDATE contests SET status = CASE WHEN announced = 1 THEN 'live' ELSE 'closed' END, owner_id = '', contact_email = '', installer_email = '', event_id = NULL WHERE owner_id = ?").bind(id),
    env.DB.prepare("DELETE FROM drafts WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ];
  for (const c of contests) if (c.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id));
  await env.DB.batch(stmts);
}
