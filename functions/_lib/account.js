import { purgeRenewals } from "./renewal.js";
import { r2Delete, photoKeys } from "./dbchunk.js";
import { logOp } from "./oplog.js";
import { refundDueStatements } from "./orders.js";
// Removes an account and everything tied to it. Used by "delete my account" (DELETE /api/me) and the admin Users tab.
// Removes sign-ins, drafts, profile picture, contest entries (with their photos) and votes, closes contests the person
// runs (unannounced ones are closed; announced ones keep their frozen results, owner-less; both leave the map), and blanks their email on homes and events they posted.
// It also clears the person's email, name and phone from every other table that holds them: judge invitations and ballots, quote requests they sent, installer profiles they
// own (and the requests those received), edit logs, event claims, weekly-email signup, co-organizer rows in other people's contests and contact details on reports.
// Homes the person added to a contest as its organizer stay (they belong to the contest); only posts.added_by is cleared.
// Kept on purpose: feature_orders (financial records; only user_id is cleared), email_prefs (so an unsubscribed address is not mailed again), hashes that expire by themselves.
export async function deleteAccount(env, id, email) {
  const all = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const contests = await all("SELECT id, event_id FROM contests WHERE owner_id = ?", id);
  const entries = await all("SELECT id, photos FROM posts WHERE user_id = ?", id);
  const installers = (await all("SELECT id FROM installers WHERE lower(owner_email) = lower(?)", email)).map((r) => r.id);
  let avatar = ""; try { avatar = ((await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(id).first()) || {}).avatar || ""; } catch {}
  await r2Delete(env, [...photoKeys(entries), avatar], "account photos"); // one call per 1000 files (R2 delete takes a list), not one per file

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
  } catch (e) { await logOp(env, "account", "scrubbing frozen contest results failed: " + (e && e.message)); }

  try { await purgeRenewals(env, id, email); } catch (e) { await logOp(env, "account", "automatic renewal cleanup failed: " + (e && e.message)); } // automatic renewal: detach the saved payment method at Stripe (best effort) and delete the row; only Stripe ids were ever stored
  const E = email, I = id;
  // Judge rows: the person as a judge in anyone's contest, and every judge of a contest they ran. Unannounced contest: the row and its ballot go.
  // Announced contest: results are frozen, so the row stays as an anonymous placeholder (no email, token or account link) and the scores stay.
  const jMine = "SELECT j.id FROM judges j JOIN contests c ON c.id = j.contest_id WHERE c.announced = ? AND (c.owner_id = ? OR j.user_id = ? OR lower(j.email) = lower(?))";
  // Paid placements that vanish with this account (their event rows, homes and installer profile): flagged refund due FIRST, in the same batch, so Admin > Orders and the digest show them.
  // An installer profile stays on the site without an owner, but nobody can manage or renew the paid Sponsor placement any more, so it is flagged too.
  const stmts = [...refundDueStatements(env.DB, { events: contests.map((c) => c.event_id), homes: entries.map((r) => r.id), installers }, "The account owner deleted their account while a paid placement was running. Refund it in the Stripe dashboard, then mark it refunded here."), ...snaps,
    ...["judge_picks", "judge_scores", "judge_conflicts"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE judge_id IN (${jMine})`).bind(0, I, I, E)),
    env.DB.prepare(`DELETE FROM judges WHERE id IN (${jMine})`).bind(0, I, I, E),
    env.DB.prepare(`UPDATE judges SET email = 'removed-' || id, token = '', user_id = NULL WHERE id IN (${jMine})`).bind(1, I, I, E),
    // Quote requests. The copy an organizer kept goes with the organizer; requests the person sent keep the row (the installer already has the email) without the requester's details.
    env.DB.prepare("DELETE FROM contest_leads WHERE contest_id IN (SELECT id FROM contests WHERE owner_id = ?)").bind(I),
    env.DB.prepare("UPDATE contest_leads SET user_id = '', name = '', email = '', phone = '', note = '' WHERE user_id = ? OR lower(email) = lower(?)").bind(I, E),
    env.DB.prepare("DELETE FROM installer_leads WHERE installer_id IN (SELECT id FROM installers WHERE lower(owner_email) = lower(?))").bind(E),
    env.DB.prepare("UPDATE installer_leads SET user_id = '', name = '', email = '', phone = '', note = '' WHERE user_id = ? OR lower(email) = lower(?)").bind(I, E),
    env.DB.prepare("UPDATE installers SET owner_email = '' WHERE lower(owner_email) = lower(?)").bind(E),
    env.DB.prepare("UPDATE installers SET email = '' WHERE lower(email) = lower(?)").bind(E),
    env.DB.prepare("DELETE FROM listing_changes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)").bind(I),
    env.DB.prepare("UPDATE listing_changes SET by_email = '', by_name = '' WHERE lower(by_email) = lower(?)").bind(E),
    env.DB.prepare("DELETE FROM lights_on WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)").bind(I),
    env.DB.prepare("DELETE FROM event_claims WHERE user_id = ? OR lower(email) = lower(?)").bind(I, E),
    env.DB.prepare("DELETE FROM alert_subs WHERE lower(email) = lower(?)").bind(E),
    env.DB.prepare("DELETE FROM contest_staff WHERE lower(email) = lower(?)").bind(E),
    env.DB.prepare("UPDATE reports SET contact = '' WHERE lower(contact) = lower(?)").bind(E),
    env.DB.prepare("UPDATE feature_orders SET user_id = NULL WHERE user_id = ?").bind(I),
    env.DB.prepare("DELETE FROM votes WHERE user_id = ? OR post_id IN (SELECT id FROM posts WHERE user_id = ?)").bind(id, id),
    env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(id),
    // Homes this person added to a contest as its organizer belong to the contest: they stay, without the link back to the account.
    env.DB.prepare("UPDATE posts SET added_by = NULL WHERE added_by = ?").bind(id),
    env.DB.prepare("UPDATE posts SET contact_email = '' WHERE contest_id IS NULL AND lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("UPDATE event_submissions SET contact_email = '' WHERE lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("DELETE FROM contest_staff WHERE contest_id IN (SELECT id FROM contests WHERE owner_id = ?)").bind(id),
    env.DB.prepare("UPDATE contest_changes SET by_email = '', by_name = '' WHERE lower(by_email) = lower(?)").bind(email),
    // Co-organizer log lines hold email addresses ("Added x@y.com", "x@y.com" / "Removed"): the person's own address goes from every contest, and every co-organizer address
    // goes from the logs of contests they ran (those contests lose their owner and their co-organizer list too).
    env.DB.prepare("UPDATE contest_changes SET old = CASE WHEN instr(lower(old), lower(?1)) > 0 THEN '' ELSE old END, new = CASE WHEN instr(lower(new), lower(?1)) > 0 THEN 'a co-organizer' ELSE new END WHERE field = 'Co-organizers'").bind(email),
    env.DB.prepare("UPDATE contest_changes SET old = '', new = '' WHERE field = 'Co-organizers' AND contest_id IN (SELECT id FROM contests WHERE owner_id = ?)").bind(id),
    // The admin activity log labels Users rows with the person's email. Blank the labels that carry it (the action, time and admin stay).
    env.DB.prepare("UPDATE admin_log SET label = '' WHERE instr(lower(label), lower(?)) > 0").bind(email),
    // Announced contests stay 'live' (frozen results, winner crowns and the Past results page stay); the organizer's personal data goes either way.
    env.DB.prepare("UPDATE contests SET status = CASE WHEN announced = 1 THEN 'live' ELSE 'closed' END, owner_id = '', contact_email = '', installer_email = '', event_id = NULL WHERE owner_id = ?").bind(id),
    env.DB.prepare("DELETE FROM drafts WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ];
  for (const c of contests) if (c.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id)); // its paid placement was flagged above
  await env.DB.batch(stmts);
}
