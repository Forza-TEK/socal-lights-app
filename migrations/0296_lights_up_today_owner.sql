-- Lights Up Today (installer profile "lights-up-today"): assign the profile to info@lightsuptoday.com so they can sign in and edit it (owner request, 2026-11-25).
-- The profile page /installer/lights-up-today/manage opens for the signed-in account with this email. Guarded: only while nobody owns the profile yet, so it never replaces a claim made in the meantime.
UPDATE installers SET owner_email = 'info@lightsuptoday.com' WHERE id = '10ce592ace0ba1ef' AND owner_email = '';
