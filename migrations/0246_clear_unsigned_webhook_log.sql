-- Remove the one stale "no stripe-signature header" entry (a non-Stripe request, now no longer logged) so the Admin errors tile starts clean.
DELETE FROM ops_log WHERE kind = 'webhook' AND detail LIKE '%no stripe-signature header%';
