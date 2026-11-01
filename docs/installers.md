# Installer profiles

A professional installer company has a profile page at `/installer/<slug>` (company, service area, phone, website, a "Call for a quote" button, and every home on the map it installed). Profiles are free for now; the paid parts (exclusive city slot, lead emails, featured placement) come later.

## How a home gets linked to an installer
- **An installer posts it** (Showcase a House, "A professional installer"): the post creates or joins the installer's profile (matched by company name, ignoring case) and counts as confirmed.
- **A homeowner names the installer** ("Did a professional install your lights?"): the claim shows on the card and the details page right away as "Installed by <company>", linked to the profile. If we have the installer's email (from an earlier post of theirs), they get a one-click confirm link that adds a check mark. Unconfirmed claims stay visible, by decision of 2026-11-01.
- **A contest's presenting installer** links to the profile when a profile with that name exists.

## Where it shows
Home cards, the home details panel, the contest "Get a quote" card, `/installer/<slug>` (listed in the sitemap), and the admin Review screen ("Installed by ... claimed by the homeowner, not confirmed"), so the claim is seen before a home is approved.

## Data
`installers` (migration 0140) plus `posts.installer_id`, `installer_confirmed`, `installer_token`. The migration also made a profile for every installer who had already posted and linked their homes.

## Admin
Admin, Installers tab: edit a profile (name, website, phone, service area, a short "About", and a private email for confirmation links), hide or show it, or merge two spellings of one company. Merging moves every home and any contest naming that company to the profile you keep, fills blanks on it from the other one, and removes the other (its page then returns "not found"). Renaming a profile to a name another profile already has is refused: merge instead.
