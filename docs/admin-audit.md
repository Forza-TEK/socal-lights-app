# Admin audit (2026-11-02)

Method: read every Admin file (`public/admin/*`, `functions/api/admin/*`, `adminlog.js`), walked every tab at phone, tablet and desktop widths in light and dark, and compared how each record type is shown and changed.

## What was wrong
1. **Ten tabs in one wrapping row.** No grouping, no overview, no sense of what needs attention. On a phone the row scrolled sideways.
2. **No home page.** Opening Admin landed on "Waiting for review" whether or not anything was waiting.
3. **Records were handled five different ways.** Houses: card + Edit window. Submitted events and contests: card, no Edit. Events and users: table + window. Installers: card with an inline form. Confirm wording differed ("Click again to…" in four spellings, one not at all for Unpublish), and after an action some tabs removed the card, some re-rendered, some did neither. Only Users and the log had search or paging.
4. **Reports never reached Admin.** "Something wrong? Tell us" wrote to the `reports` table and nothing read it.
5. **Zero information in the browser tab.** No waiting count in the title.
6. **Log filter missed installers and reports.**
7. **Admin ignored the shared look.** Day/night used a local copy of the header button.

## What was built
- **Shell** (`public/admin/index.html`, `admin.css`): desktop side menu in groups (Review, Manage, Tools) with waiting badges; tablet icon rail with tooltips; phone top bar + bottom bar (Home, Houses, Events, Contests, More) and a "More" sheet holding the full menu. Deep links (`/admin/#users`), Escape/scrim close, `aria-current`, 44px targets, reduced-motion respected. Browser tab title shows `(n)` waiting.
- **Dashboard** (`functions/api/admin/dashboard.js`): what needs you (houses, events, contests, reports, installer claims), today, what is live, people last 7 days, newest submissions, contests running, your recent activity. Every tile opens the right tab.
- **Reports tab** (`functions/api/admin/reports.js`): list, Open Events, Dismiss.
- **One record standard** (`public/admin/kit.js`), used by every tab:
  - Toolbar: views (segmented), search, filters, Add, running count.
  - Record: title + status tags + date, key facts, then one action row: `Edit · main action(s) ······ danger` (danger always last, red, right-aligned; full-width buttons on phones).
  - Destructive actions need a second tap ("Tap again to remove"), 5 second window, same everywhere.
  - Every change shows the same toast ("Published", "Saved", "Merged"…) and updates the counts.
  - Edit windows share one frame and close the same way (X, Cancel, Escape, tap outside); Save then Cancel, delete on the right.
  - Long lists page the same way (Newer / Older) or "Show 60 more".
- Activity log areas now include installers, reports and data check.

## Standard per record type
| Tab | Edit | Main | Danger |
|---|---|---|---|
| Houses waiting | Edit window | Approve and publish | Decline |
| Published houses | Edit window | Unpublish | Remove from site |
| Submitted events | Edit window (waiting ones) | Publish (confirmed/expected) / Unpublish | Decline |
| Contests (waiting) | Edit window | Approve | Decline |
| Events | Edit window | | Delete (inside the window) |
| Installers | Edit window | Hide / Show | Merge (inside the window) |
| Users | Edit window (name, note, suspend, delete) | | Delete account (inside the window) |
| Reports | | Open Events | Dismiss |

## Still open (see the Admin checklist)
- Replaced records and Data check are decision tools, not record lists; still tables.
- Decline reasons (and an email to the person), approve/decline emails to homeowners.
- Bulk select (approve several), undo for decline.
- Admin sessions: Cloudflare Access only; no second admin role.
- Search across everything (one box in the top bar).
- Dashboard trends (daily lines), page views (needs analytics source).
- Contest management from Admin beyond approval (pause, edit, remove).

## Profile and Tutorials use the same frame
`public/appshell.js` + `appshell.css` give Your profile and Tutorials the same side menu (desktop), icon rail (tablet) and bottom bar + More sheet (phone) as Admin. Profile tabs and tutorial categories became the menu items; the site links (Map, Add, Tutorials, Your profile) sit under them.

