-- Organizer-collected sponsors (owner decision 2026-11-07). The site is not a party to sponsor money; these columns let the organizer record a paid (or in-kind) sponsor.
-- Rules: functions/_lib/sponsors.js. Add-only. Rows that exist already become basis 'legacy' and keep showing as before.
--   contact_name, phone, email : the sponsor's contact (personal / business data; never public; removed on account deletion and 24 months after the contest ends)
--   amount_cents               : optional, what the sponsor paid the organizer
--   basis                      : '' (not confirmed) | 'paid' | 'in_kind' | 'legacy'
--   paid_date, paid_method     : when and how the organizer received the money (free text method)
--   in_kind_note               : what was donated in kind
--   receipt, receipt_name      : PRIVATE R2 key (sponsor-receipt/<contest id>/<sponsor id>.<ext>) and the original file name; never in any public listing
--   show_public, permission    : "show on the contest page" and "I have the sponsor's permission to list their name and logo"
--   hidden_by_admin            : Admin hid it (support and abuse review)
ALTER TABLE contest_sponsors ADD COLUMN contact_name TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN amount_cents INTEGER;
ALTER TABLE contest_sponsors ADD COLUMN basis TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE contest_sponsors ADD COLUMN paid_date TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN paid_method TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN in_kind_note TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN receipt TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN receipt_name TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN show_public INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contest_sponsors ADD COLUMN permission INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contest_sponsors ADD COLUMN hidden_by_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contest_sponsors ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

-- Sponsor self-service (owner decision 2026-11-07, safer path: no money moves through the site).
--   contests.sponsor_pay_url / sponsor_pay_text : the organizer's own payment link (https only) and/or plain-text instructions, shown to sponsors on /s/<token>. The site never charges.
--   contests.sponsor_levels                     : JSON [{label, cents}] up to 3 levels the organizer defines (display only)
--   contests.sponsor_token / sponsor_link_on    : the unlisted, unguessable invite link /s/<token> and whether it is on; sponsor_admin_off = Admin switched it off; sponsor_pay_hidden = Admin hid the payment text
--   contest_sponsors.status                     : submitted (waiting for the organizer) | approved | declined. Rows made by the organizer are approved. Only approved rows can show.
--   contest_sponsors.source / message / level_label / decline_note : who made the row, the sponsor's message, the level chosen, the organizer's short note on a decline
ALTER TABLE contests ADD COLUMN sponsor_pay_url TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN sponsor_pay_text TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN sponsor_levels TEXT NOT NULL DEFAULT '[]';
ALTER TABLE contests ADD COLUMN sponsor_token TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN sponsor_link_on INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contests ADD COLUMN sponsor_admin_off INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contests ADD COLUMN sponsor_pay_hidden INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contests_sponsor_token ON contests(sponsor_token);
ALTER TABLE contest_sponsors ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE contest_sponsors ADD COLUMN source TEXT NOT NULL DEFAULT 'organizer';
ALTER TABLE contest_sponsors ADD COLUMN message TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN level_label TEXT NOT NULL DEFAULT '';
ALTER TABLE contest_sponsors ADD COLUMN decline_note TEXT NOT NULL DEFAULT '';
