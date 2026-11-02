// Admin > Settings > Email templates: every automatic email the site sends, with its plain-text and HTML versions.
import { esc, rec, toolbar, wireToolbar, filterCards, tap, toast, modalFrame } from "/admin/kit.js?v=20261103a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const ago = (s) => { const t = new Date(String(s).replace(" ", "T") + "Z"); return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
let DATA = null;

export async function renderEmails(main) {
  DATA = await api("/api/admin/emails");
  const items = DATA.items;
  const sections = DATA.groups.map((g) => {
    const list = items.filter((t) => t.group === g.key);
    if (!list.length) return "";
    return `<h2 class="dh">${esc(g.label)}</h2><div class="cards">${list.map((t) => rec({
      attrs: `data-emid="${esc(t.id)}"`, title: esc(t.name), tags: [t.edited ? ["Edited", "warn"] : ["Default"]],
      meta: t.edited ? `Changed ${esc(ago(t.updated_at))}${t.updated_by ? " by " + esc(t.updated_by) : ""}` : "",
      facts: `<dt>Sent to</dt><dd>${esc(t.to)}</dd><dt>When</dt><dd>${esc(t.when)}</dd><dt>Subject</dt><dd>${esc(t.preview.subject)}</dd>`,
      body: `<p class="meta emx">${esc(t.preview.text.replace(/\s+/g, " ").slice(0, 190))}${t.preview.text.length > 190 ? "…" : ""}</p>`,
      edit: `<button type="button" class="btn ghost" data-emopen="${esc(t.id)}">View and edit</button>`,
    })).join("")}</div>`;
  }).join("");
  const edited = items.filter((t) => t.edited).length;
  main.innerHTML = toolbar({ search: { placeholder: "Search the emails" }, count: `${items.length}` })
    + `<p class="meta" style="margin:0 0 14px;max-width:760px">Every email the site sends on its own. Each one goes out as a plain-text version and a styled HTML version made from the same wording, so you only write it once. ${edited ? `${edited} ${edited === 1 ? "has" : "have"} been changed from the default.` : "None have been changed yet."} Examples on this page use made-up names and links. Changes apply to the next email sent.</p>`
    + `<div id="emlist">${sections}</div>`;
  wireToolbar(main, { onSearch: (q) => filterCards($("#emlist"), q) });
  main.onclick = (e) => { const b = e.target.closest("[data-emopen]"); if (b) openEmail(b.dataset.emopen, main); };
}

function openEmail(id, main) {
  const t = DATA.items.find((x) => x.id === id); if (!t) return;
  const m = $("#modal"); m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  const chips = t.vars.map((v) => `<button type="button" class="chip emchip" data-ins="${esc(v.key)}" title="${esc(v.label)}. Example: ${esc(String(v.sample).slice(0, 80))}">{{${esc(v.key)}}}${v.required ? " *" : ""}</button>`).join("");
  m.innerHTML = modalFrame(t.name, `
    <p class="meta" style="margin:-4px 0 12px">Sent to ${esc(t.to.toLowerCase())}. ${esc(t.when)}</p>
    <form class="f" id="emForm" novalidate>
      <fieldset class="fsec"><legend>Wording</legend><div class="fgrid">
        <div class="ff c6"><label for="em-s">Subject</label><input id="em-s" maxlength="200" value="${esc(t.subject)}" autocomplete="off"></div>
        <div class="ff c6"><label for="em-b">Email text</label><textarea id="em-b" rows="8" maxlength="6000" spellcheck="true">${esc(t.body)}</textarea>
          <small class="fhint">Blank lines start a new paragraph. Start a line with "- " for a list. Web addresses become links in the HTML version.</small></div>
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
    try { await api("/api/admin/emails/" + encodeURIComponent(t.id), { method: "PUT", body: JSON.stringify({ subject: subj.value, body: body.value }) }); close(); toast("Saved. The next email uses this wording."); renderEmails(main); }
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
    try { await api("/api/admin/emails/" + encodeURIComponent(t.id), { method: "POST", body: JSON.stringify({ action: "reset" }) }); close(); toast("Back to the default wording"); renderEmails(main); }
    catch (er) { msg(er.message, true); }
  };
  subj.focus();
}
