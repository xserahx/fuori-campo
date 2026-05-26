<script lang="ts">
  import { buildPeople, imagesRaw, slugify } from '$lib/data/gallery';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';

  // constants
  const ROW_HEIGHT = 72;

  // props
  let { activeFilter = null }: { activeFilter?: string | null } = $props();

  type Person = { name: string; tags: string[] };

  const people: Person[] = buildPeople(imagesRaw);

  // reactive state
  let selectedIndex = $state<number>(-1);
  let copied = $state(false);
  let bgScroll = $state<number>(0);

  // refs
  let bgContainerRef: HTMLDivElement;
  let namesInteractionRef: HTMLDivElement;

  function getVisiblePeople() {
    return activeFilter
      ? people.filter((p) => p.tags.includes(activeFilter as string))
      : people;
  }

  function findImageIndexByName(name: string | undefined) {
    if (!name) return 0;
    return imagesRaw.findIndex((img) => img.name === name) || 0;
  }

  async function copyAndOpen(person: Person, idx: number) {
    const imageIndex = findImageIndexByName(person.name);
    const slug = slugify(person.name, imageIndex);
    const href = `/volunteer/${slug}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.origin + href);
        copied = true;
        setTimeout(() => (copied = false), 700);
      }
    } catch (e) {
      // ignore
    }

    // small delay so user can perceive toast
    await new Promise((r) => setTimeout(r, 250));
    goto(href);
  }

  // no global underline — each name has its own underline element

  function syncScroll() {
    if (!namesInteractionRef || !bgContainerRef) return;
    bgScroll = namesInteractionRef.scrollTop;
  }
</script>

<div class="copy-toast" aria-hidden={!copied} class:visible={copied}>Link copied</div>

<div class="names-view">
  <div class="names-quote">
    <p>“HO PARLATO DI CURLING CON LA PRINCIPESSA D’INGHILTERRA CHE FIGATA.”</p>
    <div class="names-meta">
      <span>BORMIO - STELVIO SKI CENTER</span>
      <span>EVENT SERVICES VOLUNTEER</span>
    </div>
  </div>

  <div class="names-stage">
    <div class="names-bg" bind:this={bgContainerRef} aria-hidden="true">
      <div class="names-bg-inner" style={`transform: translateY(${-bgScroll}px)`}>
        {#each getVisiblePeople() as person, i}
          {@const distance = i - selectedIndex}
          <div
            class="names-bg__item"
            class:selected={distance === 0}
            style={`top: ${i * ROW_HEIGHT}px; opacity: ${Math.max(0, 1 - Math.abs(distance) * 0.12)}; filter: blur(${Math.min(12, Math.abs(distance) * 2)}px);`}
          >
            <div class="name-wrap">
              <span class="name-text">{person.name.toUpperCase()}</span>
              <div class="item-underline" class:visible={distance === 0} aria-hidden="true"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div bind:this={namesInteractionRef} class="names-interaction" role="listbox" aria-label="Names gallery" tabindex="0" onscroll={syncScroll} onmouseleave={() => (selectedIndex = -1)}>
      {#each getVisiblePeople() as person, index}
        <button
          class="names-interaction__item"
          onmouseenter={() => (selectedIndex = index)}
          onfocus={() => (selectedIndex = index)}
          onblur={() => (selectedIndex = -1)}
          onclick={() => copyAndOpen(person, index)}
          aria-label={`Open ${person.name}`}
          type="button"
        >
          {person.name.toUpperCase()}
        </button>
      {/each}
    </div>

    
  </div>

  <div class="names-footer">
    <span class="names-footer__label">GALLERY</span>
    <span class="names-footer__pill">NAMES</span>
  </div>
</div>

<style>
  .names-view { position:absolute; inset:var(--gallery-navbar-offset) 0 0 0; z-index:6; overflow:hidden; background: linear-gradient(90deg, rgba(26,26,26,0.96) 0 28%, rgba(26,26,26,0.82) 46%, rgba(26,26,26,0.78) 100%); color:#fff; font-family:'Forma DJR Display',sans-serif; }
  .names-quote { position:absolute; left:42px; top:160px; width:260px; z-index:4; text-transform:uppercase; }
  .names-quote p { margin:0; font-size:20px; line-height:1.02; }
  .names-meta { margin-top:36px; padding-top:14px; border-top:1px solid rgba(250,250,250,0.12); display:flex; flex-direction:column; gap:8px; font-size:12px; }

  .names-stage { position:absolute; inset:0; z-index:2; display:flex; align-items:center; justify-content:center; }

  .names-bg { position:absolute; left:300px; right:120px; top:80px; bottom:120px; overflow:hidden; z-index:3; }
  .names-bg-inner { position:relative; width:100%; }
  .names-bg__item { position:absolute; left:0; right:0; font-size:72px; color:rgba(255,255,255,0.24); text-transform:uppercase; letter-spacing:-0.02em; transition: transform 260ms cubic-bezier(.22,1,.36,1), opacity 260ms ease, filter 260ms ease; white-space:nowrap; }
  .names-bg__item.selected { color:var(--gallery-accent,#bdff5d); opacity:1; filter:none; transform: translateX(16px) scale(1.02); text-shadow:0 0 6px rgba(0,0,0,0.25); }

  .names-interaction { position:absolute; left:300px; right:120px; top:80px; bottom:120px; display:flex; flex-direction:column; gap:28px; align-items:flex-start; overflow:auto; z-index:6; }
  .names-interaction__item { border:0; background:transparent; color:transparent; font-size:84px; line-height:1; padding:6px 0; cursor:pointer; }

  .name-wrap { display:inline-block; position:relative; padding-bottom:8px; }
  .name-text { display:inline-block; }
  .item-underline { position:absolute; left:0; bottom:0; height:2px; background:var(--gallery-accent,#bdff5d); width:0; opacity:0; transition: width 220ms cubic-bezier(.22,1,.36,1), opacity 160ms ease; }
  .item-underline.visible { width:100%; opacity:1; }

  .names-footer { position:absolute; left:42px; bottom:28px; z-index:6; display:flex; gap:8px; align-items:center; }
  .names-footer__pill { background:var(--gallery-accent,#bdff5d); color:#111; padding:0 11px; border-radius:999px; font-weight:700; }

  .copy-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%) translateY(8px); background:rgba(0,0,0,0.8); color:#fff; padding:8px 14px; border-radius:999px; opacity:0; pointer-events:none; transition:opacity 180ms ease, transform 220ms cubic-bezier(.22,1,.36,1); z-index:9999; }
  .copy-toast.visible { opacity:1; transform:translateX(-50%) translateY(0); }

  @media (max-width:1100px) { .names-bg__item { font-size:46px; } .names-interaction__item { font-size:56px; } }
  @media (max-width:760px) { .names-quote { display:none; } .names-bg { left:24px; right:24px; } .names-interaction { left:24px; right:24px; } .names-bg__item { font-size:26px; } }
</style>
