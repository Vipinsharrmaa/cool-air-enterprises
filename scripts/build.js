/*
  Build script — run with `npm run build`.

  This is a small, plain Node script. It is NOT a framework and does not do
  anything clever: it just stitches shared HTML fragments into each page,
  compiles Tailwind's CSS, and copies files into dist/. Read it top to bottom
  and you've read the whole build system.

  What it does, in order:
    1. Deletes and recreates dist/ (a clean build every time).
    2. For every page in src/pages/, replaces <!-- @include:name --> comments
       with the matching file from src/partials/, and writes the result to
       dist/<page>.html.
    3. Runs the Tailwind CLI to compile src/css/input.css -> dist/assets/css/main.css.
    4. Copies src/js/*.js -> dist/assets/js/ (plain copy, no minification -
       see the "readability" note in the project plan for why).
    5. Copies the GSAP library files from node_modules into
       dist/assets/js/vendor/ (self-hosted, so the site never makes a
       request to a third-party CDN at runtime).
    6. Copies src/images/ -> dist/assets/images/ and assets/logo.png's
       generated favicons to dist/.
    7. Writes robots.txt and sitemap.xml.
*/

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

// The list of final pages and the site structure the sitemap/robots files
// need to know about. Add a page here (and a matching src/pages/<file>) to
// add a new page to the site.
const PAGE_FILES = [
  "index.html",
  "hvac-solutions.html",
  "ventilation.html",
  "ducting.html",
  "cold-storage.html",
  "electrical.html",
  "contact.html",
];

// Change this once you know the real production domain - it's only used to
// generate the sitemap and canonical-style references, not required for the
// site to function locally.
const SITE_URL = "https://www.coolairenterprises.in";

// -- helpers ---------------------------------------------------------------

function rimraf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

// Replaces every "<!-- @include:name -->" comment in `html` with the
// contents of src/partials/name.html. Runs a couple of passes so a partial
// is allowed to include another partial (e.g. the mobile nav living inside
// the header partial).
function resolveIncludes(html) {
  const includePattern = /<!--\s*@include:([a-zA-Z0-9_-]+)\s*-->/g;
  let previous = "";
  let result = html;
  let passes = 0;

  while (result !== previous && passes < 5) {
    previous = result;
    result = result.replace(includePattern, (match, partialName) => {
      const partialPath = path.join(SRC, "partials", `${partialName}.html`);
      if (!fs.existsSync(partialPath)) {
        console.warn(`  [warn] missing partial: ${partialName}.html`);
        return "";
      }
      return fs.readFileSync(partialPath, "utf8");
    });
    passes++;
  }

  return result;
}

function buildPages() {
  console.log("Building pages...");
  for (const file of PAGE_FILES) {
    const sourcePath = path.join(SRC, "pages", file);
    const html = fs.readFileSync(sourcePath, "utf8");
    const finalHtml = resolveIncludes(html);
    fs.writeFileSync(path.join(DIST, file), finalHtml, "utf8");
    console.log(`  ${file}`);
  }
}

function buildCss() {
  console.log("Compiling Tailwind CSS...");
  fs.mkdirSync(path.join(DIST, "assets", "css"), { recursive: true });
  execSync(
    "npx tailwindcss -i ./src/css/input.css -o ./dist/assets/css/main.css --minify",
    { cwd: ROOT, stdio: "inherit" }
  );
}

function copyJs() {
  console.log("Copying JavaScript...");
  const outDir = path.join(DIST, "assets", "js");
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(path.join(SRC, "js"))) {
    fs.copyFileSync(path.join(SRC, "js", file), path.join(outDir, file));
  }

  // Self-host GSAP + ScrollTrigger instead of loading them from a CDN.
  const vendorOutDir = path.join(outDir, "vendor");
  fs.mkdirSync(vendorOutDir, { recursive: true });
  const gsapDist = path.join(ROOT, "node_modules", "gsap", "dist");
  fs.copyFileSync(path.join(gsapDist, "gsap.min.js"), path.join(vendorOutDir, "gsap.min.js"));
  fs.copyFileSync(
    path.join(gsapDist, "ScrollTrigger.min.js"),
    path.join(vendorOutDir, "ScrollTrigger.min.js")
  );
}

function copyImages() {
  console.log("Copying images...");
  copyDir(path.join(SRC, "images"), path.join(DIST, "assets", "images"));
}

function writeFavicons() {
  console.log("Writing favicons...");
  const logoDir = path.join(SRC, "images", "logo");
  const map = {
    "favicon-32.png": "favicon-32x32.png",
    "favicon-180.png": "apple-touch-icon.png",
    "favicon-512.png": "favicon-512x512.png",
  };
  for (const [from, to] of Object.entries(map)) {
    const fromPath = path.join(logoDir, from);
    if (fs.existsSync(fromPath)) {
      fs.copyFileSync(fromPath, path.join(DIST, to));
    }
  }
}

function writeRobotsAndSitemap() {
  console.log("Writing robots.txt and sitemap.xml...");
  fs.writeFileSync(
    path.join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  const urls = PAGE_FILES.map((file) => {
    const loc = file === "index.html" ? `${SITE_URL}/` : `${SITE_URL}/${file}`;
    return `  <url><loc>${loc}</loc></url>`;
  }).join("\n");

  fs.writeFileSync(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
}

function main() {
  rimraf(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  buildPages();
  buildCss();
  copyJs();
  copyImages();
  writeFavicons();
  writeRobotsAndSitemap();

  console.log("\nBuild complete -> dist/");
}

main();
