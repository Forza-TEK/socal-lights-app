// Fold the intro paragraph and the weekly-list card away so the first screen is the city title plus the event list.
(() => {
  const h = [...document.querySelectorAll("h2")].find((x) => /coming up/i.test(x.textContent));
  const h1 = document.querySelector("h1");
  let n = h1.nextElementSibling;
  while (n && n !== h) { const nx = n.nextElementSibling; if (!n.contains(h)) { n.style.display = "none"; } n = nx; }
  document.querySelectorAll('.ev a').forEach((a)=>{if(/open on the map/i.test(a.textContent))a.style.display='none';});
  const f=document.querySelector('main').firstElementChild; if(f&&/SoCal Lights/.test(f.textContent)&&f.tagName!=='H1'&&!f.classList.contains('tags'))f.style.display='none';
  window.scrollTo(0, 0);
})();
