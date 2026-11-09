# Contest pricing change: what in marketing now says "free" or the old prices

Owner decision 2026-11-09 (after meeting the City of Eastvale, who recommended charging): contest organizers pay from the first contest. Single contest $149, up to 5 contests in a 12-month window $299, up to 20 contests $499, more than 20 contact us. The old rule was 1 free contest per organization per 12 months, with passes $50 / $75 / $100 for up to 5 / 10 / 20. Entering and voting stay free for residents, and payment never affects results.

**Nothing in this file was edited in the ads, posts, pictures or videos.** This is the list of what to change, with the exact current text and a proposed replacement, for the owner to apply on the go-live day (the new pricing goes live when the PR `contest-pricing-2026-11` is merged and `PAID_FROM` in `functions/_lib/passes.js` is set to that day).

Rules the proposals follow: the word "home"; no price in ad copy (`ads-plan-2026-11.md`: "No ad copy contains a price", the copy points to the Pricing page); no "free forever" or "always free"; nothing that says or implies payment affects results; nothing invented. "Free for residents to enter" is true and stays. Character limits are the ones already recorded in `ads-content.json` (Meta: headline 40, primary text 125, description 30; Google: headline 30, description 90).

Summary: 4 paid ads to change (ct-a-meta, ct-a-google, ct-b-meta, ct-c-google; the Meta ones also live in the database and in the handoff doc), 1 organic post (op-05), 2 pictures with the headline "Run a home lights contest, free" (a03 and its Story version), 6 tutorial caption files and 1 tutorial list entry, and the narration in `scripts/tutorials/videos2.mjs` for 4 videos. Everything else that says "free" (map, search, routes, listing an event or a home, installer profile, entering and voting) is still true and needs no change.

## 1. Paid ads: `docs/marketing/ads-content.json`

The same Meta copy is also stored in the database (`ads_items`, seeded word for word by `migrations/0204_ads_link.sql`, rows `ct-a-meta`, `ct-b-meta`, `ct-c-meta`) and is what the Ads API serves to Grok. Changing the JSON alone does not change the database: the rows must be changed in Admin or by a new add-only migration that updates them. `docs/marketing/ads-launch-handoff.md` (lines 22 to 34) repeats the ct-a and ct-b text and must change with them. `docs/marketing/ads-plan-2026-11.md` line 19 was already corrected in this PR (it described the first contest as free).

### ct-a-meta (Meta, contest organizers)
| Field | Current text | Proposed |
|---|---|---|
| concept | `A: First contest free` | `A: Run a contest` |
| headline | `Run a home lights contest, free` | `Run a home lights contest` (25) |
| primary_text | `Cities, HOAs, schools, chambers: your organization's first contest in every 12 months is free. Entering is free too.` | `Cities, HOAs, schools, chambers: set up a home lights contest in minutes. Entering is free for residents.` (105) |
| description | `First contest free` | `Free for residents to enter` (27) |
| landing_url utm_content | `a-free-v1` | Keep for continuity of reporting, or use `a-contest-v2` so the old "free" message is not mixed into the numbers. The ads plan says not to edit tracking codes, so the owner decides. |
| asset | `a03-contest-screens` (picture says "free", see section 3) | the new picture |

### ct-a-google (Google Search, contest organizers)
| Field | Current text | Proposed |
|---|---|---|
| concept | `A: First contest free` | `A: Run a contest` |
| headline (3, joined by " \| ") | `Run a Lights Contest Free \| For Cities, HOAs & Schools \| First Contest Free` | `Run a Lights Contest Online \| For Cities, HOAs & Schools \| Residents Enter for Free` (27 / 26 / 24, each under 30) |
| primary_text (description 1) | `Resident entries, judges, and People's Choice and Judges' Choice awards. First one free.` | `Resident entries, judges, and People's Choice and Judges' Choice awards. Choose a pass.` (87) |
| description (description 2) | `Your organization's first contest in every 12-month window is free. Entering is free.` | `Entering is free for residents. Organizers choose a contest pass; see our Pricing page.` (87) |
| landing_url utm_content | `a-free-v1` | as above |

