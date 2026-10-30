# SoCal Lights: App Store plan

The native apps (`app/`) are thin Capacitor wrappers that load https://socallights.app, so every site update reaches the apps immediately. They identify themselves with the browser string `SoCalLightsApp/1.0`; the site uses that to leave out tipping and paid Featured placements inside the apps (Apple and Google want in-app purchase for digital goods).

Bundle / package id: `app.socallights.lights` (change in `app/capacitor.config.json` before the first build if you want a different one; it cannot change after publishing).

## What is done
- `public/privacy.html` — privacy policy (live at https://socallights.app/privacy). Use this URL in every store listing.
- `app/` — Capacitor project with iOS and Android platforms generated, icons installed, location permission text and Android permissions set.
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
**Promotional text:** Find Halloween haunts, Christmas lights, tree lightings and neighbor-decorated homes across Southern California. Free, no sign-up.
**Short description (Google, 80 chars):** Halloween, Christmas and seasonal events and home displays across SoCal.
**Full description:**
SoCal Lights puts holiday and seasonal fun across Southern California on one map.

• Places: events, parks, shows, markets and real neighbor-decorated homes in one list and one map
• Tap a dot for hours, price and photos, or swipe through a home's photos
• Heart places to save them, then see your night in driving order
• Open the route in Apple Maps or Google Maps
• Filter by tonight, this Saturday, free, county, city or type
• Seasons: Halloween, Thanksgiving & Christmas, New Year, Spring and Summer
• Add your event or showcase your house, free

Free, no ads, no account needed.
**Keywords (iOS, 100 chars):** christmas lights,halloween,haunted house,pumpkin patch,tree lighting,los angeles,orange county,san diego,holiday events
**Category:** Travel (secondary: Lifestyle). **Age rating:** 4+ (no objectionable content; Halloween events are family-oriented).
**Support URL:** https://socallights.app  **Marketing URL:** https://socallights.app  **Privacy policy:** https://socallights.app/privacy  **Contact:** info@socallights.app

## Privacy questionnaires
- **Apple "App Privacy":** Data collected and linked to you: Contact info (email address, only when you submit an event or house), User content (event/house details and photos you submit). Used for: app functionality. No tracking. Location: used on device only, not collected.
- **Google "Data safety":** Location: approximate/precise, not collected or shared (processed on device). Personal info (email): collected only when submitting a form, not shared, can request deletion by email. Photos: collected only when submitted, shown publicly. Data encrypted in transit: yes. Deletion: by emailing info@socallights.app.

## Screenshots to capture (use the live site in each store's required sizes)
iPhone 6.9" (1320x2868) and 6.5" (1284x2778): 1) map zoomed on a neighborhood, 2) a tapped pin card, 3) Places list, 4) Filters panel, 5) My night route, 6) a home display with photos. Android phone: same six at 1080x1920. A 1024x500 feature graphic for Google Play can reuse the Reel's intro frame.

## App review notes (paste into App Store Connect)
"SoCal Lights is a free map of seasonal events and neighbor-decorated homes in Southern California. No login is required. Location is optional and used only on the device. The app loads our own website content from socallights.app so that event data stays current. Tapping Add opens a form to submit an event or a house, which is reviewed before publishing. No digital goods are sold in the app."

## Risk to watch (Apple 4.2 "minimum functionality")
A wrapper around a website can be rejected. Mitigation already in the site: it is a full interactive map app (not a brochure), saves places, plans routes and works offline-gracefully. If rejected, add native features: a native share sheet (`@capacitor/share` is already installed) and local reminder notifications for saved events.


## Cheapest path (decided 2026-10-30)
- **Apple:** individual Developer Program account, $99/yr (same price as a company account but no D-U-N-S wait).
- **No Mac rental needed:** the workflow `.github/workflows/ios-app.yml` builds on a GitHub Mac and uploads to App Store Connect. Needs four repository secrets (GitHub > Settings > Secrets and variables > Actions): `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the contents of the API key file from App Store Connect > Users and Access > Integrations > Team Keys, role "App Manager"). Create the app record (bundle id `app.socallights.lights`) in App Store Connect first.
- **Google Play:** $25 once. Run "Android upload key (one time)", download its artifact, add secrets `ANDROID_KEYSTORE_B64` (contents of upload.jks.b64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, then run "Android app" and upload the .aab in Play Console (opt in to Play App Signing).
- **Microsoft Store:** $19 individual, once. Package with pwabuilder.com and upload in Partner Center.
