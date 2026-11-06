// GET /help/<slug> — one Help article: the one-line answer, the steps, the tutorial video, "was this helpful?" and "ask us".
import { loadArticles, renderBody, plainText, CAT, KINDS } from "../_lib/help.js";
import { helpFrame, askForm, articleLink, esc } from "../_lib/helpui.js";
import { jsonScript } from "../_lib/shell.js";

const notFound = (origin) => new Response(helpFrame({ title: "Help article not found | SoCal Lights", noindex: true, origin, body: `<h1>We couldn't find that page</h1><p class="lede">It may have moved. Try a search.</p><p><a class="btn go" style="display:inline-flex;max-width:260px" href="/help">Go to the Help Center</a></p>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin, slug = String(params.slug || "").toLowerCase();
  const list = await loadArticles(env), a = list.find((x) => x.slug === slug);
  if (!a) return notFound(origin);
  const cat = CAT[a.category] || { key: a.category, title: "Help" };
  const related = list.filter((x) => x.category === a.category && x.slug !== a.slug).slice(0, 5);
  const v = /^[a-z0-9-]+$/.test(a.video) ? a.video : "";
  const video = v ? `<div class="vtabs" role="group" aria-label="Video version"><button type="button" data-v="w" aria-pressed="true">Computer</button><button type="button" data-v="p" aria-pressed="false">Phone</button></div><div class="vid" id="vid"><video id="vv" controls preload="none" playsinline poster="/tutorials/${v}.jpg"><source src="/tutorials/${v}.mp4" type="video/mp4"><track kind="captions" src="/tutorials/${v}.vtt" srclang="en" label="English" default></video></div>
<script>(function(){var b=document.querySelectorAll(".vtabs button"),w=document.getElementById("vid"),vv=document.getElementById("vv"),f=${jsonScript(v)};function set(k){b.forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.v===k))});var m=k==="p",s=m?"-mobile":"";w.className="vid"+(m?" ph":"");vv.poster="/tutorials/"+f+s+".jpg";vv.innerHTML='<source src="/tutorials/'+f+s+'.mp4" type="video/mp4"><track kind="captions" src="/tutorials/'+f+s+'.vtt" srclang="en" label="English" default>';vv.load()}b.forEach(function(x){x.onclick=function(){set(x.dataset.v)}});if(matchMedia("(max-width:700px)").matches)set("p")})()</script>` : "";
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.summary, dateModified: String(a.updated_at || "").replace(" ", "T") + "Z", author: { "@type": "Organization", name: "SoCal Lights" }, mainEntityOfPage: `${origin}/help/${a.slug}` };
  const body = `<article class="art"><p class="crumb"><a href="/help">Help Center</a> &rsaquo; <a href="/help#${esc(cat.key)}">${esc(cat.title)}</a></p>
<h1>${esc(a.title)}</h1><p class="sum">${esc(a.summary)}</p>${video}<div class="body">${renderBody(a.body)}</div>
<div class="rate" id="rate"><b id="rq">Was this helpful?</b><div class="row" id="rb" style="margin-top:10px"><button type="button" class="btn" data-y="1">Yes</button><button type="button" class="btn" data-y="0">No</button></div><div id="rn" hidden style="margin-top:10px"><label for="rnote" style="display:block;font-size:14px;color:var(--muted);margin-bottom:4px">What were you looking for? (optional)</label><textarea id="rnote" rows="3" maxlength="300"></textarea><div style="margin-top:8px"><button type="button" class="btn go" id="rsend" style="min-height:44px;padding:0 20px;flex:none">Send</button></div></div><p class="hmsg" id="rm" role="status"></p></div>
${askForm("help:" + a.slug)}
${related.length ? `<section class="hsec"><h2>More in ${esc(cat.title)}</h2><ul class="alist">${related.map(articleLink).join("")}</ul></section>` : ""}
<p class="hmsg" style="color:var(--muted)">Updated ${esc(String(a.updated_at || "").slice(0, 10))}</p></article>
<div class="hfoot"><span>Looking for something else?</span><a class="btn go" style="flex:none" href="/help">Search the Help Center</a></div>
<script>(function(){var s=${jsonScript(a.slug)},m=document.getElementById("rm"),n=document.getElementById("rn");
function post(y,note){return fetch("/api/help/vote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug:s,helpful:y,note:note||""})})}
document.getElementById("rb").onclick=function(e){var b=e.target.closest("button");if(!b)return;var y=b.dataset.y==="1";post(y,"").catch(function(){});document.getElementById("rb").hidden=true;
if(y){m.textContent="Thank you. Glad it helped.";document.getElementById("rq").textContent=""}else{document.getElementById("rq").textContent="Sorry about that.";n.hidden=false;document.getElementById("rnote").focus()}};
document.getElementById("rsend").onclick=function(){var t=document.getElementById("rnote").value.trim();post(false,t).catch(function(){});n.hidden=true;m.innerHTML='Thank you, that helps us fix it. For an answer now, <a href="#ask" onclick="document.getElementById(\\'ask\\').open=true">ask us</a>.'}})()</script>`;
  return new Response(helpFrame({ title: `${a.title} | Help Center | SoCal Lights`, desc: a.summary, canonical: `${origin}/help/${a.slug}`, ld, origin, body }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" } });
}
