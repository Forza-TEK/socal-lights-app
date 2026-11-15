# City coverage checklist

The deep search splits Southern California into **21 small groups of cities**. Each group is searched by
its own helper, so every city gets real attention (a group of ~10–17 cities is what found 37 missing
events in the Pomona Valley; groups of 40–60 cities skimmed past small towns).

For **every city** in its group, a helper checks, one by one:
- the city's parks & recreation / community services **events calendar** (and its social posts)
- the downtown / village association and chamber of commerce
- community centers, libraries, malls and shopping centers, churches only for large public events
- local farms, zoos, museums, theaters, colleges, HOA/master-planned community events that are open to the public
- local news and family sites (Patch, local papers, mommypoppins, macaronikid, enjoyorangecounty, lajollamom, Time Out, LAist)
- **wineries, breweries, taprooms and distilleries** (venue pass, see [city-sweep.md](city-sweep.md): holiday lights, tree lightings, Santa, markets, New Year's Eve, Halloween; searches like "<city> winery holiday", "<city> brewery tree lighting")
- **hotels and resorts** (hotel and resort pass, see [city-sweep.md](city-sweep.md): tree lightings, lights-on nights, Santa, markets, menorah lightings, New Year's Eve; Ritz-Carlton, Four Seasons, Montage, Terranea, Pelican Hill, Hotel del Coronado and others; searches like "<city> hotel tree lighting", "<city> resort holiday lights")
- **home decorating contests** (Halloween, Christmas, holiday): city, HOA, chamber, newspaper, radio and service-club contests that publish entered or winning homes with addresses (see the contest section in [city-sweep.md](city-sweep.md))

A helper always reports the cities where it found nothing, so gaps are visible instead of silent.

Beyond cities, the sweeps also work from a **venue watchlist** (`docs/watchlist.json`) and a list of **season categories** with working targets, and every run starts with `node scripts/coverage-gaps.mjs --group <N>` (see "Gap report, season categories and the venue watchlist" in [city-sweep.md](city-sweep.md)). The groups' thin days follow the gap report's ranking, not fixed groups.

## Los Angeles County
1. **Central LA & Westside** — Los Angeles (Downtown, Hollywood, Silver Lake/Echo Park, Eastside/Boyle Heights, Highland Park, Griffith Park, Westwood, Venice, Playa Vista, Westchester), Beverly Hills, West Hollywood, Culver City, Santa Monica, Malibu, Ladera Heights, Marina del Rey, Pepperdine University, View Park-Windsor Hills
2. **Valley & Verdugos** — Burbank, Glendale, La Cañada Flintridge, San Fernando, Encino, Sherman Oaks, Studio City, North Hollywood, Van Nuys, Woodland Hills, Northridge, Granada Hills, Porter Ranch, Chatsworth, Sylmar, Sunland-Tujunga, Calabasas, Agoura Hills, Westlake Village, Hidden Hills, La Crescenta-Montrose, Topanga
3. **West San Gabriel Valley** — Pasadena, Altadena, South Pasadena, San Marino, Arcadia, Monrovia, Sierra Madre, Bradbury, Duarte, Temple City, San Gabriel, Alhambra, Monterey Park, Rosemead, El Monte, South El Monte, Montebello, East Pasadena, East San Gabriel, Mayflower Village, North El Monte, San Pasqual, South Monrovia Island, South San Gabriel
4. **Pomona Valley & East SGV** — Azusa, Glendora, San Dimas, La Verne, Claremont, Pomona, Diamond Bar, Walnut, West Covina, Covina, Baldwin Park, Irwindale, Rowland Heights, Hacienda Heights, La Habra Heights, La Puente, City of Industry, Avocado Heights, Charter Oak, Citrus, South San Jose Hills, Valinda, Vincent, West Puente Valley
5. **South Bay** — Torrance, Redondo Beach, Hermosa Beach, Manhattan Beach, El Segundo, Palos Verdes Estates, Rancho Palos Verdes, Rolling Hills, Rolling Hills Estates, San Pedro, Wilmington, Carson, Gardena, Hawthorne, Inglewood, Lawndale, Lomita, Avalon (Catalina), Alondra Park, Del Aire, Lennox, West Athens, West Carson, West Rancho Dominguez, Westmont
6. **Long Beach & Gateway Cities** — Long Beach, Lakewood, Signal Hill, Downey, Norwalk, Whittier, La Mirada, Cerritos, Artesia, Bellflower, Paramount, Pico Rivera, Santa Fe Springs, South Gate, Lynwood, Compton, Huntington Park, Bell Gardens, Commerce, Cudahy, Maywood, Vernon, Hawaiian Gardens, East Los Angeles, East Rancho Dominguez, East Whittier, Florence-Graham, Rose Hills, Walnut Park, West Whittier-Los Nietos, Willowbrook
7. **North LA County** — Santa Clarita (Valencia, Newhall, Saugus, Canyon Country, Stevenson Ranch), Castaic, Acton, Lancaster, Palmdale, Agua Dulce, Desert View Highlands, Elizabeth Lake, Green Valley, Hasley Canyon, Lake Hughes, Lake Los Angeles, Leona Valley, Littlerock, Sun Village, Val Verde

## Orange County
8. **South OC** — Mission Viejo, Ladera Ranch, Rancho Mission Viejo, Aliso Viejo, Laguna Niguel, Laguna Hills, Laguna Woods, Lake Forest, Foothill Ranch, Rancho Santa Margarita, Coto de Caza, Trabuco Canyon, San Juan Capistrano, Dana Point, San Clemente, Laguna Beach, Las Flores, Modjeska, Silverado, Williams Canyon
9. **Central OC & Coast** — Irvine, Tustin, Costa Mesa, Newport Beach, Huntington Beach, Fountain Valley, Santa Ana, Orange, Villa Park, El Modena, Orange Park Acres
10. **North OC** — Anaheim, Fullerton, Brea, La Habra, Placentia, Yorba Linda, Buena Park, Cypress, La Palma, Los Alamitos, Rossmoor, Seal Beach, Garden Grove, Westminster, Stanton, Midway City

## San Diego County
11. **City of San Diego & Coronado** — Downtown/Gaslamp, Little Italy, Old Town, Balboa Park, Point Loma/Liberty Station, Mission Bay, Pacific Beach, La Jolla, North Park/Hillcrest, Barrio Logan, Clairemont, Mira Mesa, Rancho Bernardo, Carmel Valley, Coronado
12. **North County** — Carlsbad, Oceanside, Vista, San Marcos, Escondido, Encinitas, Solana Beach, Del Mar, Poway, Ramona, Julian, Valley Center, Fallbrook, Bonsall, Camp Pendleton Mainside, Camp Pendleton South, Del Dios, Elfin Forest, Fairbanks Ranch, Harmony Grove, Hidden Meadows, Lake San Marcos, Mount Laguna, Pala, Rainbow, Rancho Santa Fe, San Diego Country Estates
13. **East County & South Bay** — Santee, El Cajon, La Mesa, Lemon Grove, Lakeside, Alpine, Spring Valley, Chula Vista, National City, Imperial Beach, Bonita, Borrego Springs, Bostonia, Boulevard, Casa de Oro-Mount Helix, Crest, Descanso, Eucalyptus Hills, Granite Hills, Harbison Canyon, Jacumba, Jamul, La Presa, Pine Valley, Potrero, Rancho San Diego, Winter Gardens

## Riverside & San Bernardino counties
14. **Western Riverside County** — Riverside, Corona, Norco, Eastvale, Jurupa Valley, Moreno Valley, Perris, Menifee, Coronita, El Cerrito, El Sobrante, Good Hope, Green Acres, Home Gardens, Homeland, Lake Mathews, Lakeview, March ARB, Mead Valley, Nuevo, Romoland, Winchester, Woodcrest
15. **Southwest Riverside & the Pass** — Lake Elsinore, Wildomar, Murrieta, Temecula, Hemet, San Jacinto, Beaumont, Banning, Calimesa, Canyon Lake, Aguanga, Anza, Cabazon, East Hemet, French Valley, Idyllwild-Pine Cove, Lake Riverside, Lakeland Village, Meadowbrook, Mountain Center, Sage, Temescal Valley, Valle Vista, Warm Springs
16. **Coachella Valley** — Palm Springs, Cathedral City, Rancho Mirage, Palm Desert, Indian Wells, La Quinta, Indio, Coachella, Desert Hot Springs, Blythe (far east, along the Colorado River), Bermuda Dunes, Desert Center, Desert Edge, Desert Palms, Garnet, Indio Hills, Mecca, Mesa Verde, North Shore, Oasis, Ripley, Sky Valley, Thermal, Thousand Palms, Vista Santa Rosa, Whitewater
17. **San Bernardino Valley & West End** — San Bernardino, Redlands, Yucaipa, Loma Linda, Highland, Rialto, Fontana, Colton, Rancho Cucamonga, Upland, Ontario, Montclair, Chino, Chino Hills, Grand Terrace, Bloomington, Lytle Creek, San Antonio Heights
18. **High Desert & Mountains** — Victorville, Hesperia (including Oak Hills, Summit Valley, Mojave River Valley), Adelanto, Apple Valley, Oro Grande, Spring Valley Lake, Helendale, Phelan, Piñon Hills, Wrightwood, Lucerne Valley, Big Bear Lake, Lake Arrowhead, Crestline, Running Springs, Oak Glen, Barstow/Yermo, Twentynine Palms, Joshua Tree, Yucca Valley, Needles, Baker, Big Bear City, Big River, Bluewater, Fort Irwin, Homestead Valley, Lenwood, Morongo Valley, Mountain View Acres, Oak Hills, Searles Valley, Silver Lakes

## Ventura & Santa Barbara counties
19. **Ventura County** — Ventura, Oxnard, Port Hueneme, Camarillo, Thousand Oaks, Newbury Park, Simi Valley, Moorpark, Ojai, Santa Paula, Fillmore, Bell Canyon, Casa Conejo, Channel Islands Beach, El Rio, Lake Sherwood, Meiners Oaks, Mira Monte, Oak View, Santa Rosa Valley, Santa Susana, Saticoy, Somis
20. **Santa Barbara County** — Santa Barbara, Montecito, Goleta, Carpinteria, Solvang, Buellton, Los Olivos, Santa Ynez, Lompoc, Santa Maria, Orcutt, Guadalupe, Ballard, Casmalia, Cuyama, Eastern Goleta Valley, Garey, Isla Vista, Los Alamos, Mission Canyon, Mission Hills, New Cuyama, Sisquoc, Summerland, Toro Canyon, University of California-Santa Barbara, Vandenberg AFB, Vandenberg Village

## Region-wide
21. **Region-wide sources** — county-wide guides and roundups (OC Register, LA Times, San Diego Union-Tribune, Press-Enterprise, VC Star, Noozhawk, Time Out, Secret LA, LAist, mommypoppins, macaronikid editions, Visit [city] tourism sites), theme parks, regional chains (Mr. Jack O' Lanterns, Pumpkin Station, Big Wave Dave's, Mr. Bones), malls run by Westfield/Simon/Irvine Co./Caruso — to catch anything a city-by-city sweep missed.

## Coverage audit (snapshot 2026-10-27; the counts further down are regenerated)

All 210 incorporated cities in the seven counties (88 LA, 34 Orange, 18 San Diego, 28 Riverside, 24 San Bernardino, 10 Ventura, 8 Santa Barbara) were compared with this checklist.
The 13 that were missing are now in a group above: Bradbury, Cudahy, Hawaiian Gardens, La Habra Heights, Lomita, Maywood and Vernon (LA); Blythe and Canyon Lake (Riverside); Adelanto, Grand Terrace and Needles (San Bernardino).
Rolling Hills (the city, not Rolling Hills Estates) was still absent from group 5 and is listed there now.
Every census-designated place in the seven counties (the unincorporated places the Census Bureau names) is in a group above and in `public/cities.js`. The center is the Census internal point, rounded to 3 decimal places. El Modena and Orange Park Acres were designated after the 2024 gazetteer; their centers are the Wikipedia coordinates, rounded the same way.

<!-- coverage:start -->
### Priority cities (0–1 upcoming events on the map, 2026-11-11)
Generated by `node scripts/coverage-report.mjs --write-doc` from `/api/events` (1095 upcoming events, 272 city names in the groups above). Count = upcoming events whose city or address names the city. Sweeps should dig into these first, even if the rest of the group is already well covered. Few events may simply mean a quiet town, but each one still needs a real look. Do not edit this block by hand; re-run the script after each round of sweeps.

- **0 events (41):** Encino, Studio City, Northridge, Porter Ranch, Sunland-Tujunga, Calabasas, Westlake Village, Hidden Hills (group 2); Bradbury (group 3); Azusa, Rowland Heights, La Habra Heights (group 4); Artesia, Lynwood, Huntington Park, Bell Gardens, Cudahy, Maywood, Vernon, Hawaiian Gardens (group 6); Acton (group 7); Laguna Woods, Foothill Ranch, Coto de Caza, Trabuco Canyon (group 8); Pacific Beach, Barrio Logan, Clairemont, Mira Mesa, Rancho Bernardo, Carmel Valley (group 11); Spring Valley (group 13); Canyon Lake (group 15); Loma Linda (group 17); Oro Grande, Spring Valley Lake, Pinon Hills, Lucerne Valley, Needles (group 18); Port Hueneme (group 19); Guadalupe (group 20)
- **1 event (54):** West Hollywood, Culver City, Malibu (group 1); Granada Hills, Chatsworth, Agoura Hills (group 2); South Pasadena, Duarte, Temple City, South El Monte, Montebello (group 3); San Dimas, Diamond Bar, Irwindale, Hacienda Heights (group 4); Lawndale (group 5); Signal Hill, Norwalk, La Mirada, Bellflower, Paramount, Pico Rivera, Compton, Commerce (group 6); Castaic (group 7); Rancho Mission Viejo, Laguna Niguel (group 8); Placentia, Cypress, Los Alamitos, Garden Grove, Stanton (group 10); Little Italy (group 11); Valley Center, Fallbrook (group 12); National City, Imperial Beach, Borrego Springs (group 13); Eastvale (group 14); Banning (group 15); Indian Wells, Desert Hot Springs (group 16); Rialto, Montclair, Grand Terrace (group 17); Helendale, Crestline, Running Springs, Oak Glen (group 18); Santa Paula, Fillmore (group 19); Carpinteria, Santa Ynez, Orcutt (group 20)
<!-- coverage:end -->

The block above is generated; refresh it after each round of sweeps with `node scripts/coverage-report.mjs --write-doc` (reads the public `/api/events`, one anonymous request). The same run prints the confirmation counts that `docs/confirmation-plan.md` uses, so no number in these docs is typed by hand.
