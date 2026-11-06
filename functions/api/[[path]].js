// Anything under /api/ that no other function handles: answer in JSON (with a 404) instead of an HTML page, so scripts and the site's own code can read the error.
import { json } from "../_lib/util.js";

export const onRequest = () => json({ error: "Not found." }, { status: 404 });
