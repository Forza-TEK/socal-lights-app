// Where the add forms keep an unfinished draft on THIS device.
//   answers : localStorage, under a key made from the form and the signed-in account ("scl-house-draft:<user id>"), so two people sharing a browser never see each other's draft
//   photos  : IndexedDB (database "scl-drafts"), under the same key. The photos are already shrunk on the phone (about 100 to 400 KB each), so eight fit easily. Nothing is uploaded until the form is sent.
// Signing out (or deleting the account) removes every draft here, answers and photos. Every call is safe when storage is blocked (private window, full disk): it just keeps nothing.
const DB = "scl-drafts", STORE = "photos";
export const draftKey = (base, uid) => `${base}:${uid || "anon"}`;
// The keys older versions used had no account in them, so nobody can say whose they are: they are removed rather than shown to the wrong person.
const LEGACY = /^scl-(?:house|event|contest)-draft$|^scl-entry-draft-[a-z0-9-]+$/, KEYED = /^scl-(?:house|event|contest|entry)-draft(?:-[a-z0-9-]+)?:/;

export function purgeLegacyDrafts() {
  try { for (const k of Object.keys(localStorage)) if (LEGACY.test(k)) localStorage.removeItem(k); } catch {}
}

const open = () => new Promise((res) => {
  try {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = r.onblocked = () => res(null);
  } catch { res(null); }
});
const tx = async (mode, fn) => {
  const db = await open(); if (!db) return null;
  return new Promise((res) => {
    try {
      const t = db.transaction(STORE, mode), q = fn(t.objectStore(STORE));
      t.oncomplete = () => { db.close(); res(q ? q.result ?? null : null); };
      t.onerror = t.onabort = () => { db.close(); res(null); };
    } catch { try { db.close(); } catch {} res(null); }
  });
};
// blobs: the compressed photos in order. draftId: the saved-to-account draft they belong to (so a different draft never picks them up).
export const savePhotos = (key, blobs, draftId) => (blobs && blobs.length ? tx("readwrite", (s) => s.put({ blobs, draftId: draftId || "", t: Date.now() }, key)) : dropPhotos(key));
export const loadPhotos = (key) => tx("readonly", (s) => s.get(key));
export const dropPhotos = (key) => tx("readwrite", (s) => s.delete(key));

export function clearAllLocalDrafts() {
  try { for (const k of Object.keys(localStorage)) if (LEGACY.test(k) || KEYED.test(k)) localStorage.removeItem(k); } catch {}
  try { indexedDB.deleteDatabase(DB); } catch {}
}
