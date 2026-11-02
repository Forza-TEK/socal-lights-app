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
