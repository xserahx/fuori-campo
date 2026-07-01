<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import { buildGalleryHref, readGalleryContext } from '$lib/data/gallery-context';
  import BackButton from '$lib/components/buttons/BackButton.svelte';
  import VediTutteLeFoto from '$lib/components/buttons/VediTutteLeFoto.svelte';
  import PhotoGalleryOverlay from '$lib/components/buttons/PhotoGalleryOverlay.svelte';
  import { getImageUrls } from '$lib/data/volunteers';
  import type { PageData } from './$types';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  /* ── Page data (dbVol pre-fetched by load function) ─────────── */
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Extended volunteer type (for Figma photo fallback only) ─── */
  type Volunteer = GalleryImage & { dayDescription?: string; responses?: string[] };

  /* ── Reactive slug / context ─────────────────────────────────── */
  const currentSlug = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  // Figma image entry — used only as photo fallback when volunteer has no DB photos
  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  /* ── Display values — DB is the single source of truth ──────── */
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : (volunteer?.name ?? '')
  );

  const volunteerRole = $derived(
    dbVol ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? '').toUpperCase() : ''
  );

  const nameSurname   = $derived(dbVol?.cognome.toUpperCase() ?? '');
  const nameFirstname = $derived(dbVol?.nome.toUpperCase()    ?? '');

  const resolvedLocation = $derived(
    dbVol ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? '').toUpperCase() : ''
  );

  const resolvedDetail = $derived(
    dbVol
      ? [dbVol.regione, dbVol.eta ? `${dbVol.eta} anni` : null].filter(Boolean).join(', ')
      : ''
  );

  const resolvedQuote = $derived(
    dbVol?.autorizzazione_risposte ? (dbVol.commento_positivo ?? null) : null
  );
  const quoteText = $derived(resolvedQuote ?? 'Un’esperienza che non dimenticherò mai.');

  /* ── Photos ──────────────────────────────────────────────────── */
  const dbPhotos    = $derived(dbVol ? getImageUrls(dbVol) : []);
  const figmaPhotos = $derived(
    imagesRaw
      .filter(img => img.name && volunteer?.name && img.name === volunteer.name)
      .map(img => img.src)
  );
  const volunteerPhotos = $derived(dbPhotos.length > 0 ? dbPhotos : figmaPhotos);
  const photoCount      = $derived(volunteerPhotos.length);

  /* ── Stato apertura galleria foto a schermo intero (overlay) ──── */
  let galleryOpen = $state(false);
  function openGallery() { galleryOpen = true; }
  function closeGallery() { galleryOpen = false; }

  // Blocca lo scroll della pagina mentre l'overlay è aperto.
  $effect(() => {
    if (!browser) return;
    document.body.style.overflow = galleryOpen ? 'hidden' : '';
  });

  /* ── Q&A responses ───────────────────────────────────────────── */
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
      : null
  );

  const questionTitles = [
    'UNA GIORNATA TIPO DA VOLONTARIO',
    'COME MI VEDEVANO GLI ALTRI',
    'UN COMMENTO POSITIVO',
    'E UNO NEGATIVO',
    'COSA MI PORTO A CASA',
    'COSA NON MI AVETE CHIESTO',
    'LO RIFAREI E LO CONSIGLIEREI?',
  ];

  let openQ = $state(-1);
  $effect(() => { currentSlug; openQ = -1; });

  function answerFor(i: number): string {
    if (dbResponses) return dbResponses[i] ?? 'Nessuna risposta disponibile.';
    if (i === 0 && volunteer?.dayDescription) return volunteer.dayDescription;
    return volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.';
  }

  // Clear any scroll-lock left over from the gallery / category / homepage.
  $effect(() => {
    if (!browser) return;
    document.documentElement.style.overflow = '';
    if (!galleryOpen) document.body.style.overflow = '';
    document.body.style.paddingTop = '';
  });

 
 /* ── Logica di Blocco del Bottone Foto prima del Footer ──────── */
  /* ── Logica di Blocco del Bottone Foto prima del Footer ──────── */
  /* ── Logica di Blocco del Bottone Foto prima del Footer ──────── */
  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);

    const fotoBtn = document.getElementById('sticky-foto-btn');
    const footerElement = document.querySelector('footer');

    if (fotoBtn && footerElement) {
      // Creiamo una timeline dedicata che si attiva SOLO quando serve
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: footerElement,
          // Parte nell'istante esatto in cui la cima del footer si trova a 48px dal fondo del viewport
          start: "top bottom-=48px", 
          // Finisce quando il footer ha occupato tutto lo spazio visibile in basso
          end: "bottom bottom",      
          scrub: 0, // 0 annulla qualsiasi ritardo o "rimbalzo" intermedio, legandosi al millimetro alla rotella
          invalidateOnRefresh: true
        }
      });

      // Sposta il bottone sull'asse Y esattamente della quota di cui il footer sale
      tl.to(fotoBtn, {
        y: () => -(footerElement.offsetHeight),
        ease: "none" // Fondamentale: linearizza il movimento eliminando accelerate/decelerate intermedie
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  });
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="profile" id="main-content">

  <div class="hero">

    <!-- ── INDIETRO button ────────────────────────────────────────── -->
    <div class="back-btn-wrapper">
      <BackButton href={buildGalleryHref(currentContext)} />
    </div>

    <!-- ── Header: hero name (left) + quote (top-right) ─────────────── -->
    <header class="head">
      <div class="name-hero" role="img" aria-label={volunteerTitle}>
        {#if nameSurname}<div class="name-surname" aria-hidden="true">{nameSurname}</div>{/if}
        <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
      </div>

      <blockquote class="vol-quote" class:vol-quote--dim={!resolvedQuote}>
        <!-- Prima virgoletta estratta e resa indipendente -->
        <span class="qmark qmark--first" aria-hidden="true">&#8220;</span>
        
        <p class="quote-body">{quoteText}</p>
        
        <!-- Seconda virgoletta -->
        <span class="qmark qmark--last" aria-hidden="true">&#8221;</span>
      </blockquote>

    </header>

    <!-- ── Riga inferiore: ruolo/location (sx) + Q&A (dx) ── -->
    <div class="hero-grid">

      <!-- ── Volunteer info (role + location) ────────────────────── -->
      <div class="vol-info">
        <p class="info-role">{volunteerRole}</p>
        <p class="info-location">{resolvedLocation}<br />{resolvedDetail}</p>
      </div>

      <!-- ── Q&A accordion ──────────────────────────────────────── -->
      <div class="qa-wrap" role="list">
        {#each questionTitles as q, i}
          <div class="qa-item" role="listitem">
            <button
              class="qa-row"
              class:qa-row--open={openQ === i}
              type="button"
              aria-expanded={openQ === i}
              onclick={() => { openQ = openQ === i ? -1 : i; }}
            >
              <span class="qa-title">{q}</span>
              <span class="qa-icon" class:qa-icon--open={openQ === i} aria-hidden="true">
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                  <path d="M26 14V38M14 26H38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
            </button>
            <div class="qa-sep" class:qa-sep--open={openQ === i}>
              {#if openQ === i}
                <div class="qa-answer" role="region" aria-live="polite">
                  <p>{answerFor(i)}</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

    </div>

    <!-- ── VEDI TUTTE LE FOTO ── -->
    {#if photoCount > 0}
      <div id="sticky-foto-btn" class="vedi-foto-wrapper">
        <VediTutteLeFoto onclick={openGallery} />
      </div>
    {/if}

  </div>

</main>

<SiteFooter />

<!-- ── Galleria overlay ── -->
{#if galleryOpen && photoCount > 0}
  <PhotoGalleryOverlay
    photos={volunteerPhotos}
    altBase={volunteerTitle}
    onclose={closeGallery}
  />
{/if}

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
  }
  :global(*) {
    box-sizing: border-box;
    font-family: var(--font-display);
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .profile {
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

  /* ── INDIETRO button ─────────────────────────────────────────────── */
  .back-btn-wrapper {
    margin-left: var(--spacing-11, 72px);
  }
  @media (max-width: 700px) {
    .back-btn-wrapper { margin-left: var(--spacing-5, 24px); }
  }

  /* ── Header ─────────────────────────────────────────────────────── */
  .head {
    position: relative;
    margin-top: 28px;
    min-height: 220px;
  }
  .name-hero { pointer-events: none; }
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
    padding-left: var(--spacing-11, 72px);
    margin-bottom: -8px;
    color: var(--color-content-accent, #bdff5d);
  }
  .name-firstname {
    padding-left: clamp(48px, 19vw, 340px);
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
  }

  /* ── Quote ─────────────────────────────────────────────────────── */
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
  .vol-quote--dim { opacity: 0.55; }

  /* ── STRUTTURA DELLE VIRGOLETTE (Speculari e allineate a destra) ── */
  /* ── STRUTTURA DELLE VIRGOLETTE ── */
  .qmark {
    display: flex; /* Trasformato in flex per poter allineare il testo internamente */
    justify-content: flex-end; /* Allinea a destra orizzontalmente */
    width: 100%;
    font-family: var(--font-display);
    font-size: 84px;
    font-style: normal;
    font-weight: 500;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-width: var(--stroke-1);
    -webkit-text-stroke-color:var(--color-content-body);
    paint-order: stroke fill;
    user-select: none;
  }

  .qmark--first {
    height: 45px;          /* Altezza ridotta per schiacciare la virgoletta verso il basso */
    line-height: 1;        /* Ripristina la linea di base corretta per l'allineamento */
    margin-bottom: 0px;    /* Azzerato per incollarla al testo */
  }

  .qmark--last {
    align-items: flex-start; /* La seconda virgoletta invece si allinea in alto, vicino al testo */
    height: 45px;
    line-height: 0.6;
    margin-top: 16px;
  }

  .quote-body {
    max-width: 100%;
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--ts-cat-size);
    font-style: normal;
    font-weight: 500;
    line-height: 32px;
    color: var(--color-content-body);
    text-align: right;
    white-space: pre-wrap;
  }
   

  /* ── Grid ───────────────────────────────────────────────────────── */
  .hero-grid {
    display: grid;
    grid-template-columns: 6fr 6fr;
    column-gap: var(--spacing-6, 32px);
    align-items: start;
    margin-top: 72px;
    padding: 0 var(--spacing-11, 72px);
  }

  /* ── Info ───────────────────────────────────────────────────────── */
  .vol-info {
    margin: 0;
    min-width: 0;
  }
  .info-role {
    margin: 0 0 8px;
    font-size: 36px;
    font-weight: 500;
    line-height: 1.0;
    letter-spacing: 1.44px;
    color: var(--color-content-accent, #bdff5d);
  }
  .info-location {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.45;
    letter-spacing: 1px;
    white-space: pre-wrap;
    color: var(--color-content-body);
  }

  /* ── FOTO WRAPPER INITIAL FIXED STATE ── */
  .vedi-foto-wrapper {
    position: fixed;
    left: var(--spacing-11, 72px);
    bottom: var(--unit-48, 48px);
    z-index: 9999 !important; /* Forza il bottone a stare sopra a qualunque pezzo del footer */
    pointer-events: auto;
    will-change: transform;
  }

  /* ── Q&A Accordion ──────────────────────────────────────────────── */
  .qa-wrap {
    width: 100%;
    margin: 0;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .qa-item { display: flex; flex-direction: column; }

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
    line-height: 1.0;
    text-transform: uppercase;
    letter-spacing: 1.44px;
    cursor: pointer;
    text-align: left;
    transition: color 0.18s ease;
  }
  .qa-row:hover,
  .qa-row--open { color: var(--color-content-accent, #bdff5d); }
  .qa-row:hover + .qa-sep:not(.qa-sep--open) { background: var(--color-content-accent, #bdff5d); }

  .qa-title { flex: 1; min-width: 0; word-break: break-word; }

  .qa-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.18s ease, transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .qa-icon svg { width: 100%; height: 100%; }
  .qa-row:hover .qa-icon { opacity: 1; }
  .qa-icon--open { opacity: 1; transform: rotate(45deg); }

  .qa-sep {
    height: 2.417px;
    background: #fafafa;
    flex-shrink: 0;
    overflow: hidden;
    transition: background 200ms ease;
  }
  .qa-sep--open { height: auto; background: var(--color-content-accent, #bdff5d); }

  .qa-answer { padding: 36px 44px 40px; }
  
  
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

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .vol-quote { right: var(--spacing-5, 24px); top: 4px; width: 300px; }
    .quote-body { font-size: var(--ts-cat-size); }
    .hero-grid {
      grid-template-columns: 1fr;
      row-gap: 40px;
      padding: 0 24px;
    }
    .qa-row { font-size: 26px; }
    .vedi-foto-wrapper { left: var(--spacing-5, 24px); }
  }

  @media (max-width: 700px) {
    .profile { padding-top: calc(var(--navbar-height, 125px) + 8px); }
    .name-surname  { padding-left: var(--spacing-5); font-size: clamp(44px, 13vw, 80px); }
    .name-firstname { padding-left: 40px; font-size: clamp(44px, 13vw, 80px); }
    .head { min-height: 0; }
    .vol-quote {
      position: relative;
      right: auto; top: auto;
      width: 100%;
      max-width: 100%;
      margin: 24px 0 0;
      padding: 0.6em var(--spacing-5);
    }
    .quote-body { width: 100%; font-size: 18px; }
    .hero-grid { padding: 0 var(--spacing-5, 24px); margin-top: 24px; }
    .info-role { font-size: 26px; }
    .qa-row { font-size: 18px; letter-spacing: 1px; padding: 12px 0; }
    .qa-icon { width: 28px; height: 28px; }
    .qa-answer { padding: 20px 18px 24px; }
    .qa-answer p { font-size: 16px; }

    .hero { padding-bottom: 56px; }
    .vedi-foto-wrapper {
      position: static !important;
      margin: 32px var(--spacing-5, 24px) 0;
    }
  }

  @media (pointer: coarse) {
    .qa-row { min-height: max(48px, calc(44px / var(--page-zoom, 1))); }
  }

  @media (prefers-reduced-motion: reduce) {
    .qa-sep, .qa-icon { transition: none; }
  }
</style>