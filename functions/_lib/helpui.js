// The look of the Help Center pages (/help and /help/<slug>), built on the app's shared page frame in shell.js.
import { esc, header, page, jsonScript } from "./shell.js";
import { CATEGORIES, CAT, KINDS, brief } from "./help.js";

export const HELP_EMAIL = "info@socallights.app";

const CSS = `
main.help{max-width:1160px}.top{max-width:1160px}.top,main.help{padding-left:24px;padding-right:24px}@media(min-width:1208px){.top,main.help{padding-left:0;padding-right:0}}
.help h1{margin:8px 0 6px}
.help .lede{color:var(--muted);font-size:18px;margin:0 0 18px;max-width:60ch}
.hsearch{position:relative;margin:6px 0 8px}
.hsearch form{display:flex;gap:8px}
.hsearch input[type=search]{flex:1;min-width:0;min-height:54px;padding:0 18px;border:1.5px solid var(--field);border-radius:999px;background:var(--surface);color:var(--ink);font:500 17px var(--f)}
.hsearch button{min-height:54px;padding:0 22px;border:0;border-radius:999px;background:var(--season);color:var(--on-season);font:700 16px var(--f);cursor:pointer}
.hres{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.hres a{display:block;padding:12px 16px;border-radius:14px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);text-decoration:none}
.hres b{display:block;font-weight:700}.hres span{color:var(--muted);font-size:14px}
.hnone{padding:16px;border-radius:14px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:8px 0 0}
.cat{display:flex;flex-direction:column;gap:4px;padding:16px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);text-decoration:none;color:inherit}
.cat b{font-size:17px;font-weight:800}.cat span{color:var(--muted);font-size:14px}.cat small{color:var(--muted);font-size:13px;margin-top:4px}
.hsec{margin:34px 0 0}.hsec h2{margin:0 0 12px}
.htabs{display:flex;gap:8px;margin:18px -4px 0;padding:4px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.htabs::-webkit-scrollbar{display:none}
.htabs a{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:700 15px var(--f);text-decoration:none;white-space:nowrap}
@media(min-width:700px){.htabs{flex-wrap:wrap;overflow:visible;margin:18px 0 0;padding:0}}
.htabs a small{font-size:12px;font-weight:700;color:var(--muted)}
.htabs a:hover{border-color:var(--season)}
.htabs a[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:var(--bg)}.htabs a[aria-selected=true] small{color:inherit;opacity:.8}
.htabs a:focus-visible{outline:2px solid var(--season);outline-offset:2px}
.hsec .catblurb{margin:-6px 0 14px;color:var(--muted)}
.hlayout{display:grid;gap:8px}
@media(min-width:900px){.hlayout{grid-template-columns:260px minmax(0,1fr);gap:0 44px;align-items:start;margin-top:24px}
.hlayout .htabs{flex-direction:column;flex-wrap:nowrap;position:sticky;top:16px;margin:0;padding:0}
.hlayout .htabs a{width:100%;justify-content:space-between;border-radius:14px;min-height:50px}
.hlayout .hsec[data-cat]{max-width:780px;margin-top:0}}
.htabs-on .hsec[data-cat]{margin-top:18px}
.htabs-on .hsec[data-cat][hidden]{display:none}
/* In the app frame (appshell.js: side menu, icon rail, phone bottom bar) the topics live in the frame's menu, so the in-page tabs and the old header go away */
body.sh-page .top,body.sh-page .htabs{display:none}body.sh-page main.help{max-width:980px;margin:0 auto;padding:22px clamp(16px,3vw,32px) 72px}body.sh-page .hlayout{display:block;margin-top:8px}body.sh-page .hlayout .hsec[data-cat]{max-width:none;margin-top:18px}
@media(max-width:699px){body.sh-page main.help{padding:16px 16px calc(92px + env(safe-area-inset-bottom,0px))}}

.alist{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.alist a{display:flex;flex-direction:column;gap:5px;height:100%;box-sizing:border-box;padding:16px 18px;border-radius:14px;background:var(--surface);border:1px solid var(--line);text-decoration:none;min-height:48px}
.alist a:hover,.alist a:focus-visible{border-color:var(--season)}.alist a:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.alist .at{font-weight:700;font-size:16px;line-height:1.3;color:var(--ink)}
.alist .am{font-size:13px;color:var(--ink)}.alist .av{font-size:13px;color:var(--muted);margin-top:auto;padding-top:2px}
.hsec h2 .ct{font-size:14px;font-weight:600;color:var(--muted);margin-left:4px}
.crumb{font-size:14px;color:var(--muted);margin:6px 0 0}.crumb a{color:inherit}
.art .sum{font-size:19px;margin:10px 0 18px;max-width:62ch}
.art .body{max-width:66ch}.art .body p,.art .body ul,.art .body ol{margin:0 0 14px}.art .body ol,.art .body ul{padding-left:24px}.art .body li{margin:6px 0}
.art .body h2{font-size:20px;margin:26px 0 8px}
.art .body h3{font-size:17px;margin:20px 0 6px}
.art .body a{text-underline-offset:3px}
.vid{margin:0 0 22px;border-radius:18px;overflow:hidden;background:#000;box-shadow:var(--shadow);max-width:720px}
.vid video{display:block;width:100%;aspect-ratio:16/9;background:#000}.vid.ph video{aspect-ratio:9/16;max-height:78vh}
.vtabs{display:flex;gap:8px;margin:0 0 10px}.vtabs button{min-height:40px;padding:0 14px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:700 14px var(--f);cursor:pointer}
.vtabs button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.rate{margin:30px 0 0;padding:18px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);max-width:66ch}
.rate .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.rate button.btn{min-height:44px}
.rate textarea,.ask textarea,.ask input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--field);border-radius:12px;background:transparent;color:var(--ink);min-height:48px}
.ask{margin:16px 0 0;max-width:66ch}.ask summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center}
.ask form{display:grid;gap:10px;padding:6px 0 0}.ask label{display:grid;gap:4px;font-size:14px;color:var(--muted)}
.hmsg{margin:8px 0 0;font-size:15px}.hmsg.bad{color:#b42318}
.hfoot{margin-top:36px;padding:18px;border-radius:18px;background:var(--surface-2);display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between}
`;

