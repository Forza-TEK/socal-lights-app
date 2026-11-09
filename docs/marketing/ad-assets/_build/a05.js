// Labels the local demo installer profile as an example and uses the word 'home' instead of 'display' in the product text.
(() => {
  const b = document.createElement("div"); b.id = "exlabel"; b.textContent = "Example installer profile"; document.body.appendChild(b);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/Displays/g, "Homes").replace(/displays/g, "homes").replace(/Demo data\./, "Example profile.");
})();
