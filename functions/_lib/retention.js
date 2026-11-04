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