### ct-b-meta (Meta, contest organizers)
| Field | Current text | Proposed |
|---|---|---|
| description | `First contest free` | `Free for residents to enter` (27) |
| notes | `... Fact check before launch that each feature named is in the free first contest; pricing.html lists entries, voting, judges and both awards. ...` | `... Fact check before launch that each feature named is in every contest pass; pricing.html lists entries, voting, judges and both awards. ...` |
| asset | `a04-qr-poster` (picture is fine, see section 3) | none |
| headline, primary_text | `Judges, awards and a QR poster` / `Run your neighborhood lights contest online: resident entries, judges, and People's Choice and Judges' Choice awards.` | no change |

### ct-c-google (Google Search, contest organizers)
| Field | Current text | Proposed |
|---|---|---|
| description (description 2) | `Set up your city, HOA or school contest online. Your first contest is free.` | `Set up your city, HOA or school contest online. Residents enter free; passes on Pricing.` (88) |
| headline | `Contest Homes on a Map \| Free Routes for Visitors \| Lights Contest for Your City` | no change ("Free Routes for Visitors" is true) |
| primary_text | `Show your contest homes on a free map. Visitors can browse and plan a route between them.` | no change (the map is free) |

### Checked, no change needed
ct-a-meta Instagram fields, ct-b-google (`Entering and voting are free for everyone. Payment never affects any contest result.` stays true), ct-c-meta (`Map and routes are free` and `a free map` stay true), every event, installer, home and family ad (they say free about listing, profiles, the map and routes, not about contests).

## 2. Organic posts: `docs/marketing/organic-posts-2026-11.json` and `.md`

### op-05, Tue 2026-11-17, Facebook and Instagram feed post (the only organic post that says a contest is free)
| Field | Current text | Proposed |
|---|---|---|
| concept | `2026-11-17 (Tue): Run a home decorating contest` | no change |
| headline | `Want a neighborhood lights contest? Your first one is free.` | `Want a neighborhood lights contest? Set one up in minutes.` (58) |
| primary_text | `Set up a home decorating contest in minutes: a link and a QR code to share, with entries, judges and a results page. The first contest for your organization in a 12-month window is free.` | `Set up a home decorating contest in minutes: a link and a QR code to share, with entries, judges and a results page. Residents enter for free; organizers choose a contest pass (see the Pricing page).` (199) |
| landing_url utm_content | `contest-first-free` | `contest-setup` (a tracking name only) |
| visual | `a03 demo contest entry (4:5)` | the new a03 picture (section 3) |

In the `.md` the same post is lines 40 to 42.

### Posts that use a contest picture or mention a contest, checked
- op-07 (2026-11-19 Story, "Print it, post it, share it."): uses a04 (QR poster). The poster reads "Scan to enter your home. It's free!", which is about a resident entering and stays true. No change.
- op-14 (2026-12-05, "See how a home decorating contest ends."): uses "a03 demo contest results (4:5)". The text says nothing about price; no text change. If the a03 results picture also carries the "free" headline, use the new picture.
- op-01, op-03, op-04, op-08, op-10, op-13 say free about the map, browsing, listing an event, the installer page and adding a home. All still true. No change.

## 3. Asset pictures: `public/ad-assets/` (`manifest.json`, built by `scripts/build-ad-assets.mjs`)

| File | What it shows now | Proposed |
|---|---|---|
| `a03-contest-screens/a03-contest-entry-page-4x5-1080x1350.png` | Top line in the picture: **"Run a home lights contest, free"**, then the pill "Start at socallights.app" over a screenshot of the demo contest page | Replace the top line with `Run a home lights contest` (or `Set up a home lights contest in minutes`) and keep the pill and the screenshot. Do not put a price in the picture. |
| `a11-story-versions/a11-story-a03-contest-entry-page-9x16.png` | Same top line **"Run a home lights contest, free"**, Story size | Same replacement. |
| `a04-qr-poster/a04-qr-poster-4x5-1080x1350.png` | Top line "Judges, awards and a QR poster". Inside the poster: "Scan to enter your home. **It's free!**" | No change: the poster text is for residents entering, which stays free. (Optional: `Scan to enter your home.` without "It's free!" if the owner wants no "free" next to a contest ad.) |
| `a11-story-versions/a11-story-a04-qr-poster-9x16.png` | Same as a04 | Same as a04. |

After replacing a03 and its Story version, run `node scripts/build-ad-assets.mjs` so `manifest.json` gets the new sha256. `public/ad-assets/README.md` needs no change (it names asset ids only).

