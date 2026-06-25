<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/Navbar.svelte';
  import { buildGalleryHref, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrls, getImageUrl, fetchAllVolunteers, getCachedVolunteers, type VolunteerSummary } from '$lib/data/volunteers';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Lazy-loaded neighbour volunteers (for bg scatter only) ───── */
  let allVols = $state<VolunteerSummary[]>(getCachedVolunteers());
  onMount(() => { fetchAllVolunteers().then(vs => { allVols = vs; }); });

  /* ── URL context ───────────────────────────────────────────────── */
  const currentSlug    = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  /* ── Display values ────────────────────────────────────────────── */
  const volunteerCognome = $derived(dbVol?.cognome?.toUpperCase() ?? '');
  const volunteerNome    = $derived(dbVol?.nome?.toUpperCase() ?? '');
  const volunteerTitle   = $derived(dbVol ? `${dbVol.cognome} ${dbVol.nome}` : '');
  const volunteerRole    = $derived((dbVol?.ruolo_specifico ?? dbVol?.ruolo_generale ?? '').toUpperCase());
  const resolvedVenue    = $derived((dbVol?.venue_montagna ?? dbVol?.venue_milano ?? '').toUpperCase());
  const venueDisplay     = $derived(
    [resolvedVenue, dbVol?.eta ? `${dbVol.eta} ANNI` : ''].filter(Boolean).join('  ·  ')
  );

  /* Hero quote comes from commento_positivo when responses are authorised */
  const heroQuote = $derived(
    dbVol?.autorizzazione_risposte ? (dbVol.commento_positivo ?? '') : ''
  );

  /* ── Same-volunteer photo carousel ────────────────────────────── */
  const volunteerPhotos = $derived(dbVol ? getImageUrls(dbVol) : []);
  const hasPhoto        = $derived(volunteerPhotos.length > 0);
  let photoIdx   = $state(0);
  let imgError   = $state(false);

  $effect(() => { currentSlug; photoIdx = 0; imgError = false; });

  const currentPhoto = $derived(
    hasPhoto ? (volunteerPhotos[photoIdx] ?? null) : null
  );

  function prevPhoto() {
    const len = volunteerPhotos.length;
    if (len < 2) return;
    photoIdx = ((photoIdx - 1) + len) % len;
    imgError = false;
  }
  function nextPhoto() {
    const len = volunteerPhotos.length;
    if (len < 2) return;
    photoIdx = (photoIdx + 1) % len;
    imgError = false;
  }

  /* ── Background scatter: neighbouring volunteers' photos ───────── */
  const neighborSlugs = $derived(
    (page.url.searchParams.get('neighbors') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  );
  const bgPaths = $derived.by(() => {
    const paths: string[] = [];
    if (neighborSlugs.length > 0) {
      for (const s of neighborSlugs) {
        if (paths.length >= 4) break;
        const vol = allVols.find(v => v.slug === s);
        if (!vol?.ha_immagini) continue;
        const p = vol.image_paths?.[0] ?? vol.image_path;
        if (p) paths.push(getImageUrl(p) ?? '');
      }
    } else {
      const seed = currentSlug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const others = allVols.filter(v => v.slug !== currentSlug && v.ha_immagini);
      for (let i = 0; paths.length < 4 && i < others.length; i++) {
        const vol = others[(seed + i) % others.length];
        const p = vol.image_paths?.[0] ?? vol.image_path;
        if (p) paths.push(getImageUrl(p) ?? '');
      }
    }
    return paths.filter(Boolean);
  });

  /* ── Q&A accordion ─────────────────────────────────────────────── */
  const QUESTIONS = [
    { label: 'LA MIA GIORNATA (QUASI) NORMALE', field: 'giornata_tipo'        },
    { label: 'COME MI VEDEVANO GLI ALTRI',       field: 'percezione_pubblico'  },
    { label: 'IL MIO MOMENTO PREFERITO',          field: 'commento_positivo'    },
    { label: 'QUELLO CHE VORREI DIMENTICARE',     field: 'commento_negativo'    },
    { label: 'COSA MI PORTO A CASA',              field: 'cosa_porti'           },
    { label: 'COSA (NON) MI AVETE CHIESTO',       field: 'commenti_generali'    },
    { label: 'LA MIA RISPOSTA ONESTA',            field: 'rifai'                },
  ] as const;

  let openIdx = $state<number | null>(null);
  function toggleQ(i: number) { openIdx = openIdx === i ? null : i; }

  function goBack() {
    goto(buildGalleryHref(currentContext));
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="vol-page" id="main-content">

  <!-- ── Back ────────────────────────────────────────────────────── -->
  <div class="back-wrap">
    <button class="back-btn" type="button" aria-label="Torna alla galleria" onclick={goBack}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
        <path d="M17 5H1M5 1L1 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>INDIETRO</span>
    </button>
  </div>

  <!-- ── Hero: name + quote ──────────────────────────────────────── -->
  <section class="hero">
    <div class="name-block" role="img" aria-label={volunteerTitle}>
      {#if volunteerCognome}
        <div class="name-row name-row--filled" aria-hidden="true">{volunteerCognome}</div>
      {/if}
      <div class="name-row name-row--outline" aria-hidden="true">{volunteerNome}</div>
    </div>

    {#if heroQuote}
    <blockquote class="hero-quote" aria-label="Citazione del volontario">
      <span class="qmark qmark--open" aria-hidden="true">&ldquo;</span>
      <p class="qtext">{heroQuote}</p>
      <span class="qmark qmark--close" aria-hidden="true">&rdquo;</span>
    </blockquote>
    {:else}
    <blockquote class="hero-quote hero-quote--dim" aria-hidden="true">
      <span class="qmark qmark--open">&ldquo;</span>
      <p class="qtext">Un'esperienza che non dimenticherò mai.</p>
      <span class="qmark qmark--close">&rdquo;</span>
    </blockquote>
    {/if}
  </section>

  <!-- ── Meta: role + venue ──────────────────────────────────────── -->
  <div class="meta-block">
    {#if volunteerRole}<p class="meta-role">{volunteerRole}</p>{/if}
    {#if venueDisplay}<p class="meta-venue">{venueDisplay}</p>{/if}
  </div>

  <!-- ── Photo section ───────────────────────────────────────────── -->
  {#if hasPhoto && currentPhoto && !imgError}
  <section class="photo-wrap" aria-label="Foto del volontario">

    <!-- Background scatter (other volunteers, blurred) -->
    {#if bgPaths.length}
    <div class="bg-scatter" aria-hidden="true">
      {#each bgPaths as src, i (src)}
        <img src={src} alt="" class="bg-img bg-img--{i}" draggable="false" />
      {/each}
    </div>
    {/if}

    <!-- Main photo -->
    <img
      src={currentPhoto}
      alt={volunteerTitle}
      class="main-photo"
      draggable="false"
      onerror={() => { imgError = true; }}
    />

    <!-- Carousel arrows (only when multiple photos) -->
    {#if volunteerPhotos.length > 1}
    <div class="frecce">
      <button class="arr arr--prev" type="button" aria-label="Foto precedente" onclick={prevPhoto}>
        <svg viewBox="0 0 14 28" fill="none" aria-hidden="true">
          <path d="M11 2L3 14L11 26" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="arr arr--next" type="button" aria-label="Foto successiva" onclick={nextPhoto}>
        <svg viewBox="0 0 14 28" fill="none" aria-hidden="true">
          <path d="M3 2L11 14L3 26" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    {/if}
  </section>
  {/if}

  <!-- ── Q&A accordion ────────────────────────────────────────────── -->
  {#if dbVol?.autorizzazione_risposte}
  <section class="qa" class:qa--no-photo={!hasPhoto || imgError} aria-label="Risposte del volontario">
    {#each QUESTIONS as q, i}
      {@const answer = (dbVol as any)[q.field] as string | null}
      {#if answer}
      <div class="qa-item">
        <button
          class="qa-q"
          type="button"
          onclick={() => toggleQ(i)}
          aria-expanded={openIdx === i}
        >
          <span class="qa-label">{q.label}</span>
          <span class="qa-plus" aria-hidden="true">{openIdx === i ? '−' : '+'}</span>
        </button>
        <div class="qa-line"></div>
        {#if openIdx === i}
        <p class="qa-answer">{answer}</p>
        {/if}
      </div>
      {/if}
    {/each}
  </section>
  {/if}

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0d0d0d;
    color: #fafafa;
    overflow-x: hidden;
  }
  :global(*) { box-sizing: border-box; font-family: var(--font-display); }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .vol-page {
    padding-top: var(--navbar-height, 125px);
    background: #0d0d0d;
    min-height: 100dvh;
  }

  /* ── Back button ─────────────────────────────────────────────────── */
  /* Figma: 168×48px pill, padding 12/20, gap 12 */
  .back-wrap {
    padding: 24px 0 0 72px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 48px;
    padding: 12px 20px;
    background: #0d0d0d;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    color: #fafafa;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    transition:
      transform   0.36s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow  0.36s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }
  .back-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 24px rgba(189, 255, 93, 0.25), inset 0 0 12px rgba(189, 255, 93, 0.06);
  }
  .back-btn:hover svg,
  .back-btn:hover span {
    filter: blur(2px);
    color: var(--color-content-accent, #bdff5d);
  }
  .back-btn:active { transform: scale(0.97); transition-duration: 80ms; }
  .back-btn svg { flex-shrink: 0; transition: filter 0.28s ease, color 0.28s ease; }
  .back-btn span { transition: filter 0.28s ease, color 0.28s ease; }

  /* ── Hero ────────────────────────────────────────────────────────── */
  /* Figma: section gap from back-wrap bottom = 28px, padding 20px top & bottom */
  .hero {
    position: relative;
    margin-top: 28px;
    padding: 20px 0;
    overflow: visible;
  }

  .name-block { display: flex; flex-direction: column; }

  .name-row {
    font-size: 116px;
    font-weight: 800;
    line-height: 116px;
    letter-spacing: 0;
    white-space: nowrap;
  }

  /* Figma: surname filled lime, firstname outline lime, −8px overlap */
  .name-row--filled {
    margin-left: 72px;
    color: var(--color-content-accent, #bdff5d);
    margin-bottom: -8px;
  }
  .name-row--outline {
    margin-left: 340px;
    color: transparent;
    -webkit-text-stroke: 1.5px var(--color-content-accent, #bdff5d);
  }

  /* ── Hero quote — absolute, right side ──────────────────────────── */
  /* Figma: right 67px, top 20px (within hero padding), width 393px */
  .hero-quote {
    position: absolute;
    top: 20px;
    right: 67px;
    width: 393px;
    margin: 0;
    padding: 0;
  }
  .hero-quote--dim { opacity: 0.45; }

  /* Figma: 84px Medium, solid semi-transparent (NOT outline) */
  .qmark {
    font-size: 84px;
    font-weight: 500;
    line-height: 80px;
    color: rgba(250, 250, 250, 0.45);
    display: block;
    user-select: none;
  }
  .qmark--open  { margin-left: -4px; }
  .qmark--close { text-align: right; margin-right: -4px; }

  /* Figma: 32px Bold, white, ls 0.96, lh 32px */
  .qtext {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    line-height: 32px;
    letter-spacing: 0.96px;
    color: #fafafa;
    padding: 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── Meta ────────────────────────────────────────────────────────── */
  /* Figma: 28px gap from hero, ml 74px */
  .meta-block {
    margin-top: 28px;
    margin-left: 74px;
  }

  /* Figma: 36px/500, ls 1.44, accent */
  .meta-role {
    margin: 0;
    font-size: 36px;
    font-weight: 500;
    line-height: 43.2px;
    letter-spacing: 1.44px;
    color: var(--color-content-accent, #bdff5d);
    text-transform: uppercase;
  }

  /* Figma: 24px/500, white, ls 0.96, lh 28.8 */
  .meta-venue {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 28.8px;
    letter-spacing: 0.96px;
    color: #fafafa;
    text-transform: uppercase;
  }

  /* ── Photo section ───────────────────────────────────────────────── */
  /* Figma: 135px gap from meta, photo 588×784 centered, arrows at ±72px */
  .photo-wrap {
    position: relative;
    margin-top: 135px;
    height: 784px;
    overflow: visible;
  }

  /* Background scatter (blurred, other volunteers) */
  .bg-scatter {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: visible;
  }

  .bg-img {
    position: absolute;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  /* Figma scatter positions (pixel-exact from design) */
  .bg-img--0 { left: 330px;  top: 121px; width: 799px; height: 599px; opacity: 0.70; filter: blur(10px); }
  .bg-img--1 { left: 603px;  top: 125px; width: 786px; height: 590px; opacity: 0.70; filter: blur(10px); }
  .bg-img--2 { left: 206px;  top: 252px; width: 327px; height: 338px; opacity: 0.35; filter: blur(15px); }
  .bg-img--3 { left: 1195px; top: 250px; width: 327px; height: 338px; opacity: 0.35; filter: blur(15px); }

  /* Figma: 588×784px centered (570px margin each side at 1728px ref) */
  .main-photo {
    display: block;
    position: relative;
    z-index: 1;
    width: 588px;
    height: 784px;
    object-fit: cover;
    margin: 0 auto;
  }

  /* Full-width row, vertically centered on photo, pointer-events on arrows only */
  .frecce {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 72px;
    pointer-events: none;
  }

  /* Figma: 60×60px circle, 1px subtle border */
  .arr {
    width: 60px;
    height: 60px;
    border-radius: 999px;
    border: 1px solid rgba(250, 250, 250, 0.22);
    background: rgba(13, 13, 13, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    color: #fafafa;
    flex-shrink: 0;
    transition: color 0.24s ease, border-color 0.24s ease, filter 0.24s ease;
  }
  .arr svg { width: 14px; height: 28px; }
  .arr--prev { padding: 16px 16px 16px 12px; }
  .arr--next { padding: 16px 12px 16px 16px; }
  .arr:hover {
    color: var(--color-content-accent, #bdff5d);
    border-color: var(--color-content-accent, #bdff5d);
    filter: drop-shadow(0 0 8px rgba(189, 255, 93, 0.38));
  }

  /* ── Q&A accordion ───────────────────────────────────────────────── */
  /* Figma: ml 597px, mr 72px, gap 20px between items */
  .qa {
    margin-top: 125px;
    padding-left: 597px;
    padding-right: 72px;
    padding-bottom: 160px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Without photo: less top gap (meta bottom → qa = 96px) */
  .qa--no-photo { margin-top: 96px; }

  /* Question row: label + circular +/- toggle */
  .qa-q {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 52px;
    gap: 6px;
    background: none;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    text-align: left;
  }

  /* Figma: 36px/500, ls 1.44, lh 43.2, white, uppercase */
  .qa-label {
    font-size: 36px;
    font-weight: 500;
    line-height: 43.2px;
    letter-spacing: 1.44px;
    color: #fafafa;
    white-space: nowrap;
    transition: color 0.2s ease;
  }
  .qa-q:hover .qa-label,
  .qa-q[aria-expanded='true'] .qa-label {
    color: var(--color-content-accent, #bdff5d);
  }

  /* Circular +/- button — hidden until hover or open */
  .qa-plus {
    font-size: 28px;
    font-weight: 400;
    line-height: 1;
    color: #fafafa;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(250, 250, 250, 0.3);
    border-radius: 999px;
    opacity: 0;
    transition: opacity 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .qa-q:hover .qa-plus {
    opacity: 1;
    color: var(--color-content-accent, #bdff5d);
    border-color: var(--color-content-accent, #bdff5d);
  }
  .qa-q[aria-expanded='true'] .qa-plus {
    opacity: 1;
    color: var(--color-content-accent, #bdff5d);
    border-color: var(--color-content-accent, #bdff5d);
  }

  /* Figma: 2px white separator */
  .qa-line {
    height: 2px;
    background: rgba(250, 250, 250, 1);
    transition: background 0.2s ease;
  }
  .qa-q[aria-expanded='true'] + .qa-line {
    background: var(--color-content-accent, #bdff5d);
  }

  /* Figma: 24px/500, white, lh 26px — plain text on dark bg */
  .qa-answer {
    margin: 20px 0 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    letter-spacing: 0;
    color: #fafafa;
    white-space: pre-line;
  }

  /* ── Focus styles ────────────────────────────────────────────────── */
  .back-btn:focus-visible,
  .arr:focus-visible,
  .qa-q:focus-visible {
    outline: 2px solid var(--color-content-accent, #bdff5d);
    outline-offset: 3px;
  }

  /* ── Reduced motion ──────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .back-btn, .arr, .qa-label, .qa-plus, .qa-line { transition: none; }
  }
</style>
