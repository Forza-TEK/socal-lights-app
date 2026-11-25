// The one place that decides "this text needs a person to look at it first". New homes, edited homes and new or edited events all use it, so a change to a live listing
// goes through the same rule a new submission does.
export const BAD = /\b(viagra|casino|porn|xxx|escort|crypto|bitcoin|loan|forex|cbd|betting)\b/i;
export const needsReview = (...texts) => BAD.test(texts.filter(Boolean).join(" "));

// Events only (not homes or contests): the owner's rule is that an event that fits a season is posted wherever it is held and whatever it promotes, so "casino" and gambling-promo wording are fine.
// The other words on the list (porn, escort, crypto, loan and so on) still send an event to review.
export function eventNeedsReview(...texts) {
  return BAD.test(texts.filter(Boolean).join(" ").replace(/\bcasinos?\b/gi, " "));
}
