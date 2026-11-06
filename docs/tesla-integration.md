# Sending Route these to a Tesla: the account option (exploration)

Goal: tap Send to Tesla on a route and have the stops appear in the car's navigation, without sharing each stop by hand.

## What Tesla offers (Fleet API, checked November 2026)
- `navigation_gps_request`: send coordinates to the car's navigation. It has an `order` setting for the sequence when several stops are sent.
- `navigation_waypoints_request`: send a list of waypoints.
- Every command needs the app's **virtual key** installed on the car. Unsigned commands are rejected; Tesla's open-source Vehicle Command Proxy signs them (not needed for pre-2021 S/X and most business vehicles). A 2024 Model 3 needs the key and signed commands.
- Cost: pay per use, about $0.001 per command (their example: 1,211 commands = $1.21), $10 monthly discount for small apps, billing limit starts at $0 and is raised after adding a payment method. Limits: 30 device commands per minute per account.
- Sources: developer.tesla.com Fleet API docs (vehicle commands; billing and limits).
- Not confirmed: exact request fields for the two navigation commands, and whether stops arrive as one multi-stop trip on a 2024 Model 3 (to be tested on the owner's car).

## What we would build
1. Register a Tesla developer app for socallights.app; host the public key at `/.well-known/appspecific/com.tesla.3p.public-key.pem`; partner registration call.
2. "Connect your Tesla" in the profile: Tesla OAuth, store refresh tokens encrypted (D1), one row per user and vehicle.
3. A small signing proxy (Vehicle Command Proxy) on a server we run. Cloudflare Pages Functions cannot run the Go proxy, so it needs a tiny host (a container/VM) or a Worker port of the signing protocol.
4. The owner/driver adds the app's virtual key to the car once (a link opens the Tesla app; confirm with the key card or phone in the car).
5. On the route sheet: "Send to Tesla" sends the route (up to 9 stops) with `navigation_gps_request` in order, then the same for the next route when the first is done.
6. Privacy policy, terms and the outside-hosts list (a test enforces it) updated: Tesla receives the stops, we store tokens.

## Effort and risks
- About 2 to 3 weeks including a test on the owner's Model 3. Ongoing: token refresh, proxy hosting, Tesla app review/partner terms.
- Friction: each driver must connect an account and add a virtual key. Many users will prefer the share sheet.
- Decide before building: free or paid feature, and whether to launch only after "Send to car" (share sheet) shows demand.
