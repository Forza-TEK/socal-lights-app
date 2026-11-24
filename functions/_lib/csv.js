// The one CSV cell rule for every Admin export: a leading = + - @ (or a tab / carriage return) would run as a formula when the file is opened in a spreadsheet, so it gets a ' in front (CSV injection).
// Cells with a comma, quote or line break are quoted. Used by admin/export.js and admin/users/index.js.
export const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const csvResponse = (name, head, rows) => new Response([head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
