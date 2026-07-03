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
  const BG_SKIP = new Set(['4-1', '2-2', '5-3', '3-4']); // "col-row" empty cells
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
        const w    = 60 + Math.round(rnd(k * 1.3 + 1) * 36);                 // 60–96%
        const ar   = ['4 / 3', '3 / 2', '16 / 9', '1 / 1', '3 / 4'][Math.floor(rnd(k * 2.1 + 2) * 5)];
        const jx   = ['start', 'center', 'end'][Math.floor(rnd(k * 5.1 + 4) * 3)];
        const jy   = ['start', 'center', 'end'][Math.floor(rnd(k * 6.3 + 5) * 3)];
        const blur = 8 + Math.round(rnd(k * 3.7 + 3) * 8);                   // 8–16px
        const op   = (0.30 + rnd(k * 7.9 + 6) * 0.25).toFixed(2);           // .30–.55
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
    fetchAllVolunteers().then(vols => { allVols = vols; });
  });

  /* ── Shared-element "photo fly" — gallery click → this frame ──────
     If a flight was launched by a gallery click (see PhotosView), report
     this frame's rect once it's laid out at its final size so the overlay
     (mounted in the root layout) can fly the clone into place. entryRect is
     kept locally for the page's lifetime — including through arrow
     navigation — so closing can always fly back to that original slot. */
  let frameEl        = $state<HTMLElement | null>(null);
  let entryRect       = $state<FlightRect | null>(null);
  let flightEntry     = $state(false); // frame hidden while the clone is mid-flight
  // Permanent for the page's lifetime (unlike flightEntry): once a flight is
  // in play, the frame's own frame-enter keyframes must stay off for good —
  // toggling `animation: none` on and off would replay it from scratch the
  // moment flightEntry clears, double-animating on top of the flight reveal.
  let suppressEntranceAnim = $state(false);
  let arrivalReported = false;

  onMount(() => {
    const s = get(photoFlight);
    if (s.active && s.phase === 'entering' && !s.to && s.from) {
      entryRect = s.from;
      flightEntry = true;
      suppressEntranceAnim = true;
      // Park the caption lines beneath their clip masks now (frame is still
      // opacity:0, so this is invisible) — revealCaption() below plays their
      // actual entrance the instant the photo reaches max zoom, so the text
      // gets its own motion instead of just riding the frame's opacity fade.
      parkCaption();
      // Safety net: if the image never loads (error / no image), the overlay's
      // own timeout resets the flight, but the frame must still reveal.
      setTimeout(() => { flightEntry = false; revealCaption(); }, FLIGHT_DURATION_MS + 400);
    } else {
      // No flight (direct URL load / refresh): frame-enter plays its one
      // keyframe entrance normally. But `class="photo-frame photo-frame--{ratio}"`
      // gets reassigned wholesale on every later arrow navigation (detectedRatio
      // changes), and reassigning an element's className mid-animation makes
      // Chrome restart any CSS `animation` still bound to it — replaying the
      // blur/scale/translateY entrance a second time right as the crossfade
      // and caption settle. Disarm it for good once its single intended
      // play has had time to finish, so nothing can ever restart it again.
      setTimeout(() => { suppressEntranceAnim = true; }, 750);
    }
  });

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug    = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));
  const imgParam       = $derived(page.url.searchParams.get('img'));

  /* ── Background: spatially adjacent volunteers passed from the gallery ──
     When arriving from PhotosView the URL carries `neighbors=slug1,slug2,…`
     (the closest gallery cards to the clicked photo). Arrow navigation strips
     the param — that's how we tell "fresh open from the gallery" apart from
     "moved with the arrows", so the background can stay locked to the photo
     that was originally opened (see bgPaths below).                        */
  const neighborSlugs = $derived(
    (page.url.searchParams.get('neighbors') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
  );

  const BG_COUNT = BG_TILES.length; // number of scatter cells (6×4 minus skipped)

  // Locked once per gallery entry and left untouched by arrow navigation, so
  // the atmosphere never changes while browsing peers — only a fresh open
  // from the gallery (a new `neighbors` param) re-rolls it.
  let bgPaths = $state<string[]>([]);

  $effect(() => {
    if (neighborSlugs.length === 0 && bgPaths.length > 0) return; // arrow nav: keep the locked background

    // Never show the current subject: exclude the displayed image and every
    // photo belonging to this volunteer.
    const excluded = new Set<string>();
    if (imgParam) excluded.add(imgParam);
    if (dbVol?.image_path) excluded.add(dbVol.image_path);
    for (const p of dbVol?.image_paths ?? []) excluded.add(p);

    const paths: string[] = [];
    const used = new Set<string>();
    const add = (p?: string | null) => {
      // Dedupe: a photo already used (or excluded) is never repeated.
      if (!p || excluded.has(p) || used.has(p)) return;
      used.add(p);
      paths.push(p);
    };

    // 1) Photos NEAR the selected one — the gallery passes the spatially
    //    closest volunteers, ordered by proximity, one photo each.
    for (const s of neighborSlugs) {
      if (paths.length >= BG_COUNT) break;
      if (s === currentSlug) continue;
      const vol = allVols.find(v => v.slug === s);
      if (vol?.ha_immagini) add(vol.image_paths?.[0] ?? vol.image_path);
    }

    // 2) Top up (direct nav, or few neighbours) with a seed-stable set of
    //    other volunteers — still deduped and never the current subject.
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

  /* ── Real background field ───────────────────────────────────────
     PhotosView snapshots the gallery neighbours as they sat around the
     clicked photo — already converted to on-screen px — so this page can
     render the exact same arrangement as a fixed field: no rescaling, no
     animation, and (since it's read once and never cleared) unaffected by
     arrow navigation. Falls back to the decorative bgPaths field above when
     there's no snapshot (direct URL load / arrow nav without one). */
  type BgTile = { dx: number; dy: number; w: number; h: number; src: string };
  let bgField = $state<{ cw: number; tiles: BgTile[] } | null>(null);

  onMount(() => {
    try {
      const raw = sessionStorage.getItem('bgField');
      if (raw) bgField = JSON.parse(raw);
      sessionStorage.removeItem('bgField'); // consume once
    } catch { /* no snapshot → decorative field */ }
  });

  let imgError      = $state(false);
  let detectedRatio = $state<'16-9' | '4-3' | '3-4' | '9-16'>('16-9');
  const isPortrait  = $derived(detectedRatio === '3-4' || detectedRatio === '9-16');

  // NB: does NOT reset detectedRatio. The frame keeps the OUTGOING photo's
  // shape until the incoming photo's real ratio is known (handleImageLoad) —
  // snapping to a hardcoded '16-9' here first made the frame jump twice
  // (old shape → forced 16:9 → real shape), worst when going portrait ↔
  // landscape. morphFrame() below animates the one, correct shape change.
  $effect(() => { currentSlug; imgParam; imgError = false; });

  /* ── Arrow-navigation crossfade ───────────────────────────────────
     Peer navigation (goTo) changes the route, which updates `resolvedSrc`
     but otherwise just swaps the <img> src instantly. To read as a single
     continuous "scroll between images" motion instead of a hard cut, the
     outgoing photo is kept mounted on top and eased out (fade + scale up)
     while the incoming one (already in the DOM below it) eases in from a
     slight scale-down — a GSAP crossfade, not a Svelte transition, so it
     stays on the same timeline/easing as the rest of the frame's motion.
     The frame itself is morphed (FLIP: old px size → new px size) in the
     same duration, so a portrait ↔ landscape switch reshapes smoothly
     instead of snapping the instant the aspect-ratio class changes. */
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
    // Only crossfade photo → photo (a fresh flight entry or a volunteer with
    // no image at all just renders normally, no outgoing layer to animate).
    if (prev && src && !flightEntry) {
      outgoingSrc = prev;
      // Snapshot the frame's CURRENT (still-old-ratio) size — the "from" of
      // the FLIP morph, taken before detectedRatio has any chance to change.
      pendingFrameFrom = frameEl ? rectOf(frameEl) : null;
      // Caption text is already reactively bound to the NEW volunteer by
      // this point — park it back below the clip mask synchronously, in the
      // same tick, before the browser paints, so nothing flashes at rest
      // before crossfadePhoto reveals it.
      parkCaption();
      crossfadePhoto();
    } else {
      outgoingSrc = null;
      pendingFrameFrom = null;
    }
  });

  // 'power2.inOut' eases in AND out gently — no fast burst at the start the
  // way the previous 'expo.out' gave, shared here so the crossfade, the
  // frame morph, and the caption stagger all move on the same calm curve.
  const XFADE_EASE = 'power2.inOut';
  const XFADE_DUR  = 0.85;

  // ── Caption entrance (shared: arrow-nav crossfade + gallery-click flight)
  // All three lines slide up from beneath their clip-mask wrapper together —
  // same start, same duration, same end (no stagger — an earlier staggered
  // version left later lines visibly still moving after earlier ones had
  // already stopped).
  //
  // Uses a FIXED PIXEL `y` offset, not `yPercent`. `yPercent` requires GSAP to
  // measure each element's own rendered height internally to convert the
  // percentage to px. This app applies `document.documentElement.style.zoom`
  // globally (app.html) for its responsive scaling, and this codebase has
  // already hit — and documented — GSAP's own measurements being unreliable
  // under that zoom (see the ScrollTrigger pin fix in "fix question panels
  // animation": native `position: sticky` replaced GSAP's pin because GSAP's
  // measurement "made the next panel start a hair early" under zoom). A
  // plain `y: Npx` needs no such runtime measurement, so it can't be thrown
  // off the same way — which a concurrent parent resize (morphFrame, running
  // at the same time) made especially likely to trigger.
  //
  // killTweensOf first in both: guards against a straggler tween from a
  // still-in-flight PREVIOUS reveal (e.g. two arrow clicks in quick
  // succession) fighting a freshly-started one on the same element/property.
  const CAP_PARK_Y = 60; // covers the tallest line (.cap-name) at every breakpoint

  function parkCaption() {
    gsap.killTweensOf('.cap-line');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set('.cap-line', { y: CAP_PARK_Y });
  }

  function revealCaption(delay = 0) {
    gsap.killTweensOf('.cap-line');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set('.cap-line', { y: 0 });
      return;
    }
    gsap.to('.cap-line', { y: 0, duration: 0.9, ease: 'power2.out', force3D: false, delay });
  }

  async function crossfadePhoto() {
    await tick();
    if (!mainImgEl) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { outgoingSrc = null; revealCaption(); return; }

    gsap.killTweensOf([mainImgEl, outgoingImgEl, '.cap-line'].filter(Boolean));

    // Incoming photo: soft-focus pull — starts slightly blurred & larger,
    // sharpens and settles to size as it fades in.
    gsap.fromTo(mainImgEl,
      { opacity: 0, scale: 1.1, filter: 'blur(10px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: XFADE_DUR, ease: XFADE_EASE,
        onComplete: () => { if (mainImgEl) gsap.set(mainImgEl, { clearProps: 'filter' }); } }
    );

    // NB: revealCaption() is NOT called here. It fires from handleImageLoad's
    // pendingFrameFrom branch instead, at the exact same instant morphFrame
    // starts — see the note there for why (a mismatch made the settled
    // caption look like it "moved again" once the frame resize caught up).

    if (outgoingImgEl) {
      gsap.to(outgoingImgEl, {
        opacity: 0, scale: 1.1, filter: 'blur(10px)', duration: XFADE_DUR, ease: XFADE_EASE,
        onComplete: () => { outgoingSrc = null; },
      });
    }
  }

  // FLIP-morphs the frame from its old pixel size to its new one. Freezes
  // aspect-ratio to 'auto' for the duration (otherwise the CSS aspect-ratio
  // rule — already switched to the new class — would fight the width tween
  // by re-deriving height every frame instead of letting both axes ease
  // together). Same easing/duration as crossfadePhoto so the reshape and
  // the photo fade read as one motion rather than two things coinciding.
  //
  // Deliberately does NOT clearProps the inline width/height/aspectRatio at
  // the end (unlike an earlier version of this function). The filters panel
  // hit exactly this class of bug: its own reveal tween's onComplete used to
  // clearProps back to the CSS value, and the FiltraPerCategoriaFilter.svelte
  // history shows that call was removed — the CSS-recomputed `min(...)`/
  // aspect-ratio value doesn't always exactly match the px value GSAP
  // animated to (this app applies a document-wide `zoom` scale in app.html,
  // which can round slightly differently), so clearing right as the frame
  // "settles" reintroduces a fresh snap at that exact instant — precisely
  // the kind of "still moving after it looks done" symptom being chased
  // here. Leaving the explicit inline px in place means the frame's box
  // never changes again after this tween, full stop; the next morphFrame
  // call (next navigation) just overwrites it with a fresh explicit value.
  //
  // `onSettled` fires once the frame's box is truly done changing — the
  // caption is nested inside it via position:absolute, so it must never be
  // revealed before this: revealing while the frame is still animating
  // width/height lets the still-moving box keep nudging the caption's
  // rendered position for the remainder of the resize, on EVERY line at
  // once (since they're all anchored the same way), which is a very close
  // match for the "all three lines drift a few px up" report.
  function morphFrame(from: FlightRect, to: FlightRect, onSettled: () => void) {
    if (!frameEl || (from.width === to.width && from.height === to.height) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSettled();
      return;
    }
    gsap.killTweensOf(frameEl);
    gsap.set(frameEl, { width: from.width, height: from.height, aspectRatio: 'auto' });
    gsap.to(frameEl, {
      width: to.width, height: to.height, duration: XFADE_DUR, ease: XFADE_EASE,
      onComplete: onSettled,
    });
  }

  async function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    // Use the SAME snap the gallery masonry uses (snapToStdFrame), so this frame
    // always matches the photo's gallery frame — no more portrait/landscape drift.
    const snapped = snapToStdFrame(img.naturalWidth / img.naturalHeight);
    detectedRatio = snapped > 1.5 ? '16-9'
                  : snapped > 1.0 ? '4-3'
                  : snapped > 0.66 ? '3-4'
                  : '9-16';

    if (flightEntry && !arrivalReported && frameEl) {
      arrivalReported = true;
      // Wait for the ratio class change above to actually lay out, so the
      // reported rect matches the frame's real final size, not the '16-9'
      // default it started with.
      await tick();
      requestAnimationFrame(() => {
        if (frameEl) arriveEntry(rectOf(frameEl));
        // Fires the instant the photo reaches max zoom — the frame's own
        // opacity fade (--flight-reveal-ms) and the caption's slide-up
        // entrance both start here, together, so the text arrives with the
        // photo instead of trailing it.
        setTimeout(() => { flightEntry = false; revealCaption(); }, FLIGHT_DURATION_MS);
      });
    } else if (pendingFrameFrom) {
      const from = pendingFrameFrom;
      pendingFrameFrom = null;
      // Caption reveal is gated on morphFrame's onSettled — NOT fired here —
      // because the caption sits inside the frame via position:absolute, and
      // revealing it while the frame's width/height are still being tweened
      // lets the still-resizing box keep nudging the caption's rendered
      // position for the remainder of the resize. Waiting the extra beat
      // means the caption only ever appears once the frame is truly at its
      // final, unchanging size — nothing left that could move it afterward.
      await tick();
      requestAnimationFrame(() => {
        if (frameEl) {
          // The previous morph left explicit inline width/height on the frame,
          // which would mask THIS photo's real ratio — so measuring the target
          // would return the old size (from === to) and the shape would never
          // change between photos. Clear them so CSS recomputes the correct
          // target for the new ratio, then morph old → new. Both happen in the
          // same frame (no paint between), so there's no visible jump.
          gsap.set(frameEl, { clearProps: 'width,height,aspectRatio' });
          morphFrame(from, rectOf(frameEl), revealCaption);
        } else revealCaption();
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
    if (tag) return allVols.filter(v => ruoloToTag(v.ruolo_generale) === tag && v.ha_immagini);
    return allVols.filter(v => v.ha_immagini);
  });

  const vIdx = $derived(peers.findIndex(v => v.slug === currentSlug));

  function goTo(offset: number) {
    const len    = peers.length;
    if (len === 0) return;
    const target = peers[((vIdx + offset) % len + len) % len];
    if (target) {
      const search = buildGallerySearchParams(currentContext);
      goto(search ? `/volunteer/${target.slug}?${search}` : `/volunteer/${target.slug}`);
    }
  }

  function goBackToGallery() {
    // Fly back into the original gallery slot — always that slot, even if
    // arrow navigation moved to a different peer first, since that's where
    // the gallery's restored pan position will actually show this photo.
    if (frameEl && entryRect && resolvedSrc) {
      launchExit(resolvedSrc, rectOf(frameEl), entryRect);
    }
    goto(buildGalleryHref(currentContext));
  }

  /* ── 3D card tilt — spring-driven, same feel as the gallery (see
     $lib/actions/tilt, ReactBits TiltedCard). Live two-layer shadow that
     matches the frame's CSS resting elevation at rest and leans with tilt. */
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

  <!-- ── Blurred background: photos near the selected one in the gallery ──
       Locked to the photo originally opened from the gallery — unaffected
       by arrow navigation (bgField is read once on mount; bgPaths is locked
       by the effect above). -->
  {#if bgField}
    <!-- Real gallery neighbours, at the exact on-screen offsets they had
         around the clicked photo — a fixed field, no rescaling/animation. -->
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
    <!-- Fallback (arrow / direct nav, no snapshot): the decorative neighbour field. -->
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

  <!-- Depth vignette — darkens the edges into the cosmos, keeps the centre
       clear so the sharp frame reads as the focal point. -->
  <div class="bg-vignette" aria-hidden="true"></div>

  <!-- ── Click-background-to-close ────────────────────────────────── -->
  <!-- z:3 — above dark overlays, below photo frame (z:5) and arrows (z:20) -->
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={frameEl}
    class="photo-frame photo-frame--{detectedRatio}"
    class:photo-frame--portrait={isPortrait}
    class:photo-frame--flight={flightEntry}
    class:photo-frame--suppress-anim={suppressEntranceAnim}
    style={suppressEntranceAnim ? `--flight-reveal-ms:${FLIGHT_REVEAL_MS}ms` : undefined}
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
          onerror={() => { imgError = true; pendingFrameFrom = null; revealCaption(); }}
        />
      </div>
    {:else}
      <div class="photo-placeholder"></div>
    {/if}

    <!-- Gallery "card" texture: fine grain + soft vignette (matches PhotosView) -->
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
    <!-- Contenitore che eredita solo la posizione del vecchio bottone -->
    <div class="expand-btn-container">
      <ScopriDiPiuButton
        onclick={() => {
          const search = buildGallerySearchParams(currentContext);
          goto(search ? `/volunteer/${currentSlug}/profile?${search}` : `/volunteer/${currentSlug}/profile`);
        }}
      />
    </div>

  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  /* NB: no `overflow: hidden` here. SvelteKit never unloads a page's CSS
     after first visit, so a :global overflow lock would leak onto every
     later page (e.g. the profile page could no longer scroll). The fixed
     `.lb` shell below already covers the viewport, so the lightbox never
     scrolls without needing a body-level lock. */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: var(--font-display);
  }

  /* ── Lightbox shell ─────────────────────────────────────────────── */
  /* Fixed + inset:0 covers the whole viewport regardless of the body
     padding-top (navbar) or the global width-based zoom on <html>, and
     centres the frame on BOTH axes via flexbox — the same edge-to-edge
     approach the gallery uses. This is immune to the absolute-centering
     math drifting under zoom on smaller screens.                      */
  .lb {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    /* ── COSMOS atmosphere ──────────────────────────────────────────
       A soft cool glow blooms behind the subject and falls off into a
       deep near-black at the edges — minimal, spacious, "deep space". */
    background:
      radial-gradient(120% 90% at 50% 34%, rgba(38, 44, 58, 0.55) 0%, rgba(20, 22, 28, 0.0) 52%),
      radial-gradient(140% 130% at 50% 50%, #101216 0%, #0a0a0c 62%, #070708 100%);
  }

  /* ── Background field ───────────────────────────────────────────
     A full 4×3 grid spanning the whole viewport. Each neighbour photo
     fills one cell, so the field covers the entire background (no empty
     space) with no overlaps and no repeats. A small gap gives a natural
     separation between tiles; the focal frame sits on top of the centre. */
  .bg-scatter {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(4, 1fr);
    /* Gutter + edge inset give the scatter its gallery-like dark spacing. */
    gap: 1.4vw;
    padding: 1.2vw;
  }

  .bg-photo {
    /* Per-tile width / aspect / alignment come inline (BG_TILES); the tile
       stays inside its own cell, so tiles never overlap. max-height caps any
       tall aspect so it can't bleed into the cell above/below. */
    height: auto;
    max-width: 100%;
    max-height: 100%;
    border-radius: 12px;
    object-fit: cover;
    /* Gently desaturated so the field reads as cool atmosphere, not a busy
       collage competing with the sharp subject. blur/opacity overridden inline. */
    opacity: 0.35;
    filter: blur(12px) saturate(0.85);
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* Real gallery field: each neighbour placed at its exact on-screen offset
     from the clicked photo (position/size/blur/opacity all inline, already
     in on-screen px — no further scaling here). */
  .bg-scatter--real {
    display: block;
    padding: 0;
    z-index: 1; /* above the decorative base fill, still below the frame */
  }
  .bg-photo--real {
    position: absolute;
    transform: translate(-50%, -50%);
    height: auto;               /* overridden inline with an explicit px height */
    max-width: none;
    max-height: none;
    border-radius: var(--radius-s, 4px);  /* match the gallery tile radius */
    object-fit: cover;
  }

  /* ── Depth vignette ─────────────────────────────────────────────
     One subtle layer (replaces the old double wash): darkens the edges
     so the scattered tiles melt into the cosmos, while leaving the
     centre clear for the focal frame. */
  .bg-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(115% 100% at 50% 50%, rgba(10, 10, 12, 0) 40%, rgba(9, 9, 11, 0.55) 74%, rgba(7, 7, 8, 0.82) 100%);
  }

  /* ── Close background ───────────────────────────────────────────── */
  /* Sits above overlays (z:2) but below photo frame (z:5) & arrows (z:20).
     Clicking any dark area outside the photo returns to the gallery.     */
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
    right: var(--spacing-11, 72px);  /* */
    z-index: 25;  
  }

  /* Gestione responsive per schermi piccoli */
  @media (max-width: 700px) {
    .close-x-container { 
      top: 24px; 
      right: 24px; 
    }
  }

  /* ── Navigation arrows ──────────────────────────────────────────── */
 /* ── POSIZIONAMENTO DELLE FRECCE LATERALI ── */
  .arrow-container {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;  /* Resta sopra il frame della foto */
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

  /* ── Base frame (positioning only, no size) ─────────────────────
     Centred by the flex parent (.lb) — no absolute/translate needed,
     which keeps it reliably centred on both axes at any zoom level.  */
  .photo-frame {
    position: relative;
    flex: 0 0 auto;
    z-index: 5;
    overflow: hidden;
    background: #111;
    /* ── Gallery "card" effect ── rounded corners, elevation shadow and a
       hairline border, mirroring .collage-item in PhotosView (scaled up for
       the larger focal frame). */
    border-radius: var(--radius-s, 4px);
    box-shadow:
      0 18px 60px rgba(0, 0, 0, 0.55),
      0 4px 20px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    /* `backwards` (not `both`): applies the `from` state before the entrance
       to avoid a flash, but does NOT forwards-fill — so after the animation
       the GSAP tilt is free to drive `transform` on hover. */
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

    /* Vertical budget: how tall the frame may grow relative to the
       *dynamic* viewport height. dvh tracks mobile chrome show/hide,
       so the frame always fits without the page ever scrolling.    */
    --avail-h: 86dvh;

    /* Hard safety: never taller than the budget even if a width cap
       wins, so flexbox never has to clip it.                        */
    max-height: var(--avail-h);
  }

  /* ── Frame size per snapped ratio ───────────────────────────────
     The frame is sized by WIDTH so its aspect-ratio fixes the height.
     Width = min(Figma-max, vw-cap, height-cap), where the height-cap
     (--avail-h × ratio) guarantees the resulting HEIGHT never exceeds
     the vertical budget. The frame therefore always fits both axes
     and stays absolutely centred at every viewport size.          */
  .photo-frame--16-9 { width: min(1091px, 63vw, calc(var(--avail-h) * 16 / 9)); aspect-ratio: 16 / 9; }
  .photo-frame--4-3  { width: min(1091px, 63vw, calc(var(--avail-h) * 4  / 3)); aspect-ratio: 4  / 3; }
  .photo-frame--3-4  { width: min(588px,  34vw, calc(var(--avail-h) * 3  / 4)); aspect-ratio: 3  / 4; }
  .photo-frame--9-16 { width: min(588px,  34vw, calc(var(--avail-h) * 9  / 16)); aspect-ratio: 9 / 16; }

  /* Portrait button moves to top-right (avoids caption overlap) */
  .photo-frame--portrait .expand-btn-container { bottom: auto; top: 18px; }

  /* ── Shared-element "photo fly" entrance ──────────────────────────
     When a flight is in play, the frame-enter keyframes are replaced by the
     PhotoFlightOverlay's clone animating in from the gallery — the frame
     itself just needs to fade in once the clone arrives, not run its own
     motion on top. `--suppress-anim` is permanent for the page's lifetime;
     `--flight` toggles the actual hide/reveal.
     The transition duration MUST match FLIGHT_REVEAL_MS exactly (passed in
     via the inline --flight-reveal-ms var): the clone's own fade-out uses
     the same constant, starting at the same instant, so the bare clone and
     the real, captioned frame crossfade in lockstep — no window where the
     photo already looks "arrived" while the info is still fading in. */
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

  /* Outgoing photo during an arrow-navigation crossfade — sits above the
     incoming image (still below the noise/vignette/caption overlays) and
     is eased out by GSAP (crossfadePhoto); removed once faded to opacity 0. */
  .photo-img--outgoing {
    z-index: 1;
  }

  .photo-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #111 0%, #1c1c1c 100%);
  }

  /* ── Card texture overlays (match PhotosView .img-noise / .img-vignette) ──
     Sit above the image (z:1) but below the caption (z:2), so the caption
     text stays crisp. */
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
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
    /* gradient fade zone — must extend well above the tallest text line */
    padding-top: 110px;
  }

  .caption-grad {
    position: absolute;
    inset: 0;
    /* opaque at bottom, fully transparent only at the very top of the padding zone */
    background: linear-gradient(to top, #0e0e0e 0%, rgba(14,14,14,0.9) 45%, transparent 100%);
  }

  .caption-text {
    position: relative;
    padding-left: var(--spacing-4-2);
    padding-bottom: var(--spacing-4-2);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Clip mask for the arrow-navigation caption reveal — same role as
     .filter-item-wrap in FiltraPerCategoriaFilter: hides the line while
     GSAP parks it at yPercent:140, so sliding to 0 reads as emerging from
     beneath the row rather than sliding in from off-frame. */
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
    /* allow long venue names to wrap instead of overflowing */
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
  /* ── POSIZIONAMENTO DEL BOTTONE ── */
  .expand-btn-container {
    position: absolute;
    top: var(--spacing-4-2);   /* Mantiene la posizione esatta in basso a destra */
    right: var(--spacing-4-2);    /* */
    z-index: 3;     /* Resta sopra la didascalia[cite: 4] */
  }

  /* Se il frame è verticale (portrait), sposta il contenitore in alto a destra[cite: 4]
  .photo-frame--portrait .expand-btn-container { 
    bottom: auto; 
    top: 18px; 
  }  */

  /* ── Responsive ─────────────────────────────────────────────────────
     Only the per-breakpoint knobs change: the width cap (Figma-max),
     the viewport-width fraction (how much room to leave for the side
     blur + arrows), and the vertical budget --avail-h. The height-cap
     math itself lives once in the base rules above.                 */
  @media (max-width: 1300px) {
    .photo-frame--16-9  { width: min(900px, 80vw, calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 80vw, calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(500px, 44vw, calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(500px, 44vw, calc(var(--avail-h) * 9  / 16)); }
  }

  @media (max-width: 1100px) {
    .photo-frame--16-9  { width: min(900px, 90vw, calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 90vw, calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(460px, 50vw, calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(460px, 50vw, calc(var(--avail-h) * 9  / 16)); }
  }

  @media (max-width: 700px) {
    /* Phones: give the frame more height budget and nearly full width. */
    .photo-frame        { --avail-h: 80dvh; }
    .photo-frame--16-9  { width: min(96vw,  calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(96vw,  calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(88vw,  calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(88vw,  calc(var(--avail-h) * 9  / 16)); }
    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }
    /* Keep arrows in-viewport on small screens */
    .arrow--prev { left: 20px; }
    .arrow--next { right: 20px; }
    /* Close button safe area */
    .close-x { top: 24px; right: 24px; }
  }

  /* ── Touch target compensation ──────────────────────────────────── */
  /* Extend hit areas via pseudo-element without changing visual size. */
  @media (pointer: coarse) {
    .arrow {
      position: fixed; /* keep fixed for coarse-pointer layers */
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
