#!/usr/bin/env node
// Reads one public page as SoCalLightsBot: honest user-agent, robots.txt first, and signed with Web Bot Auth when the private key is in the environment (BOT_SIGNING_KEY).
//   node scripts/signed-fetch.mjs <url> [--head] [--max 20000]
// For the sweeps: use this (instead of curl or a fetch tool) for a page that turned the plain bot away (403) ONLY once Cloudflare has verified the bot (docs/verified-bot.md);
// it is the same identity as before, now proven. It never retries, never changes the user-agent and never tries to get past a challenge page: a 403 or a challenge is reported as is.
import { botFetch } from "../functions/_lib/webbotauth.js";
import { robotsCheck } from "../functions/_lib/robots.js";

const args = process.argv.slice(2), url = args.find((a) => /^https?:\/\//.test(a)), max = Number(args[args.indexOf("--max") + 1]) || 20000;
if (!url) { console.error("Usage: node scripts/signed-fetch.mjs <url> [--head] [--max N]"); process.exit(2); }
const f = botFetch({ BOT_SIGNING_KEY: process.env.BOT_SIGNING_KEY }, { robots: robotsCheck });
const r = await f(url, { method: args.includes("--head") ? "HEAD" : "GET", redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app/bot)", accept: "text/html,*/*" }, signal: AbortSignal.timeout(20000) });
if (r.headers.get("x-robots-blocked")) { console.log(`ROBOTS: ${url} is disallowed for SoCalLightsBot by its robots.txt. Not fetched. Do not work around it; use docs/browser-pass.md.`); process.exit(3); }
console.log(`HTTP ${r.status} ${r.headers.get("content-type") || ""}${process.env.BOT_SIGNING_KEY ? " (signed)" : " (not signed: BOT_SIGNING_KEY is not set)"}${/challenge/i.test(r.headers.get("cf-mitigated") || "") ? " (the site answered with a bot challenge: do not retry or work around it)" : ""}`);
if (!args.includes("--head")) console.log((await r.text()).slice(0, max));
