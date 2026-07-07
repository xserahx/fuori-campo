<script lang="ts">
  import "../../../lib/styles/tokens.css";
  import { onMount, tick } from "svelte";
  import { get } from "svelte/store";
  import gsap from "gsap";
  import { tilt } from "$lib/actions/tilt";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    buildGalleryHref,
    buildGallerySearchParams,
    readGalleryContext,
  } from "$lib/data/gallery-context";
  import {
    getImageUrl,
    fetchAllVolunteers,
    getCachedVolunteers,
    ruoloToTag,
    type VolunteerSummary,
  } from "$lib/data/volunteers";
  import { snapToStdFrame } from "$lib/data/gallery";
  import type { PageData } from "./$types";
  import ScopriDiPiuButton from "$lib/components/buttons/ScopriDiPiuButton.svelte";
  import IconButton from "$lib/components/buttons/IconButton.svelte";
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import {
    photoFlight,
    arriveEntry,
    launchExit,
    rectOf,
    restingRectOf,
    FLIGHT_DURATION_MS,
    FLIGHT_REVEAL_MS,
    type FlightRect,
  } from "$lib/stores/photoFlight";

  // ═══════════════════════════════════════════════════════════
  // 1. GENERAZIONE SFONDO "COSMO" (COLLAGE SFOCATO)
  // ═══════════════════════════════════════════════════════════
  /* Crea un campo di foto sfocate sullo sfondo. Ogni foto adiacente della 
     galleria diventa una tessera sparsa in una griglia 6x4. Le dimensioni, 
     la sfocatura e l'opacità variano per dare un senso di profondità (effetto parallasse visivo). */

  const BG_COLS = 6;
  const BG_ROWS = 4;
  // Celle volutamente saltate per creare spazi vuoti organici
  const BG_SKIP = new Set(["4-1", "2-2", "5-3", "3-4"]);

  // Funzione pseudo-random deterministica: assicura che il posizionamento
  // dello scatter sia sempre identico ad ogni caricamento, senza rimescolarsi.
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

        // Genera larghezza, proporzioni, allineamento, blur e opacità pseudo-casuali
        const w = 60 + Math.round(rnd(k * 1.3 + 1) * 36);
        const ar = ["4 / 3", "3 / 2", "16 / 9", "1 / 1", "3 / 4"][
          Math.floor(rnd(k * 2.1 + 2) * 5)
        ];
        const jx = ["start", "center", "end"][Math.floor(rnd(k * 5.1 + 4) * 3)];
        const jy = ["start", "center", "end"][Math.floor(rnd(k * 6.3 + 5) * 3)];
        const blur = 8 + Math.round(rnd(k * 3.7 + 3) * 8);
        const op = (0.3 + rnd(k * 7.9 + 6) * 0.25).toFixed(2);

        tiles.push(
          `grid-column:${c}; grid-row:${r}; width:${w}%; aspect-ratio:${ar};` +
            `justify-self:${jx}; align-self:${jy}; filter:blur(${blur}px) saturate(0.85); opacity:${op};`,
        );

        k++;
      }
    }
    return tiles;
  })();

  // ═══════════════════════════════════════════════════════════
  // 2. DATI PAGINA E CACHE VOLONTARI
  // ═══════════════════════════════════════════════════════════
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  // Tenta di caricare i volontari dalla cache, altrimenti li mappa in modo lazy.
  let allVols = $state<VolunteerSummary[]>(getCachedVolunteers());
  onMount(() => {
    fetchAllVolunteers().then((vols) => {
      allVols = vols;
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. TRANSIZIONE DI VOLO SHARED-ELEMENT (DA GALLERIA)
  // ═══════════════════════════════════════════════════════════

  let frameEl = $state<HTMLElement | null>(null);
  let entryRect = $state<FlightRect | null>(null);
  let flightEntry = $state(false);
  let suppressEntranceAnim = $state(false);

  onMount(() => {
    const s = get(photoFlight);

    // Se l'utente ha cliccato una foto nella galleria, attiviamo il "volo" della foto
    if (s.active && s.phase === "entering" && !s.to && s.from) {
      entryRect = s.from;
      flightEntry = true;
      suppressEntranceAnim = true;
      parkCaption(); // Nascondiamo il testo finché la foto non è atterrata

      // Attendiamo due RequestAnimationFrame: in questo modo siamo certi che il
      // frame (frameEl) sia stato calcolato e disegnato dal browser con le sue
      // dimensioni finali. Questo evita glitch o "teletrasporti" della foto.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (frameEl) arriveEntry(restingRectOf(frameEl));

          setTimeout(() => {
            flightEntry = false;
            revealCaption(); // Sveliamo il testo quando la foto atterra
          }, FLIGHT_DURATION_MS);
        }),
      );
    } else {
      setTimeout(() => {
        suppressEntranceAnim = true;
      }, 750);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 4. STATO REATTIVO DA URL E SFONDI ADIACENTI
  // ═══════════════════════════════════════════════════════════
  const currentSlug = $derived(
    (page.params as Record<string, string>).slug ?? "",
  );
  const currentContext = $derived(readGalleryContext(page.url.searchParams));
  const imgParam = $derived(page.url.searchParams.get("img"));

  // Legge dall'URL quali erano le foto vicine nella galleria (passate tramite param 'neighbors')
  const neighborSlugs = $derived(
    (page.url.searchParams.get("neighbors") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const BG_COUNT = BG_TILES.length;
  let bgPaths = $state<string[]>([]);

  // Popola l'array degli sfondi evitando di duplicare la foto principale
  $effect(() => {
    if (neighborSlugs.length === 0 && bgPaths.length > 0) return;

    const excluded = new Set<string>();
    if (imgParam) excluded.add(imgParam);
    if (dbVol?.image_path) excluded.add(dbVol.image_path);
    for (const p of dbVol?.image_paths ?? []) excluded.add(p);

    const paths: string[] = [];
    const used = new Set<string>();

    const add = (p?: string | null) => {
      if (!p || excluded.has(p) || used.has(p)) return;
      used.add(p);
      paths.push(p);
    };

    // 1. Prima cerca di inserire i vicini effettivi della galleria
    for (const s of neighborSlugs) {
      if (paths.length >= BG_COUNT) break;
      if (s === currentSlug) continue;
      const vol = allVols.find((v) => v.slug === s);
      if (vol?.ha_immagini) add(vol.image_paths?.[0] ?? vol.image_path);
    }

    // 2. Se non bastano, riempie i buchi in modo deterministico dal resto del database
    if (paths.length < BG_COUNT) {
      const seed = currentSlug
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const others = allVols.filter(
        (v) => v.slug !== currentSlug && v.ha_immagini,
      );
      for (let i = 0; paths.length < BG_COUNT && i < others.length; i++) {
        const vol = others[(seed + i) % others.length];
        add(vol.image_paths?.[0] ?? vol.image_path);
      }
    }
    bgPaths = paths;
  });

  // Ripristino del layout di sfondo "reale" salvato in SessionStorage
  type BgTile = { dx: number; dy: number; w: number; h: number; src: string };
  let bgField = $state<{ cw: number; tiles: BgTile[] } | null>(null);
  onMount(() => {
    try {
      const raw = sessionStorage.getItem("bgField");
      if (raw) bgField = JSON.parse(raw);
      sessionStorage.removeItem("bgField");
    } catch {
      /* nessun layout salvato, si usa quello decorativo pseudo-casuale */
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 5. PROPORZIONI FRAME E ADATTAMENTO DINAMICO
  // ═══════════════════════════════════════════════════════════
  type FrameRatio = "16-9" | "4-3" | "3-4" | "9-16";
  const ratioFromParam = (v: string | null): FrameRatio | null =>
    v === "16-9" || v === "4-3" || v === "3-4" || v === "9-16" ? v : null;

  let imgError = $state(false);

  // Imposta le proporzioni iniziali leggendole dall'URL. Questo garantisce che
  // il div frame assuma le proporzioni finali ancor prima che l'immagine finisca
  // di caricare, permettendo all'animazione di atterraggio di essere perfetta.
  let detectedRatio = $state<FrameRatio>(
    ratioFromParam(page.url.searchParams.get("ar")) ?? "16-9",
  );
  const isPortrait = $derived(
    detectedRatio === "3-4" || detectedRatio === "9-16",
  );

  $effect(() => {
    currentSlug;
    imgParam;
    imgError = false;
  });

  // ═══════════════════════════════════════════════════════════
  // 6. TRANSIZIONE CROSSFADE (NAVIGAZIONE INTERNA)
  // ═══════════════════════════════════════════════════════════

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

    // Se stiamo navigando tramite frecce, esegue il crossfade tra foto vecchia e nuova
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

  const XFADE_EASE = "power2.inOut";
  const XFADE_DUR = 0.85;

  function parkCaption() {
    gsap.killTweensOf(".cap-line");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // yPercent scende del 150% rispetto alla VERA altezza del testo:
    // assicura che il testo si nasconda sempre dietro la maschera (overflow),
    // a prescindere dal fatto che sia su 1, 2 o 3 righe.
    gsap.set(".cap-line", { yPercent: 150, y: 0 });
  }

  // Pre-caricamento del Web Font:
  // Se l'animazione GSAP calcola le altezze del testo col font di sistema e
  // poi il Web Font (forma-djr-display) finisce di caricare a metà animazione,
  // il testo "sobbalza". Aspettiamo che il font sia pronto prima di animare.
  const CAPTION_FONTS = [
    '500 1em "forma-djr-display"',
    '800 1em "forma-djr-display"',
  ];

  function captionFontsReady() {
    if (typeof document === "undefined" || !document.fonts) return true;
    return CAPTION_FONTS.every((f) => document.fonts.check(f));
  }

  function revealCaption(delay = 0) {
    gsap.killTweensOf(".cap-line");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(".cap-line", { yPercent: 0, y: 0 });
      return;
    }

    const play = () =>
      gsap.to(".cap-line", {
        yPercent: 0, // Torna alla posizione naturale (0%)
        y: 0, // Assicura che i pixel aggiuntivi siano a zero
        duration: 0.9,
        ease: "power2.out",
        force3D: false,
        delay,
      });

    if (captionFontsReady()) {
      play();
      return;
    }

    Promise.all(CAPTION_FONTS.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(play);
  }

  // Anima dolcemente l'opacità, la scala e il blur della foto in ingresso e in uscita
  async function crossfadePhoto() {
    await tick();
    if (!mainImgEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      outgoingSrc = null;
      revealCaption();
      return;
    }

    gsap.killTweensOf([mainImgEl, outgoingImgEl, ".cap-line"].filter(Boolean));
    gsap.fromTo(
      mainImgEl,
      { opacity: 0, scale: 1.1, filter: "blur(10px)" },
      {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: XFADE_DUR,
        ease: XFADE_EASE,
        onComplete: () => {
          if (mainImgEl) gsap.set(mainImgEl, { clearProps: "filter" });
        },
      },
    );
    if (outgoingImgEl) {
      gsap.to(outgoingImgEl, {
        opacity: 0,
        scale: 1.1,
        filter: "blur(10px)",
        duration: XFADE_DUR,
        ease: XFADE_EASE,
        onComplete: () => {
          outgoingSrc = null;
        },
      });
    }
  }

  // Modifica morbidamente le dimensioni del div frameEl se la nuova foto
  // ha una proporzione diversa dalla precedente (es. da orizzontale a verticale)
  function morphFrame(from: FlightRect, to: FlightRect, onSettled: () => void) {
    if (
      !frameEl ||
      (from.width === to.width && from.height === to.height) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onSettled();
      return;
    }

    gsap.killTweensOf(frameEl);
    gsap.set(frameEl, {
      width: from.width,
      height: from.height,
      aspectRatio: "auto",
    });
    gsap.to(frameEl, {
      width: to.width,
      height: to.height,
      duration: XFADE_DUR,
      ease: XFADE_EASE,
      onComplete: onSettled,
    });
  }

  // Quando l'immagine carica effettivamente, corregge il ratio per future navigazioni
  async function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    const snapped = snapToStdFrame(img.naturalWidth / img.naturalHeight);
    const ratio: FrameRatio =
      snapped > 1.5
        ? "16-9"
        : snapped > 1.0
          ? "4-3"
          : snapped > 0.66
            ? "3-4"
            : "9-16";

    // Non ridimensionare mai il frame mentre un volo d'ingresso è in corso,
    // altrimenti la foto atterrerebbe disallineata.
    if (!flightEntry) detectedRatio = ratio;

    if (pendingFrameFrom) {
      const from = pendingFrameFrom;
      pendingFrameFrom = null;

      await tick();
      requestAnimationFrame(() => {
        if (frameEl) {
          gsap.set(frameEl, { clearProps: "width,height,aspectRatio" });
          morphFrame(from, rectOf(frameEl), revealCaption);
        } else {
          revealCaption();
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. VALORI DISPLAY E NAVIGAZIONE (FRECCE E BOTTONI)
  // ═══════════════════════════════════════════════════════════
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : "",
  );
  const volunteerRole = $derived(
    dbVol
      ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? "").toUpperCase()
      : "",
  );
  const resolvedVenue = $derived(
    dbVol
      ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? "").toUpperCase()
      : "",
  );
  const resolvedSrc = $derived(
    dbVol?.ha_immagini ? getImageUrl(imgParam ?? dbVol.image_path) : null,
  );

  // Mantiene il contesto dei filtri attivi (es. stai scorrendo solo l'Area Sport)
  const peers = $derived.by(() => {
    const tag =
      ruoloToTag(dbVol?.ruolo_generale ?? null) ??
      currentContext.filters[0] ??
      null;
    if (tag) {
      return allVols.filter(
        (v) => ruoloToTag(v.ruolo_generale) === tag && v.ha_immagini,
      );
    }
    return allVols.filter((v) => v.ha_immagini);
  });

  const vIdx = $derived(peers.findIndex((v) => v.slug === currentSlug));

  function goTo(offset: number) {
    const len = peers.length;
    if (len === 0) return;
    const target = peers[(((vIdx + offset) % len) + len) % len];
    if (target) {
      const search = buildGallerySearchParams(currentContext);
      goto(
        search
          ? `/volunteer/${target.slug}?${search}`
          : `/volunteer/${target.slug}`,
      );
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
    goto(
      search
        ? `/volunteer/${currentSlug}/profile?${search}`
        : `/volunteer/${currentSlug}/profile`,
    );
  }

  function handleFrameKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;
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

  // ═══════════════════════════════════════════════════════════
  // 8. TILT 3D AZIONATO DAL MOUSE (HOVER INTERATTIVO)
  // ═══════════════════════════════════════════════════════════
  // Genera un'ombra dinamica che si sposta al contrario rispetto all'inclinazione
  // della card, accentuando enormemente la percezione della profondità 3D.
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
  {#if bgField}
    <div class="bg-scatter bg-scatter--real" aria-hidden="true">
      {#each bgField.tiles as t, i (i)}
        {@const nd = Math.hypot(t.dx, t.dy) / bgField.cw}
        {@const near = Math.max(0, Math.min(1, 1 - nd / 10))}
        {@const blur = (6 + (1 - near) * 10).toFixed(1)}
        {@const op = (0.3 + near * 0.3).toFixed(2)}
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

  <button
    class="close-bg"
    type="button"
    aria-label="Torna alla galleria"
    onclick={goBackToGallery}
  ></button>

  <div class="close-x-container">
    <IconButton variant="close" onclick={goBackToGallery} />
  </div>

  <div class="arrow-container arrow-container--prev">
    <ArrowButton direction="left" onclick={() => goTo(-1)} />
  </div>

  <div class="arrow-container arrow-container--next">
    <ArrowButton direction="right" onclick={() => goTo(1)} />
  </div>

  <div
    bind:this={frameEl}
    class="photo-frame photo-frame--{detectedRatio}"
    class:photo-frame--portrait={isPortrait}
    class:photo-frame--flight={flightEntry}
    class:photo-frame--suppress-anim={suppressEntranceAnim}
    style={suppressEntranceAnim
      ? `--flight-reveal-ms:${FLIGHT_REVEAL_MS}ms`
      : undefined}
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

    <div class="card-noise" aria-hidden="true"></div>
    <div class="card-vignette" aria-hidden="true"></div>

    <div class="photo-caption">
      <div class="caption-grad" aria-hidden="true"></div>
      <div class="caption-text">
        <div class="cap-line-wrap">
          <p class="cap-role cap-line">{volunteerRole}</p>
        </div>
        <div class="cap-line-wrap">
          <p class="cap-location cap-line">{resolvedVenue}</p>
        </div>
        <div class="cap-line-wrap">
          <p class="cap-name cap-line">{volunteerTitle.toUpperCase()}</p>
        </div>
      </div>
    </div>

    <ScopriDiPiuButton
      class="expand-btn-container"
      onclick={handleExpandButtonClick}
      onpointerdown={handleExpandButtonPointerDown}
    />
  </div>
</main>

<style>
  /* ═══════════════════════════════════════════════════════════
   * STILI GLOBALI E CONTENITORE LIGHTBOX
   * ═══════════════════════════════════════════════════════════ */
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

  .lb {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: radial-gradient(
        120% 90% at 50% 34%,
        rgba(38, 44, 58, 0.55) 0%,
        rgba(20, 22, 28, 0) 52%
      ),
      radial-gradient(
        140% 130% at 50% 50%,
        #101216 0%,
        #0a0a0c 62%,
        #070708 100%
      );
  }

  /* ═══════════════════════════════════════════════════════════
   * SFONDO SFOCATO "COSMO" E CHIUSURA
   * ═══════════════════════════════════════════════════════════ */
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

  .bg-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(
      115% 100% at 50% 50%,
      rgba(10, 10, 12, 0) 40%,
      rgba(9, 9, 11, 0.55) 74%,
      rgba(7, 7, 8, 0.82) 100%
    );
  }

  .close-bg {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
  }

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

  /* ═══════════════════════════════════════════════════════════
   * UI NAVIGAZIONE (FRECCE)
   * ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
   * FRAME FOTOGRAFICO PRINCIPALE (CARD)
   * ═══════════════════════════════════════════════════════════ */
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

    /* Altezza massima disponibile usata come base di calcolo per le varie proporzioni */
    --avail-h: 86dvh;
    max-height: var(--avail-h);
  }

  .photo-frame:focus-visible {
    outline: 2px solid var(--color-content-accent, #bdff5d);
    outline-offset: 8px;
  }

  /* Gestione automatica della larghezza in base all'altezza (mantiene l'aspect-ratio) */
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

  /* ═══════════════════════════════════════════════════════════
   * LIVELLI IMMAGINE E TEXTURE CARD
   * ═══════════════════════════════════════════════════════════ */
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
    object-fit: cover; /* Riempie sempre l'area senza deformare e senza bordi neri */
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

  .card-noise {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: radial-gradient(
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px
    );
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    opacity: 0.12;
  }

  .card-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 58%,
      rgba(0, 0, 0, 0.42) 100%
    );
  }

  /* ═══════════════════════════════════════════════════════════
   * DIDASCALIA INFERIORE (CAPTION E GRADIENTE)
   * ═══════════════════════════════════════════════════════════ */
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

    /* Gradiente iper-sfumato senza scalini (Scrim Gradient) */
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
    font-size: var(--ts-volunteer-location-size);
    font-weight: var(--ts-volunteer-location-weight);
    line-height: var(--ts-volunteer-location-line-height);
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

  .expand-btn-container {
    position: absolute;
    top: var(--spacing-4-2);
    right: var(--spacing-4-2);
    z-index: 3;
    pointer-events: auto;
  }

  .expand-btn-container::after {
    content: "";
    position: absolute;
    inset: -10px;
  }

  /* ═══════════════════════════════════════════════════════════
   * RESPONSIVE MEDIA QUERIES
   * ═══════════════════════════════════════════════════════════ */
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

  /* ── Compensazione area tocco (Touch target) su dispositivi mobili ── */
  @media (pointer: coarse) {
    .arrow {
      position: fixed;
    }
    .arrow::after,
    .close-x::after,
    .expand-btn-container::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(80px, calc(44px / var(--page-zoom, 1)));
    }
    .close-x::after {
      min-width: max(44px, calc(44px / var(--page-zoom, 1)));
      min-height: max(44px, calc(44px / var(--page-zoom, 1)));
    }
    .expand-btn-container::after {
      min-width: 100%;
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Riduzione movimento (Accessibilità per motion sickness) ── */
  @media (prefers-reduced-motion: reduce) {
    .photo-frame {
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }
</style>
