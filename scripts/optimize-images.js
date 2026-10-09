/*
  Image prep script — run once with `npm run prepare-images`.

  What it does, in plain terms:
    1. Reads the RAW photos the user dropped into /assets (logo.png, the 15
       project photos in /assets/Project, the founder photo at
       /assets/satish.jpeg, and the 42 field-work photos in
       /assets/our-work) — that folder is never touched or modified, only
       read from.
    2. Renames/organizes them into src/images/<category>/<name>.jpg using the
       mapping table below (this table is the single source of truth for
       "which photo goes with which section" — see the project plan for how
       each photo was matched to a section).
    3. For each photo, generates a couple of responsive sizes (so a phone
       doesn't download a desktop-sized image) in both .webp (smaller, modern)
       and .jpg (fallback for very old browsers) formats.
    4. Crops the logo down into a compact "CAE" mark and a set of favicon
       sizes, so the header/nav/favicon don't have to load the full 2000x2000
       wordmark image.
    5. Resizes the founder photo and the 42 field-work photos the same way
       (field-work photos only get one width - see processFieldWorkPhotos()
       for why).

  This script only needs to be re-run if the source photos in /assets change.
  It does not run automatically as part of `npm run build`.
*/

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PHOTOS_DIR = path.join(ROOT, "assets", "Project");
const SOURCE_LOGO = path.join(ROOT, "assets", "logo.png");
const SOURCE_FOUNDER_PHOTO = path.join(ROOT, "assets", "satish.jpeg");
const SOURCE_FIELD_WORK_DIR = path.join(ROOT, "assets", "our-work");
const SOURCE_BRAND_DIR = path.join(ROOT, "assets", "brand");
const OUT_IMAGES_DIR = path.join(ROOT, "src", "images");

// Responsive widths we generate per photo. Sharp automatically skips any
// width larger than the source image (see resizeToWidths below), so a small
// source photo simply ends up with fewer generated files - nothing breaks.
const RESPONSIVE_WIDTHS = [480, 800, 1200, 1600];

// --------------------------------------------------------------------------
// The mapping table: which raw file becomes which named, organized image.
// "category" is the folder under src/images/. "name" is the file's base name
// (without extension) once renamed.
// --------------------------------------------------------------------------
const PHOTO_MAP = [
  { file: "ductingwork-4.jpeg", category: "ducting", name: "ducting-hero" },
  { file: "ductingwork-1.jpeg", category: "ducting", name: "ducting-1" },
  { file: "ductingwork-2.jpeg", category: "ducting", name: "ducting-2" },
  { file: "ductingwork-3.jpeg", category: "ducting", name: "ducting-3" },
  { file: "chillers.jpeg", category: "hvac", name: "chillers" },
  { file: "ahu.jpeg", category: "hvac", name: "ahu" },
  { file: "fcu-fan-coil-unit.jpeg", category: "hvac", name: "fcu" },
  { file: "ductableAC.jpeg", category: "hvac", name: "ductable-ac" },
  { file: "casseteAC.jpeg", category: "hvac", name: "cassette-ac" },
  { file: "splitac.jpeg", category: "hvac", name: "split-ac" },
  { file: "airwasher.jpeg", category: "ventilation", name: "air-washer" },
  { file: "airscrubber.jpeg", category: "ventilation", name: "air-scrubber" },
  { file: "exhaustfan.jpeg", category: "ventilation", name: "exhaust-fan" },
  { file: "cold-storage-room.jpeg", category: "cold-storage", name: "cold-storage" },
  // NOTE: the source file is literally named "hvac.jpeg" but the photo
  // itself shows an electrical panel bank (verified visually) - so it is
  // intentionally mapped into the electrical category, not hvac.
  { file: "hvac.jpeg", category: "electrical", name: "electrical-panel" },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

// Resize one source image down to every width in RESPONSIVE_WIDTHS that is
// not larger than the source itself, writing both a .webp and a .jpg copy
// of each size. Returns the list of widths actually generated.
async function resizeToWidths(sourcePath, outDir, baseName) {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const sourceWidth = metadata.width || 1600;

  const widths = RESPONSIVE_WIDTHS.filter((w) => w <= sourceWidth);
  // Always keep at least one size even if the source is smaller than our
  // smallest target width (some supplied photos are quite small).
  if (widths.length === 0) widths.push(sourceWidth);

  for (const width of widths) {
    const resized = sharp(sourcePath).resize({ width, withoutEnlargement: true });

    await resized
      .clone()
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(path.join(outDir, `${baseName}-${width}.jpg`));

    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(path.join(outDir, `${baseName}-${width}.webp`));
  }

  return widths;
}

async function processPhotos() {
  console.log("Processing project photos...");
  for (const entry of PHOTO_MAP) {
    const sourcePath = path.join(SOURCE_PHOTOS_DIR, entry.file);
    const outDir = path.join(OUT_IMAGES_DIR, entry.category);
    await ensureDir(outDir);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`  [skip] missing source file: ${entry.file}`);
      continue;
    }

    const widths = await resizeToWidths(sourcePath, outDir, entry.name);
    console.log(`  ${entry.file} -> ${entry.category}/${entry.name} @ [${widths.join(", ")}]px`);
  }
}

