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
</script>

<div class="mobile-feed" role="region" aria-label="Galleria foto">
  {#each images as img (img.slug)}
    <button class="feed-card" type="button" onclick={() => open(img)}>
      <img
        class="feed-img"
        src={img.src}
        alt={img.name ?? ''}
        draggable="false"
        loading="lazy"
      />
      {#if img.name}
        <div class="feed-overlay" aria-hidden="true">
          <span class="feed-name">{img.name.toUpperCase()}</span>
        </div>
      {/if}
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
    gap: 12px;
    /* top: below navbar; bottom: above toggle bar (56px track + 36px pad + 16px margin) */
    padding-top: 96px;
    padding-bottom: 116px;
  }

  .feed-card {
    position: relative;
    flex-shrink: 0;
    width: 100%;
    height: 75vw;
    border: 0;
    padding: 0;
    background: #1a1a1a;
    cursor: pointer;
    overflow: hidden;
    display: block;
    transition: opacity 0.15s ease;
  }
  .feed-card:active { opacity: 0.88; }

  .feed-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* Gradient + name — mirrors the Figma overlay */
  .feed-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 48px 16px 16px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, transparent 100%);
  }

  .feed-name {
    display: block;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 500;
    line-height: 28.8px;
    color: var(--color-content-accent, #bdff5d);
    letter-spacing: 0;
    text-align: left;
  }
</style>
