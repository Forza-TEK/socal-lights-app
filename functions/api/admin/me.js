// GET /api/admin/me — confirms the admin login is working.
import { json } from "../../_lib/util.js";
export const onRequestGet = ({ data }) => json({ email: data.admin.email });
