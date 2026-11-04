// Admin > Help: the Help Center articles, what people searched for and did not find, and the "not helpful" notes.
import { esc, toolbar, wireToolbar, tap, toast, modalFrame } from "/admin/kit.js?v=20261103a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
let DATA = null;
const slugify = (t) => String(t).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
const ago = (s) => { const t = new Date(String(s).replace(" ", "T") + "Z"); return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };

const card = (a, cats) => `<button type="button" class="emcard" data-hopen="${esc(a.slug)}"><span class="emct"><b>${esc(a.title)}</b>${a.status === "draft" ? '<span class="tag warn">Draft</span>' : ""}</span><span class="ems">${esc(cats[a.category] || a.category)} · ${esc(DATA.kinds[a.kind] || a.kind)}</span><span class="ems">${a.yes + a.no ? `${a.yes} helpful, ${a.no} not` : "No votes yet"}${a.video ? " · video" : ""}</span></button>`;

export async function renderHelp(main, q = "") {
  DATA = await api("/api/admin/help");
  const cats = Object.fromEntries(DATA.categories.map((c) => [c.key, c.title]));
  const drafts = DATA.articles.filter((a) => a.status === "draft").length, notHelp = DATA.articles.filter((a) => a.no > a.yes).length;
  const none = DATA.noResult.length
    ? `<div class="emgrid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${DATA.noResult.map((s) => `<button type="button" class="emcard" data-hnew="${esc(s.q)}"><span class="emct"><b>${esc(s.q)}</b></span><span class="ems">${s.n} ${s.n === 1 ? "search" : "searches"}, last ${esc(ago(s.last))}</span><span class="ems">Tap to write this article</span></button>`).join("")}</div>`
    : `<p class="meta">Nothing yet. When people search and find nothing, the words show here so you can write the missing article.</p>`;
  const notes = DATA.notes.length ? `<ul class="meta" style="margin:8px 0 0;padding-left:18px">${DATA.notes.map((n) => `<li><a href="/help/${esc(n.slug)}" target="_blank" rel="noopener">${esc(n.slug)}</a>: ${esc(n.note)} <span style="opacity:.7">(${esc(ago(n.created_at))})</span></li>`).join("")}</ul>` : `<p class="meta">No notes yet.</p>`;
  main.innerHTML = toolbar({ search: { placeholder: "Search articles", value: q }, add: { id: "hAdd", label: "New article" }, count: `${DATA.articles.length} articles${drafts ? ` · ${drafts} drafts` : ""} · ${DATA.searches30} searches in 30 days` })
    + `<section class="fsec" style="margin:14px 0"><h3 style="margin:0 0 6px">Searches with no result (last 30 days)</h3>${none}</section>`
    + `<section class="fsec" style="margin:14px 0"><h3 style="margin:0 0 6px">What people said was missing</h3>${notes}${notHelp ? `<p class="meta" style="margin-top:8px">${notHelp} ${notHelp === 1 ? "article has" : "articles have"} more "not helpful" than "helpful" votes.</p>` : ""}</section>`
    + `<div id="hlist"></div>`;
  const paint = (query) => {
    const w = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = DATA.articles.filter((a) => !w.length || w.every((x) => (a.title + " " + a.keywords + " " + a.summary + " " + a.slug).toLowerCase().includes(x)));
    $("#hlist").innerHTML = DATA.categories.map((c) => {
      const items = list.filter((a) => a.category === c.key);
      return items.length ? `<h3 style="margin:22px 0 8px">${esc(c.title)} <span class="meta">${items.length}</span></h3><div class="emgrid">${items.map((a) => card(a, cats)).join("")}</div>` : "";
    }).join("") || `<div class="empty">Nothing matches that.</div>`;
  };
  paint(q);
  wireToolbar(main, { onSearch: (v) => { q = v; paint(v); } });
  $("#hAdd").onclick = () => openArticle(null, main, q);
  main.onclick = (e) => {
    const o = e.target.closest("[data-hopen]"); if (o) return openArticle(DATA.articles.find((a) => a.slug === o.dataset.hopen), main, q);
    const n = e.target.closest("[data-hnew]"); if (n) return openArticle(null, main, q, n.dataset.hnew);
  };
}

