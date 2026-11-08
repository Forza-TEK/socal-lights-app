#!/usr/bin/env node
// Read-only Pages deploy-stall check for .github/workflows/deploy-watch.yml. Same rule as the admin digest (functions/_lib/deploys.js).
//   env: CLOUDFLARE_API_TOKEN (needs Account > Cloudflare Pages > Read), CLOUDFLARE_ACCOUNT_ID, HEAD_SHA, HEAD_AT (ISO time of that commit; optional)
// Exit 0 = healthy, or "not configured" / "unknown" (a notice, never a failure: the token may simply lack the permission yet). Exit 1 = stalled.
// Prints a one-line verdict and, when stalled, the problems. Writes `state=` to $GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";
import { checkDeploys } from "../functions/_lib/deploys.js";

const raw = process.env.CLOUDFLARE_API_TOKEN || "";
const token = (raw.match(/[A-Za-z0-9_-]{30,}/) || [""])[0]; // tolerate a pasted secret with extra lines or spaces
const head = process.env.HEAD_SHA ? { sha: process.env.HEAD_SHA, at: process.env.HEAD_AT || null } : null;
const r = await checkDeploys({ token, accountId: process.env.CLOUDFLARE_ACCOUNT_ID, head });
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `state=${r.state}\n`);
if (r.state === "ok") console.log(`Deploys look healthy (${r.checked} recent deployments checked).`);
else if (r.state === "stalled") { for (const p of r.problems) console.log(`::error::${p.text}`); }
else console.log(`::notice::Deploy check ${r.state}: ${r.why}`);
process.exit(r.state === "stalled" ? 1 : 0);
