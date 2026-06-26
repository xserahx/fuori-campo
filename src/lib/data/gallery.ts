
export type GalleryImage = {
  src: string;
  path?: string;   // storage path (relative); used to reopen the exact image in zoom view
  slug?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  tags?: string[];
  name?: string;
  /** Full-width lime card testimonial — shown on profile page */
  dayDescription?: string;
  /** When true the photo appears in the layout but clicking does nothing */
  noClick?: boolean;
};

export type Person = {
  name: string;
  tags: string[];
};

export const imagesRaw: GalleryImage[] = [
  { src: 'https://www.figma.com/api/mcp/asset/aa1bcc44-33a0-48b1-a75c-913f2d3630eb', left: 1384.95, top: 494.84, width: 223.864, height: 298.485, tags: ['organizzativa'], name: 'Tomolillo Michele' },
  { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06 },
  { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06, tags: ['logistica'], name: 'Tomolillo Michele' },
  { src: 'https://www.figma.com/api/mcp/asset/cf92030a-f76a-466e-83d6-f94316719d6e', left: 628.47, top: 155.8, width: 161.035, height: 286.285, tags: ['gestione'], name: 'Filippi Elisa' },
  {
    src: 'https://www.figma.com/api/mcp/asset/cf92030a-f76a-466e-83d6-f94316719d6e',
    left: 470.12, top: 340.6, width: 185.5, height: 247.3,
    tags: ['sport'],
    name: 'Muraca Francesca Aquila',
    dayDescription: 'I turni erano variabili, potevano essere al mattino verso le 8:30 o al pomeriggio verso le 13. Raggiungevo il luogo di gara prendendo prima il treno per arrivare a Milano, la metro da Cadorna a Rogoredo e poi il pullman o la navetta. Durante la giornata mi occupavo degli accessi nei relativi luoghi. Ho costruito un bel rapporto con i volontari e i vari membri dello staff.'
  },
  { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425 },
  { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425, tags: ['relazioni'], name: 'Lacchin Adriano' },
  { src: 'https://www.figma.com/api/mcp/asset/9dc12179-c0fb-4d55-988b-c055d87fecb1', left: 320.99, top: 1041.6, width: 184.303, height: 138.452, tags: ['cerimonie'], name: 'Marzorati Guido' },
  { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938 },
  { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938, tags: ['sport'], name: 'Brezzi Rodolfo' },
  { src: 'https://www.figma.com/api/mcp/asset/005b2d2c-0afe-4335-9bff-7580699b45c3', left: 1509.16, top: 889.88, width: 263.09, height: 199.246, tags: ['organizzativa'], name: 'Terraneo Chiara' },
  { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919 },
  { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919, tags: ['logistica'], name: 'Marzorati Guido' },
  { src: 'https://www.figma.com/api/mcp/asset/331fa98b-1d4f-4c52-84df-2f4e0da7c169', left: 159.12, top: 774.83, width: 158.83, height: 211.773, tags: ['gestione'], name: 'Guerrini Valentina' },
  { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684 },
  { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684, tags: ['relazioni'], name: "D'Amiano Gualtiero" },
  { src: 'https://www.figma.com/api/mcp/asset/1f8a6af0-1ed8-4150-9b19-e988572ea609', left: 648.83, top: 811.48, width: 185.429, height: 247.239, tags: ['cerimonie'], name: 'Guerrini Valentina' },
  { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948 },
  { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948, tags: ['sport'], name: 'Lisa Liz' },
  { src: 'https://www.figma.com/api/mcp/asset/57845de6-3257-4345-b245-5582dcd71fed', left: 413.64, top: 554.91, width: 165.865, height: 221.153, tags: ['organizzativa'], name: 'Guerrini Valentina' },
  { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714 },
  { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714, tags: ['logistica'], name: 'Guerrini Valentina' },
  { src: 'https://www.figma.com/api/mcp/asset/08aad09d-f709-4304-b39f-2a12aad3373f', left: 1207.8, top: 935.69, width: 157.939, height: 210.586, tags: ['gestione'], name: "D'Amiano Gualtiero" },
  { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479 },
  { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479, tags: ['relazioni'], name: 'Terraneo Chiara' },
  { src: 'https://www.figma.com/api/mcp/asset/f11ba762-b329-4551-a3d6-ef7950a6bb8d', left: 736.39, top: 564.07, width: 214.461, height: 160.846, tags: ['cerimonie'], name: 'Terraneo Chiara' },
  { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095 },
  { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095, tags: ['sport'], name: 'Marzorati Guido' },
  { src: 'https://www.figma.com/api/mcp/asset/ded9c5f3-a6e9-4d84-be2c-7b125c11b710', left: -131.05, top: 793.15, width: 102.25, height: 136.334, tags: ['logistica'], name: 'Cecchin Romano' },
  { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864 },
  { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864, tags: ['gestione'], name: 'Toscano Maria Grazia' },
  { src: 'https://www.figma.com/api/mcp/asset/bd2e4233-abf8-4255-b73b-9c2060bdbf2d', left: -198.26, top: 309.54, width: 203.567, height: 152.675, tags: ['organizzativa'], name: 'Guerrini Valentina' },
  { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963 },
  { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963, tags: ['logistica'], name: 'Tomolillo Michele' },
  { src: 'https://www.figma.com/api/mcp/asset/fd4440df-10b0-46de-9533-973bb268cf89', left: 626.66, top: 388.45, width: 155.829, height: 161.1, tags: ['relazioni'], name: 'Tomolillo Michele' },
  { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633 },
  { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633, tags: ['cerimonie'], name: 'Tomolillo Michele' },
  { src: 'https://www.figma.com/api/mcp/asset/721f6cef-83d5-4035-be4d-9652b82b9c81', left: 1049.7, top: 780.99, width: 359.169, height: 215.501, tags: ['relazioni'], name: 'Giovanessi Laura' },
  { src: 'https://www.figma.com/api/mcp/asset/e99ac53f-6fba-4a2e-ba86-d6f12f9eb068', left: 244.8, top: 810.1, width: 248.122, height: 186.092, tags: ['organizzativa'], name: 'Lisa Liz' },
  { src: 'https://www.figma.com/api/mcp/asset/c42edf09-a934-400c-bae9-0eaf96a509bd', left: 390, top: 593, width: 250.15, height: 187.612, tags: ['gestione'], name: 'Marzorati Guido' },
  { src: 'https://www.figma.com/api/mcp/asset/f47cc2c2-c580-4acf-ad82-83302c739cc7', left: 749.52, top: 565.56, width: 361.128, height: 192.267, tags: ['sport'], name: 'Passarella Anna Filomena' }
];