## 4. Tutorial videos, captions and narration

The videos are recorded with a synthetic voice from the scripts in `scripts/tutorials/videos2.mjs`; the captions in `public/tutorials/*.vtt` are cut from the same text. The chat assistant also learns from these captions, so `scripts/build-chat-kb.mjs` now skips the stale lines (see section 6) until the videos are re-recorded.

### 4a. Captions that speak the old rule (`public/tutorials/*.vtt`, `public/tutorials.json`)
| File (desktop and `-mobile` phone version) | Cue | Current text | Proposed spoken text |
|---|---|---|---|
| `run-passes.vtt`, `run-passes-mobile.vtt` | 00:00:05 (line 7) | `Your first contest in a 12 month window is free.` | `Running a contest needs a contest pass.` |
| `run-passes.vtt`, `run-passes-mobile.vtt` | first cue, 00:00:00 | `In this video, you will see what happens when you run a second contest in the same year.` | `In this video, you will see how you choose a contest pass.` |
| `run-passes.vtt`, `run-passes-mobile.vtt` | 00:03:16 (line 172) | `There are three passes: Up to 5, Up to 10, and Up to 20 contests.` | `There are three passes: a single contest, up to 5 contests, and up to 20 contests.` |
| `run-passes.vtt`, `run-passes-mobile.vtt` | 00:03:21 (line 175) | `The number counts every contest in your window, the free one included.` | `The number counts every contest in your window.` |
| `run-passes.vtt`, `run-passes-mobile.vtt` | 00:03:55 (line 202) | `Your window runs for twelve months from the day your first contest went live, and a contest that is unpublished still counts.` | `Your window runs for twelve months from the day you buy your pass, or the day your first contest goes live if that comes first, and a contest that is unpublished still counts.` |
| `run-quick.vtt`, `run-quick-mobile.vtt` | 00:03:43 (line 190) | `Your first contest in a 12-month window is free.` | `Running a contest needs a contest pass.` (the next cue, "If you run more, you choose a pass first: see the Pricing page.", becomes `You choose the pass on this screen, before the contest goes live. The Pricing page shows what each pass costs.`) |
| `run-custom.vtt`, `run-custom-mobile.vtt` | 00:06:16 (line 316) | `Your first contest in a 12-month window is free.` | same as run-quick |
| `public/tutorials.json` line 227 (entry `contest-passes`, "desc") | **Already changed in this PR** to `What the pass picker shows when you run a contest, and how to choose a pass.` (was `Your first contest is free. What the pass picker shows when you run another one, and how to choose a pass.`) | | |

`run-passes` also names the demo situation "your organization already ran a contest in the last 12 months, so this one needs a pass" (line 374 of `videos2.mjs`); with the new rule every first contest needs a pass, so that narration is wrong as well (see 4b).

### 4b. Narration source: `scripts/tutorials/videos2.mjs`
| Video | Line | Current text | Proposed |
|---|---|---|---|
| `quick` (Create a contest with Quick start) | 49, step "7 of 7: Review" | `... Your first contest in a 12-month window is free. If you run more, you choose a pass first: see the Pricing page.` | `... Running a contest needs a contest pass. You choose it on this screen before the contest goes live; the Pricing page shows what each pass costs.` |
| `custom` (Create a contest with Customize) | 87, step "16 of 16: Review" | `... Your first contest in a 12-month window is free. If you run more, you choose a pass first: see the Pricing page. Nothing is public until you tap Create contest.` | `... Running a contest needs a contest pass. You choose it on this screen before the contest goes live; the Pricing page shows what each pass costs. Nothing is public until you tap Create contest.` |
| `edit` (Edit your contest and change the dates) | 146, step "Run it again" | `... A new contest may need a pass.` | `... A new contest needs room in your pass.` |
| `contest-passes` (Contest passes) | 371 hook | `In this video, you will see what happens when you run a second contest in the same year. Your first contest in a 12 month window is free. After that, you choose a pass. We start on the map.` | `In this video, you will see how you choose a contest pass before your contest goes live. We start on the map.` |
| `contest-passes` | 374, step "7 of 7: Review" | `This is the review. Your organization already ran a contest in the last 12 months, so this one needs a pass. Tap Create contest.` | `This is the review. Your organization has no pass yet, so this contest needs one. Tap Create contest.` (the demo organization must then have NO live contest in the window: `scripts/tutorials/seed-passes.sql` and the comment at line 367 describe the old setup and must be changed with it) |
| `contest-passes` | 376, step "Three passes" | `There are three passes: Up to 5, Up to 10, and Up to 20 contests. The number counts every contest in your window, the free one included. Each card lists everything it gives you, and the price is on the card.` | `There are three passes: a single contest, up to 5 contests, and up to 20 contests. The number counts every contest in your window. Each card lists everything it gives you, and the price is on the card.` |
| `contest-passes` | 377, step "More than 20" | `Running more than twenty contests? The Up to 20 card tells you what to do. ...` | no change |
| `contest-passes` | 379, step "After you pay" | `... Your window runs for twelve months from the day your first contest went live, and a contest that is unpublished still counts. If you need more contests later, choose a bigger pass, and you pay only the difference.` | `... Your window runs for twelve months from the day you buy your pass, or the day your first contest goes live if that comes first, and a contest that is unpublished still counts. If you need more contests later, choose a bigger pass, and you pay only the difference.` |
| `contest-passes` | 380 | `Entering and voting stay free for everyone, and payment never affects who wins.` | no change |

