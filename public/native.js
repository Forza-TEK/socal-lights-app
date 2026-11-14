// Bridges to the native iPhone/Android app (the Capacitor wrapper in app/, whose browser string contains "SoCalLightsApp").
// Everything here does nothing in a normal browser. A plugin is used only when the installed app build has it (window.Capacitor.Plugins.<Name>),
// so the site can ship ahead of an app update and an old app build simply falls back to the web behaviour.
export const IN_APP = /SoCalLightsApp/.test(navigator.userAgent);
const plugin = (name) => { try { return (IN_APP && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null; } catch { return null; } };

// The phone's own share sheet (@capacitor/share). Resolves true when the sheet handled it (shared, or the person closed it), false when
// there is no native sheet and the caller should use navigator.share or copy the link.
export async function nativeShare({ title, text, url }) {
  const S = plugin("Share"); if (!S || !S.share) return false;
  try { await S.share({ title, text, url, dialogTitle: title }); return true; }
  catch (e) { return /cancel/i.test(String((e && (e.message || e.errorMessage)) || e)); } // closing the sheet rejects with "Share canceled"
}

// Reminders for saved events (@capacitor/local-notifications). That plugin is not installed in app/ yet (see docs/app-store.md, "Native features"),
// so today this finds nothing and returns. Once the plugin is added to the app build, hearting an event that has not started yet schedules a
// notification for 9 am local time on its first day, and un-hearting cancels it. Houses and events already under way get none.
const noteId = (id) => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 2147483000) + 1; };
export const reminderTime = (start, now = new Date()) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(start || "")); if (!m) return null;
  const at = new Date(+m[1], +m[2] - 1, +m[3], 9, 0, 0);
  return at.getTime() > now.getTime() ? at : null;
};
export async function syncReminder(ev, on) {
  const N = plugin("LocalNotifications"); if (!N || !ev || !ev.id) return false;
  try {
    const id = noteId(ev.id);
    if (!on) { await N.cancel({ notifications: [{ id }] }); return true; }
    const at = reminderTime(ev.s); if (!at) return false;
    let p = await N.checkPermissions(); if (p.display === "prompt" || p.display === "prompt-with-rationale") p = await N.requestPermissions();
    if (p.display !== "granted") return false;
    await N.schedule({ notifications: [{ id, title: ev.n || "SoCal Lights", body: "Starts today. Open SoCal Lights for hours and directions.", schedule: { at }, extra: { eventId: ev.id } }] });
    return true;
  } catch { return false; }
}
