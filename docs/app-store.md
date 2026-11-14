# SoCal Lights: App Store plan

The native apps (`app/`) are thin Capacitor wrappers that load https://socallights.app, so every site update reaches the apps immediately. They identify themselves with the browser string `SoCalLightsApp/1.0`; the site uses that to leave out tipping and paid Featured placements inside the apps (Apple and Google want in-app purchase for digital goods).

Bundle / package id: `app.socallights.lights` (change in `app/capacitor.config.json` before the first build if you want a different one; it cannot change after publishing).

## What is done
- `public/privacy.html` — privacy policy (live at https://socallights.app/privacy). Use this URL in every store listing.
- `app/` — Capacitor project with iOS and Android platforms generated, icons installed, location permission text and Android permissions set.
- Sign-in inside the app is the emailed code only ("Continue with Google" is hidden when the browser string has `SoCalLightsApp`: Google blocks embedded webviews, and offering Google would make Apple 4.8 require Sign in with Apple). Google and code sign-in prove the same email, so they reach the same account (`tests/appstore.test.mjs`).
- Account deletion in the app (Apple 5.1.1(v)): Profile > Account tab > Delete my account, two taps (the second asks "Tap again to permanently delete"). `DELETE /api/me` removes the account and personal data as `public/privacy.html` describes and keeps only the do-not-contact hash.
- Native share sheet (`@capacitor/share`) on every Share button inside the app (`public/native.js`).
- In-app mode: no "Keep SoCal Lights Free" tip item or footer line, no Featured payment option on Add event.

## What needs you
1. **Apple Developer Program** ($99/yr) — individual account is fastest; a company account needs a D-U-N-S number.
2. **A Mac with Xcode** (or a cloud Mac) to build, sign and upload the iOS app.
3. **Google Play Console** ($25 once) and **Microsoft Partner Center** ($19 individual, once).
4. Screenshots (see below) and answers to each store's content questionnaire.

## Build steps
### iOS (on a Mac)
```sh
cd app && npm install && npx cap sync ios && npx cap open ios
```
In Xcode: select the App target, set Team, confirm bundle id, set version 1.0 / build 1, then Product > Archive > Distribute > App Store Connect.

### Android
```sh
cd app && npm install && npx cap sync android && npx cap open android
```
In Android Studio: Build > Generate Signed Bundle (AAB). Keep the keystore file and password safe; never commit them.

### Microsoft Store
Use https://www.pwabuilder.com with https://socallights.app (the manifest, icons and service worker are already live) and choose Windows. Upload the generated package in Partner Center.

## Store listing text
**Name:** SoCal Lights
**Subtitle (iOS, 30 chars):** Holiday lights & events map
**Promotional text:** Find Halloween haunts, Christmas lights, tree lightings and neighbor-decorated homes across Southern California. Free to browse; sign in only to create a listing or enter a contest.
**Short description (Google, 80 chars):** Halloween, Christmas and seasonal events and home displays across SoCal.
**Full description:**
SoCal Lights puts holiday and seasonal fun across Southern California on one map.

• Places: events, parks, shows, markets and real neighbor-decorated homes in one list and one map
• Tap a dot for hours, price and photos, or swipe through a home's photos
• Heart places to save them, then see your night in driving order
• Open the route in Apple Maps or Google Maps
• Filter by tonight, this Saturday, free, county, city or type
• Seasons: Halloween, Thanksgiving & Christmas, New Year, Spring and Summer
• Add your event or showcase your house, free (sign in with an emailed code to create a listing or enter a contest)

Free to browse, no ads. Browsing needs no account; an account is only needed to create a listing or enter a contest, and you can delete it any time in the app (Profile > Account > Delete my account).
**Keywords (iOS, 100 chars):** christmas lights,halloween,haunted house,pumpkin patch,tree lighting,los angeles,orange county,san diego,holiday events
**Category:** Travel (secondary: Lifestyle). **Age rating:** 4+ (no objectionable content; Halloween events are family-oriented).
**Support URL:** https://socallights.app  **Marketing URL:** https://socallights.app  **Privacy policy:** https://socallights.app/privacy  **Contact:** info@socallights.app

## Privacy questionnaires
- **Apple "App Privacy":** Data collected and linked to you: Contact info (email address, only when you submit an event or house), User content (event/house details and photos you submit). Used for: app functionality. No tracking. Location: used on the device to center the map and estimate drive times. If the person taps "I saw it lit tonight", the device position is sent once to our server to check they are near the home; only a near yes/no is stored, not the coordinates (declare Precise Location, collected, not linked to identity, purpose: app functionality; confirm the answer when you fill in the questionnaire).
- **Google "Data safety":** Location: precise location is collected only when the person taps "I saw it lit tonight" (sent once to our server to check they are within about a quarter mile of the home, not stored, not shared; optional); otherwise processed on device only. Personal info (email): collected only when submitting a form, not shared, can request deletion by email. Photos: collected only when submitted, shown publicly. Data encrypted in transit: yes. Deletion: by emailing info@socallights.app.

## Screenshots to capture (use the live site in each store's required sizes)
iPhone 6.9" (1320x2868) and 6.5" (1284x2778): 1) map zoomed on a neighborhood, 2) a tapped pin card, 3) Places list, 4) Filters panel, 5) Favorites route, 6) a home display with photos. Android phone: same six at 1080x1920. A 1024x500 feature graphic for Google Play can reuse the Reel's intro frame.

