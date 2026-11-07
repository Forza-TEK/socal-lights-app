import { r2Delete } from "./dbchunk.js";
// How long a connection's network (IP) address is kept. The privacy policy promises "within two days"; this is where that is enforced.
// submit_log (raw IP of each form submission) and login_codes (IP of each sign-in code request) are pruned on every insert, and again by
// the scheduled admin digest. help_votes.who (a one-way fingerprint made from the IP, only used to stop repeat votes within a day) is blanked too.
export const IP_KEEP = "-48 hours";

export function ipPruneStatements(env) {
  return [
    env.DB.prepare(`DELETE FROM submit_log WHERE created_at < datetime('now','${IP_KEEP}')`),
    env.DB.prepare(`DELETE FROM login_codes WHERE created_at < datetime('now','${IP_KEEP}')`),
    env.DB.prepare(`UPDATE help_votes SET who = '' WHERE who != '' AND created_at < datetime('now','${IP_KEEP}')`),
  ];
}
// Best effort: a failed prune must never block the request it rides on.
export async function pruneIps(env) { try { await env.DB.batch(ipPruneStatements(env)); } catch {} }

// Personal data that outlives its purpose, purged or blanked on a schedule (privacy audit PL-04). The rows stay; only the personal text goes.
//   unconfirmed weekly-email signups : deleted after 30 days (an address someone else typed, never confirmed)
//   declined event submissions       : contact email blanked after 12 months
//   reports (name, message, contact) : blanked after 12 months
//   admin_log labels that name a person (Users, Reports areas) : blanked after 12 months
//   removal_requests (address, email, note) : blanked 6 months after Admin closed the request (done or declined); open ones are kept
//   contest_changes co-organizer rows (they hold email addresses) : old/new blanked after 12 months
// Account deletion clears the same fields for that person at once (account.js).
export const UNCONFIRMED_KEEP = "-30 days";
export const RECORDS_KEEP = "-12 months";
export const CLOSED_KEEP = "-6 months";
export function retentionStatements(env) {
  const long = `datetime('now','${RECORDS_KEEP}')`, short = `datetime('now','${CLOSED_KEEP}')`;
  return [
    env.DB.prepare(`DELETE FROM alert_subs WHERE confirmed = 0 AND created_at < datetime('now','${UNCONFIRMED_KEEP}')`),
    env.DB.prepare(`UPDATE event_submissions SET contact_email = '' WHERE status = 'declined' AND contact_email != '' AND created_at < ${long}`),
    env.DB.prepare(`UPDATE reports SET name = '', message = '', contact = '' WHERE (name != '' OR message != '' OR contact != '') AND created_at < ${long}`),
    env.DB.prepare(`UPDATE admin_log SET label = '' WHERE label != '' AND area IN ('users','normalize','reports','removals') AND at < ${long}`),
    env.DB.prepare(`UPDATE removal_requests SET address = '', email = '', note = '' WHERE status != 'open' AND (address != '' OR email != '' OR note != '') AND COALESCE(handled_at, created_at) < ${short}`),
    env.DB.prepare(`UPDATE contest_changes SET old = '', new = '' WHERE field = 'Co-organizers' AND (old != '' OR new != '') AND at < ${long}`),
  ];
}
// Best effort, like pruneIps. Called by the scheduled admin digest.
export async function pruneRetention(env) { try { await env.DB.batch(retentionStatements(env)); } catch {} await pruneSponsorRecords(env); }

// Organizer-collected sponsors (privacy): the sponsor's contact details, the amount and payment notes, and the PRIVATE receipt file are kept for 24 months after the contest's voting ended, then removed
// (the files from R2 with the batched r2Delete, the columns blanked). The sponsor's public name, logo and link stay with the contest page. privacy.html states this window.
export const SPONSOR_KEEP = "-24 months";
export async function pruneSponsorRecords(env) {
  try {
    const old = `contest_id IN (SELECT id FROM contests WHERE vote_end < date('now','${SPONSOR_KEEP}'))`;
    const rows = (await env.DB.prepare(`SELECT receipt FROM contest_sponsors WHERE receipt != '' AND ${old} LIMIT 500`).all()).results;
    if (rows.length && env.PHOTOS) await r2Delete(env, rows.map((r) => r.receipt), "sponsor receipts");
    await env.DB.prepare(`UPDATE contest_sponsors SET contact_name = '', phone = '', email = '', amount_cents = NULL, paid_date = '', paid_method = '', in_kind_note = '', receipt = '', receipt_name = '' WHERE (contact_name != '' OR phone != '' OR email != '' OR amount_cents IS NOT NULL OR paid_date != '' OR paid_method != '' OR in_kind_note != '' OR receipt != '') AND ${old}`).run();
  } catch {}
}
