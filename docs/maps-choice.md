# Which maps app opens (Directions and Route these)

- Apps offered: Apple Maps, Google Maps, Waze (`public/maps.js` is the one place that builds the links).
- On a phone, the first tap on a Directions / route button with no saved choice shows our own pop-up ("Open directions in…") with "Always use this one" ticked. The answer is remembered in the browser (`localStorage` key `socal-maps`). Later taps open straight away. "Opens in <app> · Change" (route sheet, Favorites, place detail) asks again. Desktop opens Google Maps (or the saved choice) with no pop-up.
- A web page cannot use the phone's own "Open with" chooser for map links, and cannot read or change the phone's default:
  - Android: only a `geo:` link triggers the system chooser, and it carries one destination, not a multi-stop route. Users can change the phone's own choice in Settings > Apps > (the maps app) > Open by default / Clear defaults.
  - iOS: there is no maps chooser for web links. (iOS 18.2+ has Settings > Apps > Default Apps, but a navigation default is limited to some regions.)
- Waze takes one destination at a time, so a route opens the first stop in Waze and each next stop is opened with its Directions button. The sheet says so.
- "Send to car" on each stop opens the phone's share sheet with a place link; the Tesla app and car apps accept a shared place. One stop at a time.