## App review notes (paste into App Store Connect)
"SoCal Lights is a free map of seasonal events and neighbor-decorated homes in Southern California. Browsing the map needs no login; signing in (an emailed 6-digit code, no password) is only needed to create a listing or enter a contest. An account can be deleted in the app: Profile > Account > Delete my account. Demo account for review: see the sign-in block below. Location is optional. It is used on the device, except that tapping "I saw it lit tonight" sends the position once to check the person is near the home (not stored). The app loads our own website content from socallights.app so that event data stays current. Tapping Add opens a form to submit an event or a house, which is reviewed before publishing. No digital goods are sold in the app."

## Risk to watch (Apple 4.2 "minimum functionality")
A wrapper around a website can be rejected. Mitigation already in the site: it is a full interactive map app (not a brochure), saves places, plans routes and works offline-gracefully. If rejected, add native features: a native share sheet (`@capacitor/share` is already installed) and local reminder notifications for saved events.


## Cheapest path (decided 2026-10-30)
- **Apple:** individual Developer Program account, $99/yr (same price as a company account but no D-U-N-S wait).
- **No Mac rental needed:** the workflow `.github/workflows/ios-app.yml` builds on a GitHub Mac and uploads to App Store Connect. Needs four repository secrets (GitHub > Settings > Secrets and variables > Actions): `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the contents of the API key file from App Store Connect > Users and Access > Integrations > Team Keys, role "App Manager"). Create the app record (bundle id `app.socallights.lights`) in App Store Connect first.
- **Google Play:** $25 once. Run "Android upload key (one time)", download its artifact, add secrets `ANDROID_KEYSTORE_B64` (contents of upload.jks.b64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, then run "Android app" and upload the .aab in Play Console (opt in to Play App Signing).
- **Microsoft Store:** $19 individual, once. Package with pwabuilder.com and upload in Partner Center.


## Reviewer demo login (App Review)
Apple's reviewers cannot receive an email at an address we choose, so one fixed demo address has one fixed code. It is off until you set the secret.
- **Address:** `appreview@socallights.app` (fixed in `functions/_lib/auth.js`). **Code:** whatever six digits you put in the secret below. The repo never contains the real code.
- **Turn it on:** Cloudflare dashboard > Workers & Pages > `socal-lights` > Settings > Variables and Secrets > Add > type *Secret*, name `APP_REVIEW_CODE`, value exactly six digits (pick random ones, not 123456) > Save, then redeploy (or push any commit) so Functions pick it up. For the Production environment (add it to Preview too only if you test there). CLI alternative: `npx wrangler pages secret put APP_REVIEW_CODE --project-name socal-lights`.
- **Turn it off:** delete the secret (or set it to anything that is not six digits). The address then signs in like everyone else's and a real email would be sent.
- **App Store Connect > App Review Information > Sign-in required:** tick it, User name `appreview@socallights.app`, Password `<the six digits>`. In Notes add: "Sign in is passwordless. On the sign-in screen enter the demo email, tap Email me a code (no email is actually sent for this account), then type the 6-digit code shown in the Password field above. Sign-in is only needed to create a listing or enter a contest; the map, Places, Favorites and route planning work without it. To test account deletion: Profile > Account > Delete my account."
- **What it does and does not do:** it uses the normal code path (`login_codes`), so the 4-requests-an-hour per address, 12 per network address, 10-minute expiry, 5 tries per code and 30 verifies per hour per network address all apply (the reviewer must tap "Email me a code" first; if the code is locked after 5 wrong tries, ask for a new one). The stored hash covers email plus code, so the code is useless for any other address. It sends no mail. It is an ordinary account with no admin rights (Admin is Cloudflare Access only). The reviewer can delete it in the app; signing in again creates a fresh one.
- Rotate the code after review by changing the secret.

## Native features and what remains (Apple 4.2)
Installed in `app/package.json`: `@capacitor/app`, `browser`, `share`, `splash-screen`, `status-bar` (plus core, ios, android).
- **Share sheet: done (web side).** `public/native.js` `nativeShare` calls `Capacitor.Plugins.Share` when the app has it, else falls back to `navigator.share`, then copy link. Used by place Share, Favorites Share, the route stop Share and the contest Share. Not tried on a device.
- **Reminders for saved events: web hook only.** Hearting an upcoming event in the app calls `syncReminder`, which would schedule a 9 am notification on its first day (un-hearting cancels it). It does nothing until the app build includes `@capacitor/local-notifications`, because the plugin is not installed. What remains, on a Mac or by editing and letting CI build: (1) in `app/` run `npm install @capacitor/local-notifications@^7` (this updates `app/package-lock.json`; the CI uses `npm ci`, so the lock file must be committed with it); (2) `npx cap sync ios android` (adds the pod to the Podfile; Android needs nothing extra for Capacitor 7 beyond the sync, but check the `POST_NOTIFICATIONS` permission on Android 13+); (3) run the "iOS app" workflow and test on a device: hearting an event should prompt for notification permission and deliver at 9 am on the start day; (4) then remove the last assertion in `tests/appstore.test.mjs` that pins the plugin as absent, and add the notification purpose to the App Privacy answers (local notifications collect nothing). Only the plugin is missing; it was left out because it could not be built or tested here.

## Screenshots (generated)
`docs/app-store-screenshots/`, from the live site with Playwright (Chrome, device scale factor 3, light theme, geolocation faked to Pasadena or Anaheim, welcome card hidden): `*-1320x2868.png` (iPhone 6.9") and `*-1284x2778.png` (6.5"): 1-map-neighborhood (Pasadena), 2-pin-card (Anaheim), 3-places-list, 4-filters, 5-favorites-route, 6-home-photos (a professional installer's listing, so no private home address is shown). Re-take them before submitting if the live data has changed. The blue dot is the faked location. Android 1080x1920 shots are not generated.