// --------------------------------------------------------------------------
// Logo processing: trim the full wordmark, crop out just the "CAE" mark,
// and generate favicon sizes from that mark.
// --------------------------------------------------------------------------

// Scans the raw pixel buffer row by row to find which rows contain any
// non-white ("ink") pixel. Used to isolate the "CAE" line from the smaller
// "COOL AIR ENTERPRISES" line underneath it, since they're one flat image.
function findInkRowRanges(raw, width, height, channels) {
  const WHITE_THRESHOLD = 250; // a pixel counts as "ink" if any channel dips below this
  const rowHasInk = new Array(height).fill(false);

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x * channels;
      if (raw[idx] < WHITE_THRESHOLD || raw[idx + 1] < WHITE_THRESHOLD || raw[idx + 2] < WHITE_THRESHOLD) {
        rowHasInk[y] = true;
        break;
      }
    }
  }

  // Group consecutive "has ink" rows into ranges, separated by gaps of
  // at least 15px of pure white (that gap is the space between the "CAE"
  // line and the "COOL AIR ENTERPRISES" line below it).
  const ranges = [];
  let start = null;
  let gap = 0;
  for (let y = 0; y < height; y++) {
    if (rowHasInk[y]) {
      if (start === null) start = y;
      gap = 0;
    } else if (start !== null) {
      gap++;
      if (gap > 15) {
        ranges.push([start, y - gap]);
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) ranges.push([start, height - 1]);
  return ranges;
}

// Given a row range, finds the tightest horizontal (column) bounding box
// containing ink within just those rows.
function findColumnBounds(raw, width, channels, rowStart, rowEnd) {
  const WHITE_THRESHOLD = 250;
  let minX = width;
  let maxX = 0;

  for (let y = rowStart; y <= rowEnd; y++) {
    const rowOffset = y * width * channels;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * channels;
      if (raw[idx] < WHITE_THRESHOLD || raw[idx + 1] < WHITE_THRESHOLD || raw[idx + 2] < WHITE_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return { minX, maxX };
}

async function processLogo() {
  console.log("Processing logo...");
  const logoOutDir = path.join(OUT_IMAGES_DIR, "logo");
  await ensureDir(logoOutDir);

  // 1. Full lockup: just trim the surrounding whitespace, keep it as-is.
  await sharp(SOURCE_LOGO)
    .trim()
    .png()
    .toFile(path.join(logoOutDir, "cae-logo-full.png"));
  console.log("  cae-logo-full.png (trimmed full wordmark)");

  // 2. Isolate just the "CAE" mark by scanning pixels for the topmost
  //    block of ink (the "CAE" letters sit above the smaller company name).
  const { data, info } = await sharp(SOURCE_LOGO)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rowRanges = findInkRowRanges(data, info.width, info.height, info.channels);
  const markRowRange = rowRanges[0]; // first block = "CAE"

  if (markRowRange) {
    const { minX, maxX } = findColumnBounds(data, info.width, info.channels, markRowRange[0], markRowRange[1]);
    const padding = 24;
    const left = Math.max(0, minX - padding);
    const top = Math.max(0, markRowRange[0] - padding);
    const cropWidth = Math.min(info.width - left, maxX - minX + padding * 2);
    const cropHeight = Math.min(info.height - top, markRowRange[1] - markRowRange[0] + padding * 2);

    const markBuffer = await sharp(SOURCE_LOGO)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer();

    await fs.promises.writeFile(path.join(logoOutDir, "cae-mark.png"), markBuffer);
    console.log("  cae-mark.png (cropped 'CAE' mark, white background)");

    // 2b. Build a transparent-background version of the same mark so it can
    // be placed on any color (navy footer/CTA panels, the intro overlay)
    // without a white box showing around it.
    //
    // This logo only uses two colors: white background and one flat brand
    // blue (which happens to have R=0). That means the red channel alone is
    // a near-perfect alpha mask: white pixels (R=255) become fully
    // transparent, blue pixels (R=0) stay fully opaque, and anti-aliased
    // edge pixels (partway between the two) get a smooth in-between alpha -
    // exactly what's needed for clean edges. Every visible pixel is then
    // recolored to the exact brand blue so there's no color fringing.
    const markMeta = await sharp(markBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data: markData, info: markInfo } = markMeta;
    const BRAND_R = 0, BRAND_G = 74, BRAND_B = 173;
    for (let i = 0; i < markData.length; i += markInfo.channels) {
      const alpha = 255 - markData[i]; // red channel, inverted
      markData[i] = BRAND_R;
      markData[i + 1] = BRAND_G;
      markData[i + 2] = BRAND_B;
      markData[i + 3] = alpha;
    }
    await sharp(Buffer.from(markData), { raw: { width: markInfo.width, height: markInfo.height, channels: markInfo.channels } })
      .png()
      .toFile(path.join(logoOutDir, "cae-mark-transparent.png"));
    console.log("  cae-mark-transparent.png (same mark, transparent background)");

    // 2c. Same trick again, but recolored pure white - used wherever the
    // mark sits on the dark navy CTA/footer/intro sections, since white
    // reads with more contrast there than the brand blue does.
    const whiteData = Buffer.from(markData); // reuses the alpha channel we just computed
    for (let i = 0; i < whiteData.length; i += markInfo.channels) {
      whiteData[i] = 255;
      whiteData[i + 1] = 255;
      whiteData[i + 2] = 255;
      // alpha (i + 3) stays as-is
    }
    await sharp(whiteData, { raw: { width: markInfo.width, height: markInfo.height, channels: markInfo.channels } })
      .png()
      .toFile(path.join(logoOutDir, "cae-mark-white.png"));
    console.log("  cae-mark-white.png (white version for dark backgrounds)");

    // 3. Favicons generated from the same square-padded mark.
    for (const size of [32, 180, 512]) {
      await sharp(markBuffer)
        .resize({
          width: size,
          height: size,
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(path.join(logoOutDir, `favicon-${size}.png`));
    }
    console.log("  favicon-32.png, favicon-180.png, favicon-512.png");
  } else {
    console.warn("  [warn] could not isolate the 'CAE' mark automatically - using full logo as fallback");
    await sharp(SOURCE_LOGO)
      .trim()
      .resize({ width: 512, height: 512, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(logoOutDir, "favicon-512.png"));
  }
}

// --------------------------------------------------------------------------
// Founder photo (Mr Satish Kumar) - shown on the home page in place of the
// old "SK" text placeholder. Same resizeToWidths() treatment as the project
// photos above, just a single file instead of a mapping table.
// --------------------------------------------------------------------------
async function processFounderPhoto() {
  console.log("Processing founder photo...");
  const outDir = path.join(OUT_IMAGES_DIR, "founder");
  await ensureDir(outDir);

  if (!fs.existsSync(SOURCE_FOUNDER_PHOTO)) {
    console.warn("  [skip] missing source file: assets/satish.jpeg");
    return;
  }

  const widths = await resizeToWidths(SOURCE_FOUNDER_PHOTO, outDir, "satish-kumar");
  console.log(`  satish.jpeg -> founder/satish-kumar @ [${widths.join(", ")}]px`);
}

// --------------------------------------------------------------------------
// Field-work photos ("Glimpse of Our Field Work" horizontal scroll strip on
// the home page) - 42 unlabelled on-site WhatsApp exports with no per-photo
// category, so unlike PHOTO_MAP above these are just numbered in whatever
// order the filesystem returns, not matched to a specific section. Only one
// display width is generated (these render as small strip thumbnails, never
// full-size), which keeps this loop simple instead of reusing the full
// multi-width resizeToWidths() pipeline.
const FIELD_WORK_WIDTH = 480;

async function processFieldWorkPhotos() {
  console.log("Processing field-work photos...");
  const outDir = path.join(OUT_IMAGES_DIR, "our-work");
  await ensureDir(outDir);

  if (!fs.existsSync(SOURCE_FIELD_WORK_DIR)) {
    console.warn("  [skip] missing source folder: assets/our-work");
    return;
  }

  const files = fs
    .readdirSync(SOURCE_FIELD_WORK_DIR)
    .filter((name) => /\.(jpe?g|png)$/i.test(name))
    .sort();

  let index = 1;
  for (const file of files) {
    const sourcePath = path.join(SOURCE_FIELD_WORK_DIR, file);
    const baseName = `field-work-${String(index).padStart(2, "0")}`;
    const resized = sharp(sourcePath).resize({ width: FIELD_WORK_WIDTH, withoutEnlargement: true });

    await resized.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(outDir, `${baseName}.jpg`));
    await resized.clone().webp({ quality: 78 }).toFile(path.join(outDir, `${baseName}.webp`));

    index++;
  }
  console.log(`  ${files.length} field-work photos -> our-work/field-work-01..${String(files.length).padStart(2, "0")}`);
}

// --------------------------------------------------------------------------
// Brand logos ("Brands We Work With" section) - real manufacturer logos the
// user supplied, replacing the earlier text-placeholder SVGs. Each source
// file already sits on a plain white or transparent background, so this
// just trims the surrounding margin and caps the height (they arrive at
// wildly different resolutions - some over 3000px wide) so the section
// isn't shipping multi-megabyte logo files for a ~40px-tall tile.
// --------------------------------------------------------------------------
const BRAND_LOGO_MAP = [
  { file: "carrier.svg", name: "carrier" },
  { file: "daikin.png", name: "daikin" },
  { file: "mitsubushi.png", name: "mitsubishi" }, // source filename has a typo; output name is corrected
  { file: "toshiba.png", name: "toshiba" },
];
const BRAND_LOGO_MAX_HEIGHT = 200;

async function processBrandLogos() {
  console.log("Processing brand logos...");
  const outDir = path.join(OUT_IMAGES_DIR, "brands");
  await ensureDir(outDir);

  for (const { file, name } of BRAND_LOGO_MAP) {
    const sourcePath = path.join(SOURCE_BRAND_DIR, file);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`  [skip] missing source file: assets/brand/${file}`);
      continue;
    }

    if (file.endsWith(".svg")) {
      // Already a tightly-cropped vector - copy through as-is.
      fs.copyFileSync(sourcePath, path.join(outDir, `${name}.svg`));
      console.log(`  ${file} -> brands/${name}.svg`);
      continue;
    }

    const outPath = path.join(outDir, `${name}.png`);
    await sharp(sourcePath)
      .trim()
      .resize({ height: BRAND_LOGO_MAX_HEIGHT, withoutEnlargement: true })
      .png()
      .toFile(outPath);
    const { width, height } = await sharp(outPath).metadata();
    console.log(`  ${file} -> brands/${name}.png @ ${width}x${height}`);
  }
}

async function main() {
  await processLogo();
  await processPhotos();
  await processFounderPhoto();
  await processFieldWorkPhotos();
  await processBrandLogos();
  console.log("\nDone. Optimized images are in src/images/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