export const helpFrame = ({ title, desc, canonical, ld, body, noindex, origin, cat = "", cats = CATEGORIES.map((c) => c.key) }) =>
  page({ title, desc, canonical, ld, noindex, origin, body: `${header("Open the map", "/")}<main class="help" id="content" data-hcat="${esc(cat)}"><style>${CSS}</style>${body}</main>${frameScript(cats)}` });

// With scripts the page moves into the app frame (the same one Profile and Tutorials use); without them it keeps the plain header and the topic links.
const frameScript = (cats) => `<script type="module">import { mountShell } from "/appshell.js?v=20261111x560";
const C = ${jsonScript(CATEGORIES.filter((c) => cats.includes(c.key)).map((c) => ({ k: c.key, label: c.title })))}, IC = { find: "map", enter: "pencil", vote: "check", run: "trophy", sponsors: "star", post: "homeplus", account: "user" };
const m = document.getElementById("content"), index = !!document.querySelector(".hsec[data-cat]"), here = () => (location.hash || "").slice(1);
document.body.classList.add("sh-page");
const sh = mountShell({ page: "help", title: "Help Center", items: C.map((c) => ({ k: c.k, label: c.label, icon: IC[c.k] || "help" })), active: index ? (C.some((c) => c.k === here()) ? here() : (C[0] || {}).k) : m.dataset.hcat,
  onPick: (k) => { if (index && window.helpPick) { window.helpPick(k); try { history.replaceState(null, "", "#" + k); } catch {} const h = m.querySelector("h1"); if (h) h.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); } else location.href = "/help#" + k; } });
window.helpSync = (k) => sh.setActive(k);
</script>`;

export const searchBox = (q = "") => `<div class="hsearch" role="search"><form action="/help" method="get" id="hq-form"><label class="sr" for="hq" style="position:absolute;left:-9999px">Search the Help Center</label><input id="hq" name="q" type="search" value="${esc(q)}" placeholder="Search, for example: I did not get the email" autocomplete="off" enterkeyhint="search"><button type="submit">Search</button></form><ul class="hres" id="hres" aria-live="polite"></ul></div>`;

export const searchScript = `<script>(function(){var f=document.getElementById("hq-form"),i=document.getElementById("hq"),r=document.getElementById("hres"),t,lg;
function show(d,q){if(!q){r.innerHTML="";return}r.innerHTML=d.length?d.map(function(a){return '<li><a href="/help/'+a.slug+'"><b>'+esc(a.title)+'</b><span>'+esc(a.summary)+'</span></a></li>'}).join(""):'<li class="hnone">Nothing found for &ldquo;'+esc(q)+'&rdquo;. Try fewer or different words, or <a href="#ask">ask us</a>.</li>'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function go(log){var q=i.value.trim();if(q.length<2){r.innerHTML="";return}fetch("/api/help/search?q="+encodeURIComponent(q)+(log?"&log=1":"")).then(function(x){return x.json()}).then(function(d){if(i.value.trim()===q)show(d.results||[],q)}).catch(function(){})}
i.addEventListener("input",function(){clearTimeout(t);clearTimeout(lg);t=setTimeout(function(){go(false)},200);lg=setTimeout(function(){go(true)},1600)});
f.addEventListener("submit",function(e){e.preventDefault();clearTimeout(t);clearTimeout(lg);go(true)});
if(i.value)go(false)})()</script>`;

