// Monetization settings. Everything is OFF until a value is filled in; no secrets belong here (these are public links).
export const SITE = {
  // Tip jar. Cash App: "https://cash.app/$yourcashtag". Leave "" to hide the donate button.
  donateUrl: "https://cash.app/$RelaxationMeditation",
  donateLabel: "Tip with Cash App",

  // Ticket affiliate programs, by the host of the event link. Two kinds of rule:
  //   { "eventbrite.com": { param: "aff", value: "socallights" } }                       adds a tracking parameter
  //   { "ticketmaster.com": { template: "https://ticketmaster.evyy.net/c/ID/CAMPAIGN/4272?u={url}" } }  wraps the link in a network deep link ({url} = the event link)
  // Empty = links are left untouched.
  ticketAffiliates: {},

  contactEmail: "info@socallights.app",
};
