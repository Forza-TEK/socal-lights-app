// Builds docs/video-metadata.csv: one row per video and per version, with the title, description, hashtags, file names and
// caption file to paste into YouTube Studio, Instagram and Facebook. Usage: node scripts/tutorials/publish-kit.mjs
import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync("public/tutorials.json", "utf8"));
const TAGS = { find: "#ChristmasLights #SoCal #LightsNearMe", enter: "#ChristmasLights #HolidayContest #SoCal", vote: "#ChristmasLights #HolidayContest #Vote", run: "#HolidayContest #CommunityEvents #SoCal", sponsors: "#SmallBusiness #HolidayLights #SoCal", post: "#ChristmasLights #SoCal #HolidayDisplay" };
const q = (s) => `"${String(s ?? "").replaceAll('"', '""')}"`;
const rows = [["video_id", "group", "version", "platform", "title", "description", "hashtags", "video_file", "captions_file", "thumbnail_file", "length", "page_link"]];
const SITE = "https://socallights.app";
for (const g of d.groups) for (const v of g.videos) {
  if (!v.url) continue;
  const link = `${SITE}/tutorials#v-${v.id}`, tags = (TAGS[g.id] || "#SoCalLights") + " #SoCalLights";
  const desc = (cta) => `${v.desc}\n\n${cta}\nAll tutorials: ${SITE}/tutorials\nQuestions? info@socallights.app`;
  const file = (u) => u.replace(/^\//, "public/");
  rows.push([v.id, g.title, "computer (16:9, 2560x1440)", "YouTube (long video)", `${v.title} | SoCal Lights`, desc("Free to use on your phone or computer: " + SITE), tags, file(v.url), v.captions ? file(v.captions) : "", file(v.poster), v.length || "", link]);
  if (v.mobile && v.mobile.url) {
    const sec = (v.mobile.length || "0:0").split(":").reduce((a, b) => a * 60 + +b, 0);
    for (const p of ["YouTube Shorts", "Instagram Reels", "Facebook Reels"]) rows.push([v.id, g.title, "phone (9:16, 1080x1920)", p, `${v.title}${p === "YouTube Shorts" ? " #Shorts" : ""}`, desc("Full tutorials: " + SITE + "/tutorials"), tags + (p === "YouTube Shorts" ? " #Shorts" : p === "Instagram Reels" ? " #Reels" : ""), file(v.mobile.url), file(v.mobile.captions), file(v.mobile.poster), v.mobile.length + (sec > 180 ? " (OVER 3 MIN)" : ""), link]);
  }
}
writeFileSync("docs/video-metadata.csv", rows.map((r) => r.map(q).join(",")).join("\n") + "\n"); console.log("rows", rows.length - 1);
