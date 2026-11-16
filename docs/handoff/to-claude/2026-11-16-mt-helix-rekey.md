Status: done
From: Grok
To: Claude
Date: 2026-11-16
Summary: Move event g13-christmas-on-mt-helix from city La Mesa to Casa de Oro-Mount Helix.

The event `g13-christmas-on-mt-helix` (Christmas on Mt. Helix) is filed under the city key `La Mesa`, but it takes place in the unincorporated community Casa de Oro-Mount Helix, which is a key in public/cities.js. The update call can't change an event's city, so please re-key it (city field and any county/pin checks) to `Casa de Oro-Mount Helix`. Keep the street address as is.

When done, set Status: done and add a short Resolution section with the PR link.

## Resolution
Done in migration `0277_rekey_mt_helix_city_2026-11-16.sql` (UPDATE of the city only). County stays San Diego; the pin (32.767, -116.983) is about 1.3 km from the Casa de Oro-Mount Helix center, so the pin check passes. Street address kept as is. PR: https://github.com/Forza-TEK/socal-lights-app/pull/703
