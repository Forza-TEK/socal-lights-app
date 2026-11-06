// The two controls every page carries in its top corner, built once so they look and behave the same everywhere:
//  - the light / night switch
//  - the account button: a person icon that opens the sign-in sheet when you are signed out, and your picture (or initial)
//    that opens a small menu (profile, your contests, sign out) when you are signed in.
import { me, signIn, signOut, esc } from "/auth.js?v=20261107p";

// styles for the account menu and the signed-out button, added once (pages without our main stylesheet get them too)
if (!document.getElementById("chrome-css")) { const l = document.createElement("link"); l.id = "chrome-css"; l.rel = "stylesheet"; l.href = "/chrome.css?v=20261103b"; document.head.appendChild(l); }

/* ---------- light / night (same switch and same remembered choice as the map) ---------- */
const nextSwitch = () => { const d = new Date(); d.setMinutes(0, 0, 0); const h = d.getHours(); if (h < 6) d.setHours(6); else if (h < 18) d.setHours(18); else { d.setDate(d.getDate() + 1); d.setHours(6); } return d.getTime(); };
export function toggleTheme() {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t;
  try { localStorage.setItem("socal-theme", t); localStorage.setItem("socal-theme-until", String(nextSwitch())); } catch {}
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "dark" ? "#0b0d12" : "#f6f4f0";
}
export const themeBtn = () => '<button class="tbtn" type="button" data-theme-toggle aria-label="Switch between light and dark mode" title="Light / dark"><svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg></button>';
document.addEventListener("click", (e) => { if (e.target.closest("[data-theme-toggle]")) toggleTheme(); });

/* ---------- account ---------- */
let acctUser = null; const hosts = new Set(); const acctReady = me().then((i) => (acctUser = i.user)).catch(() => {});
const PERSON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
export const acctHtml = () => (acctUser
  ? `<button class="acct" type="button" data-acct-menu aria-haspopup="menu" aria-expanded="false" aria-label="Your account" title="${esc(acctUser.email)}">${acctUser.avatar ? `<img src="${esc(acctUser.avatar)}" alt="">` : esc(acctUser.email[0].toUpperCase())}</button>`
  : `<button class="acct acct-in" type="button" data-acct-signin aria-label="Sign in" title="Sign in">${PERSON}</button>`);
const paint = () => hosts.forEach((el) => { if (el.isConnected) el.innerHTML = acctHtml(); });
export async function refreshAcct(el) { const i = await me(true); acctUser = i.user; if (el) hosts.add(el); paint(); }
export async function mountAcct(el) { await acctReady; if (el) hosts.add(el); paint(); }

let menu = null;
const closeMenu = () => { if (menu) { menu.remove(); menu = null; } document.querySelectorAll("[data-acct-menu][aria-expanded=true]").forEach((b) => b.setAttribute("aria-expanded", "false")); };
function openMenu(btn) {
  closeMenu(); btn.setAttribute("aria-expanded", "true");
  menu = document.createElement("div"); menu.className = "acctmenu"; menu.setAttribute("role", "menu");
  menu.innerHTML = `<div class="who" role="presentation"><b>${esc(acctUser.name || "Signed in")}</b><span>${esc(acctUser.email)}</span></div><a role="menuitem" href="/profile">Your profile</a><a role="menuitem" href="/contests#mine">Your contests</a><a role="menuitem" href="/add">Add an event, home or contest</a><a role="menuitem" href="/tutorials">Tutorials</a><button role="menuitem" type="button" data-signout>Sign out</button>`;
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect(); menu.style.top = r.bottom + 8 + "px"; menu.style.right = Math.max(8, innerWidth - r.right) + "px";
  menu.querySelector("a").focus();
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-acct-menu]"), si = e.target.closest("[data-acct-signin]");
  if (b) { menu && b.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu(b); return; }
  if (si) { const u = await signIn({ title: "Sign in", next: location.pathname + location.search + location.hash }); if (u) location.reload(); return; }
  if (e.target.closest("[data-signout]")) { await signOut(); location.href = "/"; return; }
  if (menu && !e.target.closest(".acctmenu")) closeMenu();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu) { const b = document.querySelector("[data-acct-menu]"); closeMenu(); if (b) b.focus(); } });
addEventListener("resize", closeMenu); addEventListener("scroll", closeMenu, { passive: true, capture: true });
