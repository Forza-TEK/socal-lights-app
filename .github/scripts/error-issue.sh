#!/usr/bin/env bash
# Keeps ONE GitHub issue, "Site errors", in step with the live error log (GET /api/error-report, read-only), so the errors reach whoever fixes them without a screenshot.
#   errors in the last 24 hours: open the issue (or rewrite its text; editing sends no email); none: close it.
# Claude's hourly routine reads this issue, fixes real bugs and adds browser noise to the filters. Needs ALERT_CRON_KEY, GH_TOKEN and GH_REPO.
# If the site cannot be reached the script exits 1 and leaves the issue alone (the uptime check covers that case).
set -u
T="Site errors"
if [ -z "${ALERT_CRON_KEY:-}" ]; then echo "ALERT_CRON_KEY is not set in the repository secrets"; exit 1; fi
out=$(curl -sS -m 30 "https://socal-lights.pages.dev/api/error-report?hours=24" -H "x-alert-key: $ALERT_CRON_KEY") || { echo "::error::error-report endpoint unreachable"; exit 1; }
echo "$out" | jq -e '.errors' >/dev/null 2>&1 || { echo "::error::error-report answered something unexpected: $(echo "$out" | head -c 200)"; exit 1; }
total=$(echo "$out" | jq -r '.total')
lines=$(echo "$out" | jq -r '.errors[] | "- **" + .label + "** (" + .kind + "): " + (.n|tostring) + " in 24 h, last " + .last + " UTC" + ([.examples[] | "\n  - `" + . + "`"] | join(""))')
N=$(gh issue list --state open --search "\"$T\" in:title" --json number -q '.[0].number' || true)
run="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
body="The live site logged $total error(s) in the last 24 hours ($(date -u +%FT%TZ)):

$lines

Not counted: normal activity, notices the site sent you, and browser noise injected by the phone (iOS autofill, in-app browsers). Claude reads this issue every hour: a real bug gets a fix, noise gets added to the filter, and this issue closes when the log is quiet for 24 hours. Source: $run"
if [ "$total" -gt 0 ]; then
  if [ -z "$N" ]; then gh issue create --title "$T" --body "$body"; else gh issue edit "$N" --body "$body"; fi
else
  for n in $N; do gh issue close "$n" --reason completed --comment "No errors in the last 24 hours ($(date -u +%FT%TZ))."; done
fi
exit 0
