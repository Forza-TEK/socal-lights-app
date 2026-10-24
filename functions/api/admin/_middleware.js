// Every /api/admin/* request must carry a valid Cloudflare Access login.
import { requireAdmin, err } from "../../_lib/util.js";

export async function onRequest(context) {
  const who = await requireAdmin(context.request, context.env);
  if (!who) return err(401, "Sign in through Cloudflare Access to use the admin tools.");
  context.data.admin = who;
  return context.next();
}
