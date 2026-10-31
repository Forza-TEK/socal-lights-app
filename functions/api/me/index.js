// DELETE /api/me — delete your account. Removes your sign-ins, drafts, profile picture, contest entries (with their photos) and
// votes, closes contests you run (taking them off the map), and blanks your email on homes and events you posted.
import { json, err } from "../../_lib/util.js";
import { deleteAccount } from "../../_lib/account.js";
import { COOKIE, requireUser, sameOrigin, setCookie } from "../../_lib/auth.js";

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  await deleteAccount(env, user.id, user.email);
  return json({ ok: true }, { headers: { "set-cookie": setCookie(request, COOKIE, "", 0) } });
}
