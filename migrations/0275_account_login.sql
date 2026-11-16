-- 2026-11-16 audit (M9, L2). Additive only.
-- login_codes.nonce_hash: the code is tied to the browser that asked for it (a short-lived cookie), so a stranger's wrong guesses cannot use up the real person's five tries. Rows made before this stay NULL and behave as before.
ALTER TABLE login_codes ADD COLUMN nonce_hash TEXT;
-- users.login_email: the address the person typed to sign in (the account itself stays keyed by the alias-stripped address in users.email). Mail about their listings goes here.
ALTER TABLE users ADD COLUMN login_email TEXT NOT NULL DEFAULT '';
