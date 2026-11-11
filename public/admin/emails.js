// Admin > Settings > Email templates: every automatic email the site sends, with its plain-text and HTML versions.
import { esc, toolbar, wireToolbar, tap, toast, modalFrame } from "/admin/kit.js?v=20261113a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const ago = (s) => { const t = new Date(String(s).replace(" ", "T") + "Z"); return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
let DATA = null;

const TABNAME = { account: "Sign-in", listing: "Houses and events", installer: "Installers", contest: "Organizers", entrant: "Entrants and judges", admin: "Admin" };
let TAB = "";
try { TAB = sessionStorage.getItem("scl-emtab") || ""; } catch {}
const card = (t) => `<button type="button" class="emcard" data-emopen="${esc(t.id)}"><span class="emct"><b>${esc(t.name)}</b>${t.edited ? '<span class="tag warn">Edited</span>' : ""}</span><span class="ems">${esc(t.to)}</span><span class="emw">${esc(t.when)}</span></button>`;

export async function renderEmails(main, q = "") {
  DATA = await api("/api/admin/emails");
  const items = DATA.items, groups = DATA.groups.filter((g) => items.some((t) => t.group === g.key));
  if (!groups.some((g) => g.key === TAB)) TAB = groups[0].key;
  const edited = items.filter((t) => t.edited).length;
  main.innerHTML = toolbar({ search: { placeholder: "Search all emails", value: q }, count: `${items.length} emails${edited ? ` · ${edited} edited` : ""}` })
    + `<div class="emtabs" role="tablist" aria-label="Email groups">${groups.map((g) => `<button type="button" role="tab" class="emtab" data-emtab="${esc(g.key)}" aria-selected="false">${esc(TABNAME[g.key] || g.label)} <span>${items.filter((t) => t.group === g.key).length}</span></button>`).join("")}</div>`
    + `<p class="meta emintro" id="emintro"></p><div class="emgrid" id="emlist" role="tabpanel"></div>`;
  const paint = (query) => {
    const w = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = w.length ? items.filter((t) => w.every((x) => (t.name + " " + t.to + " " + t.when + " " + t.subject).toLowerCase().includes(x))) : items.filter((t) => t.group === TAB);
    main.querySelectorAll("[data-emtab]").forEach((b) => b.setAttribute("aria-selected", String(!w.length && b.dataset.emtab === TAB)));
    const g = groups.find((x) => x.key === TAB);
    $("#emintro").textContent = w.length ? `${list.length} ${list.length === 1 ? "email matches" : "emails match"} in every group.` : "Each goes out as plain text and a matching HTML version. Tap one to read and edit it.";
    $("#emlist").innerHTML = list.length ? list.map(card).join("") : `<div class="empty" style="grid-column:1/-1">Nothing matches that.</div>`;
  };
  paint(q);
  wireToolbar(main, { onSearch: (v) => { q = v; paint(v); } });
  main.onclick = (e) => {
    const o = e.target.closest("[data-emopen]"); if (o) return openEmail(o.dataset.emopen, main, q);
    const t = e.target.closest("[data-emtab]"); if (!t) return;
    TAB = t.dataset.emtab; try { sessionStorage.setItem("scl-emtab", TAB); } catch {}
    q = ""; const si = main.querySelector("[data-search]"); if (si) si.value = ""; paint("");
  };
}

