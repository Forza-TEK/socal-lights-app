// "Report or hide" for pages that are not the map: contest entries and installer pages (Apple 1.2, user-generated content).
// Any <a data-report="<ref>|<name>"> opens the same short form as the map (app.js) and posts to the existing POST /api/report.
// Refs: "h-<post id>" for a contest entry (the same ref a home has), "c-<slug>" for a contest, "i-<slug>" for an installer.
// "Hide for me" keeps the ref in the same device list the map uses ("socal-hidden") and hides the element marked data-rkey="<ref>".
(() => {
  if (window.__scReport) return; window.__scReport = 1;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const load = () => { try { return JSON.parse(localStorage.getItem("socal-hidden") || "[]").filter((k) => typeof k === "string").slice(0, 500); } catch { return []; } };
  const hidden = () => new Set(load());
  const applyHidden = () => { const h = hidden(); document.querySelectorAll("[data-rkey]").forEach((el) => { el.hidden = h.has(el.dataset.rkey); }); };
  const st = document.createElement("style");
  st.textContent = ".rptscrim{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.55);display:grid;place-items:end center;overflow-y:auto}.rptdlg{width:min(460px,100%);background:var(--surface,#fff);color:var(--ink,#1a1a1a);border-radius:24px 24px 0 0;padding:20px 20px 26px;display:grid;gap:10px;font:16px/1.4 var(--f-body,system-ui,sans-serif)}@media(min-width:600px){.rptscrim{place-items:center}.rptdlg{border-radius:24px}}.rptdlg h3{margin:0;font-size:20px}.rptdlg p{margin:0;color:var(--muted,#555)}.rptdlg label{display:grid;gap:4px;font-size:14px;color:var(--muted,#555)}.rptdlg textarea,.rptdlg input{font:inherit;min-height:48px;padding:10px 12px;border:1px solid var(--line,#ccc);border-radius:12px;background:transparent;color:inherit}.rpterr{color:#b42318!important;font-size:14px}.rptrow{display:flex;gap:10px;flex-wrap:wrap}.rptwhy{border:0;margin:0;padding:0;display:grid;gap:6px}.rptwhy legend{padding:0;font-size:14px;color:var(--muted,#555);margin-bottom:4px}.rptwhy label{display:flex;align-items:center;gap:10px;color:var(--ink,#1a1a1a);min-height:36px}.rptwhy input{min-height:0;width:20px;height:20px;padding:0}.rptnote{font-size:13px}.rptgo,.rptx,.rpthide{min-height:48px;padding:0 22px;border-radius:999px;border:0;font:700 16px inherit;cursor:pointer}.rptgo{background:var(--season,#1a7f4b);color:var(--on-season,#fff)}.rptx,.rpthide{background:var(--surface-2,#eee);color:var(--ink,#1a1a1a)}.reportline{font-size:13px;margin:6px 0 0}[data-rkey][hidden]{display:none!important}";
  document.head.appendChild(st);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-report]"); if (!a) return; e.preventDefault();
    const [ref, ...rest] = a.dataset.report.split("|"), name = rest.join("|");
    const o = document.createElement("div"); o.className = "rptscrim";
    o.innerHTML = `<form class="rptdlg" role="dialog" aria-modal="true" aria-label="Report or hide this listing"><h3>Report or hide</h3><p>${esc(name)}</p><fieldset class="rptwhy"><legend>What is the problem?</legend><label><input type="radio" name="why" value="objectionable"> Offensive, unsafe or inappropriate photo or text</label><label><input type="radio" name="why" value="fake"> Not a real event or home</label><label><input type="radio" name="why" value="wrong" checked> Wrong information (date, place, price, closed)</label><label><input type="radio" name="why" value="other"> Something else</label></fieldset><label>Details <span>(optional)</span><textarea name="m" rows="3" maxlength="600"></textarea></label><label>Your email, if you want a reply <span>(optional)</span><input name="c" type="email" maxlength="120" autocomplete="email"></label><p class="rpterr" role="alert" hidden></p><p class="rptnote">We review reports of objectionable content within 24 hours and remove what breaks the Terms.</p><div class="rptrow"><button class="rptgo" type="submit">Send report</button><button class="rpthide" type="button">Hide for me</button><button class="rptx" type="button">Cancel</button></div></form>`;
    document.body.appendChild(o); const f = o.querySelector("form"); f.why[2].focus();
    const close = () => o.remove(); o.onclick = (ev) => { if (ev.target === o) close(); }; o.querySelector(".rptx").onclick = close;
    o.querySelector(".rpthide").onclick = () => { try { localStorage.setItem("socal-hidden", JSON.stringify([...hidden().add(ref)].slice(-500))); } catch {} applyHidden(); close(); };
    f.onsubmit = async (ev) => { ev.preventDefault(); const er = o.querySelector(".rpterr"); er.hidden = true;
      const r = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref, name, reason: f.why.value, message: f.m.value, contact: f.c.value }) }).catch(() => null), j = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) { er.textContent = (j && j.error) || "That didn't send. Try again."; er.hidden = false; return; }
      o.innerHTML = `<div class="rptdlg" role="dialog" aria-modal="true"><h3>Thanks</h3><p>${f.why.value === "objectionable" ? "We review these within 24 hours." : "We'll look into it."}</p><div class="rptrow"><button class="rptx" type="button">Close</button></div></div>`; o.querySelector(".rptx").onclick = close; };
  });
  new MutationObserver(applyHidden).observe(document.documentElement, { childList: true, subtree: true });
  applyHidden();
})();
