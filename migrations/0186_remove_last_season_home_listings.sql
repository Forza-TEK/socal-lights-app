-- Remove home listings that came from LAST season's (2025 and older) winner and entry lists.
-- Those lists show who won or entered last year; they say nothing about which homes are lit this season, and they were shown as 'Expected' for 2026.
-- The rows stay in the earlier migrations (git history); this only removes them from the live database. Homes people post themselves are not touched.
-- Deleting an id that is not there is harmless, so this file can be run again. A home that has a Featured order (paid placement) is never deleted by this file.

-- cityofchino.org: 4 homes
DELETE FROM events WHERE id IN ('contest-chino-3754-carlos-ct','contest-chino-6023-chino-ave','contest-chino-6037-chino-ave','contest-chino-6574-pinon-ct') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- missionviejo.preview.macaronikid.com: 8 homes
DELETE FROM events WHERE id IN ('contest-11-shepherd-court-ladera','contest-12-winfield-drive-ladera','contest-2-sea-grape-road-ladera','contest-3-platinum-circle-ladera','contest-3-plum-street-ladera','contest-36-bramford-street-ladera','contest-59-flintridge-avenue-ladera','contest-73-flintridge-avenue-ladera') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- mvactivities.com: 46 homes
DELETE FROM events WHERE id IN ('cg8-mv-21322-bishop','cg8-mv-21852-contento','cg8-mv-21902-cosala','cg8-mv-21951-camargo','cg8-mv-21961-salcedo','cg8-mv-22101-cosala','cg8-mv-22166-cosala','cg8-mv-22231-platino','cg8-mv-22661-labrusca','cg8-mv-22691-via-tercero','cg8-mv-22736-via-santa-rosa','cg8-mv-23091-tiagua','cg8-mv-23405-via-ronda','cg8-mv-23722-lagarto','cg8-mv-23796-avenida-columbia','cg8-mv-23864-sycamore-dr','cg8-mv-23981-bough-ave','cg8-mv-24391-via-santa-clara','cg8-mv-24952-el-cortijo-ln','cg8-mv-25512-gloriosa-dr','cg8-mv-25692-minoa-dr','cg8-mv-25841-jamon-lane','cg8-mv-26111-camino-largo','cg8-mv-26141-buscador','cg8-mv-26522-saddleback-dr','cg8-mv-26695-manzanares','cg8-mv-26735-manzanares','cg8-mv-27041-pinjara-circle','cg8-mv-27322-via-burgos','cg8-mv-27421-via-amistoso','cg8-mv-27815-tirante','cg8-mv-28315-la-caleta','cg8-mv-28325-driza','cg8-mv-29-altezza-dr','cg8-mv-32-rosings','cg8-mv-4-amato','contest-21906-cosala-mission','contest-21921-cosala-mission','contest-23912-bough-avenue-mission','contest-25213-terreno-drive-mission','contest-25235-arion-way-mission','contest-25392-helena-circle-mission','contest-26001-via-del-norte-mission','contest-26526-via-lara-mission','contest-26892-preciados-mission','contest-27146-ayamonte-mission') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- storymaps.arcgis.com: 18 homes
DELETE FROM events WHERE id IN ('contest-glendora-1062-east-renwick-road','contest-glendora-1128-flamingo-street','contest-glendora-114-south-oakhart-drive','contest-glendora-1143-indian-springs-dri','contest-glendora-1156-hidden-springs-lan','contest-glendora-121-south-country-club','contest-glendora-121-south-san-jose-driv','contest-glendora-1251-south-concord-lane','contest-glendora-1312-bradley-court','contest-glendora-307-north-hacienda-aven','contest-glendora-408-east-linfield-stree','contest-glendora-503-east-carroll-avenue','contest-glendora-646-south-minnesota-ave','contest-glendora-708-west-laxford-street','contest-glendora-744-east-northridge-ave','contest-glendora-756-east-virginia-avenu','contest-glendora-761-west-foothill-boule','contest-glendora-771-east-virginia-avenu') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.cityofmontclair.org: 3 homes
DELETE FROM events WHERE id IN ('contest-montclair-4910-howard-st','contest-montclair-9917-pradera-ave','contest-montclair-9932-geneva-ave') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.coronadonewsca.com: 3 homes
DELETE FROM events WHERE id IN ('cg11-coronado-170-alder','cg11-coronado-708-a-ave','cg11-coronado-740-balboa') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.independent.com: 7 homes
DELETE FROM events WHERE id IN ('contest-lompoc-1004-rock-rose-lane','contest-lompoc-1100-archer-street','contest-lompoc-1200-alden-court','contest-lompoc-1424-michael-court','contest-lompoc-421-south-hawthorne-stree','contest-lompoc-621-north-10th-street','contest-lompoc-816-canfield-avenue') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.jarpd.org: 5 homes
DELETE FROM events WHERE id IN ('cg14-jv-5209-morro-ct','cg14-jv-6130-camino-real','cg14-jv-6839-reflection-way','cg14-jv-7967-linares-ave','cg14-jv-8514-running-gait-ln') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.sceneoc.com: 25 homes
DELETE FROM events WHERE id IN ('contest-1-songbird-lane-aliso','contest-2-plumeria-lane-aliso','contest-20-calle-vaqueta-rancho','contest-23961-eider-court-laguna','contest-24021-ironhead-lane-laguna','contest-24541-alta-vista-dr-dana','contest-24741-kings-road-laguna','contest-25292-bowsprit-dr-dana','contest-26282-via-california-dana','contest-26902-avenida-las-palmas-dana','contest-27-bower-lane-ladera','contest-27408-capistrano-bluffs-rd-dana','contest-28891-via-pasatiempo-laguna','contest-29491-pointe-royale-laguna','contest-30-iron-horse-trail-ladera','contest-32762-mediterranean-dr-dana','contest-33142-acapulco-dr-dana','contest-33142-mesa-vista-dr-dana','contest-33282-golden-lantern-st-dana','contest-34512-via-espinoza-dana','contest-37-gazania-way-ladera','contest-4-candlewind-court-ladera','contest-4-lompoc-court-rancho','contest-6-nantucket-lane-aliso','contest-6-pickering-circle-ladera') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);

-- www.yorbalindaca.gov: 9 homes
DELETE FROM events WHERE id IN ('contest-17081-aries-drive-yorba','contest-17705-trail-view-place-yorba','contest-18162-buena-vista-avenue-yorba','contest-18181-magnolia-way-yorba','contest-4201-sand-rock-circle-yorba','contest-5445-brentwood-place-yorba','contest-5512-raintree-street-yorba','contest-5590-camino-poniente-yorba','contest-6171-hickory-drive-yorba') AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);
