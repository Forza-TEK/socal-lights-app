// When Admin declines a home, the person's answers are saved as a draft on their account so the "declined" email can link straight to them
// (/add-house?draft=<id>) instead of a blank form. Photos are not part of a draft (they live on the device that added them), so the email says to add them again.
import { newId } from "./util.js";

const MAX_DRAFTS = 10; // same cap as POST /api/drafts

// Returns the link to open, or "" when nothing could be saved (no account on the post, 10 drafts already, anything else): the caller then falls back to the blank form.
export async function declinedDraft(env, row) {
  if (!row || !row.user_id || row.contest_id) return "";
  const { n } = (await env.DB.prepare("SELECT COUNT(*) AS n FROM drafts WHERE user_id = ?").bind(row.user_id).first()) || { n: 0 };
  if (n >= MAX_DRAFTS) return "";
  const pro = row.poster_type === "installer";
  const data = {
    kind: pro ? "installer" : "homeowner", biz: row.biz || "", web: pro ? row.web || "" : "", phone: pro ? row.phone || "" : "", area: row.service_area || "", perm: pro,
    season: row.season || "christmas", title: row.title || "", desc: row.descr || "", lightsOn: row.lights_on || "", visit: row.visit || "", parking: row.parking || "",
    accessible: !!row.accessible, radio: row.radio || "", hadPro: "no", instName: "", instWeb: "", street: row.street || "", city: row.city || "", zip: row.zip || "", where: row.where_txt || "",
  };
  const id = newId();
  // step 50 is clamped by the form to its last screen (the review), where every answer is listed and can be changed
  await env.DB.prepare("INSERT INTO drafts (id,user_id,kind,title,data,step) VALUES (?,?,?,?,?,?)").bind(id, row.user_id, "house", String(row.title || row.biz || "Untitled").slice(0, 90), JSON.stringify(data), 50).run();
  return `https://socallights.app/add-house?draft=${id}`;
}