export function slugify(name: string | undefined, index: number) {
  if (!name) return `member-${index}`;

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildPeople(rawImages: GalleryImage[]): Person[] {
  const peopleByName = new Map<string, Set<string>>();

  for (const image of rawImages) {
    if (!image.name) continue;

    const currentTags = peopleByName.get(image.name) ?? new Set<string>();

    for (const tag of image.tags ?? []) {
      currentTags.add(tag);
    }

    peopleByName.set(image.name, currentTags);
  }

  return Array.from(peopleByName.entries())
    .map(([name, tags]) => ({
      name,
      tags: Array.from(tags)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildSpacedImages(rawImages: GalleryImage[], designWidth = 1920) {
  const columnCount = 12;
  const sidePadding = 86;
  const horizontalGap = 22;
  const verticalGap = 26;
  const topPadding = 84;
  const bottomPadding = 120;
  const blockPattern = [3, 2, 2, 3, 1, 2, 3, 2, 1, 3, 2, 2];
  const sizePattern = [0.86, 1.02, 0.93, 1.08, 0.78, 0.97, 1.04, 0.84, 0.91];

  const availableWidth = designWidth - (sidePadding * 2) - (horizontalGap * (columnCount - 1));
  const columnWidth = availableWidth / columnCount;
  const columnHeights = Array.from({ length: columnCount }, () => topPadding);

  const images = rawImages.map((image, index) => {
    const span = blockPattern[index % blockPattern.length];
    const scale = sizePattern[index % sizePattern.length];
    const aspectRatio = image.height / image.width;

    const slotWidth = (columnWidth * span) + (horizontalGap * (span - 1));
    const imageWidth = slotWidth * scale;
    const imageHeight = imageWidth * aspectRatio;

    let targetColumn = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let start = 0; start <= columnCount - span; start += 1) {
      const laneHeight = Math.max(...columnHeights.slice(start, start + span));
      const rhythmBias = ((start % 3) * 14) + ((index % 6) * 5);
      const score = laneHeight + rhythmBias;

      if (score < bestScore) {
        bestScore = score;
        targetColumn = start;
      }
    }

    const laneTop = Math.max(...columnHeights.slice(targetColumn, targetColumn + span));
    const bandOffset = ((index % 4) - 1.5) * 11;
    const left = sidePadding + (targetColumn * (columnWidth + horizontalGap)) + ((slotWidth - imageWidth) / 2);
    const top = laneTop + bandOffset;
    const nextHeight = top + imageHeight + verticalGap;

    for (let i = targetColumn; i < targetColumn + span; i += 1) {
      columnHeights[i] = nextHeight;
    }

    return {
      ...image,
      left,
      top,
      width: imageWidth,
      height: imageHeight
    };
  });

  const contentHeight = Math.max(...columnHeights) + bottomPadding;

  return {
    images,
    canvasHeight: Math.max(1080, contentHeight)
  };
}

/** The four permitted frame shapes (width ÷ height). */
export const STD_FRAME_RATIOS = [16 / 9, 4 / 3, 3 / 4, 9 / 16] as const;

/** Returns the standard frame ratio closest to the supplied natural w/h ratio. */
export function snapToStdFrame(wPerH: number): number {
  return STD_FRAME_RATIOS.reduce((best, r) =>
    Math.abs(r - wPerH) < Math.abs(best - wPerH) ? r : best
  );
}

/**
 * Masonry scatter layout with AABB collision detection.
 *
 * Base algorithm: shortest-column masonry (guarantees vertical coverage).
 * Scatter: horizontal jitter within each slot + vertical stagger between columns.
 * Collision safety: each candidate position is tested with AABB + PAD gap;
 *   on collision the jitter is reduced iteratively until clear, with a hard
 *   downward scan as final fallback.
 *
 * Returns a square tile: canvasHeight = tileSize = max(canvasWidth, naturalHeight).
 * Images are centered vertically within the square tile so the infinite-tiling
 * seam is symmetrical in both axes.
 */
export function buildScatterLayout(
  rawImages: GalleryImage[],
  canvasWidth = 3840
): { images: GalleryImage[]; canvasHeight: number } {
  if (rawImages.length === 0) return { images: [], canvasHeight: 1080 };

  const COLS      = 12;
  const PAD       = 48;   // minimum pixel gap between any two cards
  const EDGE      = 80;   // canvas left/right margin
  const TOP_PAD   = 96;
  const BOT_PAD   = 144;
  const MIN_SCALE = 0.60; // fraction of slot width
  const MAX_SCALE = 0.94;

  // Deterministic hash: index → 0..1
  function h(n: number): number {
    let x = ((n ^ 0xdeadbeef) | 0);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return ((x ^ (x >>> 16)) >>> 0) / 0x100000000;
  }

  const usableW = canvasWidth - EDGE * 2;
  const colW    = (usableW - PAD * (COLS - 1)) / COLS;
  // Bottom of last placed card per column (masonry tracking)
  const colBots = new Array<number>(COLS).fill(TOP_PAD);

  // ── Spatial-hash collision grid ────────────────────────────────────
  const BUCKET = 380;
  const buckets = new Map<number, number[]>();
  const placed: GalleryImage[] = [];

  function bid(gx: number, gy: number) { return gx * 100_000 + gy; }

  function register(idx: number) {
    const { left: l, top: t, width: w, height: hh } = placed[idx];
    for (let gx = Math.floor(l / BUCKET); gx <= Math.floor((l + w) / BUCKET); gx++)
      for (let gy = Math.floor(t / BUCKET); gy <= Math.floor((t + hh) / BUCKET); gy++) {
        const b = buckets.get(bid(gx, gy));
        if (b) b.push(idx); else buckets.set(bid(gx, gy), [idx]);
      }
  }

  function collides(l: number, t: number, w: number, hh: number): boolean {
    const p = PAD;
    const seen = new Set<number>();
    for (let gx = Math.floor((l - p) / BUCKET); gx <= Math.floor((l + w + p) / BUCKET); gx++)
      for (let gy = Math.floor((t - p) / BUCKET); gy <= Math.floor((t + hh + p) / BUCKET); gy++)
        for (const idx of (buckets.get(bid(gx, gy)) ?? [])) {
          if (seen.has(idx)) continue; seen.add(idx);
          const c = placed[idx];
          if (l < c.left + c.width  + p && l + w  + p > c.left &&
              t < c.top  + c.height + p && t + hh + p > c.top) return true;
        }
    return false;
  }

  // ── Placement loop ─────────────────────────────────────────────────
  for (let i = 0; i < rawImages.length; i++) {
    const raw  = rawImages[i];
    const seed = i * 137 + 5381;

    // Span: mostly 1-col, occasionally 2-col for visual variety
    const span = h(seed) < 0.74 ? 1 : 2;

    // Shortest-column selection with a tiny random tie-break
    let bestCol = 0, bestScore = Infinity;
    for (let c = 0; c <= COLS - span; c++) {
      const laneH = Math.max(...colBots.slice(c, c + span));
      const score = laneH + h(seed + c * 23) * 44;
      if (score < bestScore) { bestScore = score; bestCol = c; }
    }

    // Image dimensions — snapped to the nearest standard frame (16:9 / 4:3 / 3:4 / 9:16)
    const scale      = MIN_SCALE + h(seed + 1) * (MAX_SCALE - MIN_SCALE);
    const slotW      = colW * span + PAD * (span - 1);
    const imgW       = slotW * scale;
    const frameRatio = snapToStdFrame(raw.width / raw.height);
    const imgH       = imgW / frameRatio;
    const laneBot = Math.max(...colBots.slice(bestCol, bestCol + span));

    // Horizontal jitter within available whitespace, vertical stagger
    const maxJX = Math.max(0, (slotW - imgW) * 0.5 - 2);
    const jx    = (h(seed + 2) - 0.5) * 2 * maxJX;
    const jy    = h(seed + 3) * 44;

    const baseL = EDGE + bestCol * (colW + PAD) + (slotW - imgW) / 2 + jx;
    const baseT = laneBot + jy;

    // Try up to 28 positions fading jitter to zero
    let finalL = baseL, finalT = baseT, ok = false;
    for (let a = 0; a <= 28 && !ok; a++) {
      const f  = 1 - a / 20;
      const tL = EDGE + bestCol * (colW + PAD) + (slotW - imgW) / 2 + jx * f;
      const tT = laneBot + jy * Math.max(0, f);
      if (!collides(tL, tT, imgW, imgH)) { finalL = tL; finalT = tT; ok = true; }
    }
    // Hard fallback: scan downward from laneBot until clear
    if (!ok) {
      finalL = EDGE + bestCol * (colW + PAD) + (slotW - imgW) / 2;
      finalT = laneBot;
      let guard = 0;
      while (collides(finalL, finalT, imgW, imgH) && guard++ < 500) finalT += 8;
    }

    const img: GalleryImage = { ...raw, left: finalL, top: finalT, width: imgW, height: imgH };
    placed.push(img);
    register(placed.length - 1);

    const newBot = finalT + imgH + PAD;
    for (let c = bestCol; c < bestCol + span; c++)
      if (newBot > colBots[c]) colBots[c] = newBot;
  }

  const maxBot = placed.reduce((m, img) => Math.max(m, img.top + img.height), 0);
  return { images: placed, canvasHeight: Math.max(1080, maxBot + BOT_PAD) };
}

export function buildInfiniteImages(rawImages: GalleryImage[], waves = 8) {
  const expanded: GalleryImage[] = [];

  for (let wave = 0; wave < waves; wave += 1) {
    for (let i = 0; i < rawImages.length; i += 1) {
      const image = rawImages[(i + wave * 3) % rawImages.length];
      const scaleVariant = 0.86 + (((wave + i) % 5) * 0.06);

      expanded.push({
        ...image,
        width: image.width * scaleVariant,
        height: image.height * scaleVariant
      });
    }
  }

  return expanded;
}

// Ref-equality cache: same rawImages array → same layout object → $derived stays stable.
let _layoutCacheKey: GalleryImage[] | null = null;
let _layoutCacheValue: ReturnType<typeof buildScatterLayout> | null = null;

export function buildScatterLayoutCached(
  rawImages: GalleryImage[],
  canvasWidth = 3840
): ReturnType<typeof buildScatterLayout> {
  if (_layoutCacheKey === rawImages && _layoutCacheValue !== null) return _layoutCacheValue;
  _layoutCacheValue = buildScatterLayout(buildInfiniteImages(rawImages), canvasWidth);
  _layoutCacheKey = rawImages;
  return _layoutCacheValue;
}

// Manually maintained list of volunteer names to ensure full coverage in the
// names view. Kept as plain strings so it can be merged with the people
// derived from `imagesRaw` at render time.
export const volunteersNames: string[] = [
  "Airaghi Giuseppe",
  "Amedeo Aureliano",
  "Angelini Carlotta",
  "Muraca Francesca Aquila",
  "Aramini Ivan",
  "Bandini Daniele",
  "Barrel Paola",
  "Beduschi Erni",
  "Bellaver Sofia",
  "Belletti Davide",
  "Belli Stefano",
  "Bellotti Marco",
  "Bettanello Giulio Alberto",
  "Bianchi Alessandra",
  "Blanchi Emanuela",
  "Bodrone Sara",
  "Boffi Pierpaolo",
  "Bottero Alessandro",
  "Boutrit Marianne",
  "Brambilla Walter",
  "Brezzi Rodolfo",
  "Bruno Carmine",
  "Callegaro Nicola",
  "Campi Maristella",
  "Carera Carla",
  "Case Simone",
  "Castiglioni Federico",
  "Castiglioni Orietta",
  "Cavalluzzo Antonio",
  "Cazzaniga Camilla",
  "Cazzini Barbara",
  "Cecchin Romano",
  "Cendali Monica",
  "Ceppi Maria Pia",
  "Cerri Elena",
  "Chiesa Roberta",
  "Clara Massimo",
  "Collinetti Giovanni",
  "Colosimo Chiara",
  "Colussi Valentina",
  "Consonni Maria Rita",
  "Corbetta Giancarlo",
  "Corchia Luigi",
  "Cornago Massimo",
  "Corona Luciana",
  "Costa Paolo",
  "Coviello Renato",
  "Cozzi Alessandro",
  "Cremonesi Marco",
  "Crippa Marco",
  "Cucchi Gian Cesare",
  "Curti Cinzia",
  "D'Amiano Gualtiero",
  "D'Incal Daniele",
  "D'Innocenzo Luigi Giampaolo",
  "Dalla Vecchia Tommaso",
  "Dario Maurice",
  "Dassie Roberta",
  "De Martin Modolado Fiamma",
  "Del Buono Francesco",
  "Della Corte Giuseppe",
  "Delli Santi Emilio",
  "Duriavig Patrizia",
  "Ercolani Iaia",
  "Facchini Enzo",
  "Falasco Silvia",
  "Ferlauto Alessio",
  "Filippi Elisa",
  "Finelli Giovanni",
  "Foianini Roberto",
  "Foti Sandro",
  "Frasca Giovanni",
  "Furlan Eleonora",
  "Furlanetto Giovanni",
  "Gallico Beatrice",
  "Galli Marco",
  "Gallo Elvis",
  "Garcia Alain",
  "Gasparello Roberta",
  "Gazzola Jonny",
  "Ghiretti Andrea",
  "Gianesello Lisa",
  "Gianinetto Renata",
  "Gibertini Maria Chiara",
  "Gigante Silvia",
  "Gipponi Agnese",
  "Giovanessi Laura",
  "Giorgia (Solo nome)",
  "Goi Gianluigi",
  "Gozzi Massimo",
  "Greco Paolo",
  "Guicciardi Greta",
  "Guida Patrizia",
  "Guerrini Valentina",
  "Guglielmino Alfio",
  "Iacona Melania",
  "Impilli Franco",
  "Inno Simone",
  "Lacchin Adriano",
  "Lamera Serenella",
  "Lavazza Paola",
  "Lazzari Fabrizio",
  "Leveni Giorgia",
  "Maggi Aurora",
  "Malpede Marco",
  "Mammana Graziella",
  "Marchese Arianna",
  "Marenghi Beatrice",
  "Marzorati Guido",
  "Mazzocchi Valentina",
  "Mazzuccato Marzia",
  "Menegotto Daniela",
  "Merenda Paolo",
  "Monti Francesca",
  "Montini Luciano",
  "Morandini Mauro",
  "Mori Roberto",
  "Naldi Viola",
  "Olivotti Secondo",
  "Panseri Angela",
  "Paparella Elisa",
  "Pasetto Denise",
  "Passarella Anna Filomena",
  "Pedon Trocie",
  "Pegorer Gianni",
  "Piacentino Marta",
  "Pudia Eduardo",
  "Randaci Teresa",
  "Redaelli Lia",
  "Ricci Luca",
  "Riva Alessandro",
  "Rivolta Umberto",
  "Rodigari Eros",
  "Rodolfi Fabrizio",
  "Rogora Lorenzo",
  "Rojas Benito",
  "Romanchenko Valeriya",
  "Rosini Elena",
  "Rossi Filippo",
  "Ruggeri Lucia",
  "Sacco Emilio",
  "Sandri Lucia",
  "Sanesi Elena",
  "Scalmani Luca",
  "Scalvini Alessandra",
  "Schenal Sandro",
  "Senoner Carla Cristina",
  "Sesana Danilo",
  "Sesana Paola",
  "Silvestri Eusebio (Max)",
  "Simoni Sara",
  "Solidoro Claudia Irene",
  "Sotgiu Alessandra",
  "Sottocorno Chiara",
  "Steffenini Marzia",
  "Sterza Maurizio",
  "Taglioretti Cristina Maurizia",
  "Tarantola Claudio",
  "Tavola Greta",
  "Terraneo Chiara",
  "Terzon Raffaella",
  "Tinuper Carlo",
  "Tollot Caterina",
  "Tonello Ernestina",
  "Tontodonati Sara",
  "Torriani Carla",
  "Tortorici Tiziano",
  "Toscano Maria Grazia",
  "Uccheddu Anna Rita",
  "Vaccarone Stefano Antonio",
  "Varischetti Luca",
  "Vedovi Ilaria",
  "Venier Elio",
  "Verdecchia Vittoria",
  "Verocai Patrizia",
  "Viganò Simonetta",
  "Woo Daniele",
  "Zaniboni Luca",
  "Zerilli Enrico"
];
