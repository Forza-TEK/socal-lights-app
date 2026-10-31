# Managing users (admin → Users tab)

Everyone who makes a profile (by emailed code or Google) is listed at `/admin/` → **Users**. Only the owner's Cloudflare Access login can see it.

**What you see:** name, email, whether they use Google, when they joined, last sign-in, how many homes/events and contest entries they posted, contests they run, and votes cast. Search by name or email, filter All / Active / Suspended, 50 per page.

**Click a person (Manage) to:**
- **Sign out everywhere:** ends every logged-in device. They can sign back in.
- **Suspend / Reactivate:** a suspended person is signed out at once and cannot sign in (emailed code or Google), vote, or enter contests. They see "This account has been suspended. Email info@socallights.app…". Their homes and entries stay as they were; unpublish those from the Published houses tab if needed.
- **Edit name** and keep a **private note** (never shown to them or the public).
- **Delete account:** type their email to confirm. Removes sign-ins, drafts, profile picture, contest entries and votes, closes the contests they run, and blanks their email on homes and events they posted. Same removal as "Delete my account" on their profile (`functions/_lib/account.js`).

**Download CSV** exports the list (respects the search and filter) for a spreadsheet.

Code: `functions/api/admin/users/index.js`, `[id].js`; UI at the end of `public/admin/admin.js`; migration `0126_user_admin.sql` (adds `status`, `suspended_at`, `admin_note`).

## Activity log (admin → Activity log)
Every change made in the admin tools is recorded: **when** (UTC), **who** (the Cloudflare Access email), and **what** ("suspended account jo@example.com", "approved house Orchard Lane", "deleted event Winter Whirl"). Covers accounts, houses, events, submitted events and contests. Filter by area, 50 per page, newest first.
- Reads are not logged, and neither are attempts that fail (a wrong delete confirmation, a validation error).
- Private notes are logged as "updated the private note", never with the note's text.
- The name shown is the item's name at the time, so a deleted account or event still reads properly.
- A person's own **Manage** window shows their last 10 admin actions under "Admin history".
- Code: `functions/_lib/adminlog.js`, the hook in `functions/api/admin/_middleware.js`, `functions/api/admin/log.js`; table `admin_log` (migration `0127_admin_log.sql`). Entries are kept indefinitely.
