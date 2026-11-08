// The look of the app (fonts, colors, tags, buttons, photo header) for the pages the server writes itself:
// installer profiles, city pages and the confirmation page. One place, so they all match the app.
// A value placed inside an inline <script>: plain JSON.stringify does not stop "</script>" or an HTML comment from ending the script,
// so < > & and the two JS line-separator characters are written as unicode escapes (same value, nothing can close the script).
export const jsonScript = (v) => JSON.stringify(v).replace(/[<>&\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
:root{--bg:#ffffff;--surface:#fff;--surface-2:#f3f1ec;--ink:#14161b;--muted:#646a7a;--line:#e7e3dc;--shadow:0 12px 32px rgba(20,22,27,.10),0 2px 6px rgba(20,22,27,.06);--free:#0b7a52;--free-soft:#dcf5ea;--paid:#b33a08;--paid-soft:#fde7da;--gold:#8a5f00;--gold-soft:#fbefcc;--ice:#2559b8;--ice-soft:#e2ecfb;--season:#c9313b;--on-season:#fff;--focus:#2a5bd7;--f:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
:root[data-theme=dark]{--bg:#0b0d12;--surface:#161a22;--surface-2:#1f2430;--ink:#f5f3ee;--muted:#9ba1b1;--line:#2a303c;--shadow:0 12px 32px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.35);--free:#3ddc97;--free-soft:#123628;--paid:#ff9a5c;--paid-soft:#3a2216;--gold:#f5c461;--gold-soft:#33291a;--ice:#7fb6ee;--ice-soft:#18273b;--season:#ff6b6b;--on-season:#0b0d12;--focus:#8fb0ff;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--f);-webkit-font-smoothing:antialiased}
a{color:inherit}:focus-visible{outline:2.5px solid var(--focus);outline-offset:2px}
.top{max-width:760px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;letter-spacing:-.02em;text-decoration:none;white-space:nowrap}.brand img{width:40px;height:40px;border-radius:50%}.brand b{background:linear-gradient(90deg,#f08a1c,var(--s-halloween,#e8590c) 45%,var(--s-christmas,#d1343f));-webkit-background-clip:text;background-clip:text;color:transparent}
.hctl{display:flex;align-items:center;gap:10px}.hctl .slot{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;line-height:0}.pill .short{display:none}
.tbtn,.acct{box-sizing:border-box;flex:none;width:44px;height:44px;margin:0;padding:0;border:1.5px solid var(--ink);border-radius:50%;background:transparent;color:var(--ink);display:inline-grid;place-items:center;overflow:hidden;line-height:1;font:600 16px var(--f);text-decoration:none;cursor:pointer}.acct{padding:2px}.acct img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}.tbtn:hover,.acct:hover{background:var(--surface-2)}.tbtn .sun{display:none}:root[data-theme=dark] .tbtn .sun{display:block}:root[data-theme=dark] .tbtn .moon{display:none}
#quotebtn .short{display:none}
@media(max-width:480px){.hide-s{display:none!important}#quotebtn .long{display:none}#quotebtn .short{display:inline}.pill .long{display:none}.pill .short{display:inline}.pill{padding:0 14px}}
@media(max-width:400px){.brand .wm{display:none}}
.pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:var(--surface);box-shadow:var(--shadow);font-weight:700;font-size:15px;text-decoration:none;white-space:nowrap}
main{max-width:760px;margin:0 auto;padding:0 16px 40px}
.crumbs{margin:0 0 12px;font-size:14px;color:var(--muted)}.crumbs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:2px 0}.crumbs li{display:inline-flex;align-items:center}.crumbs li+li::before{content:"/";margin:0 8px;opacity:.6}.crumbs a{display:inline-flex;align-items:center;min-height:32px;text-underline-offset:3px}
.hero{position:relative;border-radius:24px;overflow:hidden;background:var(--surface-2);aspect-ratio:4/3;max-height:520px}
.track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.track::-webkit-scrollbar{display:none}
.track a,.track .s{flex:0 0 100%;scroll-snap-align:center;position:relative;display:block;height:100%}
.track img{width:100%;height:100%;object-fit:cover;display:block}
.track .cap{position:absolute;left:0;right:0;bottom:0;padding:34px 16px 14px;background:linear-gradient(transparent,rgba(0,0,0,.62));color:#fff;font-weight:700;font-size:14px}
.nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;border-radius:50%;background:rgba(10,12,16,.55);color:#fff;font-size:22px;cursor:pointer;display:grid;place-items:center}.nav.l{left:10px}.nav.r{right:10px}
.count{position:absolute;right:12px;bottom:12px;background:rgba(10,12,16,.6);color:#fff;font-weight:800;font-size:12px;padding:3px 10px;border-radius:99px}
.logo{display:grid;place-items:center;height:100%;font-size:64px;font-weight:800;color:var(--season);background:linear-gradient(135deg,var(--surface-2),var(--surface))}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 4px}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--surface-2);color:var(--muted)}
.tag.free,.tag.conf{background:var(--free-soft);color:var(--free)}.tag.paid{background:var(--paid-soft);color:var(--paid)}.tag.exp{background:var(--gold-soft);color:var(--gold)}.tag.ice{background:var(--ice-soft);color:var(--ice)}
.tag.cancel{background:#fde2e2;color:#b42318}:root[data-theme=dark] .tag.cancel{background:#3b1717;color:#ff8f86}
.tag.conf::before{content:"✓";font-weight:900}.tag.exp::before{content:"≈";font-weight:900}
h1{font-size:clamp(26px,5vw,36px);line-height:1.15;letter-spacing:-.02em;font-weight:800;margin:6px 0 2px;text-wrap:balance}
h2{font-size:20px;font-weight:800;letter-spacing:-.01em;margin:30px 0 12px}
.sub{color:var(--muted);margin:0}.lead{margin:14px 0 0;white-space:pre-line}
.facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 16px;font-size:15px;margin:20px 0 0}
.facts dt{color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding-top:3px}.facts dd{margin:0;min-width:0;overflow-wrap:anywhere}
.facts a{text-underline-offset:3px}
.bar .btn{min-width:0}.bar{position:sticky;bottom:12px;z-index:5;display:flex;gap:8px;align-items:center;padding:6px;margin-top:22px;border-radius:999px;background:var(--surface);box-shadow:var(--shadow)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:999px;border:0;font:700 16px var(--f);text-decoration:none;cursor:pointer;background:var(--surface-2);color:var(--ink);white-space:nowrap}
.btn.go{flex:1;background:var(--season);color:var(--on-season)}.btn.ic{width:48px;padding:0;flex:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.card{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);text-decoration:none;color:inherit}
.card .ph{aspect-ratio:3/2;background:var(--surface-2);position:relative}.card .ph img{width:100%;height:100%;object-fit:cover;display:block}
.card .bd{padding:12px 14px 14px;display:grid;gap:4px}.card h3{margin:0;font-size:16px;font-weight:800;line-height:1.3}.card .m{color:var(--muted);font-size:14px}
.card .tags{margin:4px 0 0}
.list{display:grid;gap:12px}.ev{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;padding:12px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);text-decoration:none;color:inherit}
.ev .ph{width:96px;height:96px;border-radius:12px;overflow:hidden;background:var(--surface-2)}.ev .ph img{width:100%;height:100%;object-fit:cover;display:block}
.ev h3{margin:0;font-size:16px;font-weight:800;line-height:1.3}.ev p{margin:2px 0 0;color:var(--muted);font-size:14px}.ev .tags{margin:6px 0 0}
.foot{margin-top:36px;color:var(--muted);font-size:14px;display:flex;gap:6px 14px;flex-wrap:wrap}.foot a{min-height:32px;display:inline-flex;align-items:center}
.facts dd a{display:inline-block;min-height:24px;line-height:24px}
.sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.btn.sh{flex:none;gap:6px;padding:0 16px}
.evact{display:flex;flex-wrap:wrap;gap:0 14px;margin-top:6px}.evact a{display:inline-flex;align-items:center;min-height:32px;color:var(--ink);font-size:14px;font-weight:700;text-underline-offset:3px}
.sub-box{margin:22px 0 0;padding:14px 16px 16px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08)}.sub-box h2{font-size:17px;margin:0 0 2px}.sub-box p{margin:0;color:var(--muted);font-size:14px}
.sub-form{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sub-form input[type=email]{flex:1 1 200px;min-width:0;min-height:44px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink);font:inherit}.sub-form .btn{flex:none;min-height:44px;padding:0 18px;font-size:15px}.sub-form .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}.sub-msg,.sub-fine,.sub-ts{flex-basis:100%}.sub-msg:empty{display:none}.sub-fine{font-size:12.5px!important}.sub-fine a{text-underline-offset:3px}
.card-ev{position:relative}.card-ev h3 a{color:inherit;text-decoration:none}.card-ev h3 a::after{content:"";position:absolute;inset:0;border-radius:18px}.card-ev .evact{position:relative;z-index:1}.card-ev:hover{box-shadow:0 4px 16px rgba(20,22,27,.14)}
.idrow{display:flex;gap:14px;align-items:center}.idrow img.lg{width:64px;height:64px;border-radius:16px;object-fit:contain;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08);flex:none}
.logoimg{width:100%;height:100%;object-fit:contain;padding:12%;background:var(--surface)}
.scrim{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:grid;place-items:end center}
.dlg{width:min(480px,100%);max-height:92vh;overflow:auto;background:var(--surface);border-radius:24px 24px 0 0;padding:22px 20px 26px;box-shadow:var(--shadow)}
@media(min-width:600px){.scrim{place-items:center}.dlg{border-radius:24px}}
.dlg h2{margin:0 0 6px}.dlg label{display:grid;gap:4px;font-size:14px;color:var(--muted);margin:10px 0}.dlg input,.dlg textarea{font:inherit;min-height:48px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink)}
.dlg .chk{display:flex;gap:10px;align-items:flex-start;color:var(--ink)}.dlg .chk input{min-height:0;width:22px;height:22px;flex:none}
.dlg .err{color:#b42318;margin:8px 0 0;font-size:14px}.dlg .row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.linkbtn{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer;min-height:32px}
.note{padding:18px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08)}
@media(min-width:760px){.hero{aspect-ratio:16/9}.ev{grid-template-columns:120px minmax(0,1fr)}.ev .ph{width:120px;height:120px}}
`;

const THEME = `<script>try{var h=new Date().getHours(),t=h>=18||h<6||matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light",o=localStorage.getItem("socal-theme"),u=+localStorage.getItem("socal-theme-until")||0;if(o&&u>Date.now())t=o;document.documentElement.dataset.theme=t}catch(e){}</script>`;
const GALLERY = `<script>document.querySelectorAll(".hero").forEach(function(h){var t=h.querySelector(".track");if(!t)return;var n=t.children.length,c=h.querySelector(".count");function u(){var i=Math.round(t.scrollLeft/t.clientWidth);if(c)c.textContent=(i+1)+" / "+n}t.addEventListener("scroll",u,{passive:true});h.querySelectorAll(".nav").forEach(function(b){b.onclick=function(){t.scrollBy({left:(+b.dataset.g)*t.clientWidth,behavior:"smooth"})}})});document.querySelectorAll("[data-share]").forEach(function(b){b.onclick=async function(){var d={title:document.title,url:b.dataset.url||location.origin+location.pathname};try{if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(d.url);b.setAttribute("aria-label","Link copied");var l=b.querySelector(".lbl");if(l)l.textContent="Link copied"}}catch(e){}}})</script>`;

// Header with the logo and a button back to the map
export const header = (label = "Open the map", href = "/") => `<div class="top" role="banner"><a class="brand" href="/" aria-label="SoCal Lights home"><img src="/img/badge-160.webp" width="40" height="40" alt=""><span class="wm">SoCal <b>Lights</b></span></a><div class="hctl"><a class="pill" href="${esc(href)}" aria-label="${esc(label)}"><span class="long">${esc(label)}</span><span class="short">Map</span></a><span class="slot" data-theme-slot></span><span class="slot" data-acct-slot></span></div></div>`;

// Breadcrumb trail: the visible links and the matching schema.org BreadcrumbList. items = [{ name, href }, ...]; the last one is the current page (no href needed).
export function crumbs(origin, items) {
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((x, i) => `<li>${x.href && i < items.length - 1 ? `<a href="${esc(x.href)}">${esc(x.name)}</a>` : `<span aria-current="page">${esc(x.name)}</span>`}</li>`).join("")}</ol></nav>`;
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.href ? origin + x.href : undefined })) };
  return { html, ld };
}

export const SHARE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

// "Get the weekly list": one email field on city and event pages, posting to the same /api/alerts as the map's weekly email (a confirmation link comes first; nothing is sent until it is clicked).
// Pressing the button is the opt-in, so the line under the field says what it signs you up for. src ("city" or "event") only feeds a counter. public/subscribe.js wires the form and Turnstile.
export const subscribeBox = ({ city, src, siteKey = "" }) => `<section class="sub-box" aria-labelledby="sub-t"><h2 id="sub-t">Get the weekly list</h2><p>One email a week with the lights and events near ${esc(city)}. Free, and you can stop it with one tap.</p><form class="sub-form" data-sub-form data-city="${esc(city)}" data-src="${esc(src)}" data-sitekey="${esc(siteKey)}" novalidate><label class="sr" for="sub-email">Email address</label><input id="sub-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn go" type="submit">Get the weekly list</button><div class="sub-ts"></div><p class="sub-msg" role="status"></p><p class="sub-fine">We email a link to confirm first. By signing up you agree to one email a week about events near ${esc(city)}. <a href="/privacy">Privacy</a></p></form></section>`;

// The share button used on city and event pages (Web Share sheet, or the link is copied); the page script in GALLERY wires every [data-share].
export const shareBtn = (url, label = "Share") => `<button class="btn sh" type="button" data-share data-url="${esc(url)}" aria-label="${esc(label)}">${SHARE}<span class="lbl">Share</span></button>`;

// A swipeable photo header like the one on the app's details card. `slides` = [{ href?, img, cap? }]
export function hero(slides, fallbackText = "") {
  if (!slides.length) return `<div class="hero"><div class="logo" aria-hidden="true">${esc(fallbackText)}</div></div>`;
  const s = slides.map((x, i) => { const inner = `<img src="${esc(x.img)}" alt="${esc(x.cap || "")}" loading="${i ? "lazy" : "eager"}"${x.orig ? ` onerror="this.onerror=null;this.src='${esc(String(x.orig).replace(/'/g, "%27").replace(/\\/g, "%5C"))}'"` : ""}>${x.cap ? `<span class="cap">${esc(x.cap)}</span>` : ""}`; return x.href ? `<a href="${esc(x.href)}">${inner}</a>` : `<div class="s">${inner}</div>`; }).join("");
  const many = slides.length > 1;
  return `<div class="hero"><div class="track">${s}</div>${many ? `<button class="nav l" type="button" data-g="-1" aria-label="Previous photo">&#8249;</button><button class="nav r" type="button" data-g="1" aria-label="Next photo">&#8250;</button><span class="count">1 / ${slides.length}</span>` : ""}</div>`;
}

const CHROME = `<script type="module">import { themeBtn, mountAcct } from "/chrome.js?v=20261110b";const t=document.querySelector("[data-theme-slot]");if(t)t.innerHTML=themeBtn();const a=document.querySelector("[data-acct-slot]");if(a)mountAcct(a);</script>`;
// Wide pages (city lists, past results): one 1160px frame for the header and the content, lists in columns, text lines capped for reading
export const WIDE = `.top,main{max-width:1160px}.top,main{padding-left:24px;padding-right:24px}@media(min-width:1208px){.top,main{padding-left:0;padding-right:0}}main>p,main>.sub,main h1{max-width:70ch}@media(min-width:900px){main .list{grid-template-columns:repeat(auto-fill,minmax(480px,1fr));gap:14px}.duo{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:40px;align-items:start}.duo-l{position:sticky;top:16px}.duo-r>.tags:first-child{margin-top:0}.duo .hero{max-height:560px}}`;
export function page({ title, desc = "", canonical = "", ld = null, body, noindex = false, origin = "", image = "", ogType = "website", wide = false }) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}${noindex ? '<meta name="robots" content="noindex,follow">' : ""}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}<meta property="og:title" content="${esc(title)}">${desc ? `<meta property="og:description" content="${esc(desc)}">` : ""}${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}<meta property="og:type" content="${esc(ogType)}"><meta property="og:site_name" content="SoCal Lights"><meta name="twitter:card" content="summary_large_image"><meta property="og:image" content="${image ? esc(image) : esc(origin) + "/img/share.png"}"><link rel="icon" href="/img/icon-192.png">${THEME}<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<style>${CSS}${wide ? WIDE : ""}</style></head><body>${body}${GALLERY}${CHROME}${body.includes("data-sub-form") ? '<script src="/subscribe.js?v=20261107a" defer></script>' : ""}<script src="/hit.js?v=20261107a" defer></script><script src="/footer.js?v=20261110b" defer></script></body></html>`;
}
