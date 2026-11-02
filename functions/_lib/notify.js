// Emails to the people behind a listing when Admin approves, declines or restores it. Best effort: a failed email never blocks the action.
import { sendMail } from "./auth.js";
const SITE = "https://socallights.app";
const tail = "\n\nThanks for being part of SoCal Lights.\nhttps://socallights.app";

export function tell(env, waitUntil, to, subject, text) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  const job = sendMail(env, { to, subject, text: text + tail }).catch(() => {});
  if (waitUntil) waitUntil(job);
}
const why = (reason) => (reason ? `\n\nA note from our team:\n"${String(reason).trim().slice(0, 400)}"` : "");

export const houseApproved = (name) => ({ subject: `Your display is on the map: ${name}`, text: `Good news: "${name}" was approved and is now on the SoCal Lights map.\n\nSee it and edit it any time from Your profile: ${SITE}/profile#displays` });
export const houseDeclined = (name, reason) => ({ subject: `About your display: ${name}`, text: `Thanks for adding "${name}". We weren't able to put it on the map this time.${why(reason)}\n\nIf you would like to try again with a change, you can add it again from ${SITE}/add-house` });
export const eventApproved = (name) => ({ subject: `Your event is on the map: ${name}`, text: `Good news: "${name}" was approved and is now on the SoCal Lights map.\n\nChange the details any time from Your profile: ${SITE}/profile#events` });
export const eventDeclined = (name, reason) => ({ subject: `About your event: ${name}`, text: `Thanks for adding "${name}". We weren't able to put it on the map this time.${why(reason)}\n\nYou can add it again with a change from ${SITE}/add-event` });
export const contestUnpublished = (name, reason) => ({ subject: `About your contest: ${name}`, text: `Your contest "${name}" has been taken off the map for now.${why(reason)}\n\nYour link and QR code still work for you. If you think this is a mistake, reply to this email and we will take another look.` });
export const contestLive = (name, slug) => ({ subject: `Your contest is back on the map: ${name}`, text: `"${name}" is live again.\n\nSee it: ${SITE}/c/${slug}` });
