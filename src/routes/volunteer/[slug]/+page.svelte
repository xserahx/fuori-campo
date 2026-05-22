<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import { imagesRaw } from '$lib/data/gallery';

  function slugify(name: string | undefined, index: number) {
    if (!name) return `member-${index}`;
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  let slug: string | null = null;
  let volunteer: any = null;

  const unsub = page.subscribe(($page) => {
    slug = $page.params.slug ?? null;

    if (slug) {
      // find first matching image by slug
      volunteer = imagesRaw.find((img, i) => slugify(img.name, i) === slug) ?? null;
    }
  });

  onDestroy(() => unsub());
</script>

<svelte:head>
  <title>Volunteer — {volunteer?.name ?? slug}</title>
</svelte:head>

<main style="padding:48px; color:#fafafa; background:#0b0b0b; min-height:100vh;">
  <a href="/" style="color:#bdff5d; text-decoration:none;">← Back</a>

  {#if volunteer}
    <div style="display:flex; gap:32px; align-items:flex-start; margin-top:24px;">
      <div style="width:360px; flex:0 0 360px; border-radius:8px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
        <img src={volunteer.src} alt={volunteer.name} style="width:100%; height:100%; object-fit:cover; display:block;" />
      </div>
      <div style="flex:1;">
        <h1 style="font-family:'Forma DJR Display',sans-serif; margin:0 0 8px 0;">{volunteer.name}</h1>
        <div style="margin-bottom:14px; opacity:0.85;">{(volunteer.tags ?? []).join(' · ')}</div>
        <p style="max-width:720px; line-height:1.6; opacity:0.9;">Questa è la pagina personale del volontario. Qui possiamo mostrare biografia, turni, ruoli e contatti. Sostituisci con i dati reali estratti da Figma/DB.</p>

        {#if imagesForVolunteer().length > 1}
          <h3 style="margin-top:22px;">Altre immagini</h3>
          <div style="display:flex; gap:12px; margin-top:8px; flex-wrap:wrap;">
            {#each imagesForVolunteer() as img}
              <img src={img.src} alt={img.name ?? ''} style="width:120px; height:90px; object-fit:cover; border-radius:6px;" />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <h1 style="margin-top:24px;">Volunteer: {slug}</h1>
    <p style="opacity:0.8; max-width:680px;">Nessuna informazione trovata per questo volontario.</p>
  {/if}
</main>

<script lang="ts">
  function imagesForVolunteer() {
    if (!volunteer) return [];
    return imagesRaw.filter((img, i) => slugify(img.name, i) === slug);
  }
</script>
