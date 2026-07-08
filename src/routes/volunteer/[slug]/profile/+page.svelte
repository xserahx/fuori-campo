<script lang="ts">
  import "../../../../lib/styles/tokens.css";
  import { gsap } from "gsap";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Icon from "$lib/components/buttons/Icon.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { beforeNavigate } from "$app/navigation";
  import { imagesRaw, slugify, type GalleryImage } from "$lib/data/gallery";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import {
    buildGalleryHref,
    readGalleryContext,
  } from "$lib/data/gallery-context";
  import BackButton from "$lib/components/buttons/BackButton.svelte";
  import VediTutteLeFoto from "$lib/components/buttons/VediTutteLeFoto.svelte";
  import PhotoGalleryOverlay from "$lib/components/gallery/PhotoGalleryOverlay.svelte";
  import { getImageUrls } from "$lib/data/volunteers";
  import type { PageData } from "./$types";

  /* ── 1. DATI PAGINA E VOLONTARIO ───────────────────────────────
     dbVol viene recuperato dalla funzione di load (ssr o client). 
     Tutte le variabili usano $derived per aggiornarsi automaticamente
     se la route o i dati cambiano. */
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Tipo esteso per il fallback (quando non c'è DB ma solo mockup Figma) ── */
  type Volunteer = GalleryImage & {
    dayDescription?: string;
    responses?: string[];
  };

  /* ── 2. LOGICA DEL BOTTONE "INDIETRO" E CONTESTO ─────────────── */
  const currentSlug = $derived(
    (page.params as Record<string, string>).slug ?? "",
  );
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  // Leggiamo l'URL per capire se l'utente arriva dalla pagina "About" o dalla "Galleria".
  // Se c'è '?from=about', il tasto indietro riporterà ad /about, altrimenti ricostruisce
  // il link della galleria (mantenendo filtri e scroll).
  const isFromAbout = $derived(page.url.searchParams.get("from") === "about");
  const backHref = $derived(
    isFromAbout ? "/about" : buildGalleryHref(currentContext),
  );

  // Fallback per cercare il volontario nei dati statici se manca nel DB
  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find(
      (img, i) => img.name && slugify(img.name, i) === currentSlug,
    ) ?? null,
  );

  /* ── 3. VARIABILI DI VISUALIZZAZIONE (Il DB ha sempre priorità) ── */
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : (volunteer?.name ?? ""),
  );

  const volunteerRole = $derived(
    dbVol
      ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? "").toUpperCase()
      : "",
  );

  // Separazione nome e cognome per l'impatto grafico (font gigante)
  const nameSurname = $derived(dbVol?.cognome.toUpperCase() ?? "");
  const nameFirstname = $derived(dbVol?.nome.toUpperCase() ?? "");

  const resolvedLocation = $derived(
    dbVol
      ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? "").toUpperCase()
      : "",
  );

  const resolvedDetail = $derived(
    dbVol
      ? [dbVol.regione, dbVol.eta ? `${dbVol.eta} anni` : null]
          .filter(Boolean)
          .join(", ")
      : "",
  );

  const resolvedQuote = $derived(
    dbVol?.autorizzazione_risposte ? (dbVol.commento_positivo ?? null) : null,
  );
  const quoteText = $derived(
    resolvedQuote ?? "Un’esperienza che non dimenticherò mai.",
  );

  /* ── 4. LOGICA FOTO E OVERLAY GALLERIA ─────────────────────────
     Le foto del profilo ora si aprono ESCLUSIVAMENTE in overlay (schermo intero). 
     Qui calcoliamo quante e quali foto passare al componente <PhotoGalleryOverlay>. */
  const dbPhotos = $derived(dbVol ? getImageUrls(dbVol) : []);
  const figmaPhotos = $derived(
    imagesRaw
      .filter(
        (img) => img.name && volunteer?.name && img.name === volunteer.name,
      )
      .map((img) => img.src),
  );

  const volunteerPhotos = $derived(
    dbPhotos.length > 0 ? dbPhotos : figmaPhotos,
  );
  const photoCount = $derived(volunteerPhotos.length);

  /* ── Stato di apertura della galleria overlay ── */
  let galleryOpen = $state(false);
  function openGallery() {
    galleryOpen = true;
  }
  function closeGallery() {
    galleryOpen = false;
  }

  /* ── 5. GESTIONE SCROLL DELLA PAGINA (LOCK/UNLOCK) ───────────────
     Quando si apre l'overlay delle foto, dobbiamo bloccare lo scroll del 
     sito per non far scorrere la pagina profilo "sotto" le foto. 
     Rimuoviamo attributi style inline e classi lenis (libreria smooth scroll). */
  function unlockProfileScroll() {
    if (!browser) return;
    const root = document.documentElement;
    const body = document.body;

    root.style.removeProperty("overflow");
    root.style.removeProperty("overflow-y");
    root.style.removeProperty("height");
    root.style.removeProperty("position");

    body.style.removeProperty("overflow");
    body.style.removeProperty("overflow-y");
    body.style.removeProperty("height");
    body.style.removeProperty("position");
    body.style.removeProperty("padding-top");

    root.classList.remove("lenis-stopped");
    body.classList.remove("lenis-stopped");
  }

  function unlockProfileScrollIfGalleryClosed() {
    if (galleryOpen) return;
    unlockProfileScroll();
  }

  function lockProfileGalleryScroll() {
    if (!browser) return;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  // Se l'utente cambia pagina col tasto indietro, assicurati di sbloccare lo scroll
  beforeNavigate(() => {
    unlockProfileScroll();
  });

  /* ── 6. LIFECYCLE E LOGICA BOTTONE FLOTTANTE (onMount) ──────────── */
  onMount(() => {
    unlockProfileScroll();

    // Trick per aggirare bug di calcolo in avvio: puliamo lo scroll in vari frame successivi
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      unlockProfileScrollIfGalleryClosed();
      secondFrame = requestAnimationFrame(() => {
        unlockProfileScrollIfGalleryClosed();
      });
    });
    const unlockTimer = window.setTimeout(() => {
      unlockProfileScrollIfGalleryClosed();
    }, 120);

    /* ── Logica Bottone "VEDI TUTTE LE FOTO" (Sticky) ─────────────
       Il bottone è fisso in basso (position: fixed). Quando l'utente scorre 
       e il footer entra nello schermo, calcoliamo la sovrapposizione e spingiamo 
       il bottone verso l'alto (usando translate3d per accelerazione hardware) 
       evitando che il footer lo copra. Eseguito solo allo scroll per performance. */
    const fotoBtn = document.getElementById("sticky-foto-btn");
    const footerElement = document.querySelector("footer");

    let scrollRaf = 0;
    let onScrollOrResize: (() => void) | null = null;

    if (fotoBtn && footerElement) {
      const FOOTER_GAP =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--spacing-5",
          ),
        ) || 24;

      const updateStickyButton = () => {
        scrollRaf = 0;

        // Su mobile disabilitiamo l'effetto sticky e la rincorsa GSAP
        if (window.innerWidth <= 700) {
          fotoBtn.style.transform = ''; // Pulisce lo stile inline
          return; // Blocca l'esecuzione del resto della funzione
        }

        const footerRect = (
          footerElement as HTMLElement
        ).getBoundingClientRect();

        // Calcola a che altezza si trova normalmente il bottone rispetto alla fine della finestra
        const btnHeight = (fotoBtn as HTMLElement).offsetHeight;
        const bottomCss =
          parseFloat(getComputedStyle(fotoBtn as HTMLElement).bottom) || 0;
        const naturalBottom = window.innerHeight - bottomCss;

        // Se il footer entra nello spazio "vitale" del bottone, lo solleviamo del valore "lift"
        const overlap = naturalBottom + FOOTER_GAP - footerRect.top;
        const lift = Math.max(0, overlap);

        // Posizionamento istantaneo e performante senza lag/rimbalzi (Accelerato da GPU)
        fotoBtn.style.transform = `translate3d(0, -${lift}px, 0)`;
      };

      onScrollOrResize = () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(updateStickyButton);
      };

      window.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.addEventListener("resize", onScrollOrResize);

      updateStickyButton();

      // Il footer usa un WebFont asincrono, ri-calcoliamo quando il testo assume la sua altezza reale.
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(updateStickyButton);
      }
    }

    return () => {
      unlockProfileScroll();
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      window.clearTimeout(unlockTimer);
      if (onScrollOrResize) {
        window.removeEventListener("scroll", onScrollOrResize);
        window.removeEventListener("resize", onScrollOrResize);
      }
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (fotoBtn) gsap.killTweensOf(fotoBtn);
    };
  });

  onDestroy(() => {
    unlockProfileScroll();
  });

  // Reagisce all'apertura/chiusura della galleria per gestire lo scroll lock
  $effect(() => {
    if (!browser) return;
    if (!galleryOpen) {
      unlockProfileScroll();
      return;
    }
    lockProfileGalleryScroll();
    return () => {
      unlockProfileScroll();
    };
  });

  /* ── 7. DOMANDE E RISPOSTE (Q&A Accordion) ───────────────────────── */
  const dbResponses = $derived(
    dbVol?.autorizzazione_risposte
      ? [
          dbVol.giornata_tipo,
          dbVol.percezione_pubblico,
          dbVol.commento_positivo,
          dbVol.commento_negativo,
          dbVol.cosa_porti,
          dbVol.commenti_generali,
          dbVol.rifai,
        ]
      : null,
  );

  const questionTitles = [
    "UNA GIORNATA TIPO DA VOLONTARIO",
    "COME MI VEDEVANO GLI ALTRI",
    "UN COMMENTO POSITIVO",
    "E UNO NEGATIVO",
    "COSA MI PORTO A CASA",
    "COSA NON MI AVETE CHIESTO",
    "LO RIFAREI E LO CONSIGLIEREI?",
  ];

  // Stato per tenere traccia di quale domanda dell'accordion è aperta (-1 = nessuna)
  let openQ = $state(-1);

  // Azzera la domanda aperta se navighiamo a un altro volontario
  $effect(() => {
    currentSlug;
    openQ = -1;
  });

  function answerFor(i: number): string {
    if (dbResponses) return dbResponses[i] ?? "Nessuna risposta disponibile.";
    if (i === 0 && volunteer?.dayDescription) return volunteer.dayDescription;
    return volunteer?.responses?.[i] ?? "Nessuna risposta disponibile.";
  }

  /* ── Transizione personalizzata (Custom Svelte Transition) per il testo delle risposte.
     Combina un effetto di fade in/out con una sfocatura decrescente.
     Se l'utente ha impostato l'OS per ridurre i movimenti (prefers-reduced-motion), 
     la durata è 0 (appare istantaneamente). */
  const prefersReduced = () =>
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function blurFade(
    _node: HTMLElement,
    { duration = 700 }: { duration?: number } = {},
  ) {
    return {
      duration: prefersReduced() ? 0 : duration,
      easing: cubicOut,
      css: (t: number) => `opacity: ${t}; filter: blur(${(1 - t) * 10}px);`,
    };
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<main class="profile" id="main-content">
  <div class="hero">
    <div class="back-btn-wrapper">
      <BackButton href={backHref} />
    </div>

    <header class="head">
      <div class="name-hero" role="img" aria-label={volunteerTitle}>
        {#if nameSurname}
          <div class="name-surname" aria-hidden="true">{nameSurname}</div>
        {/if}
        <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
      </div>

      <blockquote class="vol-quote" class:vol-quote--dim={!resolvedQuote}>
        <span class="qmark qmark--first" aria-hidden="true">&#8220;</span>
        <p class="quote-body">{quoteText}</p>
        <span class="qmark qmark--last" aria-hidden="true">&#8221;</span>
      </blockquote>
    </header>

    <div class="hero-grid">
      <div class="vol-info">
        <p class="info-role">{volunteerRole}</p>
        <p class="info-location">{resolvedLocation}<br />{resolvedDetail}</p>
      </div>

      <div class="qa-wrap" role="list">
        {#each questionTitles as q, i}
          <div class="qa-item" role="listitem">
            <button
              class="qa-row"
              class:qa-row--open={openQ === i}
              type="button"
              aria-expanded={openQ === i}
              onclick={() => {
                openQ = openQ === i ? -1 : i;
              }}
            >
              <span class="qa-title">{q}</span>
              <span
                class="qa-icon"
                class:qa-icon--open={openQ === i}
                aria-hidden="true"
              >
                <Icon name="plus" />
              </span>
            </button>

            <div class="qa-sep" class:qa-sep--open={openQ === i}></div>

            {#if openQ === i}
              <div
                class="qa-panel"
                in:slide={{ duration: 520, easing: cubicOut }}
                out:slide={{ duration: 400, easing: cubicOut }}
              >
                <div class="qa-answer" role="region" aria-live="polite">
                  <p
                    in:blurFade={{ duration: 900 }}
                    out:blurFade={{ duration: 360 }}
                  >
                    {answerFor(i)}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    {#if photoCount > 0}
      <div
        id="sticky-foto-btn"
        class="vedi-foto-wrapper"
        class:vedi-foto-wrapper--hidden={galleryOpen}
      >
        <VediTutteLeFoto onclick={openGallery} />
      </div>
    {/if}
  </div>
</main>

<SiteFooter />

{#if galleryOpen && photoCount > 0}
  <PhotoGalleryOverlay
    photos={volunteerPhotos}
    altBase={volunteerTitle}
    onclose={closeGallery}
  />
{/if}

<style>
  /* ── Stili Generali ─────────────────────────────────────────────────────── */
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

  /* ── Involucro Pagina ────────────────────────────────────────────── */
  .profile {
    --profile-side-offset: var(--spacing-11, 72px);
    --photo-button-bottom: var(--unit-48, 48px);

    position: relative;
    width: 100%;
    min-height: 100dvh;
    padding: calc(var(--navbar-height, 125px) + 24px) 0 24px;
    background: #0e0e0e;
    color: #fafafa;
    overflow-x: hidden;
  }

  .hero {
    position: relative;
    padding-bottom: 160px;
  }

  /* ── Bottone Indietro ─────────────────────────────────────────────── */
  .back-btn-wrapper {
    margin-left: var(--profile-side-offset);
  }

  @media (max-width: 700px) {
    .back-btn-wrapper {
      margin-left: var(--profile-side-offset);
    }
  }

  /* ── Header: Nomi Giganti ────────────────────────────────────────── */
  .head {
    position: relative;
    margin-top: 28px;
    min-height: 220px;
  }

  .name-hero {
    pointer-events: none;
  }

  .name-surname,
  .name-firstname {
    font-size: clamp(56px, 8vw, 116px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
  }

  .name-surname {
    padding-left: var(--profile-side-offset);
    margin-bottom: -8px;
    color: var(--color-content-accent, #bdff5d);
  }

  .name-firstname {
    padding-left: clamp(48px, 19vw, 340px);
    color: transparent;
    -webkit-text-stroke: var(--stroke-mobile)
      var(--color-content-accent, #bdff5d);
  }

  /* ── Citazione (Quote) ──────────────────────────────────────────── */
  .vol-quote {
    position: absolute;
    right: var(--spacing-11, 72px);
    top: 8px;
    width: 429px;
    max-width: 38vw;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-style: normal;
  }

  .vol-quote--dim {
    opacity: 1;
  }

  .qmark {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    font-family: var(--font-display);
    font-size: 84px;
    font-style: normal;
    font-weight: 500;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-width: var(--stroke-mobile);
    -webkit-text-stroke-color: var(--color-content-body);
    paint-order: stroke fill;
    user-select: none;
  }

  .qmark--first {
    height: 45px;
    line-height: 1;
    margin-bottom: 0px;
  }

  .qmark--last {
    align-items: flex-start;
    height: 45px;
    line-height: 0.6;
    margin-top: 20px;
  }

  .quote-body {
    max-width: 100%;
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--ts-cat-size);
    font-style: normal;
    font-weight: 600;
    line-height: 32px;
    text-wrap: balance;
    color: var(--color-content-body);
    text-align: right;
    white-space: pre-wrap;
  }

  /* ── Griglia e Informazioni ────────────────────────────────────────── */
  .hero-grid {
    display: grid;
    grid-template-columns: 6fr 6fr;
    column-gap: var(--spacing-6, 32px);
    align-items: start;
    margin-top: 72px;
    padding: 0 var(--profile-side-offset);
  }

  .vol-info {
    margin: 0;
    min-width: 0;
    max-width: 700px;
  }

  .info-role {
    margin: 0 0 8px;
    font-size: 36px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0%;
    color: var(--color-content-accent, #bdff5d);
  }

  .info-location {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0%;
    white-space: pre-wrap;
    color: var(--color-content-body);
  }

  /* ── Accordion (Q&A) ──────────────────────────────────────────────── */
  .qa-wrap {
    width: 100%;
    margin: 0;
    /* Compensa il padding-top della prima .qa-row per farla allineare visivamente 
       con .info-role nella griglia */
    margin-top: -14px;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .qa-item {
    display: flex;
    flex-direction: column;
  }

  .qa-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 14px 0;
    border: 0;
    background: transparent;
    color: var(--color-content-body, #fafafa);
    font-size: 36px;
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 1.44px;
    cursor: pointer;
    text-align: left;
    transition: color 0.18s ease;
  }

  .qa-row:hover,
  .qa-row--open {
    color: var(--color-content-accent, #bdff5d);
  }

  .qa-row:hover + .qa-sep:not(.qa-sep--open) {
    background: var(--color-content-accent, #bdff5d);
  }

  .qa-title {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  .qa-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      opacity 0.18s ease,
      transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .qa-icon--open {
    opacity: 1;
    transform: rotate(45deg);
  }

  .qa-sep {
    height: var(--stroke-mobile);
    background: #fafafa;
    flex-shrink: 0;
    overflow: hidden;
    transition: background 200ms ease;
  }

  .qa-sep--open {
    background: var(--color-content-accent, #bdff5d);
  }

  .qa-panel {
    background: var(--color-content-accent, #bdff5d);
    overflow: hidden;
    flex-shrink: 0;
  }

  .qa-answer {
    padding: 36px 44px 40px;
  }

  .qa-answer p {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: 0.96px;
    color: var(--color-content-body-black, #0e0e0e);
    white-space: pre-wrap;
  }

  .qa-row:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 3px;
    border-radius: 4px;
  }

  /* ── Bottone per aprire foto ───────────────────────────────────────── */
  .vedi-foto-wrapper {
    position: fixed;
    left: var(--profile-side-offset, var(--spacing-11, 72px));
    bottom: var(--photo-button-bottom, var(--unit-48, 48px));
    z-index: 9999 !important;
    pointer-events: auto;
    will-change: transform;
  }

  .vedi-foto-wrapper--hidden {
    display: none;
  }

  /* ── Media Queries Responsive ──────────────────────────────────────── */
  @media (max-width: 1100px) {
    .vol-quote {
      right: var(--spacing-5, 24px);
      top: 4px;
      width: 300px;
    }

    .quote-body {
      font-size: var(--ts-cat-size);
    }

    .hero-grid {
      grid-template-columns: 1fr;
      row-gap: 40px;
    }

    .qa-wrap {
      margin-top: 0;
    }

    .qa-row {
      font-size: 26px;
    }
  }

  @media (max-width: 700px) {
    .profile {
      --profile-side-offset: var(--spacing-5, 24px);
      --photo-button-bottom: 32px;
      padding-top: calc(var(--navbar-height, 125px) + 8px);
    }
    
    .name-surname {
      padding-left: var(--profile-side-offset);
      font-size: clamp(44px, 13vw, 80px);
      margin-bottom: 0px;
    }

    .name-firstname {
      padding-left: 40px;
      font-size: clamp(44px, 13vw, 80px);
    }

    .name-surname,
    .name-firstname {
      /* Permette al testo di andare a capo */
      white-space: normal;
      /* Spezza le parole se sono singole e troppo lunghe per lo schermo */
      overflow-wrap: break-word;
      /* Imposta il margine destro di 24px per non far toccare il bordo */
      padding-right: var(--spacing-5, 24px);
      line-height: 0.85;
    }

    .head {
      min-height: 0;
    }

    .vol-quote {
      position: relative;
      right: auto;
      top: auto;
      width: 100%;
      max-width: 100%;
      margin: 24px 0 0;
      padding: 0.6em var(--profile-side-offset);
    }

    .quote-body {
      width: 100%;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0%;
    }

    .info-location {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0%;
    }

    .qmark--last {
      margin-top: 14px;
    }

    .hero-grid {
      padding: 0 var(--profile-side-offset);
      margin-top: 24px;
    }

    .info-role {
      font-size: 21px;
    }

    .qa-row {
      font-size: 18px;
      letter-spacing: 1px;
      padding: 12px 0;
    }

    .qa-icon {
      width: 28px;
      height: 28px;
    }

    .qa-answer {
      padding: 20px 18px 24px;
    }

    .qa-answer p {
      font-size: 16px;
    }

    .hero {
      padding-bottom: 56px;
    }

    .vedi-foto-wrapper {
      position: relative;
      left: auto;
      bottom: auto;
      
      /* ── NUOVO: Centratura perfetta ── */
      display: flex;
      justify-content: center;
      width: 100%;
      
      /* Margine: 24px in alto, 0 a destra, 0 in basso, 0 a sinistra */
      margin: var(--spacing-9, 60px) 0 0 0;
      
      transform: none !important;
    }

    /* Intercettazione e override forzati su mobile */
    :global(.navbar.menu-open) ~ main .vedi-foto-wrapper {
      display: none !important;
    }

    :global(body[style*="overflow: hidden"]) .vedi-foto-wrapper {
      display: none !important;
    }
  }

  @media (pointer: coarse) {
    .qa-row {
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .qa-sep,
    .qa-icon {
      transition: none;
    }
  }
</style>
