/* ------------ CONFIG ------------ */
const proxy = "https://corsproxy.io/?";
const SITES = [
  "https://legacyrussell.com/filter/Glitch-Feminism/GLITCHFEMINISM",
  "http://www.afrocyberfeminismes.org/",
  "https://tashadezelsky.github.io/thesis/mother.html",
  "https://403msglitch.me/",
  "https://world-of-female-avatars.net/main.html",
  "https://www.mouchette.org/index.html"
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
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

  // apply random CSS from site
  applyRandomSiteStyle(el, siteClass);

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

function shufflePieces() {
  document.querySelectorAll(".piece").forEach(el => {
      // --- NEW vertical spreading ---
  function spreadRandom() {
    return (Math.random() + Math.random()) / 2; // smooth random
  }

  el.style.top = spreadRandom() * 95 + "vh";
  el.style.left = (Math.random() * 60 + 5) + "vw";
    //el.style.transform = `rotate(${Math.random()*14 - 7}deg) scale(${0.5 + Math.random()*0.5})`;
  });
}

/* ------------ MAIN ------------ */
(async function run() {
  log("Loading…");
  let combinedCss = "";

  const masterPool = [];

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

      // collect fragments into master pool (preserve which site they came from)
      const sitePool = [...fr.divs, ...fr.sections, ...fr.ps, ...fr.imgs].filter(Boolean);
      sitePool.forEach(html => masterPool.push({ html, siteClass }));

    } catch(err) {
      console.error("Site failed:", site, err);
    }
  }

  // inject combined CSS
  const style = document.createElement("style");
  style.textContent = combinedCss;
  document.head.appendChild(style);

  // shuffle the master pool and create mixed pieces
  shuffleArray(masterPool);
  const piecesPerSite = 8;
  const totalPieces = SITES.length * piecesPerSite;
  for (let k = 0; k < totalPieces; k++) {
    if (masterPool.length === 0) break;
    const item = masterPool[k % masterPool.length];
    addPiece(item.html, item.siteClass);
  }

  log("click and drag.");
})();
