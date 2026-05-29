<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw } from '$lib/data/gallery';
  import '$lib/styles/tokens.css';

  type CategoryInfo = {
    label: string;
    image: string;
    tag:   string;
  };

  const CATEGORIES: CategoryInfo[] = [
    { label: 'RELAZIONI E COMUNICAZIONE',             image: '/figma/cat-1.jpg', tag: 'relazioni'    },
    { label: 'CERIMONIE E REVENUE',                   image: '/figma/cat-5.jpg', tag: 'cerimonie'    },
    { label: 'SPORT E DISCIPLINE',                    image: '/figma/cat-8.jpg', tag: 'sport'         },
    { label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: '/figma/cat-1.jpg', tag: 'organizzativa' },
    { label: 'LOGISTICA E TERRITORIO',                image: '/figma/cat-5.jpg', tag: 'logistica'     },
    { label: 'GESTIONE OPERATIVA E FAN EXPERIENCE',   image: '/figma/cat-8.jpg', tag: 'gestione'      },
  ];

  function slugify(label: string) {
    return label.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  function splitTitle(label: string): string[] {
    const match = label.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (match) return [match[1].trim(), `E ${match[2].trim()}`];
    const words = label.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return [label];
    const mid = Math.max(1, Math.ceil(words.length / 2));
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const slug = $derived((page.params as Record<string, string>).slug ?? '');
  const catIdx = $derived(CATEGORIES.findIndex(c => slugify(c.label) === slug));
  const cat    = $derived(catIdx >= 0 ? CATEGORIES[catIdx] : null);
  const lines  = $derived(cat ? splitTitle(cat.label) : []);

  const prevCat = $derived(catIdx >= 0 ? CATEGORIES[(catIdx - 1 + CATEGORIES.length) % CATEGORIES.length] : null);
  const nextCat = $derived(catIdx >= 0 ? CATEGORIES[(catIdx + 1) % CATEGORIES.length] : null);

  const volunteers = $derived((() => {
    if (!cat) return [];
    const seen = new Set<string>();
    return imagesRaw.filter(img => {
      if (!img.name || !img.tags?.includes(cat.tag)) return false;
      if (seen.has(img.name)) return false;
      seen.add(img.name);
      return true;
    });
  })());
</script>

<svelte:head>
  <title>{cat?.label ?? 'Categoria'} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <!-- ── Hero ─────────────────────────────────────────────────── -->
  <section class="hero">
    <img class="hero-img" src={cat.image} alt="" aria-hidden="true" draggable="false" />
    <div class="hero-overlay" aria-hidden="true"></div>

    <!-- Prev / Next category -->
    {#if prevCat}
      <button class="cat-arrow cat-arrow--prev" type="button"
        aria-label="Categoria precedente"
        onclick={() => goto(`/category/${slugify(prevCat.label)}`)}>
        <svg width="28" height="50" viewBox="0 0 28 50" fill="none" aria-hidden="true">
          <path d="M24 4L4 25L24 46" stroke="#baff44" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    {/if}
    {#if nextCat}
      <button class="cat-arrow cat-arrow--next" type="button"
        aria-label="Categoria successiva"
        onclick={() => goto(`/category/${slugify(nextCat.label)}`)}>
        <svg width="28" height="50" viewBox="0 0 28 50" fill="none" aria-hidden="true">
          <path d="M4 4L24 25L4 46" stroke="#baff44" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    {/if}

    <!-- Category title -->
    <div class="hero-title">
      {#each lines as line, i}
        {#if i === 0}
          <span class="title-fill">{line}</span>
        {:else}
          <span class="title-outline">{line}</span>
        {/if}
      {/each}
    </div>
  </section>

  <!-- ── Volunteer grid ─────────────────────────────────────── -->
  {#if volunteers.length > 0}
    <section class="vol-section">
      <p class="vol-count">{volunteers.length} VOLONTARI</p>
      <div class="vol-grid">
        {#each volunteers as vol}
          <figure class="vol-card">
            <img class="vol-img" src={vol.src} alt={vol.name ?? ''} loading="lazy" draggable="false" />
            <figcaption class="vol-name">{vol.name?.toUpperCase() ?? ''}</figcaption>
          </figure>
        {/each}
      </div>
    </section>
  {/if}
{:else}
  <div class="not-found">Categoria non trovata</div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  /* ── Hero ─────────────────────────────────────────────────── */
  .hero {
    position: relative;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  .hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to top, rgba(14,14,14,0.92) 0%, rgba(14,14,14,0.18) 55%, rgba(14,14,14,0.55) 100%);
    pointer-events: none;
  }

  /* ── Prev / Next arrows ───────────────────────────────────── */
  .cat-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 59px;
    height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.2s ease;
  }

  .cat-arrow:hover { opacity: 0.65; }

  .cat-arrow--prev { left: 70px; }
  .cat-arrow--next { right: 70px; }

  /* ── Hero title ────────────────────────────────────────────── */
  .hero-title {
    position: relative;
    z-index: 2;
    padding: 0 20px clamp(24px, 4vh, 56px);
    display: flex;
    flex-direction: column;
    gap: 0.05em;
  }

  .title-fill {
    display: block;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(48px, 7.5vw, 116px);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.025em;
    line-height: 0.9;
    color: #baff44;
    white-space: nowrap;
    margin-left: clamp(16px, 5vw, 72px);
  }

  .title-outline {
    display: block;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(48px, 7.5vw, 116px);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.025em;
    line-height: 0.9;
    color: transparent;
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) #baff44;
    white-space: nowrap;
    margin-left: clamp(48px, 24.5vw, 340px);
  }

  /* ── Volunteer section ─────────────────────────────────────── */
  .vol-section {
    padding: clamp(48px, 6vh, 96px) clamp(24px, 5vw, 96px) clamp(64px, 10vh, 128px);
    background: var(--color-background-primary);
  }

  .vol-count {
    margin: 0 0 clamp(24px, 3vh, 48px);
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: rgba(250, 250, 250, 0.38);
  }

  .vol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: clamp(12px, 1.5vw, 24px);
  }

  .vol-card {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vol-img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    display: block;
    background: #1a1a1a;
  }

  .vol-name {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(11px, 0.9vw, 14px);
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--color-content-accent);
  }

  /* ── Not found ─────────────────────────────────────────────── */
  .not-found {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100dvh;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    color: rgba(250, 250, 250, 0.38);
  }

  /* ── Responsive ────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .cat-arrow--prev { left: 32px; }
    .cat-arrow--next { right: 32px; }
  }

  @media (max-width: 700px) {
    .cat-arrow--prev { left: 12px; }
    .cat-arrow--next { right: 12px; }
    .vol-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  }
</style>
