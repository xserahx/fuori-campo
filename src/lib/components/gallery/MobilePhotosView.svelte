<script lang="ts">
  import { goto } from '$app/navigation';
  import { slugify, type GalleryImage } from '$lib/data/gallery';
  import { buildGalleryFromVolunteers, type VolunteerSummary } from '$lib/data/volunteers';

  let { activeFilters = [], dbVolunteers = [] }: {
    activeFilters?: string[];
    dbVolunteers?: VolunteerSummary[];
  } = $props();

  // One photo per volunteer, filtered, in arrival order.
  const images = $derived.by(() => {
    const all = dbVolunteers.length > 0 ? buildGalleryFromVolunteers(dbVolunteers) : [];
    const seen = new Set<string>();
    const result: GalleryImage[] = [];
    for (const img of all) {
      if (img.noClick || !img.slug) continue;
      if (activeFilters.length > 0 && !activeFilters.some((f) => img.tags?.includes(f))) continue;
      if (seen.has(img.slug)) continue;
      seen.add(img.slug);
      result.push(img);
    }
    return result;
  });

  function open(img: GalleryImage) {
    goto(`/volunteer/${img.slug ?? slugify(img.name, 0)}/profile`);
  }

  // Each photo's REAL aspect ratio (naturalW/naturalH), measured on load, so
  // the card frame follows the actual photo instead of the gallery's snapped
  // ratio — no cropping. Falls back to the snapped ratio until it loads.
  let ratios = $state<Record<string, number>>({});

  function measure(e: Event, slug: string) {
    const el = e.currentTarget as HTMLImageElement;
    if (el.naturalWidth && el.naturalHeight) {
      ratios[slug] = el.naturalWidth / el.naturalHeight;
      requestAnimationFrame(updateSelected);
    }
  }

  // ── Centered-photo selection ─────────────────────────────────────
  // The photo nearest the viewport centre grows to full width; the rest stay
  // at 72vw. Card HEIGHT is fixed (its natural height at 72vw), so only the
  // width flips — no vertical reflow, so scrolling stays fluid.
  let feedEl = $state<HTMLElement | null>(null);
  let selectedSlug = $state<string | null>(null);
  let raf = 0;

  function updateSelected() {
    if (!feedEl) return;
    const feedRect = feedEl.getBoundingClientRect();
    const centerY = feedRect.top + feedRect.height / 2;

    let best: string | null = null;
    let bestDist = Infinity;
    for (const card of feedEl.querySelectorAll<HTMLElement>('.feed-card')) {
      const r = card.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        best = card.dataset.slug ?? null;
      }
    }
    selectedSlug = best;
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      updateSelected();
    });
  }

  $effect(() => {
    void images;
    if (!feedEl || typeof window === 'undefined') return;
    requestAnimationFrame(updateSelected);
    window.addEventListener('resize', onScroll, { passive: true });
    return () => window.removeEventListener('resize', onScroll);
  });
</script>

<div
  class="mobile-feed"
  bind:this={feedEl}
  role="region"
  aria-label="Galleria foto"
  onscroll={onScroll}
>
  {#each images as img (img.slug!)}
    <button
      class="feed-card"
      class:selected={selectedSlug === img.slug}
      data-slug={img.slug!}
      type="button"
      
      style="--ratio: {ratios[img.slug!] ?? (img.width / img.height)};"
      
      onclick={() => open(img)}
    >
      <img
        class="feed-img"
        src={img.src}
        alt={img.name ?? ''}
        draggable="false"
        loading="lazy"
        onload={(e) => measure(e, img.slug!)}
      />
    </button>
  {/each}
</div>

<style>
  .mobile-feed {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    /* Ho aumentato un po' il gap per dare respiro tra una foto e l'altra */
    gap: 32px; 
    
    /* 1. IL TRUCCO DEL PADDING FANTASMA */
    /* 50dvh = esattamente metà schermo. Questo permette alla prima 
       e all'ultima foto di arrivare perfettamente al centro. */
    padding-top: 50dvh;
    padding-bottom: 50dvh;
    
    scrollbar-width: none;
    
    /* 2. IL MAGNETE (Nativo del Browser) */
    /* Obbliga lo scroll a fermarsi in punti matematici precisi */
    scroll-snap-type: y mandatory; 
  }

  .mobile-feed::-webkit-scrollbar { 
    display: none; 
  }

  .feed-card {
    position: relative;
    flex-shrink: 0;
    
    /* 1. LARGHEZZA FLUTTUANTE, MA ALTEZZA BLOCCATA */
    width: 72vw;
    /* L'altezza è calcolata sul 100vw, così quando la card si allarga non spinge giù le altre foto */
    height: calc(100vw / var(--ratio)); 
    
    border: 0;
    padding: 0;
    margin: 0;
    background: #0e0e0e;
    border-radius: var(--radius-s, 4px);
    cursor: pointer;
    overflow: hidden;
    
    /* Per centrare l'immagine a riposo */
    display: flex;
    align-items: center;
    justify-content: center;

    /* 2. MAGNETE RIGOROSO */
    scroll-snap-align: center;
    scroll-snap-stop: always; /* Forza lo stop obbligatorio a ogni singola foto */

    filter: blur(7px) brightness(0.7);
    opacity: 0.7;
    transition:
      width     0.35s cubic-bezier(0.2, 1, 0.4, 1),
      filter    0.3s ease,
      opacity   0.3s ease;
    
    will-change: width, filter, opacity;
    
    /* Diciamo alla GPU di prepararsi ad animare anche il blur */
    will-change: width, filter;
    

  }

  .feed-card.selected {
    width: 100dvw;
    filter: blur(0px) brightness(1);
    opacity: 1;

    transition:
      width     0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s,
      filter    0.5s ease 0.1s,
      opacity   0.5s ease 0.1s;
  
  }
  
  
  .feed-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
