// HTML versions of the invitation emails. Every builder returns { subject, text, html }: the plain text is kept for mail apps that do not show
// HTML, and the HTML is a single-column, table-based layout with inline styles so it holds up in Gmail, Apple Mail and Outlook.
// Nothing here sends mail. sendMail() in auth.js takes the html field.
const BRAND = { ink: "#1f1d1a", muted: "#6b6760", line: "#ece6dd", cream: "#fbf3ea", orange: "#e0560a", red: "#c8324f", white: "#ffffff" };
const SITE = "https://socallights.app", LOGO = SITE + "/img/icon-192.png";
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A button that survives Outlook: a padded table cell with the link inside
const button = (label, url) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px"><tr><td align="center" bgcolor="${BRAND.orange}" style="border-radius:10px"><a href="${esc(url)}" style="display:inline-block;padding:15px 30px;font:600 17px/1.2 Arial,Helvetica,sans-serif;color:${BRAND.white};text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;
const row = (html) => `<tr><td style="padding:0 40px">${html}</td></tr>`;

// title: heading; eyebrow: small caps line above it; intro: plain sentence(s); extra: html blocks after the button; foot: why they got this email
function layout({ preheader, eyebrow, title, intro, cta, extra = "", foot }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.cream}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream}"><tr><td align="center" style="padding:28px 12px">
 <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${BRAND.white};border-radius:16px;border:1px solid ${BRAND.line}">
  <tr><td align="center" style="padding:34px 40px 8px"><a href="${SITE}" style="text-decoration:none"><img src="${LOGO}" width="64" height="64" alt="SoCal Lights" style="display:block;border:0;border-radius:32px;margin:0 auto 10px"><span style="font:600 22px/1.2 Arial,Helvetica,sans-serif;color:${BRAND.ink}">SoCal <span style="color:${BRAND.orange}">Lights</span></span></a></td></tr>
  ${row(`<p style="margin:26px 0 8px;font:600 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.red};text-align:center">${eyebrow}</p><h1 style="margin:0;font:600 28px/1.25 Arial,Helvetica,sans-serif;color:${BRAND.ink};text-align:center">${title}</h1>`)}
  ${row(`<p style="margin:18px 0 0;font:400 17px/1.55 Arial,Helvetica,sans-serif;color:${BRAND.ink};text-align:center">${intro}</p><div align="center">${button(cta.label, cta.url)}</div>`)}
  ${extra ? row(extra) : ""}
  <tr><td style="padding:30px 40px 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${BRAND.line};padding-top:18px;font:400 13px/1.55 Arial,Helvetica,sans-serif;color:${BRAND.muted};text-align:center">${foot}<br><br>Button not working? Copy this link into your browser:<br><a href="${esc(cta.url)}" style="color:${BRAND.muted};word-break:break-all">${esc(cta.url)}</a></td></tr></table></td></tr>
 </table>
 <p style="margin:16px 0 0;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${BRAND.muted};text-align:center">SoCal Lights &middot; <a href="${SITE}" style="color:${BRAND.muted}">socallights.app</a> &middot; <a href="mailto:info@socallights.app" style="color:${BRAND.muted}">info@socallights.app</a></p>
</td></tr></table></body></html>`;
}
const panel = (title, lines) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:${BRAND.cream};border-radius:12px"><tr><td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${BRAND.ink}"><b style="font-weight:600">${esc(title)}</b>${lines.map((l) => `<div style="margin-top:8px;padding-left:16px;text-indent:-16px">&bull;&nbsp; ${l}</div>`).join("")}</td></tr></table>`;

