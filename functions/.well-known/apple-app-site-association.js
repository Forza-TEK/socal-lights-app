// GET /.well-known/apple-app-site-association: tells iOS that links to socallights.app content pages may open in the SoCal Lights app (universal links, audit F-45).
// Team ID 39HYGXRCC8 (Apple Developer > Membership details; not a secret) + the app's bundle id app.socallights.lights. Only content pages are listed: not /admin, /api, /profile or the add forms.
// It takes effect once an app build that carries the Associated Domains entitlement (app/ios/App/App/App.entitlements) is installed.
export const APP_ID = "39HYGXRCC8.app.socallights.lights";
export const AASA = { applinks: { details: [{ appIDs: [APP_ID], components: [{ "/": "/e/*" }, { "/": "/h/*" }, { "/": "/c/*" }, { "/": "/in/*" }, { "/": "/in" }] }] } };
export async function onRequestGet() {
  return new Response(JSON.stringify(AASA), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
