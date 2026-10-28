// Monetization settings. Everything is OFF until a value is filled in; no secrets belong here (these are public links).
export const SITE = {
  // Tip jar. Cash App: "https://cash.app/$yourcashtag". Leave "" to hide the donate button.
  donateUrl: "",
  donateLabel: "Tip with Cash App",

  // Amazon Associates tracking id (looks like "socallights-20"). Leave "" to hide the "Shop for the season" block.
  amazonTag: "",
  // Shop shortcuts by season: [label, Amazon search words].
  shop: {
    halloween: [["Costumes", "halloween costumes"], ["Decorations", "halloween decorations outdoor"], ["Candy & treats", "halloween candy variety pack"]],
    christmas: [["Christmas lights", "led christmas lights outdoor"], ["Trees & garland", "artificial christmas tree"], ["Holiday decor", "christmas outdoor decorations"]],
    newyear: [["Party supplies", "new years eve party supplies"], ["Sparklers & noisemakers", "new years eve noisemakers"]],
    spring: [["Picnic gear", "picnic blanket basket set"], ["Garden & wildflower", "wildflower seed mix"]],
    summer: [["Fourth of July", "4th of july decorations"], ["Beach & cooler", "beach canopy cooler"]],
  },

  // Ticket affiliate programs: add a tracking query parameter to links on a matching host,
  // for example { "eventbrite.com": { param: "aff", value: "socallights" } }. Empty = links are left untouched.
  ticketAffiliates: {},

  // "Feature your event" payment links (Stripe Payment Link, Cash App or PayPal). Empty = the page shows an email button instead.
  featurePay: { pin: "", top: "", season: "" },
  contactEmail: "rey@forza-tek.com",
};