function openArticle(a, main, q, seed = "") {
  const isNew = !a; a = a || { slug: "", title: seed ? seed.charAt(0).toUpperCase() + seed.slice(1) : "", category: "find", kind: "howto", summary: "", body: "", keywords: seed, video: "", sort: 100, status: "published" };
  const m = $("#modal"); m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  const opts = (list, cur) => list.map(([k, l]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
  m.innerHTML = modalFrame(isNew ? "New article" : "Edit article", `
    <form class="f" id="hForm" novalidate>
      <fieldset class="fsec"><legend>Article</legend><div class="fgrid">
        <div class="ff c6"><label for="h-t">Title</label><input id="h-t" maxlength="140" value="${esc(a.title)}" autocomplete="off"><small class="fhint">In the words people use, for example "I did not get the email".</small></div>
        <div class="ff c3"><label for="h-c">Category</label><select id="h-c">${opts(DATA.categories.map((c) => [c.key, c.title]), a.category)}</select></div>
        <div class="ff c3"><label for="h-k">Type</label><select id="h-k">${opts(Object.entries(DATA.kinds), a.kind)}</select><small class="fhint">How to: steps for a task. Fix a problem: symptom, cause, fix. Answer: a short rule or policy.</small></div>
        <div class="ff c6"><label for="h-s">The answer in one sentence</label><textarea id="h-s" rows="2" maxlength="300">${esc(a.summary)}</textarea><small class="fhint">Shown first on the page and in search results.</small></div>
        <div class="ff c6"><label for="h-b">Article text</label><textarea id="h-b" rows="14" maxlength="8000" spellcheck="true">${esc(a.body)}</textarea>
          <small class="fhint">Blank line = new paragraph. "- " starts a list item. "1. " starts a numbered step. "## " makes a small heading. **bold**. [link text](/help/another-article) links to a page on this site.</small></div>
        <div class="ff c6"><label for="h-w">Extra words people might type</label><input id="h-w" maxlength="300" value="${esc(a.keywords)}"><small class="fhint">So search finds this article, for example: code spam junk missing.</small></div>
        <div class="ff c3"><label for="h-v">Tutorial video file (optional)</label><input id="h-v" maxlength="40" value="${esc(a.video)}" placeholder="find-email"><small class="fhint">The file name in /tutorials, without .mp4.</small></div>
        <div class="ff c3"><label for="h-o">Order in its category</label><input id="h-o" type="number" min="0" max="999" value="${esc(a.sort)}"><small class="fhint">Lower numbers show first.</small></div>
        <div class="ff c3"><label for="h-p">Status</label><select id="h-p">${opts([["published", "Published"], ["draft", "Draft (hidden)"]], a.status)}</select></div>
        <div class="ff c3"><label for="h-u">Page address</label><input id="h-u" maxlength="70" value="${esc(a.slug)}" ${isNew ? "" : "readonly"} autocomplete="off"><small class="fhint">${isNew ? "Made from the title. Lowercase letters, numbers, hyphens." : "Cannot change after saving."} socallights.app/help/…</small></div>
      </div></fieldset>
      <p class="msg" id="h-msg" role="status"></p>
      <div class="mfoot sticky"><button class="btn ice" type="submit" id="h-save">Save</button>${isNew ? "" : `<a class="btn ghost" href="/help/${esc(a.slug)}" target="_blank" rel="noopener">View page</a><button class="btn ghost danger" type="button" id="h-del">Delete</button>`}<button class="btn ghost" type="button" data-mcancel>Cancel</button></div>
    </form>`, true);
  const msg = (x, bad) => { const e = $("#h-msg"); e.className = bad ? "msg err" : "msg"; e.textContent = x || ""; };
  if (isNew) { const t = $("#h-t"), u = $("#h-u"); let touched = false; u.oninput = () => (touched = true); t.oninput = () => { if (!touched) u.value = slugify(t.value); }; if (seed) u.value = slugify(t.value); }
  $("#mClose").onclick = close; m.querySelector("[data-mcancel]").addEventListener("click", close, { once: true });
  $("#hForm").onsubmit = async (e) => {
    e.preventDefault(); const b = $("#h-save"); b.disabled = true;
    const body = { slug: $("#h-u").value.trim(), title: $("#h-t").value, name: $("#h-t").value, category: $("#h-c").value, kind: $("#h-k").value, summary: $("#h-s").value, body: $("#h-b").value, keywords: $("#h-w").value, video: $("#h-v").value, sort: $("#h-o").value, status: $("#h-p").value };
    try { await api("/api/admin/help", { method: "POST", body: JSON.stringify(body) }); close(); toast(body.status === "draft" ? "Saved as a draft" : "Saved. It is live within a minute."); renderHelp(main, q); }
    catch (er) { b.disabled = false; msg(er.message, true); }
  };
  const del = $("#h-del");
  if (del) del.onclick = async (e) => {
    if (!tap(e.currentTarget, "delete")) return;
    try { await api("/api/admin/help/" + encodeURIComponent(a.slug), { method: "DELETE" }); close(); toast("Deleted"); renderHelp(main, q); }
    catch (er) { msg(er.message, true); }
  };
  $("#h-t").focus();
}
