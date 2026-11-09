-- Ads link: the link to each ad in Meta (Ads Manager, preview or permalink), as last reported by Grok. Add-only. Validated on write (https, Facebook or Instagram hosts only, no tokens).
ALTER TABLE ads_reports ADD COLUMN ad_url TEXT NOT NULL DEFAULT '';