function openEmail(id, main, q = "") {
  const t = DATA.items.find((x) => x.id === id); if (!t) return;
  const m = $("#modal"); m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  const chips = t.vars.map((v) => `<button type="button" class="chip emchip" data-ins="${esc(v.key)}" title="${esc(v.label)}. Example: ${esc(String(v.sample).slice(0, 80))}">{{${esc(v.key)}}}${v.required ? " *" : ""}</button>`).join("");
  m.innerHTML = modalFrame(t.name, `
    <p class="meta" style="margin:-4px 0 12px">Sent to ${esc(t.to.toLowerCase())}. ${esc(t.when)}</p>
    <form class="f" id="emForm" novalidate>
      <fieldset class="fsec"><legend>Wording</legend><div class="fgrid">
        <div class="ff c6"><label for="em-s">Subject</label><input id="em-s" maxlength="200" value="${esc(t.subject)}" autocomplete="off"></div>
        <div class="ff c6"><label for="em-b">Email text</label><textarea id="em-b" rows="${t.format ? 18 : 8}" maxlength="6000" spellcheck="true">${esc(t.body)}</textarea>
          <small class="fhint">Blank lines start a new paragraph. Start a line with "- " for a list. Web addresses become links in the HTML version.</small>${t.format ? `<small class="fhint" style="display:block;margin-top:6px">${esc(t.format)}</small>` : ""}</div>
        <div class="ff c6"><label>Insert a value</label><div class="emchips">${chips}</div>
          <small class="fhint">Each {{value}} is filled in when the email is sent. Values marked * must stay in the email. To show a line only when a value exists, wrap it like {{#reason}}A note: {{reason}}{{/reason}}.</small></div>
      </div></fieldset>
      <fieldset class="fsec"><legend>Preview with example values</legend>
        <div class="row" style="margin-bottom:10px"><div class="seg" role="group" aria-label="Version"><button type="button" data-pv="text" aria-pressed="true">Plain text</button><button type="button" data-pv="html" aria-pressed="false">HTML</button></div></div>
        <div class="emsub" id="em-psub"></div>
        <pre class="empre" id="em-ptext"></pre>
        <iframe class="emfr" id="em-phtml" title="HTML version" sandbox="" hidden></iframe>
      </fieldset>
      <div class="mfoot sticky"><button class="btn ice" type="submit" id="em-save">Save</button><button class="btn ghost" type="button" id="em-test">Email me a test</button>${t.edited ? `<button class="btn ghost danger" type="button" id="em-reset">Reset to default</button>` : ""}<button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="em-msg" role="status"></span></div>
    </form>`, true);
  const msg = (x, bad) => { const e = $("#em-msg"); e.className = bad ? "msg err" : "msg"; e.textContent = x || ""; };
  const subj = $("#em-s"), body = $("#em-b"); let last = body, seq = 0, tm;
  subj.onfocus = () => (last = subj); body.onfocus = () => (last = body);
  m.querySelectorAll("[data-ins]").forEach((b) => (b.onclick = () => {
    const f = last, a = f.selectionStart ?? f.value.length, z = f.selectionEnd ?? a, ins = `{{${b.dataset.ins}}}`;
    f.value = f.value.slice(0, a) + ins + f.value.slice(z); f.focus(); f.setSelectionRange(a + ins.length, a + ins.length); preview();
  }));
  const show = (v) => { m.querySelectorAll("[data-pv]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pv === v))); $("#em-ptext").hidden = v !== "text"; $("#em-phtml").hidden = v !== "html"; };
  m.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = () => show(b.dataset.pv)));
  async function preview() {
    clearTimeout(tm);
    tm = setTimeout(async () => {
      const mine = ++seq;
      try {
        const p = await api("/api/admin/mailpreview", { method: "POST", body: JSON.stringify({ id: t.id, subject: subj.value, body: body.value }) });
        if (mine !== seq) return;
        $("#em-psub").innerHTML = `<b>Subject:</b> ${esc(p.subject)}`; $("#em-ptext").textContent = p.text; $("#em-phtml").srcdoc = p.html; msg("");
      } catch (e) { if (mine === seq) msg(e.message, true); }
    }, 250);
  }
  subj.oninput = preview; body.oninput = preview; preview();
  $("#mClose").onclick = close; m.querySelector("[data-mcancel]").addEventListener("click", close, { once: true });
  $("#emForm").onsubmit = async (e) => {
    e.preventDefault(); const b = $("#em-save"); b.disabled = true;
    try { await api("/api/admin/emails/" + encodeURIComponent(t.id), { method: "PUT", body: JSON.stringify({ subject: subj.value, body: body.value }) }); close(); toast("Saved. The next email uses this wording."); renderEmails(main, q); }
    catch (er) { b.disabled = false; msg(er.message, true); }
  };
  $("#em-test").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true; msg("Sending…");
    try { const r = await api("/api/admin/mailpreview", { method: "POST", body: JSON.stringify({ id: t.id, subject: subj.value, body: body.value, test: true }) }); msg("Test sent to " + r.to + "."); }
    catch (er) { msg(er.message, true); } b.disabled = false;
  };
  const rs = $("#em-reset");
  if (rs) rs.onclick = async (e) => {
    if (!tap(e.currentTarget, "reset")) return;
    try { await api("/api/admin/emails/" + encodeURIComponent(t.id), { method: "POST", body: JSON.stringify({ action: "reset" }) }); close(); toast("Back to the default wording"); renderEmails(main, q); }
    catch (er) { msg(er.message, true); }
  };
  subj.focus();
}
