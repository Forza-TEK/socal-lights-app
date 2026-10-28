// Monetization settings. Everything is OFF until a value is filled in; no secrets belong here (these are public links).
export const SITE = {
  // Tip jar. Cash App: "https://cash.app/$yourcashtag". Leave "" to hide the donate button.
  donateUrl: "https://cash.app/$RelaxationMeditation",
  donateLabel: "Tip with Cash App",

  // Amazon Associates tracking id (looks like "socallights-20"). Leave "" to hide the Shop tab.
  amazonTag: "socallightsap-20",
  // Shop tab, by season: three categories, each a list of [emoji, label, Amazon search words]. Links carry the tag above.
  shop: {
    halloween: [
      ["Costumes", [["🦸", "Kids costumes", "kids halloween costumes"], ["🧛", "Adult costumes", "adult halloween costumes"], ["🐶", "Pet costumes", "dog halloween costumes"], ["💄", "Makeup & face paint", "halloween makeup kit"], ["🧙", "Hats & wigs", "halloween witch hat wig"], ["🔦", "Light-up trick-or-treat gear", "light up trick or treat bag"]]],
      ["Decorations", [["💀", "Skeletons & props", "halloween skeleton decoration"], ["🎃", "Pumpkins & carving", "pumpkin carving kit"], ["🕸️", "Webs & spiders", "halloween spider web decoration"], ["💡", "Lights & projectors", "halloween projector lights outdoor"], ["🪦", "Yard & tombstones", "halloween yard decorations tombstone"], ["🫥", "Fog machines", "halloween fog machine"]]],
      ["Candy & treats", [["🍬", "Candy variety packs", "halloween candy variety pack"], ["🍫", "Chocolate bags", "halloween chocolate bulk"], ["🧁", "Baking & cupcake kits", "halloween baking supplies"], ["🥤", "Party cups & plates", "halloween party tableware"], ["🎁", "Treat bags & buckets", "halloween treat bags"], ["🦴", "Glow sticks & favors", "halloween glow sticks party favors"]]],
    ],
    christmas: [
      ["Lights", [["💡", "String lights", "led christmas string lights outdoor"], ["🌈", "Color-changing lights", "rgb color changing christmas lights"], ["🧊", "Icicle lights", "icicle christmas lights"], ["🔦", "Projector lights", "christmas laser projector lights outdoor"], ["🔌", "Timers & extension cords", "outdoor extension cord timer christmas lights"], ["🪜", "Light clips & hangers", "christmas light clips"]]],
      ["Trees & decor", [["🎄", "Artificial trees", "artificial christmas tree"], ["🌿", "Garland & wreaths", "christmas garland wreath"], ["🔔", "Ornaments", "christmas ornaments set"], ["🎅", "Inflatables", "christmas inflatables outdoor"], ["🧦", "Stockings & tree skirts", "christmas stockings tree skirt"], ["🕯️", "Candles & table decor", "christmas table decorations"]]],
      ["Gifts & fun", [["🎁", "Wrapping paper & bows", "christmas wrapping paper"], ["🧣", "Cozy winter wear", "ugly christmas sweater"], ["🍪", "Baking & cookie kits", "christmas cookie decorating kit"], ["🧩", "Family games", "family board games christmas gift"], ["☕", "Hot cocoa sets", "hot cocoa gift set"], ["🧸", "Stocking stuffers", "stocking stuffers kids"]]],
    ],
    newyear: [
      ["Party", [["🎉", "Party supplies", "new years eve party supplies"], ["🎈", "Balloons & banners", "new years eve balloons banner"], ["🎩", "Hats & glasses", "new years eve hats glasses"], ["🥂", "Glassware & toasts", "champagne flutes plastic party"], ["📯", "Noisemakers", "new years eve noisemakers"], ["✨", "Confetti & streamers", "confetti poppers"]]],
      ["Sparkle", [["🎇", "Sparklers", "party sparklers"], ["👗", "Sequin outfits", "sequin dress new years eve"], ["💄", "Glitter & makeup", "glitter makeup kit"], ["🧤", "Warm layers", "winter gloves scarf set"], ["🔦", "Glow & LED party", "led glow party favors"], ["📸", "Photo booth props", "photo booth props party"]]],
      ["Chinese New Year", [["🧧", "Red envelopes", "chinese new year red envelopes"], ["🏮", "Lanterns", "chinese new year lanterns"], ["🐉", "Decor & banners", "lunar new year decorations"], ["🥢", "Tableware", "chinese new year tableware"], ["🎊", "Party favors", "lunar new year party favors"], ["👘", "Outfits", "lunar new year clothing"]]],
    ],
    spring: [
      ["Outdoors", [["🧺", "Picnic sets", "picnic blanket basket set"], ["🥾", "Hiking gear", "hiking daypack"], ["🔭", "Binoculars", "compact binoculars"], ["🧴", "Sun protection", "sunscreen hat"], ["📷", "Phone & camera gear", "phone tripod"], ["🪑", "Folding chairs", "folding camping chair"]]],
      ["Garden", [["🌼", "Wildflower seeds", "wildflower seed mix"], ["🪴", "Planters & pots", "garden planters"], ["🧤", "Garden tools", "garden tool set"], ["💧", "Watering", "garden hose nozzle"], ["🦋", "Pollinator gardens", "butterfly garden seeds"], ["🌱", "Starter kits", "herb garden starter kit"]]],
      ["Easter & spring", [["🥚", "Easter eggs & baskets", "easter baskets eggs"], ["🐰", "Easter decor", "easter decorations"], ["🪁", "Kites & outdoor toys", "kite for kids"], ["🍬", "Easter candy", "easter candy"], ["🎀", "Spring decor", "spring door wreath"], ["👒", "Sun hats", "womens sun hat"]]],
    ],
    summer: [
      ["Fourth of July", [["🇺🇸", "Flags & banners", "american flag 4th of july"], ["🎆", "Decorations", "4th of july decorations"], ["🥳", "Party tableware", "patriotic party supplies"], ["👕", "Red, white & blue wear", "4th of july shirt"], ["✨", "Sparklers", "sparklers 4th of july"], ["🎈", "Balloons", "patriotic balloons"]]],
      ["Beach & shade", [["⛱️", "Beach canopies", "beach canopy"], ["🏖️", "Beach chairs", "beach chair"], ["🏄", "Boogie boards & toys", "beach toys kids"], ["🧴", "Sunscreen", "reef safe sunscreen"], ["🕶️", "Sunglasses", "polarized sunglasses"], ["🩴", "Sandals", "sandals"]]],
      ["Cool & cookout", [["🧊", "Coolers", "cooler"], ["🥤", "Insulated bottles", "insulated water bottle"], ["🍔", "Grill tools", "grill tool set"], ["🍉", "Picnic supplies", "picnic supplies"], ["💨", "Portable fans", "portable handheld fan"], ["🎵", "Bluetooth speakers", "waterproof bluetooth speaker"]]],
    ],
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
