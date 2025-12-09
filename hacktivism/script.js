/* ------------ CONFIG ------------ */
const proxy = "https://corsproxy.io/?";
const SITES = [
  "https://www.cyberzoo.org/eng/home.htm",
  "https://hijack.org/",
  "https://www.notbored.org/the-scp.html",
  "https://risk-fintech-calc.netlify.app/",
  "https://www.furtherfield.org/revisiting-the-curious-world-of-art-hacktivism/",
  "https://top-84-ways.gallerygallery.space/green-land",
  "https://uninvited.icu/",
  "https://g33con.com/#",
  "https://will.solve.an.otherti.me/",
  "https://www.sign69.com/orpheus.html",
  "https://www.sign69.com/"
];

const statusEl = document.getElementById("status");
const shuffleBtn = document.getElementById("shuffleBtn");
shuffleBtn.onclick = () => shufflePieces();

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const SITE_CSS_RULES = {}; // store per-site CSS rules

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

/* ------------ HTML & CSS Utilities ------------ */
async function fetchText(url) {
  const res = await fetch(proxy + encodeURIComponent(url));
  if (!res.ok) throw new Error("Fetch failed " + url);
  return await res.text();
}

function parseHTML(text) {
  return new DOMParser().parseFromString(text, "text/html");
}

function absolutize(doc, base) {
  doc.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (!src) return;
    try {
      img.src = proxy + encodeURIComponent(new URL(src, base).href);
    } catch {}
  });

  doc.querySelectorAll("link[rel=stylesheet]").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    try {
      link.href = proxy + encodeURIComponent(new URL(href, base).href);
    } catch {}
  });

  return doc;
}

function extract(doc) {
  return {
    divs: [...doc.querySelectorAll("div")].map(n => n.outerHTML),
    sections: [...doc.querySelectorAll("section")].map(n => n.outerHTML),
    ps: [...doc.querySelectorAll("p")].map(n => n.outerHTML),
    imgs: [...doc.querySelectorAll("img")].map(n => n.outerHTML),
    css: [...doc.querySelectorAll("link[rel=stylesheet]")].map(l => l.href)
  };
}

function rewriteCssSelectors(cssText, siteClass) {
  // naive prefix for scoping
  return cssText.replace(/(^|\})([^{}]+)\{/g, (m, brace, sel) => {
    const prefixed = sel.split(",").map(s => `.${siteClass} ${s.trim()}`).join(", ");
    return brace + prefixed + "{";
  });
}

/* ------------ COLLAGE BUILDING ------------ */
function addPiece(html, siteClass) {
  const el = document.createElement("div");
  el.className = `piece ${siteClass} white`;
  el.innerHTML = html;

  // --- NEW vertical spreading ---
  function spreadRandom() {
    return (Math.random() + Math.random()) / 2; // smooth random
  }

  el.style.top = spreadRandom() * 95 + "vh";
  el.style.left = (Math.random() * 60 + 5) + "vw";

  el.style.transform = `rotate(${Math.random()*14 - 7}deg) scale(${0.5 + Math.random()*0.5})`;

  // give each piece a random stacking order and slight opacity so they overlap visually
  el.style.zIndex = 100 + Math.floor(Math.random() * 200);
  el.style.opacity = (0.7 + Math.random() * 0.35).toString();

  // apply random CSS from site
  applyRandomSiteStyle(el, siteClass);

  // make images clickable and link to feminism index
  el.querySelectorAll('img').forEach(img => {
    img.style.cursor = 'pointer';
    // navigate to sibling feminism index when clicked
    img.addEventListener('click', (ev) => {
      ev.stopPropagation();
      window.location.href = '../feminism/index.html';
    });
  });

  document.body.appendChild(el);
}

function detectLightContent(el) {
  // Check if the element contains images or text that would benefit from white background
  const hasImages = el.querySelector("img") !== null;
  const hasText = el.textContent.trim().length > 0;
  
  // If it's mostly text or transparent images, give it a white background
  return hasText || hasImages;
}

function applyRandomSiteStyle(el, siteClass) {
  const rules = SITE_CSS_RULES[siteClass];
  if (!rules || rules.length === 0) return;

  const rule = pick(rules);
  // Just add a class or data attribute for styling - don't append style elements
  // The combined CSS from all sites is already injected in the head
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function shufflePieces() {
  const pieces = Array.from(document.querySelectorAll('.piece'));
  if (pieces.length === 0) return;

  // shuffle ordering
  shuffleArray(pieces);

  // reassign z-index based on shuffled order so stacking changes
  pieces.forEach((el, idx) => {
    el.style.zIndex = 100 + idx;

    // also randomize position and transform for visual shuffle
    const left = (Math.random() * 60 + 5) + 'vw';
    const top = ((Math.random() + Math.random()) / 2 * 95) + 'vh';
    el.style.left = left;
    el.style.top = top;
    el.style.transform = `rotate(${Math.random()*28 - 14}deg) scale(${0.6 + Math.random()*0.8})`;
  });
}

/* ------------ MAIN ------------ */
(async function run() {
  log("Loading…");
  let combinedCss = "";

  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];
    const siteClass = `site-${i}`;

    try {
      log("Fetching " + site);
      const htmlText = await fetchText(site);
      const doc = absolutize(parseHTML(htmlText), site);
      const fr = extract(doc);

      // fetch + rewrite CSS
      for (let href of fr.css) {
        try {
          const css = await fetch(href).then(r => r.text());
          const rewritten = rewriteCssSelectors(css, siteClass);
          combinedCss += rewritten;

          // store individual rules for random piece styling
          const rules = rewritten.split("}").map(r => r.trim()).filter(r=>r.length);
          SITE_CSS_RULES[siteClass] = SITE_CSS_RULES[siteClass] || [];
          SITE_CSS_RULES[siteClass].push(...rules.map(r => r+"}"));

        } catch(e) {
          console.warn("CSS failed:", href, e);
        }
      }

      // generate pieces
      const pool = [...fr.divs, ...fr.sections, ...fr.ps, ...fr.imgs];
      for (let j = 0; j < 8; j++) {
        addPiece(pick(pool), siteClass);
      }

    } catch(err) {
      console.error("Site failed:", site, err);
    }
  }

  // inject combined CSS
  const style = document.createElement("style");
  style.textContent = combinedCss;
  document.head.appendChild(style);

  log("Done.");
})();
