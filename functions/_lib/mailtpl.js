// Every automatic email SoCal Lights sends, in one place. The wording here is the default; the admin can
// edit any of them in Admin > Settings > Email templates (saved in the email_templates table).
//
// A template is a subject plus a plain-text body. The HTML version is built from the same wording, so the two always match.
// {{name}} is replaced with a value; {{#name}}...{{/name}} is shown only when that value isn't empty.
// Each variable is [label, sample, required]. `sample` is what the preview and the test email use.
import { sendMail } from "./auth.js";
import { prefsFor } from "./emailprefs.js";
import { canMailService } from "./servicemail.js";

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
  { id: "signin_code", group: "account", unsub: "signin", name: "Sign-in code", to: "Anyone signing in by email", when: "Someone asks for a sign-in code.",
    vars: { code: ["The 6-digit code", "482913", true] },
    subject: "Your SoCal Lights code: {{code}}",
    text: "~ Sign-in code\n\n# Your sign-in code\n\nYour sign-in code for SoCal Lights is below. It works for 10 minutes.\n\n@ {{code}}\n\nIf you didn't ask for it, you can ignore this email.\n\n* You got this email because someone asked to sign in to SoCal Lights with this address." },
  { id: "alerts_confirm", group: "account", unsub: "signin", name: "Confirm weekly alerts", to: "Someone signing up for the weekly email", when: "They ask for weekly lights and events near a city.",
    vars: { radius: ["Miles around the city", "10"], city: ["City", "Pasadena"], link: ["Confirmation link", `${SITE}/api/alerts/confirm?t=abc123`, true] },
    subject: "Confirm your SoCal Lights alerts",
    text: "~ One quick step\n\n# Confirm your weekly alerts\n\nConfirm that you want a weekly email of lights and events within {{radius}} miles of {{city}}.\n\n[Confirm my alerts]({{link}})\n\nIf you did not ask for this, ignore this email and nothing will be sent.\n\n* You got this email because someone signed up for weekly alerts with this address." },
  { id: "alerts_weekly", group: "account", unsub: "alerts", name: "Weekly alert", to: "People who confirmed weekly alerts", when: "Once a week, if something is happening near them.",
    vars: { radius: ["Miles around the city", "10"], city: ["City", "Pasadena"], days: ["Days ahead covered", "7"], list: ["The list of events (built by the site)", "- Candy Cane Lane: Dec 5 to Dec 24, 5-10pm · Altadena ([details](https://socallights.app/#e-candy-cane-lane))\n- Winter Lights Walk: Dec 12, 6-9pm · Pasadena ([details](https://socallights.app/#e-winter-lights-walk))", true],
      more: ["How many more events are not listed (blank when none)", "3"], see_url: ["Link to everything near them", `${SITE}/in/pasadena`], unsub_url: ["Unsubscribe link (added to the footer by the site)", `${SITE}/api/alerts/unsubscribe?t=abc123`], footer: ["Extra footer line set by the site (blank when none)", ""] },
    subject: "Lights near {{city}} this week",
    text: "~ This week near {{city}}\n\n# Lights and events near {{city}}\n\nWithin {{radius}} miles of {{city}}, in the next {{days}} days.\n\n## Coming up\n{{list}}\n\n{{#more}}And {{more}} more.\n\n{{/more}}[See everything near {{city}}]({{see_url}})\n\n* You asked for this weekly email on socallights.app.{{#footer}} {{footer}}{{/footer}}" },

  // ---- Houses and events (Admin decisions and owner changes)
  { id: "house_approved", group: "listing", name: "Display approved", to: "The person who added the display", when: "Admin approves a display.",
    vars: { name: ["Display name", "Maple Street Lights"] },
    subject: "Your display is on the map: {{name}}",
    text: "~ Good news\n\n# Your display is on the map\n\n**{{name}}** was approved and is now on the SoCal Lights map.\n\n[See and edit your display](https://socallights.app/profile#displays)\n\n## Keep it up to date\n- You can change the details of your display any time from Your profile.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you added “{{name}}” to SoCal Lights." },
  { id: "house_declined", group: "listing", name: "Display declined", to: "The person who added the display", when: "Admin declines a display.",
    vars: { name: ["Display name", "Maple Street Lights"], reason: ["Admin's note (blank if none)", "We couldn't match the address."] },
    subject: "About your display: {{name}}",
    text: "~ An update\n\n# About your display\n\nThanks for adding **{{name}}**. We weren't able to put it on the map this time.{{#reason}}\n\n**A note from our team:**\n\n> {{reason}}{{/reason}}\n\nIf you would like to try again with a change, you can add it again.\n\n[Add it again](https://socallights.app/add-house)\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you added “{{name}}” to SoCal Lights." },
  { id: "event_approved", group: "listing", name: "Event approved", to: "The person who submitted the event", when: "Admin approves an event.",
    vars: { name: ["Event name", "Candy Cane Lane"] },
    subject: "Your event is on the map: {{name}}",
    text: "~ Good news\n\n# Your event is on the map\n\n**{{name}}** was approved and is now on the SoCal Lights map.\n\n[See and edit your event](https://socallights.app/profile#events)\n\n## Keep it up to date\n- You can change the details of your event any time from Your profile.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you added “{{name}}” to SoCal Lights." },
  { id: "feature_paid", group: "listing", name: "Featured placement receipt", to: "The person who paid for a Featured event", when: "A Featured payment goes through (and again when an event that was waiting for review is approved and switches on).",
    vars: { name: ["Event name", "Candy Cane Lane"], plan: ["Plan name", "Top of the list + Featured pin"], amount: ["Amount paid", "$50.00"], list: ["What the plan includes (built by the site)", "- A gold-ringed pin on the map\n- A “Featured” badge on your event in the list and in its details\n- Your event is listed first when people browse your area"], until: ["Last day of the placement", "Dec 24, 2026"], waiting: ["Filled in only while the event waits for review (blank when live)", ""], link: ["Link to the event on the map", `${SITE}/#e-candy-cane-lane`, true], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot apply your payment, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#paid`] },
    subject: "Your Featured placement: {{name}}",
    text: "~ Thank you\n\n# Thank you for featuring your event\n\n**{{name}}**: {{plan}}, {{amount}}.{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n{{#waiting}}We are checking your event first. Your Featured placement switches on the moment it is approved, and you do not need to do anything. If we cannot list the event, you get a full refund.\n\n{{/waiting}}## What you get\n{{list}}\n- It runs from the moment you paid through {{until}}: your event's last day or the end of the season (Christmas lights: Jan 6), whichever comes first.\n- It can take a few minutes to appear. Refresh the map if you do not see it yet.\n\n[See it on the map]({{link}})\n\n## Receipt, help and renewing\n- Stripe emails your card receipt separately.\n{{#refund}}- Refunds: {{refund}} Full terms: {{terms}}\n{{/refund}}- Questions or help: write to info@socallights.app.\n- To upgrade or add time later, open https://socallights.app/feature while signed in.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you paid for a Featured placement on SoCal Lights." },
  { id: "feature_paid_home", group: "listing", guard: "deliverable", name: "Featured home receipt", to: "The person who paid for a Featured home", when: "A Featured payment for a home (a contest winner, 2nd or 3rd place) goes through. A service message: it is also sent to people who unsubscribed from marketing.",
    vars: { name: ["Home name", "Maple Street Lights"], plan: ["Plan name", "Top of the list"], amount: ["Amount paid", "$15.00"], list: ["What the plan includes (built by the site)", "- A gold-ringed pin and a Featured badge on the map.\n- Your home is listed first when people browse your area."], until: ["Last day of the placement", "Dec 24, 2026"], link: ["Link to the home on the map", `${SITE}/#h-maple-street`, true], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot feature your home, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#refunds`] },
    subject: "Your Featured placement: {{name}}",
    text: "~ Thank you\n\n# Thank you for featuring your home\n\n**{{name}}**: {{plan}}, {{amount}}.{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n## What you get\n{{list}}\n- It runs from the moment you paid through {{until}}.\n- It can take a few minutes to appear. Refresh the map if you do not see it yet.\n\n[See it on the map]({{link}})\n\n## Receipt and help\n- Stripe emails your card receipt separately.\n{{#refund}}- Refunds: {{refund}} Full terms: {{terms}}\n{{/refund}}- Questions or help: write to info@socallights.app.\n- Payment never affects a contest result.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you paid for a Featured placement on SoCal Lights." },
  { id: "payment_not_applied", group: "listing", guard: "deliverable", name: "Payment not applied (refund coming)", to: "The person who paid", when: "A payment went through but could not be applied (the dates changed, a duplicate, the event or home was declined or removed). A service message: it is also sent to people who unsubscribed from marketing.",
    vars: { what: ["What it was for", "Candy Cane Lane"], amount: ["Amount paid", "$25.00"], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"] },
    subject: "Your payment was not applied: we are refunding it",
    text: "~ An update\n\n# We could not apply your payment\n\nWe received **{{amount}}** for {{what}}{{#paid_on}} on {{paid_on}}{{/paid_on}}, but we could not put it to use, so nothing you paid for is active.\n\n## What happens next\n- We are refunding the full amount to the card you paid with. You do not need to do anything.\n- A refund usually shows on your statement within 5 to 10 business days, depending on your bank.\n- We email you again when the refund is issued.\n{{#ref}}- Order reference: {{ref}}\n{{/ref}}\nIf you think this is a mistake, write to info@socallights.app and quote the order reference.\n\n* You got this email because you made a payment on SoCal Lights. It is a service message about that payment." },
  { id: "refund_issued", group: "listing", guard: "deliverable", name: "Refund issued", to: "The person who was refunded", when: "A refund for a payment was issued (and the placement it paid for was switched off). A service message: it is also sent to people who unsubscribed from marketing.",
    vars: { what: ["What it was for", "Candy Cane Lane"], amount: ["Amount refunded", "$25.00"], off: ["Filled in when a placement was switched off (blank otherwise)", "yes"], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"] },
    subject: "Your refund was issued",
    text: "~ Refund\n\n# Your refund was issued\n\nWe refunded **{{amount}}** for {{what}}.{{#off}} The placement it paid for is now switched off.{{/off}}\n\n## Good to know\n- The money goes back to the card you paid with. It usually shows within 5 to 10 business days, depending on your bank.\n{{#paid_on}}- Paid on: {{paid_on}}\n{{/paid_on}}{{#ref}}- Order reference: {{ref}}\n{{/ref}}- Questions: write to info@socallights.app.\n\n* You got this email because a payment you made on SoCal Lights was refunded. It is a service message about that payment." },
  { id: "event_partner_paid", group: "listing", name: "Event Partner receipt", to: "The person who bought an Event Partner plan", when: "An Event Partner plan payment goes through.",
    vars: { org: ["Organization", "covinaca.gov"], cap: ["Events the plan covers", "10"], amount: ["Amount paid", "$149"], season: ["Season", "Christmas lights"], end: ["Last day of the season", "Jan 6, 2027"], list: ["What the plan includes (built by the site)", "- Covers up to 10 of your organization's events in one season"], link: ["Link to apply the plan to your events", `${SITE}/partner`, true], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot apply your payment, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#paid`] },
    subject: "Your Event Partner plan: {{org}}",
    text: "~ Thank you\n\n# Your Event Partner plan is active\n\n**{{org}}**: Event Partner, {{amount}}.{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n## What you get\n{{list}}\n- It covers the {{season}} season, through {{end}}.\n\n## Next step\nChoose which of your events use it (up to {{cap}}). Each one gets the Featured pin for its run window.\n\n[Choose your events]({{link}})\n\n## Receipt and help\n- Stripe emails your card receipt separately.\n{{#refund}}- Refunds: {{refund}} Full terms: {{terms}}\n{{/refund}}- Questions or help: write to info@socallights.app.\n- Listing an event stays free. The Event Partner badge shows only that your organization has this plan; it is not an endorsement by SoCal Lights.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you paid for an Event Partner plan on SoCal Lights." },
  { id: "contest_pass_paid", group: "contest", name: "Contest pass receipt", to: "The organizer who bought a contest pass", when: "A contest pass payment goes through.",
    vars: { org: ["Organization", "covinaca.gov"], pass: ["Pass name", "Up to 5 contests"], amount: ["Amount paid", "$299.00"], start: ["First day of the 12-month window", "Nov 10, 2026"], end: ["Last day of the 12-month window", "Nov 9, 2027"], list: ["What the pass includes (built by the site)", "- Up to 5 contests in your 12-month window in total\n- Resident entries with photos, approved by you"], link: ["Link to create a contest", `${SITE}/add-contest`, true], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot apply your payment, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#paid`] },
    subject: "Your contest pass: {{pass}}",
    text: "~ Thank you\n\n# Your contest pass is active\n\n**{{org}}**: {{pass}}, {{amount}}.{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n## What you get\n{{list}}\n- It covers {{start}} to {{end}}, the 12-month window, which starts the day you paid (or the day your first contest went live, if that came first). A contest counts when it goes live. When the window ends, your next contest needs a new pass.\n\n[Create a contest]({{link}})\n\n## Receipt, help and upgrades\n- Stripe emails your card receipt separately.\n{{#refund}}- Refunds: {{refund}} Full terms: {{terms}}\n{{/refund}}- Questions or help: write to info@socallights.app.\n- To upgrade inside the window, open https://socallights.app/contest-pass while signed in. You pay only the difference.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you paid for a contest pass on SoCal Lights." },
  { id: "contest_pass_contact", group: "admin", unsub: "none", name: "Contest pass: more than 20 contests", to: "Admin", when: "An organizer asks about running more than 20 contests in a 12-month window.",
    vars: { email: ["Organizer's email", "sam@example.org"], org: ["Organization", "example.org"], note: ["Their note (blank if none)", "We run 30 neighborhood contests a year."], link: ["Admin link", `${SITE}/admin/`] },
    subject: "Contest pass lead: more than 20 contests",
    text: "~ For your review\n\n# More than 20 contests\n\n**{{email}}** ({{org}}) asked about running more than 20 contests in a 12-month window.\n\n{{#note}}Their note:\n\"{{note}}\"\n\n{{/note}}Reply to them by email. The lead also shows in the admin, Contests tab, Contest passes.\n\n[Open the admin]({{link}})\n\n* You got this email because you are the SoCal Lights admin." },
  { id: "sponsor_submitted", group: "contest", name: "A sponsor sent a request", to: "The contest organizer", when: "Someone fills in the sponsor form from your sponsor invite link.",
    vars: { contest: ["Contest name", "Maple Street Showdown"], company: ["Sponsor's company", "Bright Nights Lighting"], contact: ["Sponsor's contact name", "Pat Lee"], email: ["Sponsor's email", "pat@example.com"], level: ["Level they chose", "Gold"], message: ["Their message (blank if none)", "Happy to help."], link: ["Link to your Sponsors tab", `${SITE}/c/maple-street-showdown/manage#sponsors`, true] },
    subject: "A sponsor wants to support {{contest}}: {{company}}",
    text: "~ For your review\n\n# A sponsor sent a request\n\n**{{company}}** ({{contact}}, {{email}}) filled in the sponsor form for **{{contest}}**. Level: {{level}}.\n\n{{#message}}Their message:\n\"{{message}}\"\n\n{{/message}}## What to do\n- Sponsorship money goes to you, not to SoCal Lights. Check that you received their payment.\n- Open your Sponsors tab, mark the payment as received (or donated in kind), then approve them for the contest page. Nothing shows until you do.\n- You can also decline the request. We email them politely.\n\n[Open my Sponsors tab]({{link}})\n\n* You got this email because you run this contest on SoCal Lights and turned on the sponsor invite link." },
  { id: "sponsor_thanks", group: "contest", name: "Thanks for your sponsor request", to: "The sponsor who filled in the form", when: "Right after they send the sponsor form (a service message, not marketing).",
    vars: { contest: ["Contest name", "Maple Street Showdown"], organizer: ["Organizer", "Maple Street Neighbors"], company: ["Sponsor's company", "Bright Nights Lighting"] },
    subject: "We passed your sponsor request to {{organizer}}",
    text: "~ Thank you\n\n# Thanks for supporting {{contest}}\n\nWe sent the request from **{{company}}** to **{{organizer}}**.\n\n## What happens next\n- Your sponsorship goes to {{organizer}}, not to SoCal Lights. SoCal Lights does not process, hold or guarantee sponsorship payments.\n- {{organizer}} will confirm your payment and approve your listing. It appears on the contest page only after they approve it.\n- Sponsors do not influence who wins.\n\nQuestions about your payment: ask {{organizer}} directly. Questions about this email: info@socallights.app.\n\n* You got this email because someone used your address on a sponsor form for {{contest}}. If that was not you, ignore it: nothing is shown and nothing is charged." },
  { id: "sponsor_declined", group: "contest", name: "Sponsor request declined", to: "The sponsor whose request was declined", when: "The organizer declines a sponsor request.",
    vars: { contest: ["Contest name", "Maple Street Showdown"], organizer: ["Organizer", "Maple Street Neighbors"], company: ["Sponsor's company", "Bright Nights Lighting"], note: ["The organizer's note (blank if none)", "We are full this year."] },
    subject: "About your sponsor request for {{contest}}",
    text: "~ An update\n\n# About your sponsor request\n\nThank you for offering to support **{{contest}}**. **{{organizer}}** did not add **{{company}}** to the contest page this time.\n\n{{#note}}A note from {{organizer}}:\n\"{{note}}\"\n\n{{/note}}If you already sent a payment, please ask {{organizer}} about it directly: sponsorship payments go to the organizer, not to SoCal Lights.\n\n* You got this email because a sponsor request was made for {{contest}} with your address." },
  { id: "claim_approved", group: "listing", name: "Event claim approved", to: "The person who claimed an event", when: "Admin approves a claim (not sent when the claim was approved automatically).",
    vars: { name: ["Event name", "Candy Cane Lane"], link: ["Link to the Feature page with the event chosen", `${SITE}/feature?event=candy-cane-lane`, true] },
    subject: "Your claim is approved: {{name}}",
    text: "~ Good news\n\n# Your claim is approved\n\nWe approved your claim on **{{name}}**. You can now feature it on the SoCal Lights map.\n\n[Feature this event]({{link}})\n\n## What to do next\n- Open the link and sign in with this email address.\n- Choose a plan. It is a one-time payment through Stripe, not a subscription.\n- Your Featured placement starts when you pay.\n\nApproving your claim lets you feature the event. It does not let you edit the listing; to change its details, write to info@socallights.app.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you asked to claim “{{name}}” on SoCal Lights." },
  { id: "claim_declined", group: "listing", name: "Event claim declined", to: "The person who claimed an event", when: "Admin declines a claim.",
    vars: { name: ["Event name", "Candy Cane Lane"] },
    subject: "About your claim: {{name}}",
    text: "~ An update\n\n# About your claim\n\nThanks for telling us about **{{name}}**. We could not confirm from your account that you run this event, so we did not approve your claim this time. The event stays on the map as it is.\n\nIf you think we got this wrong, write to info@socallights.app with a link to the event and how you are involved, and we will take another look.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you asked to claim “{{name}}” on SoCal Lights." },
  { id: "event_declined", group: "listing", name: "Event declined", to: "The person who submitted the event", when: "Admin declines an event.",
    vars: { name: ["Event name", "Candy Cane Lane"], reason: ["Admin's note (blank if none)", "We couldn't find a public listing for it."] },
    subject: "About your event: {{name}}",
    text: "~ An update\n\n# About your event\n\nThanks for adding **{{name}}**. We weren't able to put it on the map this time.{{#reason}}\n\n**A note from our team:**\n\n> {{reason}}{{/reason}}\n\nYou can add it again with a change.\n\n[Add it again](https://socallights.app/add-event)\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you added “{{name}}” to SoCal Lights." },
  { id: "listing_paused", group: "listing", unsub: "link", name: "Listing taken down for the season", to: "Everyone who shares the listing", when: "The homeowner or installer takes a display down.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], link: ["Link to the listing", `${SITE}/profile#displays`, true] },
    subject: '{{who}} took down "{{title}}" on SoCal Lights',
    text: "~ Listing update\n\n# {{who}} took down “{{title}}”\n\n{{who}} took this listing down for the season. It stays off the map until someone puts it back.\n\n[See the listing]({{link}})\n\n* You got this email because you share the listing “{{title}}” on SoCal Lights." },
  { id: "listing_resumed", group: "listing", unsub: "link", name: "Listing put back on the map", to: "Everyone who shares the listing", when: "The homeowner or installer puts a display back.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], link: ["Link to the listing", `${SITE}/profile#displays`, true] },
    subject: '{{who}} put back "{{title}}" on SoCal Lights',
    text: "~ Listing update\n\n# “{{title}}” is back on the map\n\n{{who}} put this listing back on the map.\n\n[See the listing]({{link}})\n\n* You got this email because you share the listing “{{title}}” on SoCal Lights." },
  { id: "listing_updated", group: "listing", unsub: "link", name: "Listing edited", to: "Everyone who shares the listing", when: "The homeowner or installer changes a display.",
    vars: { who: ["Who did it", "Dana Lee"], title: ["Display name", "Maple Street Lights"], changes: ["The list of changes (built by the site)", "- Hours: 5-9pm -> 5-10pm", true], link: ["Link to the listing", `${SITE}/profile#displays`, true], manage: ["Installer manage page link (blank when no installer)", `${SITE}/installer/bright-nights/manage`] },
    subject: '{{who}} updated "{{title}}" on SoCal Lights',
    text: "~ Listing update\n\n# “{{title}}” was updated\n\n**{{who}}** changed these details.\n\n## What changed\n{{changes}}\n\n[See the listing and every change]({{link}}){{#manage}}\n\n[Open your installer manage page]({{manage}}){{/manage}}\n\n* You got this email because you share the listing “{{title}}” on SoCal Lights." },
  { id: "contest_unpublished", group: "listing", name: "Contest taken off the map", to: "The contest organizer", when: "Admin unpublishes a contest.",
    vars: { name: ["Contest name", "Maple Street Holiday Lights"], reason: ["Admin's note (blank if none)", "It looked like a duplicate."] },
    subject: "About your contest: {{name}}",
    text: "~ An update\n\n# About your contest\n\nYour contest **{{name}}** has been taken off the map for now.{{#reason}}\n\n**A note from our team:**\n\n> {{reason}}{{/reason}}\n\nYour link and QR code still work for you. If you think this is a mistake, reply to this email and we will take another look.\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you run the contest {{name}} on SoCal Lights." },
  { id: "contest_live", group: "listing", name: "Contest is on the map", to: "The contest organizer", when: "Admin approves a contest that was waiting for review, or puts one back live.",
    vars: { name: ["Contest name", "Maple Street Holiday Lights"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Your contest is on the map: {{name}}",
    text: "~ Good news\n\n# Your contest is on the map\n\n**{{name}}** is live. Thanks for your patience while we looked it over.\n\n[See your contest]({{link}})\n\nThanks for being part of SoCal Lights.\n\n* You got this email because you run the contest {{name}} on SoCal Lights." },

  // ---- Installers
  { id: "installer_listed", group: "installer", name: "Installer asked to confirm a listing", to: "The installer named on a display", when: "A homeowner says an installer put up their lights.",
    vars: { title: ["Display name", "Maple Street Lights"], biz: ["Who listed it", "The Garcia family"], installer: ["Installer name", "Bright Nights"], city: ["City", "Pasadena"], confirm: ["Confirm link", `${SITE}/api/installers/confirm?t=abc123`, true] },
    subject: "{{title}} lists you as the installer",
    text: "~ Please confirm\n\n# {{title}} lists you as the installer\n\n**{{biz}}** says {{installer}} installed the lights at “{{title}}” in {{city}}. It shows on SoCal Lights as “Installed by {{installer}}” and links to your profile.\n\n[Yes, we installed it]({{confirm}})\n\nConfirming adds a check mark to the listing. If it is not right, reply to this email and we will remove it.\n\n* You got this email because {{biz}} named {{installer}} on a SoCal Lights listing." },
  { id: "installer_confirmed", group: "installer", name: "Installer confirmed the listing", to: "The person who listed the display", when: "The installer confirms they installed it.",
    vars: { installer: ["Installer name", "Bright Nights"], title: ["Display name", "Maple Street Lights"] },
    subject: '{{installer}} confirmed the installer note on "{{title}}"',
    text: "~ Good news\n\n# {{installer}} confirmed the installer note\n\n**{{installer}}** confirmed they installed “{{title}}”. It now shows a check mark, and you can both edit the listing from your profiles. Every change is listed with who made it, and you are emailed when the other changes something.\n\n[Open your profile](https://socallights.app/profile#displays)\n\n* You got this email because you listed “{{title}}” on SoCal Lights." },
  { id: "installer_removed", group: "installer", name: "Installer removed the note", to: "The person who listed the display", when: "The installer says they did not install it.",
    vars: { installer: ["Installer name", "Bright Nights"], title: ["Display name", "Maple Street Lights"] },
    subject: '{{installer}} removed the installer note on "{{title}}"',
    text: "~ An update\n\n# {{installer}} removed the installer note\n\n**{{installer}}** says they did not install “{{title}}”, so the “Installed by” line was removed. Reply to this email if that's a mistake.\n\n[Open your profile](https://socallights.app/profile#displays)\n\n* You got this email because you listed “{{title}}” on SoCal Lights." },
  { id: "installer_claim", group: "installer", unsub: "none", name: "Installer profile claim", to: "Admin", when: "Someone claims an installer profile with an email that doesn't match the company website.",
    vars: { email: ["Claimer's email", "sam@gmail.com"], installer: ["Installer name", "Bright Nights"], web: ["Website on file", "brightnights.com"] },
    subject: "Installer profile claim: {{installer}}",
    text: "~ For your review\n\n# Installer profile claim\n\n**{{email}}** says they run **{{installer}}** ({{web}}). Their email isn't at the company's website, so it needs your OK.\n\n## To approve\n- Open the admin and go to the Installers tab.\n- Put {{email}} in “Owner email” for {{installer}}.\n\n[Open the admin](https://socallights.app/admin/)\n\n* You got this email because you are the SoCal Lights admin." },
  { id: "contest_review", group: "admin", unsub: "none", name: "New contest to review", to: "Admin", when: "Someone creates a contest we could not tie to a website (free-mail, no website, mismatch). One with an official-sounding name waits for you.",
    vars: { name: ["Contest name", "City of Irvine Official Lights"], org: ["Organizer", "City of Irvine"], city: ["City", "Irvine"], email: ["Organizer's email", "sam@gmail.com"], note: ["Why it was flagged", "official-sounding name, email is a free-mail address"], what: ["What happens until you approve it", "It is not live yet and cannot add organizer-added homes or buy Featured."], link: ["Admin link", `${SITE}/admin/`] },
    subject: "Contest to review: {{name}}",
    text: "~ For your review\n\n# Contest to review\n\n**{{email}}** created **{{name}}** (run by {{org}}, {{city}}). Flag: {{note}}.\n\n{{what}}\n\n## What to do\n- Open the admin, Contests tab.\n- Check the organizer against the real organization (a quick search or email), then approve or decline.\n\n[Open the admin]({{link}})\n\n* You got this email because you are the SoCal Lights admin." },
  { id: "home_removal_admin", group: "admin", unsub: "none", name: "Request to remove a home", to: "Admin", when: "A resident uses \"Remove my home\".",
    vars: { listing: ["Listing id or address given", "lo-example-home-brea"], address: ["Address typed", "123 Example Way, Brea"], email: ["Requester's email", "resident@example.com"], note: ["Their note (blank if none)", "This is our home and we did not agree."], link: ["Admin link", `${SITE}/admin/`] },
    subject: "Home removal request: {{listing}}",
    text: "~ Please act soon\n\n# Home removal request\n\nA resident asked us to remove a home.\n\n## Details\n- Listing: {{listing}}\n- Address: {{address}}\n- Contact: {{email}}{{#note}}\n- Note: {{note}}{{/note}}\n\nPlease approve or decline it in the admin (Reports tab). Removals are normally done within two business days.\n\n[Open the admin]({{link}})\n\n* You got this email because you are the SoCal Lights admin." },
  { id: "home_removal_ack", group: "listing", unsub: "none", name: "We got your request to remove a home", to: "The person who asked", when: "Right after someone uses \"Remove my home\".",
    vars: { listing: ["Listing id or address given", "123 Example Way, Brea"] },
    subject: "We got your request to remove a home",
    text: "~ We got it\n\n# We got your request\n\nThank you. We received your request to remove this home from SoCal Lights: **{{listing}}**.\n\nA person on our team will look at it, usually within two business days, and we will email you when it is done. If we need to check anything we will write to this address.\n\nYou don't need to do anything else.\n\n* You got this email because this address was entered on the SoCal Lights \"Remove my home\" form. If it wasn't you, you can ignore it." },
  { id: "home_removal_done", group: "listing", unsub: "none", name: "Your home was removed", to: "The person who asked", when: "Admin approves a removal request.",
    vars: { listing: ["Listing id or address given", "123 Example Way, Brea"] },
    subject: "Your home was removed from SoCal Lights",
    text: "~ Done\n\n# Your home was removed\n\nWe removed this home from SoCal Lights: **{{listing}}**. It no longer shows on the map or in lists, and any photos we held were deleted. Web search engines can keep an old copy for a while; it fades as they refresh.\n\nIf you see it again, reply to this email and we will deal with it right away.\n\n* You got this email because this address was entered on the SoCal Lights \"Remove my home\" form." },
  { id: "home_removal_declined", group: "listing", unsub: "none", name: "We could not remove the home", to: "The person who asked", when: "Admin declines a removal request.",
    vars: { listing: ["Listing id or address given", "123 Example Way, Brea"], reason: ["Admin's note (blank if none)", "We could not find a listing at that address."] },
    subject: "About your request to remove a home",
    text: "~ An update\n\n# About your request\n\nWe did not remove **{{listing}}**.{{#reason}}\n\n**A note from our team:**\n\n> {{reason}}{{/reason}}\n\nIf you think this is a mistake, reply to this email with the street address and we will take another look.\n\n* You got this email because this address was entered on the SoCal Lights \"Remove my home\" form." },
  { id: "installer_quote", group: "installer", name: "Quote request for an installer", to: "The installer", when: "Someone asks an installer for a quote from their profile.",
    vars: { name: ["Requester's name", "Dana Lee"], installer: ["Installer name", "Bright Nights"], email: ["Requester's email", "dana@example.com"], phone: ["Phone (blank if none)", "626-555-0100"], note: ["Their note (blank if none)", "Roofline and two trees."], profile: ["Installer profile link", `${SITE}/installer/bright-nights`] },
    subject: "Quote request from SoCal Lights",
    text: "~ Quote request\n\n# {{name}} asked {{installer}} for a quote\n\nThey agreed to share these details with you for this request.\n\n## Their details\n- Email: {{email}}{{#phone}}\n- Phone: {{phone}}{{/phone}}{{#note}}\n- Note: {{note}}{{/note}}\n\n[Open your profile]({{profile}})\n\n* You got this email because someone asked {{installer}} for a quote on SoCal Lights." },

  { id: "sponsor_paid", group: "installer", name: "Sponsor placement is on (receipt)", to: "The installer who paid", when: "A Sponsor banner or top-of-the-list payment is applied. Stripe also emails its own receipt.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner and top of the list"], price: ["Price paid", "$75.00"], from: ["First day", "Nov 6, 2026"], to: ["Last day", "Jan 6, 2027"], link: ["Dashboard link", `${SITE}/installer/bright-nights/manage`], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot apply your payment, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#paid`] },
    subject: "Your Sponsor placement is on: {{installer}}",
    text: "~ Thank you\n\n# Your Sponsor placement is on\n\n**{{installer}}** now has the **{{plan}}** placement on the SoCal Lights map ({{price}}, a one-time payment unless you turned on automatic renewal).{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n## When it runs\n- First day: {{from}}\n- Last day: {{to}}\n\nPaid placements are always labelled \"Sponsor\". The number of times you were shown and tapped is in your dashboard. To end it early, or if something is wrong, reply to this email: a refund switches the placement off.{{#refund}} {{refund}} Full terms: {{terms}}{{/refund}}\n\n[Open your dashboard]({{link}})\n\n* You got this email because you paid for a Sponsor placement on SoCal Lights. Stripe sends its own receipt too." },
  { id: "sponsor_admin", group: "admin", unsub: "none", name: "New Sponsor placement paid", to: "Admin", when: "An installer pays for a Sponsor banner or top-of-the-list placement.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], price: ["Price paid", "$50.00"], from: ["First day", "Nov 6, 2026"], to: ["Last day", "Jan 6, 2027"], buyer: ["Buyer's email", "sam@brightnights.com"] },
    subject: "Sponsor placement paid: {{installer}} ({{price}})",
    text: "~ New order\n\n# {{installer}} paid for a Sponsor placement\n\n## Order\n- Plan: {{plan}} ({{price}})\n- Runs: {{from}} to {{to}}\n- Buyer: {{buyer}}\n\nIt is already on the map. Orders, refunds and disputes are under Orders in the admin.\n\n[Open the admin](https://socallights.app/admin/)\n\n* You got this email because you are the SoCal Lights admin." },

  { id: "renewal_enrolled", group: "installer", name: "Automatic renewal is on (acknowledgment)", to: "The installer who turned it on", when: "Someone agrees to automatic renewal of their Sponsor placement.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], price: ["Current price", "$50"], date: ["First charge date", "Jan 6, 2027"], consent: ["The wording they agreed to", "Renew automatically each season: ..."], cancel_link: ["Cancel link", `${SITE}/cancel-renewal?t=abc`], dashboard: ["Dashboard link", `${SITE}/installer/bright-nights/manage`] },
    subject: "Automatic renewal is on for {{installer}}",
    text: "~ Automatic renewal\n\n# Automatic renewal is on\n\nYou asked us to renew the **{{plan}}** Sponsor placement for **{{installer}}** automatically.\n\n## What you agreed to\n- {{consent}}\n- Your first automatic charge is on {{date}}, the last day of your current placement. We will email you 7 days before.\n- Nothing is charged today.\n\n[Cancel automatic renewal]({{cancel_link}})\n\nYou can also turn it off in your [dashboard]({{dashboard}}). Cancelling keeps the placement you already paid for. It is off unless you turn it on.\n\n* You got this email because you turned on automatic renewal for a Sponsor placement on SoCal Lights." },
  { id: "renewal_reminder", group: "installer", name: "Automatic renewal reminder (7 days before)", to: "The installer", when: "7 days before an automatic renewal charge, once per renewal.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], price: ["Amount to be charged", "$50"], date: ["Charge date", "Jan 6, 2027"], from: ["Next placement starts", "Jan 7, 2027"], to: ["Next placement ends", "Jan 31, 2027"], note: ["Price change note (blank if none)", ""], cancel_link: ["Cancel link", `${SITE}/cancel-renewal?t=abc`], dashboard: ["Dashboard link", `${SITE}/installer/bright-nights/manage`] },
    subject: "{{installer}}: your Sponsor placement renews on {{date}} ({{price}})",
    text: "~ Heads up\n\n# Your Sponsor placement renews soon\n\nOn **{{date}}** we will charge your saved card **{{price}}** to renew the **{{plan}}** placement for **{{installer}}**. The next placement runs {{from}} to {{to}}.\n\n{{note}}[Cancel automatic renewal]({{cancel_link}})\n\nCancel any time before {{date}} and nothing is charged. You can also use your [dashboard]({{dashboard}}). Cancelling keeps the placement you already paid for.\n\n* You got this email because you turned on automatic renewal for a Sponsor placement on SoCal Lights." },
  { id: "renewal_charged", group: "installer", name: "Automatic renewal charged (receipt)", to: "The installer", when: "An automatic renewal charge went through and the placement was applied. Stripe also emails its own receipt.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], price: ["Price paid", "$50.00"], from: ["First day", "Jan 7, 2027"], to: ["Last day", "Jan 31, 2027"], cancel_link: ["Cancel link", `${SITE}/cancel-renewal?t=abc`], link: ["Dashboard link", `${SITE}/installer/bright-nights/manage`], paid_on: ["Date paid (blank if unknown)", "Nov 11, 2026"], ref: ["Order reference (built by the site)", "SL-1A2B3C4D"], refund: ["The refund statement for this product (built by the site)", "If we cannot apply your payment, you get a full refund."], terms: ["Link to the refund terms (built by the site)", `${SITE}/terms#paid`] },
    subject: "Your Sponsor placement was renewed: {{installer}}",
    text: "~ Thank you\n\n# Your Sponsor placement was renewed\n\nWe charged your saved card **{{price}}** and renewed the **{{plan}}** placement for **{{installer}}**.{{#paid_on}} Paid on {{paid_on}}.{{/paid_on}}{{#ref}} Order reference: {{ref}}.{{/ref}}\n\n## When it runs\n- First day: {{from}}\n- Last day: {{to}}\n\nWe will email you again 7 days before the next charge. To stop automatic renewal, [cancel here]({{cancel_link}}) or use your [dashboard]({{link}}). Stripe also sends its own receipt.{{#refund}} {{refund}} Full terms: {{terms}}{{/refund}}\n\n* You got this email because automatic renewal is on for a Sponsor placement on SoCal Lights." },
  { id: "renewal_failed", group: "installer", name: "Automatic renewal charge failed", to: "The installer", when: "The automatic charge did not go through. We try once more 3 days later.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], price: ["Amount", "$50"], date: ["Charge date", "Jan 6, 2027"], retry: ["Date of the one retry", "Jan 9, 2027"], link: ["Page to pay or update the card", `${SITE}/sponsor?installer=bright-nights&plan=banner`], cancel_link: ["Cancel link", `${SITE}/cancel-renewal?t=abc`] },
    subject: "{{installer}}: we could not renew your Sponsor placement",
    text: "~ Action needed\n\n# We could not charge your card\n\nThe automatic renewal of the **{{plan}}** placement for **{{installer}}** ({{price}}) did not go through on {{date}}.\n\nWe will try once more on **{{retry}}**. To avoid a gap, pay once or use a different card now. On that page you can also tick the box to renew automatically with the new card.\n\n[Pay or update my card]({{link}})\n\nIf the second try fails, automatic renewal stops and nothing more is charged automatically. [Cancel automatic renewal]({{cancel_link}})\n\n* You got this email because automatic renewal is on for a Sponsor placement on SoCal Lights." },
  { id: "renewal_lapsed", group: "installer", name: "Automatic renewal stopped (lapsed)", to: "The installer", when: "The retry failed too, so automatic renewal stopped.",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], link: ["Page to buy again", `${SITE}/sponsor?installer=bright-nights&plan=banner`] },
    subject: "{{installer}}: automatic renewal has stopped",
    text: "~ Update\n\n# Automatic renewal has stopped\n\nWe could not renew the **{{plan}}** Sponsor placement for **{{installer}}**, so automatic renewal is now off. We will not charge your card automatically again unless you turn it back on.\n\n[Renew the placement]({{link}})\n\n* You got this email because automatic renewal was on for a Sponsor placement on SoCal Lights." },
  { id: "renewal_cancelled", group: "installer", name: "Automatic renewal cancelled", to: "The installer", when: "Someone cancels automatic renewal (dashboard or the email link).",
    vars: { installer: ["Installer name", "Bright Nights"], plan: ["Plan", "Banner"], dashboard: ["Dashboard link", `${SITE}/installer/bright-nights/manage`] },
    subject: "Automatic renewal is off for {{installer}}",
    text: "~ Cancelled\n\n# Automatic renewal is off\n\nAutomatic renewal of the **{{plan}}** Sponsor placement for **{{installer}}** is cancelled. We will not charge your card automatically. The placement you already paid for keeps running to its last day.\n\nYou can turn it back on any time in your [dashboard]({{dashboard}}).\n\n* You got this email because automatic renewal for a Sponsor placement on SoCal Lights was cancelled." },
  { id: "renewal_admin", group: "admin", unsub: "none", name: "Automatic renewal needs a look", to: "Admin", when: "A renewal lapsed after a failed charge, or was paused by a refund or dispute.",
    vars: { installer: ["Installer name", "Bright Nights"], what: ["What happened", "Automatic renewal lapsed after a failed charge."], plan: ["Plan", "Banner"], price: ["Amount", "$50"] },
    subject: "Automatic renewal: {{installer}}",
    text: "~ For your review\n\n# {{installer}}: automatic renewal\n\n{{what}}\n\n- Plan: {{plan}} ({{price}})\n\nSee Admin > Orders (Automatic renewals).\n\n[Open the admin](https://socallights.app/admin/)\n\n* You got this email because you are the SoCal Lights admin." },

  // ---- Contest organizers
  { id: "entry_new", group: "contest", unsub: "link", name: "New contest entry waiting", to: "The contest organizer", when: "A home is entered in a contest.",
    vars: { title: ["Home name", "The Garcia Home"], street: ["Street", "12 Elm Ct"], city: ["City", "Pasadena"], contest: ["Contest name", "Maple Street Holiday Lights"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "New entry waiting: {{contest}}",
    text: "~ New entry\n\n# An entry is waiting for you\n\n**{{title}}** ({{street}}, {{city}}) entered **{{contest}}** and is waiting for your OK. Photos are held privately until you approve.\n\n[Review the entry]({{link}})\n\n* You got this email because you organize {{contest}} on SoCal Lights." },
  { id: "contest_team_changed", group: "contest", unsub: "link", name: "Contest team changed something", to: "The other organizers of the contest", when: "An organizer edits the contest.",
    vars: { who: ["Who did it", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], changes: ["The list of changes (built by the site)", "- Voting ends: Dec 20 -> Dec 22", true], link: ["Manage page", `${SITE}/c/maple-street/manage`] },
    subject: "{{who}} updated {{contest}}",
    text: "~ Team update\n\n# {{who}} updated {{contest}}\n\n## What changed\n{{changes}}\n\n[See everything the team changed]({{link}})\n\n* You got this email because you help run {{contest}} on SoCal Lights." },
  { id: "contest_quote_sent", group: "contest", name: "Quote request sent (to organizer)", to: "The contest organizer", when: "Someone asks the contest's installer for a quote.",
    vars: { name: ["Requester's name", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], installer: ["Installer name", "Bright Nights"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "Quote request sent: {{contest}}",
    text: "~ Quote request\n\n# Quote request sent\n\n**{{name}}** asked **{{installer}}** for a quote through {{contest}}. You can see requests on your dashboard.\n\n[Open your dashboard]({{link}})\n\n* You got this email because you run {{contest}} on SoCal Lights." },
  { id: "contest_quote", group: "contest", name: "Quote request (to the contest's installer)", to: "The contest's installer", when: "Someone asks for a quote from the contest page.",
    vars: { name: ["Requester's name", "Dana Lee"], contest: ["Contest name", "Maple Street Holiday Lights"], email: ["Requester's email", "dana@example.com"], phone: ["Phone (blank if none)", "626-555-0100"], note: ["Their note (blank if none)", "Roofline and two trees."], installer: ["Installer name", "Bright Nights"] },
    subject: "Quote request from {{contest}}",
    text: "~ Quote request\n\n# Quote request from {{contest}}\n\n**{{name}}** asked for a quote through {{contest}}. They agreed to share these details with {{installer}} for this request.\n\n## Their details\n- Email: {{email}}{{#phone}}\n- Phone: {{phone}}{{/phone}}{{#note}}\n- Note: {{note}}{{/note}}\n\n* You got this email because {{contest}} lists {{installer}} as its installer on SoCal Lights." },
  { id: "results_organizer", group: "contest", name: "Results sent (to organizer)", to: "The contest organizer", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], sent: ["Entrants emailed", "12"], total: ["Entrants in all", "12"], link: ["Manage page", `${SITE}/c/maple-street/manage`, true] },
    subject: "Results sent: {{contest}}",
    text: "~ Results sent\n\n# Results sent: {{contest}}\n\nYou announced the winners of **{{contest}}**. {{sent}} of {{total}} entrants were emailed. The results are locked.\n\n[Open your dashboard to download them]({{link}})\n\n* You got this email because you run {{contest}} on SoCal Lights." },

  // ---- Entrants, voters and judges
  { id: "entry_approved", group: "entrant", name: "Entry approved", to: "The entrant", when: "The organizer approves a contest entry.",
    vars: { name: ["Home name", "The Garcia Home"], contest: ["Contest name", "Maple Street Holiday Lights"], vote_start: ["Voting starts", "Dec 1"], vote_end: ["Voting ends", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Your entry is in: {{contest}}",
    text: "~ Good news\n\n# Your entry is in\n\n**{{name}}** was approved and is now in {{contest}}, on the contest page and on the map. Voting runs {{vote_start}} to {{vote_end}}.\n\n[See the contest]({{link}})\n\nShare the link so neighbors can vote for your home.\n\n* You got this email because you entered {{contest}} on SoCal Lights." },
  { id: "entry_declined", group: "entrant", name: "Entry declined", to: "The entrant", when: "The organizer declines a contest entry.",
    vars: { name: ["Home name", "The Garcia Home"], contest: ["Contest name", "Maple Street Holiday Lights"], org: ["Organizer", "Maple Street Neighbors"], reason: ["Organizer's reason (blank if none)", "Photos were too dark."], link: ["Enter-again link", `${SITE}/c/maple-street/enter`, true] },
    subject: "About your entry: {{contest}}",
    text: "~ An update\n\n# About your entry\n\n{{org}} couldn't include **{{name}}** in {{contest}}.{{#reason}}\n\n**Their reason:**\n\n> {{reason}}{{/reason}}\n\nYou can enter again with new photos or details while entries are open.\n\n[Enter again]({{link}})\n\n* You got this email because you entered {{contest}} on SoCal Lights." },
  { id: "contest_remind_open", group: "entrant", unsub: "link", name: "Voting is open", to: "Entrants of the contest", when: "The day voting opens.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], vote_end: ["Voting ends", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Voting is open: {{contest}}",
    text: "~ Voting is open\n\n# Voting is open: {{contest}}\n\nVoting for **{{contest}}** is open until {{vote_end}}. Ask your neighbors to vote for your home.\n\n[Open the contest]({{link}})\n\n* You got this email because you entered or voted in {{contest}} on SoCal Lights." },
  { id: "contest_remind_close", group: "entrant", unsub: "link", name: "Last days to vote", to: "Entrants and voters", when: "Two days before voting closes.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], vote_end: ["Voting closes", "Dec 20"], link: ["Contest page", `${SITE}/c/maple-street`, true] },
    subject: "Last days to vote: {{contest}}",
    text: "~ Last days to vote\n\n# Voting closes {{vote_end}}\n\nVoting for **{{contest}}** closes {{vote_end}}. Make sure you've voted in every category.\n\n[Vote now]({{link}})\n\n* You got this email because you entered or voted in {{contest}} on SoCal Lights." },
  { id: "judge_nudge", group: "entrant", unsub: "link", name: "Judge reminder", to: "Judges who haven't finished", when: "The organizer sends a reminder.",
    vars: { org: ["Organizer", "Maple Street Neighbors"], contest: ["Contest name", "Maple Street Holiday Lights"], done: ["Homes scored so far", "4"], total: ["Homes to score", "12"], link: ["Judge ballot link", `${SITE}/c/maple-street/judge`, true], vote_end: ["Voting ends", "Dec 20"] },
    subject: "Reminder: your judging for {{contest}}",
    text: "~ Friendly reminder\n\n# Please finish your judging\n\n**{{org}}** would like you to finish your ballot for **{{contest}}**. You have scored {{done}} of {{total}}.\n\n[Open my ballot]({{link}})\n\nVoting ends {{vote_end}}.\n\n* You got this email because you are a judge for {{contest}} on SoCal Lights." },
  { id: "results_winner", group: "entrant", unsub: "link", name: "Results: you won", to: "Winning entrants", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], wins: ["What they won", "Best Overall (Grand Prize)"], prize: ["Prizes (blank if none)", "Best Overall (Grand Prize): $100 gift card"], org: ["Organizer", "Maple Street Neighbors"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "You won: {{contest}}",
    text: "~ Congratulations\n\n# You won!\n\nYour home won **{{wins}}** in {{contest}}.{{#prize}} Prize: {{prize}}.{{/prize}}\n\n[See the results]({{link}})\n\n## What happens next\n- {{org}} will contact you at this email address about any prize.\n- A crown now shows on your home.\n- You can choose where to show your badge in your profile.\n\n* You got this email because you entered {{contest}} on SoCal Lights." },
  { id: "results_entrant", group: "entrant", unsub: "link", name: "Results: thanks for entering", to: "Entrants who didn't win", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], winners: ["Winning homes", "The Garcia Home, 12 Elm Ct"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "Results are in: {{contest}}",
    text: "~ Results\n\n# Results are in: {{contest}}\n\nThank you for entering **{{contest}}**. Winners: {{winners}}.\n\n[See the full results]({{link}})\n\n* You got this email because you entered {{contest}} on SoCal Lights." },
  { id: "results_judge", group: "entrant", unsub: "link", name: "Results: thanks for judging", to: "Judges", when: "The organizer announces the winners.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], winners: ["Winning homes", "The Garcia Home, 12 Elm Ct"], link: ["Results page", `${SITE}/c/maple-street`, true] },
    subject: "Results are in: {{contest}}",
    text: "~ Results\n\n# Results are in: {{contest}}\n\nThank you for judging **{{contest}}**. The winners are {{winners}}.\n\n[See the results]({{link}})\n\n* You got this email because you were a judge for {{contest}} on SoCal Lights." },

  // ---- Invitations with the designed layout (centered title, orange button, boxed tips). See "Formatting" in the editor.
  { id: "judge_invite", group: "entrant", unsub: "link", layout: "invite", name: "Judge invitation", to: "A judge the organizer added", when: "The organizer adds a judge to a contest.",
    format: "Formatting for this email: start a line with ~ for the small heading above the title, # for the title, ## for a box title (then lines starting with - for its bullets), and > for a quoted note. Write [Button text](link) for the orange button and **bold** for bold. Start the last line with * for the small print at the bottom.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], org: ["Organizer", "Maple Street Neighbors"], how: ["How judges vote (built by the site)", "Score every home from 1 to 10 in each category."], link: ["Judge ballot link", `${SITE}/c/maple-street/judge`, true] },
    subject: "You're invited to judge {{contest}}",
    text: "~ Judges' invitation\n\n# You're invited to judge {{contest}}\n\n**{{org}}** asked you to be one of the judges. It takes a few minutes, and you can do it on your phone.\n\n[Open my judges' ballot]({{link}})\n\n## How judging works\n- {{how}}\n- Judge on first impression, creativity, theme, craftsmanship and variety of lights.\n- Know a household? Tap \"I know this household\" and your vote for it will not count.\n- Your picks stay private until winners are announced, and you can change them until voting closes.\n\nSign in with **this email address** so we know it is you.\n\n* You got this email because {{org}} added you as a judge for {{contest}}." },
  { id: "contest_invite", group: "entrant", unsub: "link", layout: "invite", name: "Contest invitation (neighbors)", to: "A neighbor the organizer invites", when: "The organizer sends Invite neighbors by email.",
    format: "Formatting for this email: start a line with ~ for the small heading above the title, # for the title, ## for a box title (then lines starting with - for its bullets), and > for a quoted note. Write [Button text](link) for the orange button and **bold** for bold. Start the last line with * for the small print at the bottom.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], org: ["Organizer", "Maple Street Neighbors"], city: ["City", "Irvine"], link: ["Contest page", `${SITE}/c/maple-street`, true], note: ["The organizer's note (blank if none)", "Cocoa on the corner Saturday at 6."], contact: ["Organizer's reply address (blank if none)", "maria@example.com"] },
    subject: "You're invited: {{contest}}",
    text: "~ Home decorating contest · {{city}}\n\n# {{org}} invites you to {{contest}}\n\nEnter your home, or vote for your favorite lights in the neighborhood. It is free.\n\n[Enter your home or vote]({{link}})\n\n{{#note}}> {{note}}\n\n{{/note}}## It takes about a minute\n- Tap the button and sign in with your email or Google.\n- To enter: add a photo of your home and your address.\n- To vote: pick one favorite in each category.\n\n* You got this because {{org}} entered your address.{{#contact}} Reply to {{contact}} to be left off future invitations.{{/contact}}" },
  { id: "coorg_invite", group: "contest", unsub: "link", layout: "invite", name: "Co-organizer invitation", to: "A co-organizer the owner added", when: "The contest owner adds a co-organizer on the Team tab.",
    format: "Formatting for this email: start a line with ~ for the small heading above the title, # for the title, ## for a box title (then lines starting with - for its bullets), and > for a quoted note. Write [Button text](link) for the orange button and **bold** for bold. Start the last line with * for the small print at the bottom.",
    vars: { contest: ["Contest name", "Maple Street Holiday Lights"], org: ["Organizer", "Maple Street Neighbors"], link: ["Dashboard link", `${SITE}/c/maple-street/manage`, true] },
    subject: "You can help run {{contest}}",
    text: "~ Co-organizer invitation\n\n# You can help run {{contest}}\n\n**{{org}}** added you as a co-organizer. You get the same dashboard they use.\n\n[Open the dashboard]({{link}})\n\n## What you can do\n- Approve or decline the homes people enter.\n- Review votes, and void any that look wrong.\n- Invite judges and add sponsors.\n- See visits, QR scans and votes per day.\n\nSign in with **this email address**. Only the person who created the contest can change its dates and details.\n\n* You got this email because {{org}} added you to {{contest}}." },

  // ---- Sent to the admin
  { id: "admin_digest", group: "admin", unsub: "none", name: "New submissions summary", to: "Admin", when: "Every few hours when there is something new.",
    vars: { headline: ["Short summary for the subject", "3 new submissions"], day_total: ["Submissions so far today", "5"], summary: ["What's new (built by the site)", "3 new submissions since the last update.\n\n## Events (3)\n- Candy Cane Lane · Altadena\n- Winter Lights Walk · Pasadena\n- Holiday Tree Lighting · Irvine\n\n", true], today_line: ["Today's counts", "5 submissions (2 homes, 3 events, 0 contest entries)."], live_line: ["Live from submissions", "120 homes, 48 events."], held: ["Waiting for your review", "2"] },
    subject: "SoCal Lights: {{headline}} ({{day_total}} today)",
    text: "~ Admin summary\n\n# {{headline}}\n\n{{summary}}## Right now\n- Today so far: {{today_line}}\n- Live from submissions: {{live_line}}\n- Waiting for your review: {{held}}\n\nEverything new is already live. To take something down, open the admin and use Unpublish.\n\n[Open the admin](https://socallights.app/admin/)\n\n* You got this email because you are the SoCal Lights admin." },
];

const FORMAT = "Formatting for this email: start a line with ~ for the small heading above the title, # for the title, ## for a box title (then lines starting with - for its bullets), and > for a quoted note. Write [Button text](link) for the orange button and **bold** for bold. Start a line with @ for a big highlighted code. Start the last line with * for the small print at the bottom. The unsubscribe line, links and copyright are added under it automatically.";
for (const t of TEMPLATES) { t.layout = "invite"; t.format = FORMAT; t.unsub = t.unsub || "service"; }

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

// ---- User text in emails ----
// Values are substituted into the wording BEFORE it is turned into HTML, so a name or note like "[Verify your account](https://evil)" would
// become a branded link or button. Values that people typed (names, notes, reasons...) are therefore neutralized: brackets, parentheses,
// angle brackets and backticks become look-alike full-width characters, web addresses are removed, and line breaks can't start a new block.
// Values the site builds itself (links, lists) are left alone. HTML escaping happens when the page is drawn (esc below).
const RAW_VARS = new Set(["code", "link", "see_url", "unsub_url", "manage", "confirm", "profile", "list", "summary", "footer", "cancel_link", "dashboard", "consent", "refund", "terms"]);
const FULLWIDTH = { "[": "\uFF3B", "]": "\uFF3D", "(": "\uFF08", ")": "\uFF09", "<": "\uFF1C", ">": "\uFF1E", "`": "\u2018" };
export function safeText(v, keepLines = false) {
  let t = String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\b(?:https?:\/\/|ftp:\/\/|www\.)\S*/gi, "");
  t = t.replace(/[\[\]()<>`]/g, (ch) => FULLWIDTH[ch]);
  return keepLines ? t.replace(/\r/g, "") : t.replace(/\s*[\r\n]+\s*/g, " ");
}
export function safeVars(vars) {
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) out[k] = RAW_VARS.has(k) ? v : safeText(v, k === "changes");
  return out;
}

export const sampleVars = (t) => Object.fromEntries(Object.entries(t.vars).map(([k, v]) => [k, v[1]]));

// What the admin has saved (or null). A missing table or row means "use the default".
export async function savedFor(env, id) {
  try { return await env.DB.prepare("SELECT subject, body FROM email_templates WHERE id = ?").bind(id).first(); } catch { return null; }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const link = (s) => s.replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)"'\]]/g, (u) => `<a href="${u}" style="color:#b3261e;text-decoration:underline">${u}</a>`);
// ---- The designed layout every email uses ----
// Wording markers: "~ " small heading, "# " title, "[Label](url)" button, "## " + "- " lines = boxed list, "> " quote, "@ " big code, "* " small print, **bold**.
const INK = "#1f1d1a", MUTED = "#6b6760", LINE = "#e7e3dc", CREAM = "#f6f5f2", ORANGE = "#e0560a", BTN = "#c2410c", RED = "#c8324f", FONT = "Arial,Helvetica,sans-serif";
const inline = (s) => {
  // [text](https://link) becomes a link; bare web addresses and **bold** work too
  let out = "", i = 0;
  for (const m of String(s).matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) { out += link(esc(s.slice(i, m.index))) + `<a href="${esc(m[2])}" style="color:#b3261e;text-decoration:underline">${esc(m[1])}</a>`; i = m.index + m[0].length; }
  return (out + link(esc(s.slice(i)))).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
};
const bigButton = (label, url) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 6px"><tr><td align="center" bgcolor="${BTN}" style="border-radius:10px"><a href="${esc(url)}" style="display:inline-block;padding:15px 30px;font:600 17px/1.2 ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;
export function plainOf(text) {
  return String(text).split("\n").map((l) => l.replace(/^~ /, "").replace(/^## ?/, "").replace(/^# /, "").replace(/^\* /, "").replace(/^@ /, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2").replace(/\*\*(.+?)\*\*/g, "$1")).filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
}
export function toInviteHtml(text, subject, foot2 = {}) {
  const blocks = String(text).trim().split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let eyebrow = "", title = "", foot = "", cta = null, introDone = false; const body = [];
  for (const b of blocks) {
    const lines = b.split("\n"); let m;
    if (b.startsWith("~ ")) eyebrow = b.slice(2);
    else if (b.startsWith("# ")) title = b.slice(2);
    else if (b.startsWith("* ")) foot = b.slice(2);
    else if (b.startsWith("@ ")) body.push(`<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 4px"><tr><td align="center" style="background:${CREAM};border:1px solid ${LINE};border-radius:12px;padding:16px 34px;font:700 34px/1 'Courier New',Courier,monospace;letter-spacing:.28em;color:${INK}">${esc(b.slice(2))}</td></tr></table>`);
    else if ((m = b.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) { if (!cta) cta = { label: m[1], url: m[2] }; body.push(`<div align="center">${bigButton(m[1], m[2])}</div>`); }
    else if (b.startsWith("> ")) body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr><td style="border-left:4px solid ${ORANGE};padding:4px 0 4px 16px;font:italic 400 16px/1.55 Georgia,'Times New Roman',serif;color:${INK}">${inline(lines.map((l) => l.replace(/^> ?/, "")).join(" "))}</td></tr></table>`);
    else if (b.startsWith("## ")) body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:${CREAM};border-radius:12px"><tr><td style="padding:18px 22px;font:400 15px/1.55 ${FONT};color:${INK}"><b style="font-weight:600">${inline(lines[0].slice(3))}</b>${lines.slice(1).map((l) => `<div style="margin-top:8px;padding-left:16px;text-indent:-16px">&bull;&nbsp; ${inline(l.replace(/^- /, ""))}</div>`).join("")}</td></tr></table>`);
    else if (!introDone) { introDone = true; body.push(`<p style="margin:18px 0 0;font:400 17px/1.55 ${FONT};color:${INK};text-align:center">${lines.map(inline).join("<br>")}</p>`); }
    else body.push(`<p style="margin:18px 0 0;font:400 14px/1.5 ${FONT};color:${MUTED};text-align:center">${lines.map(inline).join("<br>")}</p>`);
  }
  const row = (h) => `<tr><td style="padding:0 40px">${h}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;border:1px solid ${LINE}">
<tr><td align="center" style="padding:34px 40px 8px"><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/img/icon-192.png" width="64" height="64" alt="SoCal Lights" style="display:block;border:0;border-radius:32px;margin:0 auto 10px"><span style="font:600 22px/1.2 ${FONT};color:${INK}">SoCal <span style="color:${ORANGE}">Lights</span></span></a></td></tr>
${row(`<p style="margin:26px 0 8px;font:600 12px/1.3 ${FONT};letter-spacing:.16em;text-transform:uppercase;color:${RED};text-align:center">${esc(eyebrow)}</p><h1 style="margin:0;font:600 28px/1.25 ${FONT};color:${INK};text-align:center">${esc(title)}</h1>`)}
${row(body.join(""))}
<tr><td style="padding:30px 40px 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};padding-top:18px;font:400 13px/1.55 ${FONT};color:${MUTED};text-align:center">${inline(foot)}${cta ? `<br><br>Button not working? Copy this link into your browser:<br><a href="${esc(cta.url)}" style="color:${MUTED};word-break:break-all">${esc(cta.url)}</a>` : ""}</td></tr></table></td></tr>
</table>
${foot2.html ? `<p style="margin:16px 0 0;font:400 12px/1.6 ${FONT};color:${MUTED};text-align:center">${foot2.html}</p>` : ""}
<p style="margin:12px 0 0;font:400 12px/1.6 ${FONT};color:${MUTED};text-align:center"><a href="${SITE}/privacy" style="color:${MUTED}">Privacy</a> &middot; <a href="${SITE}/terms" style="color:${MUTED}">Terms</a> &middot; <a href="${SITE}" style="color:${MUTED}">socallights.app</a> &middot; <a href="mailto:info@socallights.app" style="color:${MUTED}">info@socallights.app</a></p>
<p style="margin:8px 0 0;font:400 12px/1.6 ${FONT};color:${MUTED};text-align:center">&copy; ${new Date().getFullYear()} Forza-TEK. SoCal Lights. All rights reserved.</p>
</td></tr></table></body></html>`;
}

// Marketing and invitation emails (the ones with an unsubscribe link: weekly alert, reminders, results, invitations) carry the sender's postal address and
// List-Unsubscribe headers. The address is NOT in the repository (it is public): it comes from the MAIL_POSTAL_ADDRESS secret, and the line is left out when it is not set.
export const isMarketing = (t) => !!t && (t.unsub === "link" || t.unsub === "alerts");
export const postalLine = (env) => String((env && env.MAIL_POSTAL_ADDRESS) || "").replace(/\s*[\r\n]+\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, 300);
// Replies to a service or receipt email go to the support mailbox (the sender login@ is not read). Mail to the admin and marketing mail are left alone.
export const REPLY_TO = "info@socallights.app";
export const replyFor = (t) => (t && t.group !== "admin" && !isMarketing(t) ? REPLY_TO : undefined);
const MAILTO_UNSUB = "mailto:info@socallights.app?subject=unsubscribe";

// The line under every email about stopping it. The kind is set per email (unsub: link | alerts | signin | service | none).
function footerFor(t, vars, unsubUrl) {
  const a = (u, label) => `<a href="${esc(u)}" style="color:${MUTED};text-decoration:underline">${label}</a>`;
  switch (t.unsub) {
    case "link": return { html: `Don't want emails like this? ${a(unsubUrl, "Unsubscribe")}.`, plain: `Don't want emails like this? Unsubscribe: ${unsubUrl}` };
    case "alerts": return vars.unsub_url ? { html: `${a(vars.unsub_url, "Unsubscribe from the weekly email")}. It takes one tap.`, plain: `Unsubscribe from the weekly email: ${vars.unsub_url}` } : { html: "", plain: "" };
    case "signin": return { html: "You only get this email when you ask to sign in or sign up, so it has no unsubscribe link.", plain: "You only get this email when you ask to sign in or sign up, so it has no unsubscribe link." };
    case "none": return { html: "", plain: "" };
    default: return { html: "This is a service email about your account or listings, so it has no unsubscribe link. To stop all emails, write to info@socallights.app.", plain: "This is a service email about your account or listings, so it has no unsubscribe link. To stop all emails, write to info@socallights.app." };
  }
}

// Fill in a template. `draft` ({subject, body}) previews unsaved edits; otherwise the saved wording, else the default.
// `unsubUrl` is the person's own unsubscribe link (a sample one in previews).
export async function renderTemplate(env, id, vars, draft, unsubUrl = SITE + "/unsubscribe?t=sample") {
  const t = byId(id); if (!t) throw new Error("Unknown email template: " + id);
  const s = draft || (await savedFor(env, id));
  vars = safeVars(vars);
  const subject = oneLine(fill(s ? s.subject : t.subject, vars)) || oneLine(fill(t.subject, vars));
  const text = fill(s ? s.body : t.text, vars).trim() || fill(t.text, vars).trim();
  const f = footerFor(t, vars, unsubUrl), year = new Date().getFullYear();
  const addr = isMarketing(t) ? postalLine(env) : "";
  if (addr) { f.html = (f.html ? f.html + "<br>" : "") + esc(addr); f.plain = (f.plain ? f.plain + "\n" : "") + addr; }
  const plain = plainOf(text) + "\n\n--\n" + (f.plain ? f.plain + "\n" : "") + `SoCal Lights, ${SITE}\n(c) ${year} Forza-TEK. All rights reserved.`;
  return { subject, text: plain, html: toInviteHtml(text, subject, f), edited: !!s && !draft, marketing: isMarketing(t) };
}

// List-Unsubscribe headers for marketing mail. With a one-click address (a token link that accepts POST) both headers go; without, only the mailto.
export function unsubHeaders(oneClickUrl) {
  return oneClickUrl ? { "List-Unsubscribe": `<${oneClickUrl}>, <${MAILTO_UNSUB}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : { "List-Unsubscribe": `<${MAILTO_UNSUB}>` };
}

// Send one templated email (HTML and plain text). Returns true when it was handed to the mail service.
// Returns false when the send failed or was skipped. Emails with an unsubscribe link (unsub: "link") are skipped for anyone who has unsubscribed.
export async function sendTemplate(env, id, to, vars) {
  if (!to) return false;
  const t = byId(id); let unsubUrl, oneClick = "";
  if (t && t.guard === "deliverable" && !(await canMailService(env, to))) return false; // service mail ignores an unsubscribe, but never goes to a bounced or complained address or a deleted account
  if (t && t.unsub === "link") {
    const p = await prefsFor(env, to);
    if (p && p.optout) return false; // skipped on purpose (unsubscribed); a caller that must tell this from a failure checks prefsFor
    if (p) { unsubUrl = `${SITE}/unsubscribe?t=${p.token}`; oneClick = `${SITE}/api/unsub?t=${p.token}`; } // the link in the email opens the page; the header's one-click address takes the POST
  } else if (t && t.unsub === "alerts" && vars && vars.unsub_url) oneClick = String(vars.unsub_url);
  const m = await renderTemplate(env, id, vars, null, unsubUrl || SITE + "/unsubscribe");
  return sendMail(env, { to, subject: m.subject, text: m.text, html: m.html, tag: id, headers: isMarketing(t) ? unsubHeaders(oneClick) : undefined, replyTo: replyFor(t) });
}
