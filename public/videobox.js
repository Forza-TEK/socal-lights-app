// The video box of a home's or a contest entry's edit sheet: one video, either a short clip uploaded from the phone or a YouTube/Vimeo link.
// A link shows at once; a clip is held until Admin approves it (the person can watch it here meanwhile). Talks to /api/me/video/<postId> (functions/api/me/video/[id].js).
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
if (!document.getElementById("vbox-css")) { const st = document.createElement("style"); st.id = "vbox-css"; st.textContent = ".vbox video{display:block;width:100%;max-width:420px;border-radius:10px;background:#000;margin:0 0 10px}.vbox .vlink{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}.vbox .vlink input{flex:1 1 240px;min-width:0}.vbox .padd{display:flex;gap:8px;flex-wrap:wrap;align-items:center}"; document.head.appendChild(st); } // its own few styles, so it looks right on every page that uses it
export const MAX_VIDEO_MB = 40, MAX_VIDEO_SECONDS = 75;

export function videoBoxHtml(h, { noun = "home" } = {}) {
  const id = esc(h.id || "x"), file = h.video_file || "", link = h.video || "", ok = !!h.video_ok, has = !!(file || link);
  const preview = file ? `<video controls playsinline preload="metadata" src="/api/photo/${esc(file)}"></video>` : link ? `<p class="small">Video link: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a></p>` : "";
  const msg = file ? (ok ? `Your video is live: people can watch it on your ${noun}'s page.` : "Uploaded. It shows on the map once it is approved, usually within a day. You can watch it here meanwhile.") : link ? `This link shows as a Watch the video button on your ${noun}'s page.` : `No video yet. Upload a short clip (up to about a minute, ${MAX_VIDEO_MB} MB) or paste a YouTube or Vimeo link.`;
  return `<div class="vbox" data-vbox>${preview}<p class="small muted" data-vmsg role="status">${msg}</p>
    <div class="padd"><label class="btn out sm" for="vf-${id}">${has ? "Replace with a clip" : "Upload a video"}</label><input id="vf-${id}" type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden data-evideo>
      <button type="button" class="btn out sm" data-vlink-open>Paste a link</button>${has ? '<button type="button" class="btn out sm" data-vrm>Remove video</button>' : ""}</div>
    <div class="vlink" data-vlink hidden><input type="url" data-vlink-in maxlength="300" placeholder="Paste a YouTube or Vimeo link" aria-label="YouTube or Vimeo link"><button type="button" class="btn sm" data-vlink-save>Save link</button></div></div>`;
}

// How long a picked clip is, and whether this browser can play it at all (if it cannot, other people's often cannot either). Resolves { seconds } or { error }.
function inspect(file) {
  return new Promise((done) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file); v.preload = "metadata"; v.muted = true;
    const end = (r) => { URL.revokeObjectURL(url); done(r); }, t = setTimeout(() => end({ error: "That video could not be read." }), 15000);
    v.onloadedmetadata = () => { clearTimeout(t); end({ seconds: v.duration }); };
    v.onerror = () => { clearTimeout(t); end({ error: "This video can't be played in your browser, so we can't show it either. Try another clip. On an iPhone, choose Settings > Camera > Formats > Most Compatible, then record again." }); };
    v.src = url;
  });
}

// Wires the box inside a form (or any element): upload, link, remove. item is the home row (its video fields are updated); url is /api/me/video/<id>.
export function wireVideoBox(root, { item, url, noun = "home", friendly = (e) => e.message || "That didn't work." }) {
  const box = () => root.querySelector("[data-vbox]"), say = (t) => { const m = box() && box().querySelector("[data-vmsg]"); if (m) m.textContent = t; };
  const set = (v) => { item.video = v.link || ""; item.video_file = v.file || ""; item.video_ok = v.ok ? 1 : 0; const b = box(); if (b) { const keep = b.querySelector("[data-vlink]").hidden; b.outerHTML = videoBoxHtml(item, { noun }); void keep; } };
  const call = async (body) => { const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "That didn't work."); return j.video; };
  // fetch, not XMLHttpRequest: the Admin "act as this person" view only redirects fetch calls
  const upload = async (file) => {
    let r; try { r = await fetch(url, { method: "PUT", headers: { "content-type": file.type || "video/mp4" }, body: file }); } catch { throw new Error("The upload was interrupted. Check your connection and try again."); }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "That didn't work."); return j.video;
  };
  root.addEventListener("change", async (e) => {
    if (!e.target.matches("[data-evideo]")) return;
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    if (file.size > MAX_VIDEO_MB * 1048576) return say(`That video is ${Math.round(file.size / 1048576)} MB. The limit is ${MAX_VIDEO_MB} MB (about a minute from a phone). Pick a shorter clip or trim it first.`);
    say("Checking the video…");
    const info = await inspect(file); if (info.error) return say(info.error);
    if (info.seconds > MAX_VIDEO_SECONDS) return say(`That video is ${Math.round(info.seconds)} seconds. Keep it to about a minute so it loads quickly on phones.`);
    say(`Uploading ${Math.max(1, Math.round(file.size / 1048576))} MB… this can take a minute on a phone connection.`);
    try { set(await upload(file)); say("Uploaded. It shows on the map once it is approved, usually within a day."); } catch (x) { say(friendly(x)); }
  });
  root.addEventListener("click", async (e) => {
    const open = e.target.closest("[data-vlink-open]"), save = e.target.closest("[data-vlink-save]"), rm = e.target.closest("[data-vrm]");
    if (open) { const l = box().querySelector("[data-vlink]"); l.hidden = !l.hidden; if (!l.hidden) l.querySelector("input").focus(); return; }
    if (save) { const v = box().querySelector("[data-vlink-in]").value.trim(); if (!v) return say("Paste a YouTube or Vimeo link first."); try { set(await call({ action: "link", url: v })); say("Link saved."); } catch (x) { say(friendly(x)); } return; }
    if (rm) { try { set(await call({ action: "remove" })); say("Video removed."); } catch (x) { say(friendly(x)); } }
  });
}

// On the "you're done" screen of the add forms: an optional video box for the home or entry that was just created. The screen has an empty <div id="vslot"></div> for it.
export function mountVideoSlot(id, { noun = "home", friendly } = {}) {
  const put = () => {
    const slot = document.getElementById("vslot"); if (!slot || slot.dataset.ready) return !!slot;
    slot.dataset.ready = "1"; const item = { id };
    slot.innerHTML = `<h2 style="margin-bottom:6px">Add a video <span class="muted" style="font-weight:400">(optional)</span></h2><p class="help" style="margin:0 0 10px">A short clip of your lights, up to about a minute, or a YouTube or Vimeo link. You can also add or change it later from Your profile.</p>${videoBoxHtml(item, { noun })}`;
    wireVideoBox(slot, { item, url: "/api/me/video/" + id, noun, ...(friendly ? { friendly } : {}) }); return true;
  };
  if (!put()) requestAnimationFrame(() => { if (!put()) setTimeout(put, 200); });
}
