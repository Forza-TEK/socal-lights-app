// The season gap report for functions (the Grok work order). Same counting as scripts/coverage-gaps.mjs, which reads files and so cannot run inside a Pages Function.
import { SEASONS } from "../../public/seasons.js";
import { CATEGORIES, activeSeasons } from "../../scripts/coverage-categories.mjs";

export const statusOf = (n, min) => (n === 0 && min > 0 ? "EMPTY" : n < min / 2 ? "THIN" : n < min ? "LOW" : "OK");
const text = (e) => `${e.n || ""} ${e.v || ""}`;

/** events: [{ n (name), v (venue), t (type), sn (season), e (end date) }], already limited to upcoming events. */
export function seasonReport(events, today) {
  return activeSeasons(SEASONS, today).map((s) => ({
    season: s, label: SEASONS[s].label, upcoming: events.filter((e) => e.sn === s).length,
    categories: (CATEGORIES[s] || []).map((c) => {
      const count = events.filter((e) => e.sn === s && ((c.types && c.types.includes(e.t)) || (c.rx && c.rx.test(text(e))))).length;
      return { id: c.id, label: c.label, count, min: c.min, status: statusOf(count, c.min), queries: c.queries, where: c.where };
    }),
  }));
}
