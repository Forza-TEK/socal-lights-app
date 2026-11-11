// The one place that decides "this text needs a person to look at it first". New homes, edited homes and new or edited events all use it, so a change to a live listing
// goes through the same rule a new submission does.
export const BAD = /\b(viagra|casino|porn|xxx|escort|crypto|bitcoin|loan|forex|cbd|betting)\b/i;
export const needsReview = (...texts) => BAD.test(texts.filter(Boolean).join(" "));
