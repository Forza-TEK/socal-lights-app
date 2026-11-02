// Emails to the people behind a listing when Admin approves, declines or restores it. Best effort: a failed email never blocks the action.
// The wording lives in mailtpl.js and can be edited in Admin > Settings > Email templates.
import { sendTemplate } from "./mailtpl.js";

export function tell(env, waitUntil, to, id, vars) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  const job = sendTemplate(env, id, to, vars).catch(() => {});
  if (waitUntil) waitUntil(job);
}
