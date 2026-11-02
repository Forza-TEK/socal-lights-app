// POST /api/me/profile { name, street, city, zip } — your optional profile details. Everything is optional; blank clears it.
import { normName, normStreet, normZip } from "../../_lib/fields.js";
import { json, err, clean } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { CITY } from "../../../public/cities.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be saved.");
  const name = normName(clean(b.name, 80)), street = normStreet(clean(b.street, 120)), city = clean(b.city, 60), zip = normZip(clean(b.zip, 12)) || clean(b.zip, 5);
  if (city && !CITY[city]) return err(400, "Choose a city from the list.");
  if (zip && !/^\d{5}$/.test(zip)) return err(400, "The ZIP code needs 5 digits.");
  await env.DB.prepare("UPDATE users SET name = ?, street = ?, city = ?, zip = ? WHERE id = ?").bind(name, street, city, zip, user.id).run();
  return json({ ok: true });
}
