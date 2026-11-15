// GET /.well-known/http-message-signatures-directory: the public key SoCalLightsBot signs its requests with (Web Bot Auth, functions/_lib/webbotauth.js).
// 404 until the secret BOT_SIGNING_KEY is set; the public key is derived from it (nothing secret is ever served).
import { loadBotKey, directoryResponse } from "../_lib/webbotauth.js";

export async function onRequestGet({ request, env }) {
  const key = await loadBotKey(env.BOT_SIGNING_KEY);
  if (!key) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return directoryResponse(request, key);
}
