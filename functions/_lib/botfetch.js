// The fetch our server code uses to read other sites' pages: honest user-agent (set by the caller), robots.txt first, and signed with Web Bot Auth when BOT_SIGNING_KEY is set.
import { botFetch } from "./webbotauth.js";
import { robotsCheck } from "./robots.js";

export const politeFetch = (env) => botFetch(env, { robots: robotsCheck });