The pass cards that appear on screen in `contest-passes` show the prices from `/api/config`, so after the re-recording they show $149 / $299 / $499 and the audio says no price, which is consistent with the rule that the narration names no prices.

### 4c. Frames that show the old screens (no spoken text, but visible on screen)
- The **Add page** contest tile used to read "Free · about 3 minutes". It now reads "About 3 minutes" and then "From $149 · about 3 minutes" once the price loads. Videos that pass through the Add page: `quick`, `custom`, `contest-passes` (all through `wizardStart`), and `add-event` and `showcase` (they open the Add page and tap another tile). The narration there does not mention the tile text, so these only need a re-record if the owner wants the frame to match; `quick`, `custom` and `contest-passes` are being re-recorded anyway.
- The **Review screen** of the wizard now shows the pass picker for every new contest (it used to show "Your first contest in a 12-month window is free." for a first contest). Visible in `quick`, `custom` and `contest-passes`.
- The **Pricing page** no longer has the "Free / Your first contest" card in the Contest organizers tab. `sponsor` and `feature` open the Pricing page but show other tabs; check only if the contest tab appears in a frame.

### 4d. Other tutorial documents that describe the old behavior (history, no change needed unless they are reused)
`docs/tutorial-updates.md` (rows for `quick`, `custom`, `unpublish`, `feature`), `docs/CHECKLIST.md` line 27 and `docs/status.md` mention "free first contest" as a record of what was recorded on 2026-11-07 and 2026-11-08. They are history; not edited.

## 5. Outreach emails (written by Grok from the playbook)
These are not ads or posts but they would repeat "free" to organizers, so they were corrected in this PR (plain text docs, effective when the PR is merged): `docs/monetization/grok-email-playbook.md` (approved facts, the two organizer subject lines and bodies, the organizer follow-up, and the "never say" line now allows the contest pass prices) and `docs/monetization/grok-outreach-guide.md` (contest organizer facts). Historical analysis that quotes old emails (`docs/monetization/email-outreach-analysis.md`, `outreach.md`, `product-marketing.md`) was left as a record. Emails already sent under the old rule cannot be recalled; an organizer who answers one that said "free" should be told plainly about the new prices.

## 6. Already changed in this PR (in-repo copy, for the record)
`functions/_lib/passes.js` (prices), `functions/_lib/passmail.js` and `functions/_lib/mailtpl.js` (the receipt email), `functions/_lib/chatkb.js`, `functions/_lib/chatcards.js`, `docs/ai-assistant-kb.md`, `docs/ai-assistant-sample-qa.md`, the regenerated `functions/_lib/chatkb-data.js` (which now leaves out the old pricing lines of the tutorial captions), `public/add-contest.html`, `public/add.html` (the contest tile shows the price), `public/contest-pass.html`, `public/contest-passes.js`, `public/pricing.html`, `public/terms.html`, `public/app.js` (Support sheet), `public/organizer.html`, `public/admin/admin.js`, `public/tutorials.json` (one description), the Help articles (new migration `0213_help_contest_pricing.sql`) and the docs under `docs/`.
