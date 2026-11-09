# Ad creative for Grok (not linked from the site)

Served at `https://socallights.app/ad-assets/<asset-id>/<file>` with `X-Robots-Tag: noindex, nofollow` (see `public/_headers`) and disallowed in `robots.txt`. Nothing on the site links here.
`GET /api/ads/assets` (Bearer `ADS_API_KEY`) returns the absolute URLs, sha256 and the ad ids that use each file, read from `manifest.json` in this folder.

## Status: EMPTY until the creative is final
The creative is being built on the branch `origin/ads-creative` in `docs/marketing/ad-assets/` (a01 to a10: screenshots and videos, about 5 MB in all). When the owner approves it as final:

```sh
git fetch origin ads-creative
git checkout origin/ads-creative -- docs/marketing/ad-assets      # or merge the branch
node scripts/build-ad-assets.mjs --from docs/marketing/ad-assets   # copies into public/ad-assets/<asset-id>/ and rewrites manifest.json
```

Rules: each file under 20 MiB (Cloudflare Pages limit is 25 MiB); png, jpg, webp, mp4, mov only; no personal data on screen (see `docs/marketing/ads-launch-handoff.md`). Do not copy a file that already lives in `public/`: reference it instead. Do not copy `_build/` working files.

## Asset ids (set in `ads_items.asset_id`, migration `0204_ads_link.sql`)
| asset id | used by |
|---|---|
| `a03-contest-screens` | ct-a-meta |
| `a04-qr-poster` | ct-b-meta |
| `a02-city-page` | ev-a-meta, ev-b-meta |
| `a05-installer-profile` | in-a-meta, in-b-meta |
| `a08-find-location-video` | fa-a-meta |
| `a09-favorites-video` | fa-b-meta |
| `a10-weekend-list` | fa-c-meta |
| `a07-route-video` | ho-b-meta |
| (none yet: add-a-home recording, cut from the tutorial) | ho-a-meta |

`a01-page-images` (Facebook cover and profile) is for the Page, not an ad; list it in the manifest without an ad id if Grok needs it.
