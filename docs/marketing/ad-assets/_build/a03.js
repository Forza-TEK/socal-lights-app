// Adds an 'Example contest' label and swaps demo street numbers for plain 'Maple Street' so no house numbers show.
(() => {
  const b = document.createElement("div"); b.id = "exlabel"; b.textContent = "Example contest · demo homes"; document.body.appendChild(b);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/\b\d{3} Maple Street/g, "Maple Street").replace(/Demo data for a tutorial video\./, "Demo data.");
})();
