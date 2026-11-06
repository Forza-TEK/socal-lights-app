#!/usr/bin/env bash
# Asks the site how close it is to Cloudflare's free-plan limits (POST /api/usage-check, read-only) and keeps ONE GitHub issue in step:
#   level warning (90%) or limit (100%, or a quota error logged in the last 2 hours): open the issue, or comment on it (at most every 6 hours);
#   level ok or watch (under 90%): close the issue with a comment.
# Needs ALERT_CRON_KEY (the same repository secret as the digest) and GH_TOKEN / GH_REPO. If the check itself fails the script exits 1 and leaves the issue alone.
set -u
T="Cloudflare free-plan limit reached or near"
URL="https://socal-lights.pages.dev/api/usage-check"
if [ -z "${ALERT_CRON_KEY:-}" ]; then echo "ALERT_CRON_KEY is not set in the repository secrets"; exit 1; fi
out=$(curl -sS -m 40 -X POST "$URL" -H "x-alert-key: $ALERT_CRON_KEY") || { echo "::error::usage check unreachable"; exit 1; }
level=$(echo "$out" | jq -r '.level // empty' 2>/dev/null)
case "$level" in ok|watch|warning|limit) ;; *) echo "::error::usage check answered something unexpected: $(echo "$out" | head -c 200)"; exit 1;; esac
echo "level: $level"; echo "$out" | jq -r '.lines[]?' 2>/dev/null
N=$(gh issue list --state open --search "\"$T\" in:title" --json number -q '.[0].number' || true)
lines=$(echo "$out" | jq -r '(.lines // []) | map("- " + .) | join("\n")')
hit=$(echo "$out" | jq -r 'if (.lastLimitAt // "") != "" then "A quota error was logged by the site at " + .lastLimitAt + " UTC." else "" end')
run="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
body="Cloudflare free-plan usage is at level **$level** ($(date -u +%FT%TZ)).

$lines

$hit

Open Admin > Usage for the 7-day trend. What to do: docs/runbooks/cloudflare-limits.md. Check: $run. This issue closes itself when every metric is back under 90%."
case "$level" in
  warning|limit)
    if [ -z "$N" ]; then gh issue create --title "$T" --body "$body"
    else
      last=$(gh issue view "$N" --json updatedAt -q .updatedAt)
      if [ $(( $(date -u +%s) - $(date -u -d "$last" +%s) )) -gt 21600 ]; then gh issue comment "$N" --body "$body"; else echo "issue #$N already updated in the last 6 hours"; fi
    fi;;
  *)
    for n in $N; do gh issue close "$n" --reason completed --comment "Back under 90% at $(date -u +%FT%TZ) (level: $level)."; done;;
esac
