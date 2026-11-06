#!/usr/bin/env bash
# Dead-man's switch, GitHub side. Asks the site which scheduled jobs have gone quiet (GET /api/heartbeat, read-only) and keeps ONE issue in step:
#   some job stale: open "Scheduled job stopped reporting" (or comment at most every 12 hours); none: close it.
# Catch-up: if the nightly backup is stale and no backup run was started in the last 3 hours, start one (workflow_dispatch; needs `actions: write`).
# Needs ALERT_CRON_KEY, GH_TOKEN and GH_REPO. Called by usage-check.yml and submission-digest.yml, the two workflows that run most often.
# If the site cannot be reached the script exits 1 and leaves the issue alone (the uptime check and the external monitor cover that case).
set -u
T="Scheduled job stopped reporting"
if [ -z "${ALERT_CRON_KEY:-}" ]; then echo "ALERT_CRON_KEY is not set in the repository secrets"; exit 1; fi
out=$(curl -sS -m 30 "https://socal-lights.pages.dev/api/heartbeat" -H "x-alert-key: $ALERT_CRON_KEY") || { echo "::error::heartbeat endpoint unreachable"; exit 1; }
echo "$out" | jq -e '.jobs' >/dev/null 2>&1 || { echo "::error::heartbeat endpoint answered something unexpected: $(echo "$out" | head -c 200)"; exit 1; }
lines=$(echo "$out" | jq -r '.jobs[] | select(.stale) | "- " + .line')
echo "${lines:-no stale jobs}"
N=$(gh issue list --state open --search "\"$T\" in:title" --json number -q '.[0].number' || true)
run="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
body="These scheduled jobs have not reported in for longer than expected ($(date -u +%FT%TZ)). GitHub runs scheduled workflows late or skips them; a stopped job can also mean a broken workflow or secret.

$lines

What to do: GitHub > Actions > pick the workflow > Run workflow, then check it reports in (Admin home shows a red banner while a job is stale). Details: docs/runbooks/monitoring.md. Check: $run. This issue closes itself when every job has reported."
if [ -n "$lines" ]; then
  if [ -z "$N" ]; then gh issue create --title "$T" --body "$body"
  else
    last=$(gh issue view "$N" --json updatedAt -q .updatedAt)
    if [ $(( $(date -u +%s) - $(date -u -d "$last" +%s) )) -gt 43200 ]; then gh issue comment "$N" --body "$body"; else echo "issue #$N already updated in the last 12 hours"; fi
  fi
else
  for n in $N; do gh issue close "$n" --reason completed --comment "Every scheduled job has reported in ($(date -u +%FT%TZ))."; done
fi
# Catch-up for the nightly backup
if echo "$out" | jq -e '.jobs[] | select(.job == "backup" and .stale)' >/dev/null 2>&1; then
  recent=$(gh run list --workflow backup.yml --limit 1 --json createdAt -q '.[0].createdAt' || true)
  if [ -z "$recent" ] || [ $(( $(date -u +%s) - $(date -u -d "$recent" +%s) )) -gt 10800 ]; then
    echo "The backup has not reported for over 30 hours: starting it now."
    gh workflow run backup.yml || echo "::warning::could not start the backup workflow (needs actions: write)"
  else echo "a backup run was started in the last 3 hours; not starting another"; fi
fi
exit 0
