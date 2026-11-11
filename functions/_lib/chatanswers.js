// AI assistant: curated complete answers for the contest flows where the answer must list every route and every step (docs/ai-assistant-action-audit.md).
// A contest organizer in Covina asked how to add homes and was not told about the organizer's own route. A small model can drop the part that matters, so for these
// questions the answer is written once, here, from the published Help articles, and sent without a model call (cheaper, faster, and the same every time).
// Facts (limits, button names) are checked against the Help articles and the knowledge base by tests/chat-answers.test.mjs, so they cannot drift quietly.
// Never any price, date or personal data here. Links are our own pages only.

const HELP = "https://socallights.app/help/";
const any = (q, ...res) => res.some((r) => r.test(q));
const all = (q, ...res) => res.every((r) => r.test(q));

const ORG = /\b(with|from|for|at) (the )?(city|town|county)\b|\bcity hall\b|\b(coordinator|town|in the system|our website)\b|\b(organi[sz]er|my contest|our contest|the contest i (created|run|made|started|am running)|contest i (created|run|made|started)|my city|our city|city of|hoa|homeowners? association|neighbou?rhood (group|association)|school|chamber|my residents|our residents|the residents|for residents|for (them|her|him)|manage|dashboard|co-?organi[sz]er)\b/i;
const ADD = /\b(add|enter|input|insert|register|load|import|upload|put|submit|include|bulk|manual\w*|paste|type in|sign(ed|ing)? (people |them |residents |everyone )?up|get|bring)\b/i;
const HOMES = /\b(homes?|houses?|residents?|people|everyone|sign-?ups?|registrations?|addresses|address list|participants?|entries|entrants?|households?|properties|yards?|displays?)\b/i;
const SELF = /\b(enter|add|submit|register|put) (my|our) (own )?(home|house|display|lights|yard)\b/i;
const LISTY = /\b(signed (people |them |residents )?up|myself|ourselves|on behalf|instead of|into the contest|list|spreadsheet|excel|csv|form|manual\w*|bulk|paste|import|for (them|her|him|residents|people)|without (a |an )?(account|photo|photos)|don'?t have (an )?(account|photo|photos)|no (account|photo))\b/i;

// Each topic: id, test(q), reply, optional link card.
const TOPICS = [
  {
    id: "remove_added_home",
    test: (q) => all(q, /\b(remove|delete|take out|take off|undo|get rid of)\b/i, /\b(home|house|entry|entries|address)\b/i) && any(q, /\b(i|we) (added|entered|put in)\b|\badded (by )?(mistake|accident)\b|\bby mistake\b|\bwrong home\b|\bfrom my contest\b|\bout of my contest\b|\bin my contest\b/i) && !any(q, /\b(my own|my home|my house|my display)\b/i),
    reply: `To take a home out of your contest that you added by mistake:
1. Open your dashboard (account circle, Your contests, Manage) and tap Entries.
2. Find the home and tap Remove on its row, then tap again to confirm.
- This works before the winners are announced and while the home has no votes.
- If it only has a typo, use Edit instead and keep the home.
Full steps: ${HELP}add-your-citys-homes-yourself`,
    link: ["Add your city's homes yourself", "add-your-citys-homes-yourself"],
  },
  {
    id: "org_photos",
    test: (q) => all(q, /\b(photos?|pictures?|images?)\b/i, /\b(add|upload|put|attach)\b/i) && any(q, /\b(homes? (i|we) (added|loaded|entered|put in|imported)|(i|we) (added|loaded|entered|put in|imported)|added (homes?|them)|organi[sz]er|for (a |an |the )?residents?|city added|no photos?|don'?t have (any )?(photos?|pictures?)|have no photo|loaded manually)\b/i) && !any(q, /\b(my (own )?home|my display|my lights)\b/i) && !/\b(home ?owner|resident|family|owner)\b[^.?!]{0,20}\b(to|can) (add|upload)\b/i.test(q),
    reply: `Homes you add yourself start with no photo, and you can add photos for them:
1. Open your dashboard (account circle, Your contests, Manage) and tap Entries.
2. On the home, tap Photos, then Add photos, and choose up to eight pictures from your phone or computer. They are made smaller on your device before they upload.
3. To take a photo off, tap the cross on it.
- Photos show at once on the contest page, the ballot and the map, and can be added or removed until voting closes.
- You can also send the homeowner a private link (Copy link or Email link) so they add their own. They can hide the photos you added but not delete them.
Full steps: ${HELP}add-photos-to-homes-you-added`,
    link: ["Add photos to homes you added", "add-photos-to-homes-you-added"],
  },
  {
    id: "homeowner_link",
    test: (q) => all(q, /\b(home ?owners?|resident|family|owner)\b/i, /\b(add|upload|send|post)\b/i, /\b(pictures?|photos?|images?)\b/i, /\b(i|we) (put in|added|entered|loaded|created)\b|\bthat i\b/i) || (all(q, /\b(link|unlink|invite|invitation)\b/i, /\b(home ?owners?|residents?|owner|her|him|them|family|person|someone|wrong person|nobody)\b/i) && any(q, ORG, /\b(private|copy|email|emailed|send|sent|gave|share|unlink|new link|make a new)\b/i) && !any(q, /\b(vote|voting link|contest link|link to (my|the|our) contest|share|qr)\b/i)),
    reply: `Every home you add yourself has its own private link, so the homeowner can add their own photos and details. To send it:
1. Open your dashboard (account circle, Your contests, Manage) and tap Entries.
2. On the home's row, tap Copy link, or Email link to open an email with the link and a short message already written. The same link is in the Photos box.
3. The homeowner opens it, signs in with their email or Google, and links the home to their account.
- Link went to the wrong person and nobody has linked the home yet? Tap Make a new link; the old one stops working.
- Someone already linked it by mistake? Tap Unlink this homeowner, which removes them and gives you a new link to send.
- The homeowner can change the details, add their own photos, delete their own photos, and hide the photos you added (not delete them). They cannot change the address or delete the home. You can remove any photo.
Full steps: ${HELP}add-photos-to-homes-you-added`,
    link: ["Add photos and send the owner a link", "add-photos-to-homes-you-added"],
  },
  {
    id: "fix_added_home",
    test: (q) => all(q, /\b(fix|edit|change|correct|wrong|typo|typed|misspell\w*|mistake|update)\b/i, /\b(homes?|houses?|address|street|entry|entries|family|resident)\b/i) && any(q, /\b(added|add|organi[sz]er|manually|entered for|for (a |the )?resident|put in)\b/i, /\b(i|we) (entered|added|put in|loaded|submitted)\b/i, ORG) && !any(q, /\b(vote|judge|score|category|my own|my (home|house|display))\b/i),
    reply: `You can fix any home you added yourself. Here is how:
1. Open your dashboard: tap the account circle, then Your contests, then Manage on your contest.
2. Tap Entries. Homes you added have an Added by organizer tag and an Edit button.
3. Tap Edit, then fix the name, the description or the address.
4. Tap Save. The change shows everywhere at once: the ballot, the judges' ballot, the driving routes and the map.
- Changing the address moves the pin, so we look it up again. It cannot match another home already in your contest.
- After winners are announced the address is locked, but the name and description can still be fixed.
- Co-organizers can edit these homes too.
- A home a resident entered themselves is edited by that resident from their profile.
- Added one by mistake? Tap Remove on its row, then tap again to confirm.
Full steps: ${HELP}edit-a-home-you-added`,
    link: ["Fix a home you added", "edit-a-home-you-added"],
  },
  {
    id: "homeowner_got_link",
    test: (q) => any(q, /\b(city|organi[sz]er|hoa|neighbou?rhood|association|school|chamber)\b[^.?!]{0,40}\b(added|entered|put|registered|signed me up|submitted)\b[^.?!]{0,30}\b(my|our) (home|house|display|address)\b/i, /\b(got|received|have|opened|open|clicked)\b[^.?!]{0,20}\b(a |the )?(private )?link\b[^.?!]{0,40}\b(city|organi[sz]er|hoa|contest|my home)\b/i, /\b(my (home|house) (was|is) (already )?(in|added to|entered in) (a|the) contest)\b/i, /\b(emailed|sent|gave|texted) me (a |the )?(private )?link\b[^.?!]{0,60}\b(my|our) (home|house)\b/i, /\b(entered|added|put) my (home|house|display)\b[^.?!]{0,30}\b(in|into|to) the (decorating )?contest\b[^.?!]{0,40}\b(add|upload)\b[^.?!]{0,10}\b(my own )?(photos?|pictures?)\b/i),
    reply: `If your city or neighborhood group put your home in a contest, you do not need to enter again. They can send you a private link. Here is what to do:
1. Open the link from your email. It opens a private page for your home.
2. If it asks, sign in with your email or Google.
3. Tap "Yes, this is my home: link it to my account".
4. Check the details (name, description, when the lights are on, a tip for visitors, how to see it, parking, radio station) and tap Save changes.
5. Under Photos, tap Add your own photos and choose pictures from your phone or computer.
Your home is then on your profile, under Contests and under Displays.
- You can change the details and your own photos until voting ends. You can hide the organizer's photos but not delete them.
- You cannot change the address (ask the organizer), delete the home from the contest, or change the contest.
- The first account to link the home keeps it, so do not share the link. If it says the home is linked to another account or the link is not active, ask the organizer for a new link.
Full steps: ${HELP}your-city-added-your-home`,
    link: ["Your city added your home", "your-city-added-your-home"],
  },
  {
    id: "contest_add_homes",
    test: (q) => (all(q, ADD, HOMES, /\bcontests?\b|\b(my city|our city|hoa|residents?|participants?|organi[sz]er|coordinator|in the system)\b/i) || all(q, /\b(manual\w*|bulk|paste|import)\b/i, /\b(homes|houses|addresses)\b/i) || all(q, ADD, /\b(homes|houses)\b/i, /\b(signed (people |them )?up|booth|spreadsheet|excel|csv|registered)\b/i)) && (any(q, ORG, LISTY, /\b(how (do|can|should) (i|we)|can (i|we)|is there a way)\b[^.?!]{0,30}\b(add|enter|register|load|import|put)\b[^.?!]{0,25}\b(homes|houses|residents|addresses|participants|entries)\b/i)) && !(SELF.test(q) && !any(q, ORG, LISTY)),
    reply: `There are two ways to get homes into your contest, and you can use both in the same contest.

Way 1: Add homes yourself. This is best when your city already collects sign-ups on a form, a spreadsheet or email. Residents do not need a photo or an account.
1. Open your dashboard: tap the account circle, then Your contests, then Manage on your contest.
2. Tap Entries, then open Add homes yourself.
3. Paste one home per line, like this: Street address, City, ZIP | Name. City, ZIP and name are optional, and without a city your contest's city is used. A column pasted from a spreadsheet works too.
4. Tap Check addresses. Each line is marked Found, or tells you what is wrong, such as Already in this contest.
5. Tick the box saying the residents agreed to have their address shown on the public map (only if they did).
6. Tap Add homes. They go straight onto the ballot and the driving routes with an Added by organizer tag.
- Limits: up to 100 homes pasted at a time, up to 500 per contest, and up to 25 while a new contest waits for our quick review. You can add homes once the contest is live and until voting starts.
- Afterwards: fix a typo with Edit on the home's row, add photos with Photos, and send the homeowner a private link with Copy link or Email link so they can add their own photos.

Way 2: Residents enter their own home. Share your contest link, QR code or poster. Residents tap Enter, sign in, add photos, the home's address and a name, and accept the contest rules (they must be 18 or older). You approve entries by hand or automatically, whichever you chose.

Full steps for Way 1: ${HELP}add-your-citys-homes-yourself`,
    link: ["Add your city's homes yourself", "add-your-citys-homes-yourself"],
  },
  {
    id: "resident_enter",
    test: (q) => any(q, SELF, /\b(how|where) (do|can) (i|we) enter (the |a |this )?(contest|competition|[a-z' ]{0,40}contest)\b(?![^.?!]*\b(event|business|company|team|sponsor)\b)/i, /\b(enter|submit|register|put) (my|our|a) (home|house|display|lights)\b[^.?!]{0,25}\b(contest|competition|decorating|voting)\b/i) && !/\b(my|our|an?) (event|business|company|team)\b[^.?!]{0,10}\bin\b/i.test(q) && !/\b(without|instead of|not in)\b[^.?!]{0,15}\bcontest\b|\b(to|on) the map\b/i.test(q) && /\b(contests?|competitions?)\b/i.test(q) && !any(q, /\b(organi[sz]er|my contest|our contest|for residents|dashboard|city added)\b/i),
    reply: `Here is how to enter your home in a contest:
1. Open the contest page (use the link, QR code or poster from the organizer) and tap Enter.
2. Sign in with Google or an emailed code.
3. Add photos (take them at night with the lights on), your home's address, and a name.
4. Accept the contest's official rules. You must be 18 or older.
5. Submit. If the organizer approves entries by hand, your photos stay private until they approve; if entries are approved automatically, your home appears right away.
- A home competes in every category, so you do not pick one.
- You can edit the name and description, or withdraw, from your profile (Contests, then Mine) while the contest allows it.
- Did your city or neighborhood group already add your home? Then you do not need to enter again: open the private link they sent you. See ${HELP}your-city-added-your-home
Full steps: ${HELP}enter-your-home-in-a-contest`,
    link: ["Enter your home in a contest", "enter-your-home-in-a-contest"],
  },
];
export const TOPIC_IDS = TOPICS.map((t) => t.id);

// Returns { id, reply, cards } or null. `q` is the visitor's newest message. Safety refusals and the "talk to a person" fast path run before this.
const EXTRA = { contest_add_homes: ["Open your contests (then Manage)", "/contests#mine"], fix_added_home: ["Open your contests (then Manage)", "/contests#mine"], homeowner_link: ["Open your contests (then Manage)", "/contests#mine"], org_photos: ["Open your contests (then Manage)", "/contests#mine"], remove_added_home: ["Open your contests (then Manage)", "/contests#mine"], resident_enter: ["See contests you can enter", "/contests"], homeowner_got_link: ["Open your profile", "/profile"] };
export function directAnswer(q) {
  const text = String(q || "");
  if (text.length < 8 || text.length > 500) return null;
  for (const t of TOPICS) {
    let hit = false;
    try { hit = t.test(text); } catch { hit = false; }
    if (hit) { const ex = EXTRA[t.id], links = [...(t.link ? [{ label: t.link[0], sub: "", href: "/help/" + t.link[1] }] : []), ...(ex ? [{ label: ex[0], sub: "", href: ex[1] }] : [])]; return { id: t.id, reply: t.reply, cards: links.length ? [{ type: "links", label: "Go straight there", links }] : [] }; }
  }
  return null;
}
