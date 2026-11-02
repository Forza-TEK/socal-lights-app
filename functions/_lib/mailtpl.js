// Every automatic email SoCal Lights sends, in one place. The wording here is the default; the admin can
// edit any of them in Admin > Settings > Email templates (saved in the email_templates table).
//
// A template is a subject plus a plain-text body. The HTML version is built from the same wording, so the two always match.
// {{name}} is replaced with a value; {{#name}}...{{/name}} is shown only when that value isn't empty.
// Each variable is [label, sample, required]. `sample` is what the preview and the test email use.
import { sendMail } from "./auth.js";

const SITE = "https://socallights.app";
const THANKS = "\n\nThanks for being part of SoCal Lights.\nhttps://socallights.app";
const NOTE = '{{#reason}}\n\nA note from our team:\n"{{reason}}"{{/reason}}';

export const GROUPS = [
  ["account", "Sign-in and alerts"],
  ["listing", "Houses and events"],
  ["installer", "Installers"],
  ["contest", "Contest organizers"],
  ["entrant", "Entrants, voters and judges"],
  ["admin", "Sent to the admin"],
];

export const TEMPLATES = [
  // ---- Sign-in and alerts
  { id: "signin_code", group: "account", name: "Sign-in code", to: "Anyone signing in by email", when: "Someone asks for a sign-in code.",
    vars: { code: ["The 6-digit code", "482913", true] },
    subject: "Your SoCal Lights code: {{code}}",
    text: "Your SoCal Lights sign-in code is {{code}}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email." },
  { id: "alerts_confirm", group: "account", name: "Confirm weekly alerts", to: "Someone signing up for the weekly email", when: "They ask for weekly lights and events near a city.",
    vars: { radius: ["Miles around the city", "10"], city: ["City", "Pasadena"], link: ["Confirmation link", `${SITE}/api/alerts/confirm?t=abc123`, true] },
    subject: "Confirm your SoCal Lights alerts",
    text: "Confirm that you want a weekly email of lights and events within {{radius}} miles of {{city}}:\n\n{{link}}\n\nIf you did not ask for this, ignore this email and nothing will be sent.\n\nSoCal Lights · socallights.app" },
  { id: "alerts_weekly", group: "account", name: "Weekly alert", to: "People who confirmed weekly alerts", when: "Once a week, if something is happening near them.",
    vars: { radius: ["Miles around the city", "10"], city: ["City", "Pasadena"], days: ["Days ahead covered", "7"], list: ["The list of events (built by the site)", "- Candy Cane Lane\n  Dec 5 to Dec 24, 5-10pm · Altadena\n  https://socallights.app/#e-candy-cane-lane", true],
      more: ["How many more events are not listed (blank when none)", "3"], see_url: ["Link to everything near them", `${SITE}/in/pasadena`], unsub_url: ["Unsubscribe link", `${SITE}/api/alerts/unsubscribe?t=abc123`, true], footer: ["Extra footer line set by the site (blank when none)", ""] },
    subject: "Lights near {{city}} this week",
    text: "Lights and events within {{radius}} miles of {{city}} in the next {{days}} days:\n\n{{list}}\n\n{{#more}}And {{more}} more. {{/more}}See everything: {{see_url}}\n\nYou asked for this weekly email on socallights.app. Stop it any time: {{unsub_url}}{{#footer}}\n{{footer}}{{/footer}}" },

  // ---- Houses and events (Admin decisions and owner changes)
  { id: "house_approved", group: "listing", name: "Display approved", to: "The person who added the display", when: "Admin approves a display.",
    vars: { name: ["Display name", "Maple Street Lights"] },
    subject: "Your display is on the map: {{name}}",
    text: `Good news: "{{name}}" was approved and is now on the SoCal Lights map.\n\nSee it and edit it any time from Your profile: ${SITE}/profile#displays${THANKS}` },
  { id: "house_declined", group: "listing", name: "Display declined", to: "The person who added the display", when: "Admin declines a display.",
    vars: { name: ["Display name", "Maple Street Lights"], reason: ["Admin's note (blank if none)", "We couldn't match the address."] },
    subject: "About your display: {{name}}",
    text: `Thanks for adding "{{name}}". We weren't able to put it on the map this time.${NOTE}\n\nIf you would like to try again with a change, you can add it again from ${SITE}/add-house${THANKS}` },
  { id: "event_approved", group: "listing", name: "Event approved", to: "The person who submitted the event", when: "Admin approves an event.",
    vars: { name: ["Event name", "Candy Cane Lane"] },
    subject: "Your event is on the map: {{name}}",
    text: `Good news: "{{name}}" was approved and is now on the SoCal Lights map.\n\nChange the details any time from Your profile: ${SITE}/profile#events${THANKS}` },
  { id: "event_declined", group: "listing", name: "Event declined", to: "The person who submitted the event", when: "Admin declines an event.",
    vars: { name: ["Event name", "Candy Cane Lane"], reason: ["Admin's note (blank if none)", "We couldn't find a public listing for it."] },
    subject: "About your event: {{name}}",
    text: `Thanks for adding "{{name}}". We weren't able to put it on the map this time.${NOTE}\n\nYou can add it again with a change from ${SITE}/add-event${THANKS}` },
  { id: "listing_paused", group: "listing", name: "Listing taken down for the season", to: "Everyone who shares the listing", when: "The homeowner or installer takes a display down.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], link: ["Link to the listing", `${SITE}/profile#displays`, true] },
    subject: '{{who}} took down "{{title}}" on SoCal Lights',
    text: '{{who}} took this listing down for the season: "{{title}}".\n\nSee the listing and the full list of changes: {{link}}' },
  { id: "listing_resumed", group: "listing", name: "Listing put back on the map", to: "Everyone who shares the listing", when: "The homeowner or installer puts a display back.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], link: ["Link to the listing", `${SITE}/profile#displays`, true] },
    subject: '{{who}} put back "{{title}}" on SoCal Lights',
    text: '{{who}} put this listing back on the map: "{{title}}".\n\nSee the listing and the full list of changes: {{link}}' },
  { id: "listing_updated", group: "listing", name: "Listing edited", to: "Everyone who shares the listing", when: "The homeowner or installer changes a display.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], changes: ["The list of changes (built by the site)", "- Hours: 5-9pm -> 5-10pm", true], link: ["Link to the listing", `${SITE}/profile#displays`, true], manage: ["Installer manage page link (blank when no installer)", `${SITE}/installer/bright-nights/manage`] },
    subject: '{{who}} updated "{{title}}" on SoCal Lights',
    text: '{{who}} changed these on "{{title}}":\n\n{{changes}}\n\nSee the listing and the full list of changes: {{link}}{{#manage}}\n(If you are the installer, open your manage page: {{manage}}.){{/manage}}' },
  { id: "contest_unpublished", group: "listing", name: "Contest taken off the map", to: "The contest organizer", when: "Admin unpublishes a contest.",
    vars: { name: ["Contest name", "Maple Street Holiday Lights"], reason: ["Admin's note (blank if none)", "It looked like a duplicate."] },
    subject: "About your contest: {{name}}",
    text: 'Your contest "{{name}}" has been taken off the map for now.' + NOTE + `\n\nYour link and QR code still work for you. If you think this is a mistake, reply to this email and we will take another look.${THANKS}` },
  { id: "contest_live", group: "listing", name: "Contest back on the map", to: "The contest organizer", when: "Admin puts a contest back live.",
    vars: { name: ["Contest name", "Maple Street Holiday Lights"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Your contest is back on the map: {{name}}",
    text: `"{{name}}" is live again.\n\nSee it: {{link}}${THANKS}` },

  // ---- Installers
  { id: "installer_listed", group: "installer", name: "Installer asked to confirm a listing", to: "The installer named on a display", when: "A homeowner says an installer put up their lights.",
    vars: { title: ["Display name", "Maple Street Lights"], biz: ["Who listed it", "The Garcia family"], installer: ["Installer name", "Bright Nights"], city: ["City", "Pasadena"], confirm: ["Confirm link", `${SITE}/api/installers/confirm?t=abc123`, true] },
    subject: "{{title}} lists you as the installer",
    text: '{{biz}} says {{installer}} installed the lights at "{{title}}" in {{city}}. It shows on SoCal Lights as "Installed by {{installer}}" and links to your profile.\n\nIf that is right, confirm it (it adds a check mark): {{confirm}}\n\nIf it is not right, reply to this email and we will remove it.' },
  { id: "installer_confirmed", group: "installer", name: "Installer confirmed the listing", to: "The person who listed the display", when: "The installer confirms they installed it.",
    vars: { installer: ["Installer name", "Bright Nights"], title: ["Display name", "Maple Street Lights"] },
    subject: '{{installer}} confirmed the installer note on "{{title}}"',
    text: `{{installer}} confirmed they installed "{{title}}". It now shows a check mark, and you can both edit the listing from your profiles. Every change is listed with who made it, and you are emailed when the other changes something.\n\n${SITE}/profile#displays` },
  { id: "installer_removed", group: "installer", name: "Installer removed the note", to: "The person who listed the display", when: "The installer says they did not install it.",
    vars: { installer: ["Installer name", "Bright Nights"], title: ["Display name", "Maple Street Lights"] },
    subject: '{{installer}} removed the installer note on "{{title}}"',
    text: `{{installer}} says they did not install "{{title}}", so the "Installed by" line was removed. Reply to this email if that's a mistake.\n\n${SITE}/profile#displays` },
  { id: "installer_claim", group: "installer", name: "Installer profile claim", to: "Admin", when: "Someone claims an installer profile with an email that doesn't match the company website.",
    vars: { email: ["Claimer's email", "sam@gmail.com"], installer: ["Installer name", "Bright Nights"], web: ["Website on file", "brightnights.com"] },
    subject: "Installer profile claim: {{installer}}",
    text: `{{email}} says they run {{installer}} ({{web}}). Their email isn't at the company's website, so it needs your OK.\n\nTo approve, open the admin, Installers tab, and put {{email}} in "Owner email" for {{installer}}: ${SITE}/admin/` },
  { id: "installer_quote", group: "installer", name: "Quote request for an installer", to: "The installer", when: "Someone asks an installer for a quote from their profile.",
    vars: { name: ["Requester's name", "Dana Lee"], installer: ["Installer name", "Bright Nights"], email: ["Requester's email", "dana@example.com"], phone: ["Phone (blank if none)", "626-555-0100"], note: ["Their note (blank if none)", "Roofline and two trees."], profile: ["Installer profile link", `${SITE}/installer/bright-nights`] },
    subject: "Quote request from SoCal Lights",
    text: "{{name}} asked {{installer}} for a quote.\n\nEmail: {{email}}{{#phone}}\nPhone: {{phone}}{{/phone}}{{#note}}\nNote: {{note}}{{/note}}\n\nThey agreed to share these details with you for this request.\nYour profile: {{profile}}" },

  // ---- Contest organizers
  { id: "entry_new", group: "contest", name: "New contest entry waiting", to: "The contest organizer", when: "A home is entered in a contest.",
    vars: { title: ["Home name", "The Garcia Home"], street: ["Street", "12 Elm Ct"], city: ["City", "Pasadena"], contest: ["Contest name", "Maple Street Holiday Lights"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "New entry waiting: {{contest}}",
    text: "{{title}} ({{street}}, {{city}}) entered {{contest}} and is waiting for your OK. Photos are held privately until you approve.\n\nReview it: {{link}}" },
  { id: "contest_team_changed", group: "contest", name: "Contest team changed something", to: "The other organizers of the contest", when: "An organizer edits the contest.",
    vars: { who: ["Who did it", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], changes: ["The list of changes (built by the site)", "- Voting ends: Dec 20 -> Dec 22", true], link: ["Manage page", `${SITE}/c/maple-street/manage`] },
    subject: "{{who}} updated {{contest}}",
    text: "{{who}} changed:\n\n{{changes}}\n\nSee everything the team changed: {{link}}" },
  { id: "contest_quote_sent", group: "contest", name: "Quote request sent (to organizer)", to: "The contest organizer", when: "Someone asks the contest's installer for a quote.",
    vars: { name: ["Requester's name", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], installer: ["Installer name", "Bright Nights"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "Quote request sent: {{contest}}",
    text: "{{name}} asked {{installer}} for a quote. You can see requests on your dashboard: {{link}}" },
  { id: "contest_quote", group: "contest", name: "Quote request (to the contest's installer)", to: "The contest's installer", when: "Someone asks for a quote from the contest page.",
    vars: { name: ["Requester's name", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], email: ["Requester's email", "dana@example.com"], phone: ["Phone (blank if none)", "626-555-0100"], note: ["Their note (blank if none)", "Roofline and two trees."], installer: ["Installer name", "Bright Nights"] },
    subject: "Quote request from {{contest}}",
    text: "{{name}} asked for a quote through {{contest}}.\n\nEmail: {{email}}{{#phone}}\nPhone: {{phone}}{{/phone}}{{#note}}\nNote: {{note}}{{/note}}\n\nThey agreed to share these details with {{installer}} for this request." },
  { id: "results_organizer", group: "contest", name: "Results sent (to organizer)", to: "The contest organizer", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], sent: ["Entrants emailed", "12"], total: ["Entrants in all", "12"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "Results sent: {{contest}}",
    text: "You announced the winners of {{contest}}. {{sent}} of {{total}} entrants were emailed. The results are locked. Download them from your dashboard: {{link}}" },

  // ---- Entrants, voters and judges
  { id: "entry_approved", group: "entrant", name: "Entry approved", to: "The entrant", when: "The organizer approves a contest entry.",
    vars: { name: ["Home name", "The Garcia Home"], contest: ["Contest name", "Maple Street Holiday Lights"], vote_start: ["Voting starts", "Dec 1"], vote_end: ["Voting ends", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Your entry is in: {{contest}}",
    text: "{{name}} was approved and is now in {{contest}}, on the contest page and on the map. Voting runs {{vote_start}} to {{vote_end}}. Share the link so neighbors can vote: {{link}}" },
  { id: "entry_declined", group: "entrant", name: "Entry declined", to: "The entrant", when: "The organizer declines a contest entry.",
    vars: { name: ["Home name", "The Garcia Home"], contest: ["Contest name", "Maple Street Holiday Lights"], org: ["Organizer", "Maple Street Neighbors"], reason: ["Organizer's reason (blank if none)", "Photos were too dark."], link: ["Enter-again link", `${SITE}/c/maple-street/enter`, true] },
    subject: "About your entry: {{contest}}",
    text: "{{org}} couldn't include {{name}} in {{contest}}.{{#reason}} Reason: {{reason}}{{/reason}}\n\nYou can enter again with new photos or details while entries are open: {{link}}" },
  { id: "contest_remind_open", group: "entrant", name: "Voting is open", to: "Entrants of the contest", when: "The day voting opens.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], vote_end: ["Voting ends", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Voting is open: {{contest}}",
    text: "Voting for {{contest}} is open until {{vote_end}}. Ask your neighbors to vote for your home: {{link}}" },
  { id: "contest_remind_close", group: "entrant", name: "Last days to vote", to: "Entrants and voters", when: "Two days before voting closes.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], vote_end: ["Voting closes", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Last days to vote: {{contest}}",
    text: "Voting for {{contest}} closes {{vote_end}}. Make sure you've voted in every category: {{link}}" },
  { id: "judge_nudge", group: "entrant", name: "Judge reminder", to: "Judges who haven't finished", when: "The organizer sends a reminder.",
    vars: { org: ["Organizer", "Maple Street Neighbors"], contest: ["Contest name", "Maple Street Holiday Lights"], done: ["Homes scored so far", "4"], total: ["Homes to score", "12"], link: ["Judge ballot link", `${SITE}/c/maple-street/judge`, true], vote_end: ["Voting ends", "Dec 20"] },
    subject: "Reminder: your judging for {{contest}}",
    text: "{{org}} would like you to finish your ballot for {{contest}}. You have scored {{done}} of {{total}}.\n\nOpen your ballot: {{link}}\nVoting ends {{vote_end}}." },
  { id: "results_winner", group: "entrant", name: "Results: you won", to: "Winning entrants", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], wins: ["What they won", "Best Overall (Grand Prize)"], prize: ["Prizes (blank if none)", "Best Overall (Grand Prize): $100 gift card"], org: ["Organizer", "Maple Street Neighbors"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "You won: {{contest}}",
    text: "Congratulations! Your home won {{wins}} in {{contest}}.{{#prize}} Prize: {{prize}}.{{/prize}} {{org}} will contact you at this email address about any prize. A crown now shows on your home, and you can choose where to show your badge in your profile. See the results: {{link}}" },
  { id: "results_entrant", group: "entrant", name: "Results: thanks for entering", to: "Entrants who didn't win", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], winners: ["Winning homes", "The Garcia Home, 12 Elm Ct"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "Results are in: {{contest}}",
    text: "Thank you for entering {{contest}}. Winners: {{winners}}. See the full results: {{link}}" },
  { id: "results_judge", group: "entrant", name: "Results: thanks for judging", to: "Judges", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], winners: ["Winning homes", "The Garcia Home, 12 Elm Ct"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "Results are in: {{contest}}",
    text: "Thank you for judging {{contest}}. The winners are {{winners}}. {{link}}" },

  // ---- Sent to the admin
  { id: "admin_digest", group: "admin", name: "New submissions summary", to: "Admin", when: "Every few hours when there is something new.",
    vars: { headline: ["Short summary for the subject", "3 new submissions"], day_total: ["Submissions so far today", "5"], summary: ["What's new (built by the site)", "3 new submissions since the last update.\n\nEvents (3):\n- Candy Cane Lane · Altadena\n\n", true], today_line: ["Today's counts", "5 submissions (2 homes, 3 events, 0 contest entries)."], live_line: ["Live from submissions", "120 homes, 48 events."], held: ["Waiting for your review", "2"] },
    subject: "SoCal Lights: {{headline}} ({{day_total}} today)",
    text: `{{summary}}Today so far: {{today_line}}\nLive from submissions: {{live_line}}\nWaiting for your review: {{held}}\n\nEverything new is already live. To take something down, open the admin and use Unpublish: ${SITE}/admin/` },
];

export const byId = (id) => TEMPLATES.find((t) => t.id === id);

const VAR = /\{\{\s*([a-z_]+)\s*\}\}/g;
const SEC = /\{\{#([a-z_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const oneLine = (s) => String(s).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
// The names a piece of text uses, checked against what the template allows
export function usedVars(s) { const out = new Set(); for (const m of String(s).matchAll(/\{\{#?\/?\s*([a-z_]+)\s*\}\}/g)) out.add(m[1]); return [...out]; }
export function fill(s, vars) {
  return String(s).replace(SEC, (_, k, inner) => (vars[k] != null && String(vars[k]).trim() !== "" ? inner : "")).replace(VAR, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}
// Returns an error message, or "" when the wording is fine.
export function checkTemplate(t, subject, body) {
  if (!subject || subject.length > 200) return "Write a subject (up to 200 characters).";
  if (/[\r\n]/.test(subject)) return "The subject must be one line.";
  if (!body || body.length > 6000) return "Write the email text (up to 6,000 characters).";
  const ok = new Set(Object.keys(t.vars));
  const bad = usedVars(subject + "\n" + body).filter((v) => !ok.has(v));
  if (bad.length) return "Unknown placeholder: " + bad.map((v) => `{{${v}}}`).join(", ") + '. Use the values listed under "Insert a value".';
  const used = new Set(usedVars(subject + "\n" + body));
  const miss = Object.entries(t.vars).filter(([k, v]) => v[2] && !used.has(k)).map(([k]) => `{{${k}}}`);
  if (miss.length) return "This email has to include " + miss.join(", ") + " or it won't work.";
  return "";
}

export const sampleVars = (t) => Object.fromEntries(Object.entries(t.vars).map(([k, v]) => [k, v[1]]));

// What the admin has saved (or null). A missing table or row means "use the default".
export async function savedFor(env, id) {
  try { return await env.DB.prepare("SELECT subject, body FROM email_templates WHERE id = ?").bind(id).first(); } catch { return null; }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const link = (s) => s.replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)"'\]]/g, (u) => `<a href="${u}" style="color:#b3261e;text-decoration:underline">${u}</a>`);
// The branded HTML version, built from the plain text: blank lines start a new paragraph, "- " lines become a list, links are clickable.
export function toHtml(text, subject) {
  const blocks = String(text).trim().split(/\n{2,}/).map((b) => {
    const lines = b.split("\n");
    if (lines.every((l) => /^- /.test(l))) return `<ul style="margin:0 0 16px;padding-left:20px">${lines.map((l) => `<li style="margin:0 0 6px">${link(esc(l.slice(2)))}</li>`).join("")}</ul>`;
    return `<p style="margin:0 0 16px">${lines.map((l) => link(esc(l))).join("<br>")}</p>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4ded5;border-radius:14px">
<tr><td style="padding:22px 28px 0;font:600 15px/1.2 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a;letter-spacing:.02em">SoCal <span style="color:#b3261e">Lights</span></td></tr>
<tr><td style="padding:16px 28px 8px;font:400 16px/1.55 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a">${blocks}</td></tr>
<tr><td style="padding:12px 28px 24px;font:400 13px/1.5 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#6b6760;border-top:1px solid #efe9e0">SoCal Lights · <a href="https://socallights.app" style="color:#6b6760">socallights.app</a></td></tr>
</table></td></tr></table></body></html>`;
}

// Fill in a template. `draft` ({subject, body}) previews unsaved edits; otherwise the saved wording, else the default.
export async function renderTemplate(env, id, vars, draft) {
  const t = byId(id); if (!t) throw new Error("Unknown email template: " + id);
  const s = draft || (await savedFor(env, id));
  const subject = oneLine(fill(s ? s.subject : t.subject, vars)) || oneLine(fill(t.subject, vars));
  const text = fill(s ? s.body : t.text, vars).trim() || fill(t.text, vars).trim();
  return { subject, text, html: toHtml(text, subject), edited: !!s && !draft };
}

// Send one templated email (HTML and plain text). Returns true when it was handed to the mail service.
export async function sendTemplate(env, id, to, vars) {
  if (!to) return false;
  const m = await renderTemplate(env, id, vars);
  return sendMail(env, { to, subject: m.subject, text: m.text, html: m.html });
}
