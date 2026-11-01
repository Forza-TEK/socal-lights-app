// The look of the app (fonts, colors, tags, buttons, photo header) for the pages the server writes itself:
// installer profiles, city pages and the confirmation page. One place, so they all match the app.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
:root{--bg:#f6f4f0;--surface:#fff;--surface-2:#f3f1ec;--ink:#14161b;--muted:#646a7a;--line:#e7e3dc;--shadow:0 12px 32px rgba(20,22,27,.10),0 2px 6px rgba(20,22,27,.06);--free:#0f9d6b;--free-soft:#dcf5ea;--paid:#c2410c;--paid-soft:#fde7da;--gold:#9a6a00;--gold-soft:#fbefcc;--ice:#2f6fd0;--ice-soft:#e2ecfb;--season:#d1343f;--on-season:#fff;--focus:#2a5bd7;--f:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
:root[data-theme=dark]{--bg:#0b0d12;--surface:#161a22;--surface-2:#1f2430;--ink:#f5f3ee;--muted:#9ba1b1;--line:#2a303c;--shadow:0 12px 32px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.35);--free:#3ddc97;--free-soft:#123628;--paid:#ff9a5c;--paid-soft:#3a2216;--gold:#f5c461;--gold-soft:#33291a;--ice:#7fb6ee;--ice-soft:#18273b;--season:#ff6b6b;--on-season:#0b0d12;--focus:#8fb0ff;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--f);-webkit-font-smoothing:antialiased}
a{color:inherit}:focus-visible{outline:2.5px solid var(--focus);outline-offset:2px}
.top{max-width:760px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;letter-spacing:-.02em;text-decoration:none;white-space:nowrap}.brand img{width:40px;height:40px;border-radius:50%}.brand b{color:var(--season)}
.pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:var(--surface);box-shadow:var(--shadow);font-weight:700;font-size:15px;text-decoration:none;white-space:nowrap}
main{max-width:760px;margin:0 auto;padding:0 16px 40px}
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
.tag.conf::before{content:"✓";font-weight:900}.tag.exp::before{content:"≈";font-weight:900}
h1{font-size:clamp(26px,5vw,36px);line-height:1.15;letter-spacing:-.02em;font-weight:800;margin:6px 0 2px;text-wrap:balance}
h2{font-size:20px;font-weight:800;letter-spacing:-.01em;margin:30px 0 12px}
.sub{color:var(--muted);margin:0}.lead{margin:14px 0 0;white-space:pre-line}
.facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 16px;font-size:15px;margin:20px 0 0}
.facts dt{color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding-top:3px}.facts dd{margin:0;min-width:0;overflow-wrap:anywhere}
.facts a{text-underline-offset:3px}
.bar{position:sticky;bottom:12px;z-index:5;display:flex;gap:8px;align-items:center;padding:6px;margin-top:22px;border-radius:999px;background:var(--surface);box-shadow:var(--shadow)}
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
.note{padding:18px;border-radius:18px;background:var(--surface);box-shadow:0 2px 10px rgba(20,22,27,.08)}
@media(min-width:760px){.hero{aspect-ratio:16/9}.ev{grid-template-columns:120px minmax(0,1fr)}.ev .ph{width:120px;height:120px}}
`;

const THEME = `<script>try{var h=new Date().getHours(),t=h>=18||h<6?"dark":"light",o=localStorage.getItem("socal-theme"),u=+localStorage.getItem("socal-theme-until")||0;if(o&&u>Date.now())t=o;document.documentElement.dataset.theme=t}catch(e){}</script>`;
const GALLERY = `<script>document.querySelectorAll(".hero").forEach(function(h){var t=h.querySelector(".track");if(!t)return;var n=t.children.length,c=h.querySelector(".count");function u(){var i=Math.round(t.scrollLeft/t.clientWidth);if(c)c.textContent=(i+1)+" / "+n}t.addEventListener("scroll",u,{passive:true});h.querySelectorAll(".nav").forEach(function(b){b.onclick=function(){t.scrollBy({left:(+b.dataset.g)*t.clientWidth,behavior:"smooth"})}})});document.querySelectorAll("[data-share]").forEach(function(b){b.onclick=async function(){var d={title:document.title,url:location.href};try{if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(d.url);b.setAttribute("aria-label","Link copied")}}catch(e){}}})</script>`;

// Header with the logo and a button back to the map
export const header = (label = "Open the map", href = "/") => `<div class="top"><a class="brand" href="/" aria-label="SoCal Lights home"><img src="/img/badge-160.webp" width="40" height="40" alt="">SoCal <b>Lights</b></a><a class="pill" href="${esc(href)}">${esc(label)}</a></div>`;

export const SHARE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

// A swipeable photo header like the one on the app's details card. `slides` = [{ href?, img, cap? }]
export function hero(slides, fallbackText = "") {
  if (!slides.length) return `<div class="hero"><div class="logo" aria-hidden="true">${esc(fallbackText)}</div></div>`;
  const s = slides.map((x) => { const inner = `<img src="${esc(x.img)}" alt="${esc(x.cap || "")}" loading="lazy">${x.cap ? `<span class="cap">${esc(x.cap)}</span>` : ""}`; return x.href ? `<a href="${esc(x.href)}">${inner}</a>` : `<div class="s">${inner}</div>`; }).join("");
  const many = slides.length > 1;
  return `<div class="hero"><div class="track">${s}</div>${many ? `<button class="nav l" type="button" data-g="-1" aria-label="Previous photo">&#8249;</button><button class="nav r" type="button" data-g="1" aria-label="Next photo">&#8250;</button><span class="count">1 / ${slides.length}</span>` : ""}</div>`;
}

export function page({ title, desc = "", canonical = "", ld = null, body, noindex = false, origin = "" }) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}${noindex ? '<meta name="robots" content="noindex">' : ""}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}<meta property="og:title" content="${esc(title)}">${desc ? `<meta property="og:description" content="${esc(desc)}">` : ""}<meta property="og:image" content="${esc(origin)}/img/share.png"><link rel="icon" href="/img/icon-192.png">${THEME}<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<style>${CSS}</style></head><body>${body}${GALLERY}</body></html>`;
}
