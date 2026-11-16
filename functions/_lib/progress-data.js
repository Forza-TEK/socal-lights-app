// The two lists on Admin > Progress that the database cannot know: how far the Admin redesign has got, and what shipped. KEEP THESE CURRENT (one line each time something is finished).
export const REDESIGN = [
  ["Events", "done", "2026-11-16"], ["From Grok", "done", "2026-11-16"], ["Submitted events", "done", "2026-11-16"], ["Event claims", "done", "2026-11-16"],
  ["Progress", "done", "2026-11-16"],
  ["Reports", "next", ""], ["Replaced records", "next", ""], ["Houses (waiting and published)", "todo", ""], ["Contests", "todo", ""], ["Installers", "todo", ""], ["Users", "todo", ""],
  ["Orders", "todo", ""], ["Event Partners", "todo", ""], ["Data check", "todo", ""], ["Activity log", "todo", ""], ["Cloudflare usage", "todo", ""], ["Outreach", "todo", ""],
  ["Ads", "todo", ""], ["Email templates", "todo", ""], ["AI assistant", "todo", ""], ["Help Center", "todo", ""], ["Dashboard", "todo", ""], ["Signed-in visitor pages", "todo", ""],
];
export const SHIPPED = [
  ["2026-11-16", "Admin > Progress: live counts from the database, refreshed while the page is open"],
  ["2026-11-16", "Admin redesign: Submitted events and Event claims converted"],
  ["2026-11-16", "Admin redesign: breadcrumb top bar, pill tabs, Events and From Grok as tables"],
  ["2026-11-15", "Map fixes from Grok's first update run: The Grove split, Old Pasadena start corrected"],
  ["2026-11-15", "Verified-bot key set; Cloudflare submission waiting for review"],
  ["2026-11-15", "Sweeps moved to Grok; Claude city sweep and browser pass paused"],
  ["2026-11-15", "Grok update call live: confirms and corrects events already on the map"],
  ["2026-11-15", "Intake accepts photo links, social post pages and the Santa type; daily cap raised to 600"],
  ["2026-11-15", "Grok event intake live: checks every row, publishes confirmed events tagged From Grok"],
];