## Profile records and management pages (follow-up)
- **Installer and person profile windows** (Admin > Installers / Users, button "Profile"): who they are, counts, then every linked record as a tappable row: homes (opens the house's edit window), contest entries, submitted events (jumps to that event in Submitted events), contests they run, installer profiles they own, an installer's owner account and recent quote requests, admin history, then the edit form. Rows link both ways (person to installer to owner).
- **Management pages use the same frame** as Admin, Profile and Tutorials: contest management (`/c/<slug>/manage`: Overview, Entries, Results, Judges, Details, Promote, Team, Sponsors), judging (`/c/<slug>/judge`: Ballot plus one item per category) and installer management (`/installer/<slug>/manage`: Overview, Homes, Details, Activity).
- Logo wordmark is one line ("SoCal Lights", with an Admin tag) in Admin and in the Profile frame.

## Photos per house
The house Edit window has two tabs: **Details** and **Photos**. The card's Edit button opens Details; its **Photos (n)** button opens Photos. Photos shows one large photo with ‹ › (and the keyboard arrows) to browse, a thumbnail strip, and actions for the photo on screen: Make cover, Move earlier/later, Remove photo (tap twice); Add photos (up to 8, JPG/PNG/WebP, resized in the browser). Changes save at once. Server: `functions/api/admin/posts/[id].js` (`photo_remove`, `photo_move`, multipart upload); photos keep the numbered names the photo routes accept.

## Edit forms
All Admin edit windows share one form layout (`fsec` / `ff` in `admin.js`, `.fsec .fgrid .ff` in `admin.css`): titled sections, labels above fields, a hint under any field that needs one, a six-column grid that stacks on phones, and a Save bar that stays in view. "Where to see it" was removed from the house form (the stored value is untouched). "Service area" is now **Areas served** with a hint. The house form shows only what belongs to **Posting as**: a homeowner sees name, title, address, season and description; a professional installer also sees phone, website and areas served (switching the choice shows or hides them at once; saving a homeowner never overwrites those three values).

## Areas served picker
"Areas served" is a multi-select (`public/areapick.js`, `areapick.css`): type two letters, pick a city or county from the same dropdown used for street addresses (`/api/address?kind=area`), and each choice becomes a removable chip (Backspace removes the last one, arrow keys + Enter pick). The list is the site's own cities and the seven counties first, then Geoapify cities and counties when `GEOAPIFY_KEY` is set. Stored as "Orange County, Irvine, San Diego County" (up to 240 characters). Used in the Admin house and installer windows and on the installer's own Details page; the add-house wizard still has a plain text box.

## Edit forms outside Admin
`public/forms.js` + `forms.css` give the same sectioned form to the public side: Your profile (Displays and Events: **Edit** opens a window like Admin's, with Listing / Plan a visit / How people reach you, and Event / When / Where and price / Details), the installer page (shared-home edit window and the Details form, with the Areas served picker) and the contest dashboard's "Edit contest details" (Contest / Schedule / Voting / Prize / Presenting installer / Official rules). The step-by-step add flows keep their one-question screens, but fields now use the same labels, 46px inputs and hints (`addflow.css`).

## Your profile layout
`public/profile.css`: the page is centred like Admin and Tutorials (content up to 1120px), with a header card (bigger avatar, name, email, pill buttons), the section heading with its Add button, and records as cards in a two-column grid (one column on phones). Empty lists get a dashed empty-state card; the Account form is a two-column form limited to 760px.

## Who can create and change a contest
Creating a contest needs a signed-in account: the Add a contest page asks you to sign in first, and the server refuses a create without one. The contest is stored with the creating account (`owner_id`), shows under that person's Contests, and shows the organizer's email in Admin. Only that person and Admin can change the contest itself (details, dates, open/close entries, pause voting, announce winners, run again). Co-organizers still run the day-to-day (approve entries, review votes, judges, sponsors) and see a note where the creator-only controls would be.
