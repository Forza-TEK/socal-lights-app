// Draft official rules for a contest. Shared by the create wizard (so the organizer can edit them) and the server (default when left blank).
// Plain-language template; the organizer is told to have a lawyer read it if they offer a prize.
export function rulesDefault(w) {
  return `OFFICIAL RULES: ${w.name}

1. Sponsor. ${w.org || "The organizer"} (the "Sponsor") runs this contest for homes in ${w.city || "the contest area"}. SoCal Lights provides the website only.
2. No purchase necessary. Entering and voting are free. Votes are never sold or traded.
3. Eligibility. Open to residents and installers of homes in ${w.city || "the contest area"}. Entrants must own the home or have the owner's permission, and must be signed in with a verified email.
4. Entering. Enter by ${w.closes}. Photos must be your own.
5. Voting. Voting runs ${w.vs} to ${w.ve}. Each verified account gets one vote per category and cannot vote for its own home.
6. Winners. The home with the most votes in each category wins${w.oneWin ? ", and a home can win only one category" : ""}. If homes tie, they share the win.
7. Fair play. Automated, purchased or duplicate votes, fake accounts and vote trading are not allowed. The Sponsor may void votes and disqualify entries it believes broke these rules. A disqualification takes effect when voting closes.
8. Prizes. Any prize is announced by the Sponsor, has no cash value and cannot be transferred. The Sponsor will contact winners by email.
9. Judging visits. Please keep displays lit during the voting dates.
10. Changes. The Sponsor may change these rules or cancel the contest if it cannot be run fairly. These rules are shown before entry and apply to everyone.
11. Apple. Apple is not a sponsor of, and is not involved in, this contest.`;
}