// ---- Judge invitation (contests/[slug]/judges.js) ----
export function judgeInvite(c, origin = SITE) {
  const url = `${origin}/c/${c.slug}/judge`, score = c.judge_method === "score";
  const how = score ? "Score every home from 1 to 10 in each category." : "Pick one favorite home in each category.";
  return {
    subject: `You're invited to judge ${c.name}`,
    text: `${c.org} invited you to be a judge for ${c.name}.\n\nOpen your judges' ballot (sign in with this email address):\n${url}\n\nJudges vote separately from the public. ${how} Judge on first impression, creativity, theme, craftsmanship and variety of lights. If you know a household, mark it so your vote for it doesn't count.`,
    html: layout({
      preheader: `${c.org} invited you to be a judge. Open your ballot in one tap.`, eyebrow: "Judges' invitation",
      title: `You're invited to judge<br>${esc(c.name)}`,
      intro: `<b>${esc(c.org)}</b> asked you to be one of the judges. It takes a few minutes, and you can do it on your phone.`,
      cta: { label: "Open my judges' ballot", url },
      extra: panel("How judging works", [esc(how), "Judge on first impression, creativity, theme, craftsmanship and variety of lights.", "Know a household? Tap <i>I know this household</i> and your vote for it will not count.", "Your picks stay private until winners are announced, and you can change them until voting closes."])
        + `<p style="margin:18px 0 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:${BRAND.muted};text-align:center">Sign in with <b>this email address</b> so we know it is you.</p>`,
      foot: `You got this email because ${esc(c.org)} added you as a judge for ${esc(c.name)}.`,
    }),
  };
}

// ---- Neighbor invitation (contests/[slug]/invite.js) ----
export function neighborInvite(c, note = "") {
  const url = `${SITE}/c/${c.slug}`;
  return {
    subject: `You're invited: ${c.name}`,
    text: `${c.org} invites you to ${c.name} in ${c.city}.${note ? `\n\n${note}` : ""}\n\nEnter your home or vote for your favorites: ${url}\n\n(You got this because ${c.org} entered your address. Reply to ${c.contact_email} to be left off future invitations.)`,
    html: layout({
      preheader: `${c.org} invites you to enter your home or vote for your favorites.`, eyebrow: `Home decorating contest &middot; ${esc(c.city)}`,
      title: `${esc(c.org)} invites you to<br>${esc(c.name)}`,
      intro: `Enter your home, or vote for your favorite lights in the neighborhood. It is free.`,
      cta: { label: "Enter your home or vote", url },
      extra: (note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr><td style="border-left:4px solid ${BRAND.orange};padding:4px 0 4px 16px;font:italic 400 16px/1.55 Georgia,'Times New Roman',serif;color:${BRAND.ink}">${esc(note).replace(/\n/g, "<br>")}</td></tr></table>` : "")
        + panel("It takes about a minute", ["Tap the button and sign in with your email or Google.", "<b>To enter:</b> add a photo of your home and your address.", "<b>To vote:</b> pick one favorite in each category."]),
      foot: `You got this because ${esc(c.org)} entered your address. ${c.contact_email ? `Reply to <a href="mailto:${esc(c.contact_email)}" style="color:${BRAND.muted}">${esc(c.contact_email)}</a> to be left off future invitations.` : ""}`,
    }),
  };
}

// ---- Co-organizer invitation (contests/[slug]/staff.js) ----
export function coOrganizerInvite(c) {
  const url = `${SITE}/c/${c.slug}/manage`;
  return {
    subject: `You can help run ${c.name}`,
    text: `${c.org} added you as a co-organizer of ${c.name}. Sign in with this email address to approve entries and manage the contest: ${url}`,
    html: layout({
      preheader: `${c.org} added you as a co-organizer. Open the dashboard.`, eyebrow: "Co-organizer invitation",
      title: `You can help run<br>${esc(c.name)}`,
      intro: `<b>${esc(c.org)}</b> added you as a co-organizer. You get the same dashboard they use.`,
      cta: { label: "Open the dashboard", url },
      extra: panel("What you can do", ["Approve or decline the homes people enter.", "Review votes, and void any that look wrong.", "Invite judges and add sponsors.", "See visits, QR scans and votes per day."])
        + `<p style="margin:18px 0 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:${BRAND.muted};text-align:center">Sign in with <b>this email address</b>. Only the person who created the contest can change its dates and details.</p>`,
      foot: `You got this email because ${esc(c.org)} added you to ${esc(c.name)}.`,
    }),
  };
}
