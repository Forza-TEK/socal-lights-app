// Draft official rules for a contest. Shared by the create wizard (so the organizer can edit them) and the server (default when left blank).
// Plain-language template; the organizer is told to have a lawyer read it if they offer a prize.
export function rulesDefault(w) {
  return `OFFICIAL RULES: ${w.name}

NO PURCHASE OR PAYMENT IS NECESSARY TO ENTER, VOTE OR WIN. A PURCHASE WILL NOT IMPROVE YOUR CHANCES. VOID WHERE PROHIBITED.

1. Sponsor. ${w.org || "The organizer"} (the "Sponsor") runs this contest for homes in ${w.city || "the contest area"} and decides all questions about it. SoCal Lights provides the website only. It is not the sponsor and is not responsible for any prize.
2. Free to enter and vote. Votes are never sold, traded or bought.
3. Eligibility. Open to people 18 or older who own a home in ${w.city || "the contest area"} or have the owner's permission, or who installed the display. Sponsor staff, judges and their households may not win. Entrants must be signed in with a verified email.
4. Entering. Enter by ${w.closes}. Photos must be your own, show your display, and not show identifiable people or children. One home may enter once.
5. Voting. Voting runs ${w.vs} to ${w.ve}. ${w.mode === "judges" ? "Only the judges invited by the Sponsor vote." : "Each verified account gets one vote per category and cannot vote for its own home."}${w.mode === "both" ? " A separate panel of invited judges also votes. Judges do not take part in the public vote, and each judge must recuse from any home they know." : ""} ${w.mode === "judges" || w.mode === "both" ? (w.method === "score" ? "Judges score every home from 1 to 10 in each category; with five or more judges the highest and lowest score for a home are dropped." : "Each judge picks one favorite home in each category.") : ""}
6. Winners. The home with the most votes${w.mode === "judges" ? " (or highest judge score)" : ""} in each category wins${w.mode === "both" ? " People's Choice, and the home with the most judge votes (or highest score) wins Judges' Choice" : ""}${w.oneWin ? ", and a home can win only one category" : ""}. ${w.mode === "both" ? "If the public vote ties, the judges' scores decide it. " : ""}If homes still tie, they share the win. Winners are determined when voting closes on ${w.ve} and announced on the contest page and by email. Final results are locked when announced.
7. Fair play. Automated, purchased or duplicate votes, fake accounts and vote trading are not allowed. The Sponsor may void votes and disqualify entries it believes broke these rules. A disqualification takes effect when voting closes. Sponsors of prizes do not vote and do not influence the result.
8. Prizes. ${w.prizeMode === "one" && w.prize ? "Prize: " + w.prize + "." : w.prizeMode === "each" ? "Prizes for each award are listed on the contest page." : "Any prize is announced by the Sponsor."}${w.sponsor ? " Provided by " + w.sponsor + "." : ""} The Sponsor (not SoCal Lights) provides and is responsible for the prizes. Prizes have no cash value, cannot be transferred, and may be replaced with one of equal value. Winners are responsible for any taxes. A prize not claimed within 14 days of notice may be given to another entrant.
9. Your photos and name. You keep ownership of your photos. By entering you allow the Sponsor and SoCal Lights to show your photos, your home's name and its street address on the contest page and map, and to promote the contest, and you confirm you have the right to do so. You can withdraw your entry at any time and the photos will be removed.
10. Visits and safety. Judges and voters may view displays from the street. Do not enter private property. Keep your display safe and your home accessible only as you choose. You are responsible for your display.
11. Privacy. Your email is used to run the contest and send results. See https://socallights.app/privacy.
12. Changes. The Sponsor may change these rules or end the contest if it cannot be run fairly, and will post any change on the contest page. California law governs. The Sponsor's decisions are final.
13. Apple. Apple is not a sponsor of, and is not involved in, this contest.`;
}
