// DRAFT (owner's lawyer to review): one refund statement per paid product, written once. The receipt emails (functions/_lib/*mail.js), Pricing and the Terms all use these
// sentences, so a buyer reads the same promise everywhere. They restate what the Terms already say (a pass and an Event Partner plan: full refund if we cannot apply it, anything else by hand). Never write a price here.
export const REFUND = {
  event: "If we cannot list or feature your event, you get a full refund. Once your placement is live it is non-refundable, but if your event is cancelled we will move it to another of your events or refund the unused time.",
  home: "If we cannot feature your home, you get a full refund. Once your placement is live it is non-refundable.",
  pass: "If we cannot apply your pass, you get a full refund. If something else is wrong, write to us and we will look at it by hand.",
  partner: "If we cannot apply your plan, you get a full refund. If something else is wrong, write to us and we will look at it by hand.",
  installer: "If we cannot put your placement on, you get a full refund. Once it is running it is non-refundable, and we do not refund or credit for timing.",
};
// Where the full terms for each product are on /terms.
export const REFUND_ANCHOR = { event: "refunds", home: "refunds", pass: "passes", partner: "paid", installer: "paid" };
export const refundTermsUrl = (kind) => "https://socallights.app/terms#" + (REFUND_ANCHOR[kind] || "paid");
