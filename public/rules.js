// Draft official rules for a contest. Shared by the create wizard (so the organizer can edit them) and the server (default when left blank).
// Plain-language template; the organizer is told to have a lawyer read it if they offer a prize.
export function rulesDefault(w) {
  return `OFFICIAL RULES: ${w.name}

1. Sponsor. ${w.org || "The organizer"} (the "Sponsor") runs this contest for homes in ${w.city || "the contest area"}. SoCal Lights provides the website only.
2. No purchase necessary. Entering and voting are free. Votes are never sold or traded.
3. Eligibility. Open to residents and installers of homes in ${w.city || "the contest area"}. Entrants must own the home or have the owner's permission, and must be signed in with a verified email.
4. Entering. Enter by ${w.closes}. Photos must be your own.
5. Voting. Voting runs ${w.vs} to ${w.ve}. ${w.mode === "judges" ? "Only the judges invited by the Sponsor vote." : "Each verified account gets one vote per category and cannot vote for its own home."}${w.mode === "both" ? " A separate panel of invited judges also votes. Judges do not take part in the public vote, and each judge may recuse from any home they know." : ""} ${w.mode === "judges" || w.mode === "both" ? (w.method === "score" ? "Judges score every home from 1 to 10 in each category; with five or more judges the highest and lowest score for a home are dropped." : "Each judge picks one favorite home in each category.") : ""}
6. Winners. The home with the most votes${w.mode === "judges" ? " (or highest judge score)" : ""} in each category wins${w.mode === "both" ? " People's Choice, and the home with the most judge votes (or highest score) wins Judges' Choice" : ""}${w.oneWin ? ", and a home can win only one category" : ""}. ${w.mode === "both" ? "If the public vote ties, the judges' scores decide it. " : ""}If homes still tie, they share the win.
7. Fair play. Automated, purchased or duplicate votes, fake accounts and vote trading are not allowed. The Sponsor may void votes and disqualify entries it believes broke these rules. A disqualification takes effect when voting closes.
8. Prizes. ${w.prizeMode === "one" && w.prize ? "Prize: " + w.prize + "." : w.prizeMode === "each" ? "Prizes for each award are listed on the contest page." : "Any prize is announced by the Sponsor."}${w.sponsor ? " Provided by " + w.sponsor + "." : ""} Prizes have no cash value and cannot be transferred. The Sponsor will contact winners by email.
9. Judging visits. Please keep displays lit during the voting dates.
10. Changes. The Sponsor may change these rules or cancel the contest if it cannot be run fairly. These rules are shown before entry and apply to everyone.
11. Apple. Apple is not a sponsor of, and is not involved in, this contest.`;
}
