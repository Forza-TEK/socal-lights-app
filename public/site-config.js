// Monetization settings. Everything is OFF until a value is filled in; no secrets belong here (these are public links).
export const SITE = {
  // Tip jar. Cash App: "https://cash.app/$yourcashtag". Leave "" to hide the donate button.
  donateUrl: "https://cash.app/$RelaxationMeditation",
  donateLabel: "Tip with Cash App",

  // Amazon Associates tracking id (looks like "socallights-20"). Leave "" to hide the "Shop for the season" block.
  amazonTag: "socallightsap-20",
  // Shop shortcuts by season: [label, Amazon search words].
  shop: {
    halloween: [["Costumes", "halloween costumes"], ["Decorations", "halloween decorations outdoor"], ["Candy & treats", "halloween candy variety pack"]],
    christmas: [["Christmas lights", "led christmas lights outdoor"], ["Trees & garland", "artificial christmas tree"], ["Holiday decor", "christmas outdoor decorations"]],
    newyear: [["Party supplies", "new years eve party supplies"], ["Sparklers & noisemakers", "new years eve noisemakers"]],
    spring: [["Picnic gear", "picnic blanket basket set"], ["Garden & wildflower", "wildflower seed mix"]],
    summer: [["Fourth of July", "4th of july decorations"], ["Beach & cooler", "beach canopy cooler"]],
  },

  // Ticket affiliate programs, by the host of the event link. Two kinds of rule:
  //   { "eventbrite.com": { param: "aff", value: "socallights" } }                       adds a tracking parameter
  //   { "ticketmaster.com": { template: "https://ticketmaster.evyy.net/c/ID/CAMPAIGN/4272?u={url}" } }  wraps the link in a network deep link ({url} = the event link)
  // Empty = links are left untouched.
  ticketAffiliates: {},

  // "Feature your event" payment links. Cash App links take the amount at the end ($5 / $10 / $15). Empty = the page shows an email button instead.
  featurePay: { pin: "https://cash.app/$RelaxationMeditation/5", top: "https://cash.app/$RelaxationMeditation/10", season: "https://cash.app/$RelaxationMeditation/15" },
  contactEmail: "info@socallights.app",
};
