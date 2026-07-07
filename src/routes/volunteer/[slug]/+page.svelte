<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import gsap from 'gsap';
  import { tilt } from '$lib/actions/tilt';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrl, fetchAllVolunteers, getCachedVolunteers, ruoloToTag, type VolunteerSummary } from '$lib/data/volunteers';
  import { snapToStdFrame } from '$lib/data/gallery';
  import type { PageData } from './$types';
  import ScopriDiPiuButton from '$lib/components/buttons/ScopriDiPiuButton.svelte';
  import IconButton from '$lib/components/buttons/IconButton.svelte';
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';
  import {
    photoFlight,
    arriveEntry,
    launchExit,
    rectOf,
    restingRectOf,
    FLIGHT_DURATION_MS,
    FLIGHT_REVEAL_MS,
    type FlightRect,
  } from '$lib/stores/photoFlight';

  /* ── Blurred background photo field (the "cosmos" atmosphere) ─────
     Each neighbour photo is a soft, low-opacity tile scattered around
     the central frame. Tiles carry their own size / blur / opacity so
     the field reads with depth: larger + sharper + brighter nearer the
     frame ("near"), smaller + blurrier + fainter toward the corners
     ("far"). All values are inline so they win over the base .bg-photo. */
  /* ── Scattered collage layout ────────────────────────────────────
     One tile per cell of a 6×4 grid (a few cells left empty), each at a
     varied size, aspect and alignment so the field reads as an organic
     collage — like the gallery — with generous dark space between tiles.
     One-tile-per-cell + within-cell sizing guarantees NO overlap. */
  const BG_COLS = 6;
  const BG_ROWS = 4;
  const BG_SKIP = new Set(['4-1', '2-2', '5-3', '3-4']);

  // Deterministic pseudo-random so the scatter is stable (no reshuffle per frame).
  const rnd = (n: number) => {
    const x = Math.sin(n * 999.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const BG_TILES = (() => {
    const tiles: string[] = [];
    let k = 0;

    for (let r = 1; r <= BG_ROWS; r++) {
      for (let c = 1; c <= BG_COLS; c++) {
        if (BG_SKIP.has(`${c}-${r}`)) continue;

        const w    = 60 + Math.round(rnd(k * 1.3 + 1) * 36);
        const ar   = ['4 / 3', '3 / 2', '16 / 9', '1 / 1', '3 / 4'][Math.floor(rnd(k * 2.1 + 2) * 5)];
        const jx   = ['start', 'center', 'end'][Math.floor(rnd(k * 5.1 + 4) * 3)];
        const jy   = ['start', 'center', 'end'][Math.floor(rnd(k * 6.3 + 5) * 3)];
        const blur = 8 + Math.round(rnd(k * 3.7 + 3) * 8);
        const op   = (0.30 + rnd(k * 7.9 + 6) * 0.25).toFixed(2);

        tiles.push(
          `grid-column:${c}; grid-row:${r}; width:${w}%; aspect-ratio:${ar};` +
          `justify-self:${jx}; align-self:${jy}; filter:blur(${blur}px) saturate(0.85); opacity:${op};`
        );

        k++;
      }
    }

    return tiles;
  })();

  /* ── Page data ────────────────────────────────────────────────── */
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Navigation peers — from cache if available, otherwise lazy ─ */
  let allVols = $state<VolunteerSummary[]>(getCachedVolunteers());

  onMount(() => {
    fetchAllVolunteers().then(vols => {
      allVols = vols;
    });
  });

  /* ── Shared-element "photo fly" — gallery click → this frame ────── */
  let frameEl        = $state<HTMLElement | null>(null);
  let entryRect      = $state<FlightRect | null>(null);
  let flightEntry    = $state(false);
  let suppressEntranceAnim = $state(false);

  onMount(() => {
    const s = get(photoFlight);

    if (s.active && s.phase === 'entering' && !s.to && s.from) {
      entryRect = s.from;
      flightEntry = true;
      suppressEntranceAnim = true;
      parkCaption();

      // Report the destination rect NOW, not on image load. The frame is already
      // sized from the `ar` param, so measuring it after layout gives the exact
      // final box — the flight starts from the true thumbnail and lands on the
      // true frame with no dependence on network/decode timing (no teleport, no
      // mid-flight resize). Two rAFs = frame laid out + painted before measuring.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (frameEl) arriveEntry(restingRectOf(frameEl));

        setTimeout(() => {
          flightEntry = false;
          revealCaption();
        }, FLIGHT_DURATION_MS);
      }));
    } else {
      setTimeout(() => {
        suppressEntranceAnim = true;
      }, 750);
    }
  });

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug    = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));
  const imgParam       = $derived(page.url.searchParams.get('img'));

  /* ── Background: spatially adjacent volunteers passed from the gallery ── */
  const neighborSlugs = $derived(
    (page.url.searchParams.get('neighbors') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  const BG_COUNT = BG_TILES.length;

  let bgPaths = $state<string[]>([]);

  $effect(() => {
    if (neighborSlugs.length === 0 && bgPaths.length > 0) return;

    const excluded = new Set<string>();

    if (imgParam) excluded.add(imgParam);
    if (dbVol?.image_path) excluded.add(dbVol.image_path);

    for (const p of dbVol?.image_paths ?? []) {
      excluded.add(p);
    }

    const paths: string[] = [];
    const used = new Set<string>();

    const add = (p?: string | null) => {
      if (!p || excluded.has(p) || used.has(p)) return;

      used.add(p);
      paths.push(p);
    };

    for (const s of neighborSlugs) {
      if (paths.length >= BG_COUNT) break;
      if (s === currentSlug) continue;

      const vol = allVols.find(v => v.slug === s);

      if (vol?.ha_immagini) {
        add(vol.image_paths?.[0] ?? vol.image_path);
      }
    }

    if (paths.length < BG_COUNT) {
      const seed = currentSlug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const others = allVols.filter(v => v.slug !== currentSlug && v.ha_immagini);

      for (let i = 0; paths.length < BG_COUNT && i < others.length; i++) {
        const vol = others[(seed + i) % others.length];
        add(vol.image_paths?.[0] ?? vol.image_path);
      }
    }

    bgPaths = paths;
  });

  /* ── Real background field ─────────────────────────────────────── */
  type BgTile = { dx: number; dy: number; w: number; h: number; src: string };
  let bgField = $state<{ cw: number; tiles: BgTile[] } | null>(null);

  onMount(() => {
    try {
      const raw = sessionStorage.getItem('bgField');

      if (raw) {
        bgField = JSON.parse(raw);
      }

      sessionStorage.removeItem('bgField');
    } catch {
      /* no snapshot → decorative field */
    }
  });

  type FrameRatio = '16-9' | '4-3' | '3-4' | '9-16';
  const ratioFromParam = (v: string | null): FrameRatio | null =>
    v === '16-9' || v === '4-3' || v === '3-4' || v === '9-16' ? v : null;

  let imgError      = $state(false);
  // Seed the frame shape from the `ar` handed over by the gallery click so the
  // frame is already at its final size on the first render. The entry flight can
  // then report an accurate landing rect immediately — no wait for the photo to
  // decode — and the zoom lands perfectly aligned.
  let detectedRatio = $state<FrameRatio>(ratioFromParam(page.url.searchParams.get('ar')) ?? '16-9');
  const isPortrait  = $derived(detectedRatio === '3-4' || detectedRatio === '9-16');

  $effect(() => {
    currentSlug;
    imgParam;
    imgError = false;
  });

  /* ── Arrow-navigation crossfade ─────────────────────────────────── */
  let mainImgEl: HTMLImageElement | undefined = $state();
  let outgoingImgEl: HTMLImageElement | undefined = $state();
  let outgoingSrc = $state<string | null>(null);
  let lastResolvedSrc: string | null = null;
  let pendingFrameFrom: FlightRect | null = null;

  $effect(() => {
    const src = resolvedSrc;

    if (src === lastResolvedSrc) return;

    const prev = lastResolvedSrc;
    lastResolvedSrc = src;

    if (prev && src && !flightEntry) {
      outgoingSrc = prev;
      pendingFrameFrom = frameEl ? rectOf(frameEl) : null;
      parkCaption();
      crossfadePhoto();
    } else {
      outgoingSrc = null;
      pendingFrameFrom = null;
    }
  });

  const XFADE_EASE = 'power2.inOut';
  const XFADE_DUR  = 0.85;


  function parkCaption() {
    gsap.killTweensOf('.cap-line');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    // LA SOLUZIONE: yPercent scende del 150% rispetto alla VERA altezza del testo, 
    // azzerando contemporaneamente la vecchia 'y' in pixel.
    gsap.set('.cap-line', { yPercent: 150, y: 0 });
  }

  // Il testo della caption usa il font display di Adobe Fonts (async, pesi 500 e
  // 800). Se il reveal parte prima che il font sia caricato, quando il web-font
  // subentra le glifi si riposizionano e la caption "sobbalza" di qualche px a
  // fine animazione. Aspettiamo il font (solo a cache fredda: a caldo check() è
  // già true → reveal immediato) così l'entrata usa già le metriche finali.
  const CAPTION_FONTS = ['500 1em "forma-djr-display"', '800 1em "forma-djr-display"'];

  function captionFontsReady() {
    if (typeof document === 'undefined' || !document.fonts) return true;
    return CAPTION_FONTS.every((f) => document.fonts.check(f));
  }

  // 2. Aggiorna il ripristino in revealCaption
  function revealCaption(delay = 0) {
    gsap.killTweensOf('.cap-line');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set('.cap-line', { yPercent: 0, y: 0 });
      return;
    }

    const play = () =>
      gsap.to('.cap-line', {
        yPercent: 0,   // Torna alla posizione naturale (0%)
        y: 0,          // Assicura che i pixel siano a zero
        duration: 0.9,
        ease: 'power2.out',
        force3D: false,
        delay
      });

    if (captionFontsReady()) {
      play();
      return;
    }

    Promise.all(CAPTION_FONTS.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(play);
  }

  async function crossfadePhoto() {
    await tick();

    if (!mainImgEl) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      outgoingSrc = null;
      revealCaption();
      return;
    }

    gsap.killTweensOf([mainImgEl, outgoingImgEl, '.cap-line'].filter(Boolean));

    gsap.fromTo(
      mainImgEl,
      { opacity: 0, scale: 1.1, filter: 'blur(10px)' },
      {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: XFADE_DUR,
        ease: XFADE_EASE,
        onComplete: () => {
          if (mainImgEl) {
            gsap.set(mainImgEl, { clearProps: 'filter' });
          }
        }
      }
    );

    if (outgoingImgEl) {
      gsap.to(outgoingImgEl, {
        opacity: 0,
        scale: 1.1,
        filter: 'blur(10px)',
        duration: XFADE_DUR,
        ease: XFADE_EASE,
        onComplete: () => {
          outgoingSrc = null;
        }
      });
    }
  }

  function morphFrame(from: FlightRect, to: FlightRect, onSettled: () => void) {
    if (
      !frameEl ||
      (from.width === to.width && from.height === to.height) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onSettled();
      return;
    }

    gsap.killTweensOf(frameEl);
    gsap.set(frameEl, {
      width: from.width,
      height: from.height,
      aspectRatio: 'auto'
    });

    gsap.to(frameEl, {
      width: to.width,
      height: to.height,
      duration: XFADE_DUR,
      ease: XFADE_EASE,
      onComplete: onSettled
    });
  }

  async function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    const snapped = snapToStdFrame(img.naturalWidth / img.naturalHeight);
    const ratio: FrameRatio = snapped > 1.5 ? '16-9'
      : snapped > 1.0 ? '4-3'
      : snapped > 0.66 ? '3-4'
      : '9-16';

    // Never resize the frame while the entry flight is in the air — the clone is
    // already flying to the rect measured from the `ar`-sized frame, so a resize
    // here would leave it landing on a shifted box. The `ar` shape already
    // matches the photo's snapped ratio; correct it only on non-flight opens
    // (direct URL / arrow navigation).
    if (!flightEntry) detectedRatio = ratio;

    if (pendingFrameFrom) {
      const from = pendingFrameFrom;
      pendingFrameFrom = null;

      await tick();

      requestAnimationFrame(() => {
        if (frameEl) {
          gsap.set(frameEl, { clearProps: 'width,height,aspectRatio' });
          morphFrame(from, rectOf(frameEl), revealCaption);
        } else {
          revealCaption();
        }
      });
    }
  }

  /* ── Display values — DB is the single source of truth ──────── */
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : ''
  );

  const volunteerRole = $derived(
    dbVol ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? '').toUpperCase() : ''
  );

  const resolvedVenue = $derived(
    dbVol ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? '').toUpperCase() : ''
  );

  const resolvedSrc = $derived(
    dbVol?.ha_immagini
      ? getImageUrl(imgParam ?? dbVol.image_path)
      : null
  );

  /* ── Navigation: same category as the current volunteer ─────────── */
  const peers = $derived.by(() => {
    const tag = ruoloToTag(dbVol?.ruolo_generale ?? null) ?? currentContext.filters[0] ?? null;

    if (tag) {
      return allVols.filter(v => ruoloToTag(v.ruolo_generale) === tag && v.ha_immagini);
    }

    return allVols.filter(v => v.ha_immagini);
  });

  const vIdx = $derived(peers.findIndex(v => v.slug === currentSlug));

  function goTo(offset: number) {
    const len = peers.length;

    if (len === 0) return;

    const target = peers[((vIdx + offset) % len + len) % len];

    if (target) {
      const search = buildGallerySearchParams(currentContext);
      goto(search ? `/volunteer/${target.slug}?${search}` : `/volunteer/${target.slug}`);
    }
  }

  function goBackToGallery() {
    if (frameEl && entryRect && resolvedSrc) {
      launchExit(resolvedSrc, restingRectOf(frameEl), entryRect);
    }

    goto(buildGalleryHref(currentContext));
  }

  let profileNavigationStarted = false;

  function goToProfile() {
    if (!currentSlug || profileNavigationStarted) return;

    profileNavigationStarted = true;

    const search = buildGallerySearchParams(currentContext);

    goto(search ? `/volunteer/${currentSlug}/profile?${search}` : `/volunteer/${currentSlug}/profile`);
  }

  function handleFrameKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    e.preventDefault();
    goToProfile();
  }

  function handleExpandButtonClick(e: MouseEvent) {
    e.stopPropagation();
    goToProfile();
  }

  function handleExpandButtonPointerDown(e: PointerEvent) {
    e.stopPropagation();
  }

  /* ── 3D card tilt — spring-driven, same feel as the gallery ───── */
  const tiltShadow = (rx: number, ry: number, h: number) => {
    const sdx = ry * 2.0;
    const sdy = -rx * 1.4 + 18;
    const sbl = 60 + (Math.abs(rx) + Math.abs(ry)) * 1.6;
    const alpha = 0.55 + 0.05 * h;
    const rim = 0.05 + 0.01 * h;

    return `${sdx}px ${sdy}px ${sbl}px rgba(0,0,0,${alpha}), 0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,${rim})`;
  };
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<main class="lb" id="main-content">

  <!-- ── Blurred background: photos near the selected one in the gallery ── -->
  {#if bgField}
    <div class="bg-scatter bg-scatter--real" aria-hidden="true">
      {#each bgField.tiles as t, i (i)}
        {@const nd   = Math.hypot(t.dx, t.dy) / bgField.cw}
        {@const near = Math.max(0, Math.min(1, 1 - nd / 10))}
        {@const blur = (6 + (1 - near) * 10).toFixed(1)}
        {@const op   = (0.30 + near * 0.30).toFixed(2)}
        <img
          src={t.src}
          alt=""
          class="bg-photo bg-photo--real"
          draggable="false"
          style="left:calc(50% + {t.dx}px); top:calc(50% + {t.dy}px); width:{t.w}px; height:{t.h}px; filter:blur({blur}px) saturate(0.85); opacity:{op};"
        />
      {/each}
    </div>
  {:else}
    <div class="bg-scatter" aria-hidden="true">
      {#each bgPaths.slice(0, BG_TILES.length) as path, i (path)}
        <img
          src={getImageUrl(path)}
          alt=""
          class="bg-photo"
          draggable="false"
          style={BG_TILES[i]}
        />
      {/each}
    </div>
  {/if}

  <div class="bg-vignette" aria-hidden="true"></div>

  <!-- ── Click-background-to-close ────────────────────────────────── -->
  <button
    class="close-bg"
    type="button"
    aria-label="Torna alla galleria"
    onclick={goBackToGallery}
  ></button>

  <!-- ── Contenitore per la posizione del bottone di chiusura ── -->
  <div class="close-x-container">
    <IconButton variant="close" onclick={goBackToGallery} />
  </div>

  <!-- ── Navigation arrows ───────────────────────────────────────── -->
  <div class="arrow-container arrow-container--prev">
    <ArrowButton direction="left" onclick={() => goTo(-1)} />
  </div>

  <div class="arrow-container arrow-container--next">
    <ArrowButton direction="right" onclick={() => goTo(1)} />
  </div>

  <!-- ── Photo frame + caption ────────────────────────────────────── -->
  <div
    bind:this={frameEl}
    class="photo-frame photo-frame--{detectedRatio}"
    class:photo-frame--portrait={isPortrait}
    class:photo-frame--flight={flightEntry}
    class:photo-frame--suppress-anim={suppressEntranceAnim}
    style={suppressEntranceAnim ? `--flight-reveal-ms:${FLIGHT_REVEAL_MS}ms` : undefined}
    role="button"
    tabindex="0"
    aria-label={`Apri il profilo completo di ${volunteerTitle}`}
    onclick={goToProfile}
    onkeydown={handleFrameKeydown}
    use:tilt={{
      max: 12,
      tiltXFactor: 0.85,
      perspective: 1100,
      scale: 1.04,
      lift: 12,
      shadow: tiltShadow,
    }}
  >

    <!-- Main image (+ outgoing layer mid-crossfade, see crossfadePhoto) -->
    {#if resolvedSrc && !imgError}
      <div class="photo-img-stack">
        {#if outgoingSrc}
          <img
            bind:this={outgoingImgEl}
            src={outgoingSrc}
            alt=""
            class="photo-img photo-img--outgoing"
            draggable="false"
            aria-hidden="true"
          />
        {/if}

        <img
          bind:this={mainImgEl}
          src={resolvedSrc}
          alt={volunteerTitle}
          class="photo-img"
          draggable="false"
          onload={handleImageLoad}
          onerror={() => {
            imgError = true;
            pendingFrameFrom = null;
            revealCaption();
          }}
        />
      </div>
    {:else}
      <div class="photo-placeholder"></div>
    {/if}

    <!-- Gallery "card" texture: fine grain + soft vignette -->
    <div class="card-noise" aria-hidden="true"></div>
    <div class="card-vignette" aria-hidden="true"></div>

    <!-- Bottom gradient + text caption -->
    <div class="photo-caption">
      <div class="caption-grad" aria-hidden="true"></div>
      <div class="caption-text">
        <div class="cap-line-wrap"><p class="cap-role cap-line">{volunteerRole}</p></div>
        <div class="cap-line-wrap"><p class="cap-location cap-line">{resolvedVenue}</p></div>
        <div class="cap-line-wrap"><p class="cap-name cap-line">{volunteerTitle.toUpperCase()}</p></div>
      </div>
    </div>

    <!-- "SCOPRI DI PIÙ" → navigate to full profile page -->
    <ScopriDiPiuButton
      class="expand-btn-container"
      onclick={handleExpandButtonClick}
      onpointerdown={handleExpandButtonPointerDown}
    />

  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html),
  :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: var(--font-display);
  }

  /* ── Lightbox shell ─────────────────────────────────────────────── */
  .lb {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 50% 34%, rgba(38, 44, 58, 0.55) 0%, rgba(20, 22, 28, 0.0) 52%),
      radial-gradient(140% 130% at 50% 50%, #101216 0%, #0a0a0c 62%, #070708 100%);
  }

  /* ── Background field ─────────────────────────────────────────── */
  .bg-scatter {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 1.4vw;
    padding: 1.2vw;
  }

  .bg-photo {
    height: auto;
    max-width: 100%;
    max-height: 100%;
    border-radius: 12px;
    object-fit: cover;
    opacity: 0.35;
    filter: blur(12px) saturate(0.85);
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .bg-scatter--real {
    display: block;
    padding: 0;
    z-index: 1;
  }

  .bg-photo--real {
    position: absolute;
    transform: translate(-50%, -50%);
    height: auto;
    max-width: none;
    max-height: none;
    border-radius: var(--radius-s, 4px);
    object-fit: cover;
  }

  /* ── Depth vignette ───────────────────────────────────────────── */
  .bg-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(115% 100% at 50% 50%, rgba(10, 10, 12, 0) 40%, rgba(9, 9, 11, 0.55) 74%, rgba(7, 7, 8, 0.82) 100%);
  }

  /* ── Close background ───────────────────────────────────────────── */
  .close-bg {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
  }

  /* ── POSIZIONAMENTO BOTTONE DI CHIUSURA ── */
  .close-x-container {
    position: fixed;
    top: var(--spacing-9, 48px);
    right: var(--spacing-11, 72px);
    z-index: 25;
  }

  @media (max-width: 700px) {
    .close-x-container {
      top: 24px;
      right: 24px;
    }
    :global(.photo-frame--portrait .expand-btn-container) {
      top: 18px;
    }
  }
  .arrow-container {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
  }

  .arrow-container--prev {
    left: var(--spacing-11, 72px);
  }

  .arrow-container--next {
    right: var(--spacing-11, 72px);
  }

  /* ── Main photo frame ───────────────────────────────────────────── */
  @keyframes frame-enter {
    from {
      opacity: 0;
      filter: blur(18px) saturate(0.4);
      transform: translateY(18px) scale(0.97);
    }

    to {
      opacity: 1;
      filter: blur(0px) saturate(1);
      transform: none;
    }
  }

  .photo-frame {
    position: relative;
    flex: 0 0 auto;
    z-index: 5;
    overflow: hidden;
    background: #111;
    border-radius: var(--radius-s, 4px);
    box-shadow:
      0 18px 60px rgba(0, 0, 0, 0.55),
      0 4px 20px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    cursor: pointer;

    --avail-h: 86dvh;

    max-height: var(--avail-h);
  }

  .photo-frame:focus-visible {
    outline: 2px solid var(--color-content-accent, #bdff5d);
    outline-offset: 8px;
  }

  .photo-frame--16-9 {
    width: min(1091px, 63vw, calc(var(--avail-h) * 16 / 9));
    aspect-ratio: 16 / 9;
  }

  .photo-frame--4-3 {
    width: min(1091px, 63vw, calc(var(--avail-h) * 4 / 3));
    aspect-ratio: 4 / 3;
  }

  .photo-frame--3-4 {
    width: min(588px, 34vw, calc(var(--avail-h) * 3 / 4));
    aspect-ratio: 3 / 4;
  }

  .photo-frame--9-16 {
    width: min(588px, 34vw, calc(var(--avail-h) * 9 / 16));
    aspect-ratio: 9 / 16;
  }

  :global(.photo-frame--portrait .expand-btn-container) {
    bottom: auto;
    top: 18px;
  }

  .photo-frame--suppress-anim {
    animation: none;
    transition: opacity var(--flight-reveal-ms, 260ms) ease-in-out;
  }

  .photo-frame--suppress-anim.photo-frame--flight {
    opacity: 0;
  }

  /* ── Image: cover fills the frame — no black bars ───────────── */
  .photo-img-stack {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .photo-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: var(--radius-s, 4px);
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .photo-img--outgoing {
    z-index: 1;
  }

  .photo-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #111 0%, #1c1c1c 100%);
  }

  /* ── Card texture overlays ────────────────────────────────────── */
  .card-noise {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    opacity: 0.12;
  }

  .card-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.42) 100%);
  }

  /* ── Caption ────────────────────────────────────────────────────── */
  .photo-caption {
    position: absolute;
    inset: 0; /* Copre tutta la card, permettendoci di usare le percentuali */
    z-index: 2;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end; /* Spinge naturalmente il testo verso il basso */
  }

  .caption-grad {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60%; 
    
    /* Gradiente iper-sfumato senza scalini */
    background: linear-gradient(
      to top,
      rgba(14, 14, 14, 0.98) 0%,
      rgba(14, 14, 14, 0.88) 15%,
      rgba(14, 14, 14, 0.73) 30%,
      rgba(14, 14, 14, 0.55) 45%,
      rgba(14, 14, 14, 0.36) 60%,
      rgba(14, 14, 14, 0.18) 75%,
      rgba(14, 14, 14, 0.06) 88%,
      rgba(14, 14, 14, 0) 100%
    );
  }

  .caption-text {
    position: relative;
    z-index: 1; /* Assicura che il testo resti sopra la sfumatura */
    padding-left: var(--spacing-4-2);
    padding-bottom: var(--spacing-4-2);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .cap-line-wrap {
    overflow: hidden;
    line-height: 1;
  }

  .cap-location {
    margin: 0 0 10px;
    font-size:      var(--ts-volunteer-location-size);
    font-weight:    var(--ts-volunteer-location-weight);
    line-height:    var(--ts-volunteer-location-line-height);
    letter-spacing: var(--ts-volunteer-location-letter-spacing);
    color: var(--color-content-body, #fafafa);
    max-width: 400px;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .cap-role {
    margin: 0;
    font-size: var(--ts-volunteer-role-size);
    font-weight: var(--ts-volunteer-role-weight);
    line-height: var(--ts-volunteer-role-line-height);
    color: var(--color-content-body, #fafafa);
  }

  .cap-name {
    margin: 0;
    font-size: clamp(24px, 2.55vw, 46px);
    font-weight: 800;
    line-height: 1.03;
    color: var(--color-content-accent, #bdff5d);
    text-transform: uppercase;
  }

  /* ── "SCOPRI DI PIÙ" pill button ───────────────────────────────── */
  .expand-btn-container {
    position: absolute;
    top: var(--spacing-4-2);
    right: var(--spacing-4-2);
    z-index: 3;
    pointer-events: auto;
  }

  .expand-btn-container::after {
    content: '';
    position: absolute;
    inset: -10px;
  }

  /* ── Responsive ───────────────────────────────────────────────────── */
  @media (max-width: 1300px) {
    .photo-frame--16-9 {
      width: min(900px, 80vw, calc(var(--avail-h) * 16 / 9));
    }

    .photo-frame--4-3 {
      width: min(900px, 80vw, calc(var(--avail-h) * 4 / 3));
    }

    .photo-frame--3-4 {
      width: min(500px, 44vw, calc(var(--avail-h) * 3 / 4));
    }

    .photo-frame--9-16 {
      width: min(500px, 44vw, calc(var(--avail-h) * 9 / 16));
    }
  }

  @media (max-width: 1100px) {
    .photo-frame--16-9 {
      width: min(900px, 90vw, calc(var(--avail-h) * 16 / 9));
    }

    .photo-frame--4-3 {
      width: min(900px, 90vw, calc(var(--avail-h) * 4 / 3));
    }

    .photo-frame--3-4 {
      width: min(460px, 50vw, calc(var(--avail-h) * 3 / 4));
    }

    .photo-frame--9-16 {
      width: min(460px, 50vw, calc(var(--avail-h) * 9 / 16));
    }
  }

  @media (max-width: 700px) {
    .photo-frame {
      --avail-h: 80dvh;
    }

    .photo-frame--16-9 {
      width: min(96vw, calc(var(--avail-h) * 16 / 9));
    }

    .photo-frame--4-3 {
      width: min(96vw, calc(var(--avail-h) * 4 / 3));
    }

    .photo-frame--3-4 {
      width: min(88vw, calc(var(--avail-h) * 3 / 4));
    }

    .photo-frame--9-16 {
      width: min(88vw, calc(var(--avail-h) * 9 / 16));
    }

    .cap-location {
      font-size: 10px;
    }

    .cap-role {
      font-size: 14px;
    }

    .cap-name {
      font-size: 20px;
    }

    .arrow--prev {
      left: 20px;
    }

    .arrow--next {
      right: 20px;
    }

    .close-x {
      top: 24px;
      right: 24px;
    }
    
  }

  /* ── Touch target compensation ──────────────────────────────────── */
  @media (pointer: coarse) {
    .arrow {
      position: fixed;
    }

    .arrow::after,
    .close-x::after,
    .expand-btn-container::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width:  max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(80px, calc(44px / var(--page-zoom, 1)));
    }

    .close-x::after {
      min-width:  max(44px, calc(44px / var(--page-zoom, 1)));
      min-height: max(44px, calc(44px / var(--page-zoom, 1)));
    }

    .expand-btn-container::after {
      min-width:  100%;
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .photo-frame {
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }
</style>