// A card: the title, the one-line answer under it, and how it is shown (video, written steps or a quick answer). The topic is the section heading, so it is not repeated here.
export const articleLink = (a) => `<li><a href="/help/${esc(a.slug)}"><b class="at">${esc(a.title)}</b><span class="am">${esc(a.summary)}</span><span class="av">${/^[a-z0-9-]+$/.test(a.video || "") ? "&#9654; Video and steps" : a.kind === "answer" ? "Quick answer" : a.kind === "fix" ? "Fix a problem" : "Written steps"}</span></a></li>`;

// "Still stuck? Ask us": a short form that goes to the owner's Reports list and, if an email is left, can be answered.
export const askForm = (ref = "help") => `<details class="ask" id="ask"><summary>Still stuck? Ask us</summary><form id="askf" novalidate>
<label>What do you need help with?<textarea id="ask-m" rows="4" maxlength="600" required></textarea></label>
<label>Your email, if you would like an answer (optional)<input id="ask-c" type="email" maxlength="120" autocomplete="email"></label>
<div><button class="btn go" type="submit" style="min-height:48px;padding:0 22px;flex:none">Send</button></div>
<p class="hmsg" id="ask-s" role="status"></p><p style="margin:0;color:var(--muted);font-size:14px">You can also write to <a href="mailto:${HELP_EMAIL}">${HELP_EMAIL}</a>.</p></form></details>
<script>(function(){var d=document.getElementById("ask");function open(){if(d&&location.hash==="#ask"){d.open=true}}open();addEventListener("hashchange",open);document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href="#ask"]');if(a&&d){d.open=true;d.scrollIntoView({block:"center"});var t=document.getElementById("ask-m");if(t)t.focus({preventScroll:true})}});
var f=document.getElementById("askf");if(!f)return;f.addEventListener("submit",function(e){e.preventDefault();var s=document.getElementById("ask-s"),m=document.getElementById("ask-m").value.trim();if(m.length<5){s.className="hmsg bad";s.textContent="Tell us what you need help with, a few words is enough.";return}
s.className="hmsg";s.textContent="Sending…";fetch("/api/help/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:${jsonScript(ref)},message:m,contact:document.getElementById("ask-c").value})}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(x){if(x.ok){s.textContent="Thank you. We read every message. If you left an email, we will write back.";f.reset()}else{s.className="hmsg bad";s.textContent=x.d.error||"That did not send. Please try again."}}).catch(function(){s.className="hmsg bad";s.textContent="That did not send. Please check your connection and try again."})})})()</script>`;

// Tabs under the search: one per topic. Without scripts every topic is listed on the page and the tabs jump to it; with scripts only the chosen topic shows.
export const catTabs = (counts) => `<div class="htabs" role="tablist" aria-label="Help topics">${CATEGORIES.filter((c) => counts[c.key]).map((c, i) => `<a href="/help#${c.key}" role="tab" id="tab-${c.key}" data-tab="${c.key}" aria-controls="${c.key}" aria-selected="${i === 0}">${esc(c.title)} <small>${counts[c.key]}</small></a>`).join("")}</div>`;
export const tabScript = `<script>(function(){var tabs=[].slice.call(document.querySelectorAll(".htabs a")),secs=[].slice.call(document.querySelectorAll(".hsec[data-cat]"));if(!tabs.length)return;document.querySelector("main.help").classList.add("htabs-on");
function pick(k,focus){var ok=false;tabs.forEach(function(t){var on=t.dataset.tab===k;if(on)ok=true})
if(!ok)k=tabs[0].dataset.tab;tabs.forEach(function(t){var on=t.dataset.tab===k;t.setAttribute("aria-selected",on);t.tabIndex=on?0:-1;if(on&&focus){t.focus();t.scrollIntoView({block:"nearest",inline:"center"})}});
if(typeof helpSync==="function")helpSync(k);secs.forEach(function(s){s.hidden=s.dataset.cat!==k;s.setAttribute("role","tabpanel");s.setAttribute("aria-labelledby","tab-"+s.dataset.cat)})}
tabs.forEach(function(t,i){t.addEventListener("click",function(e){e.preventDefault();pick(t.dataset.tab,false);try{history.replaceState(null,"","#"+t.dataset.tab)}catch(x){}});
t.addEventListener("keydown",function(e){var n=e.key==="ArrowRight"?i+1:e.key==="ArrowLeft"?i-1:e.key==="Home"?0:e.key==="End"?tabs.length-1:-1;if(n<0)return;e.preventDefault();n=(n+tabs.length)%tabs.length;pick(tabs[n].dataset.tab,true)})});
window.helpPick=pick;var h=(location.hash||"").slice(1);pick(h,false);addEventListener("hashchange",function(){pick((location.hash||"").slice(1),false)})})()</script>`;
export const catCards = (counts) => `<div class="cats">${CATEGORIES.map((c) => `<a class="cat" href="/help#${c.key}"><b>${esc(c.title)}</b><span>${esc(c.blurb)}</span><small>${counts[c.key] || 0} ${(counts[c.key] || 0) === 1 ? "article" : "articles"}</small></a>`).join("")}</div>`;
export { esc, CAT, KINDS, brief };
