# Email templates

Every automatic email the site sends is defined in `functions/_lib/mailtpl.js` (31 of them: sign-in code, weekly alerts, approvals and declines, installer confirmations and quotes, contest invitations, reminders and results, and the admin summary).

The admin edits them in **Admin > Settings > Email templates** (`/admin/#emails`). Each email has a subject and a plain-text body. The HTML version is built from the same text (paragraphs, "- " lists, clickable links, the round SoCal Lights logo beside the wordmark in the header, and a footer), so the two always match. The screen shows both versions with example values, can send a test to the signed-in admin, and can reset an email to its default.

## How it works
- The default wording lives in `TEMPLATES` in `mailtpl.js`. A row in `email_templates` (migration 0148) exists only for an email the admin changed; delete the row (or press Reset) to go back to the default.
- `{{name}}` is replaced by a value. `{{#name}}...{{/name}}` shows its text only when that value isn't empty. Saving is refused for unknown placeholders and when a required value (such as the sign-in `{{code}}`) was removed.
- Code sends an email with `sendTemplate(env, "template_id", to, { vars })`. Never call `sendMail` with hard-coded wording.
- Admin API: `GET /api/admin/emails`, `PUT` or `POST {action:"reset"}` on `/api/admin/emails/<id>`, `POST /api/admin/mailpreview` (preview and test send). Saves and resets show in the Activity log.

## Add a new email
Add an entry to `TEMPLATES` (id, group, name, to, when, vars with a label, an example and whether it is required, subject, text), then send it with `sendTemplate`. It appears in the admin list automatically.

## Invitations with the designed layout
The judge invitation, contest (neighbor) invitation and co-organizer invitation are in this list too (`judge_invite`, `contest_invite`, `coorg_invite`). They use `layout: "invite"`, a richer HTML design (centered title, orange button, boxed tips) built by `toInviteHtml` in `mailtpl.js`. In the editor, the wording uses a few markers: `~ ` small heading above the title, `# ` title, `[Button text](link)` for the button, `## ` plus `- ` lines for a boxed list, `> ` for a quoted note, `* ` for the small print, and `**bold**`. The plain-text version strips the markers. The editor shows these notes under the text box.

## One design for every email (2026-11-04)
All emails use the same designed layout (`toInviteHtml` in `functions/_lib/mailtpl.js`): round logo and wordmark, a small label, a big title, the message, an orange button, light grey boxes for lists, then a footer. The layout comes from markers in the wording (shown in the editor): `~` small label, `#` title, `[Label](link)` button (also usable inside a line as a plain link), `##` box title followed by `- ` lines, `>` quote, `@` big code (sign-in code), `*` small print (why you got this email). The plain-text version is made from the same wording and ends with the same footer.

## Unsubscribe
Each email has an `unsub` type that sets the line under it:
- `link`: reminders, team and listing updates, new-entry notices, results and neighbor invitations. The line links to `/unsubscribe?t=<token>` (`public/unsubscribe.html`, API `/api/unsub`, table `email_prefs`, code `functions/_lib/emailprefs.js`). Someone who unsubscribes is skipped by `sendTemplate` for these emails only; they can turn them back on from the same page.
- `alerts`: the weekly alert uses its own link (`/api/alerts/unsubscribe`, which deletes the sign-up).
- `signin`: sign-in code and alert confirmation say they only arrive when you ask.
- `service` (default): approvals, declines, quote requests and similar say they are service emails with no unsubscribe link, and to write to info@socallights.app to stop all email.
- `none`: admin-only emails have no line.
Set `unsub` on a new template in `TEMPLATES`.

