# Contest voting: standards research and what we should change

Research done 2026-10-30. Not legal advice; have an attorney read the official rules before running prizes.

## What the sources say
- **Contest vs sweepstakes.** A lottery has prize + chance + consideration. Skill contests may charge entry; popularity votes are a gray area in some states. So: entry is free, votes are never sold, rules are published before entry. (Gleam, Sweeppea, Thompson Coburn, Olshan, Klein Moynihan, Venable.)
- **Official rules** should state eligibility, how winners are chosen, prize terms (non-transferable), sponsor authority and right to modify, and be readable before entry.
- **Apple** requires contests to be sponsored by the developer and in-app rules to say Apple is not a sponsor (matters if contests appear in the wrapped apps).
- **Fraud controls** (ShortStack, Easypromos, Promosis): verified-email login is strongest; CAPTCHA; IP blocking gives false positives; separate entry and voting phases; monitor during voting; hold disqualifications until voting ends; ban vote buying in the rules.
- **Voting methods:** plurality, approval, score/range, ranked-choice, STAR. Plurality is simplest; sources comparing methods are advocacy-biased.
- **Judges:** trimmed mean (drop high and low, e.g. FEI HiLo Drop), standardizing judge leniency, recusal for conflicts of interest.
- **Home-lighting criteria** commonly used: first impression, creativity, theme, craftsmanship, quantity/variety. Usually judged curbside, one category win per home, People's Choice beside judges' awards.

## Our voting today
Strengths: verified accounts, DB-enforced one vote per category (`UNIQUE(contest_id,user_id,category)`), own-home block, separate People's and Judges' awards, entry and voting phases, optional hidden counts.

Gaps:
1. A computed "overall" (sum of votes across categories) double-counts and has no standard basis.
2. Visible counts invite bandwagon voting.
3. No disposable-email blocking, velocity alerts, void-vote or audit tooling.
4. Judge scoring is a plain average: no rubric, trimmed mean, completeness check or conflict declaration.
5. No tie-break rule.
6. The "I agree to the rules" box has no rules text behind it.
7. No frozen results snapshot (the sample now has one).

## Recommended fixes
- Make "Best Overall" an ordinary category, or define overall by points; optional one-win-per-home.
- Default vote counts to hidden until announce.
- Judge rubric, trimmed mean at 5+ judges, all-homes-scored requirement, conflict declaration.
- Configurable tie-break: judges' score, then co-winners.
- Fraud controls and an organizer review/void tool.
- Official-rules template with required acceptance.
- Freeze results at announce and allow export.

## Address autocomplete
Smarty has no permanent free tier per search results (42-day trial, 1,000 lookups, then about $20/month); unverified, smarty.com was unreachable from the build environment. Keep lookups low (debounce, 5+ characters, server proxy) and verify the final address with the Census geocoder. Decision pending.
