// Adds an 'Example contest' label and swaps demo street numbers for plain 'Maple Street' so no house numbers show.
// Phone view only: also hides the 'Voting runs ...' paragraph so the Enter my home button fits in the 4:5 crop.
(() => {
  const b = document.createElement("div"); b.id = "exlabel"; b.textContent = "Example contest · demo homes"; document.body.appendChild(b);
  document.querySelectorAll("p,div").forEach((e) => { if (e.children.length === 0 && /^Voting runs/.test(e.textContent)) e.style.display = "none"; });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/\b\d{3} Maple Street/g, "Maple Street").replace(/Demo data for a tutorial video\./, "Demo data.");
})();
