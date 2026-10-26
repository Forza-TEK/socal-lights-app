-- CI test only: this file must never reach main
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES
('ci-test-bad-county','CI test: wrong county','Kern','Anaheim','tree','2026-12-05','2026-12-05','expected',1,'Free','6 PM, check site',33.8366,-117.9143,'ok','https://example.com','christmas','V','440 S Anaheim Blvd, Anaheim, CA 92805'),
('ci-test-dead-link','CI test: dead link','Orange','Anaheim','tree','2026-12-05','2026-12-05','expected',1,'Free','6 PM, check site',33.8366,-117.9143,'ok','https://www.solvangjulefest.com/','christmas','V','441 S Anaheim Blvd, Anaheim, CA 92805');
