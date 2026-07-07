<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto, beforeNavigate } from "$app/navigation";
  import { fade } from "svelte/transition";
  import { gsap } from "gsap";
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import "$lib/styles/tokens.css";

  type Category = {
    id: number;
    label: string;
    image: string;
    mobileFillLh?: number;
    mobileOutlineLh?: number;
  };

  const IMG_RELAZIONI =
    "/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.webp";
  const IMG_CERIMONIE =
    "/volunteer_images/carosello_categorie/Cerimonia_e_revenue.webp";
  const IMG_SPORT = "/volunteer_images/carosello_categorie/Sport.webp";
  const IMG_AREAORGANIZZATIVA =
    "/volunteer_images/carosello_categorie/Area_organizzativa.webp";
  const IMG_LOGISTICA =
    "/volunteer_images/carosello_categorie/Logistica_e_territorio.webp";
  const IMG_GESTIONE =
    "/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.webp";

  const defaultCategories: Category[] = [
    { id: 1, label: "RELAZIONI E COMUNICAZIONE", image: IMG_RELAZIONI },
    { id: 2, label: "CERIMONIE E REVENUE", image: IMG_CERIMONIE },
    { id: 3, label: "SPORT E DISCIPLINE", image: IMG_SPORT },

    {
      id: 4,
      label: "AREA ORGANIZZATIVA E SERVIZI GENERALI",
      image: IMG_AREAORGANIZZATIVA,
      mobileFillLh: 40,
    },
    {
      id: 5,
      label: "LOGISTICA E TERRITORIO",
      image: IMG_LOGISTICA,
      mobileFillLh: 40,
      mobileOutlineLh: 40,
    },
    {
      id: 6,
      label: "GESTIONE OPERATIVA E FAN EXPERIENCE",
      image: IMG_GESTIONE,
    },
  ];

  let { categories = defaultCategories }: { categories?: Category[] } =
    $props();

  // ═══════════════════════════════════════════════════════════
  // 1. STATI GLOBALI E CAROSELLO
  // ═══════════════════════════════════════════════════════════

  let isMobile = $state(false);

  // targetPos non è limitato da 0 a 5, ma può crescere/decrescere all'infinito
  // (es. 6, 7, -1, -2). Questo permette all'anello CSS 3D di ruotare sempre
  // in avanti o indietro senza fare "scatti" per tornare alla posizione 0.
  let targetPos = $state(0);

  // isReady controlla l'applicazione della transizione CSS: viene impostato a true
  // solo dopo che il componente è stato montato, così la posizione iniziale
  // viene assegnata immediatamente, senza animazioni iniziali indesiderate.
  let isReady = $state(false);

  // ═══════════════════════════════════════════════════════════
  // 2. PRELOAD IMMAGINI
  // ═══════════════════════════════════════════════════════════
  // Per evitare il fastidioso effetto in cui l'immagine viene mostrata a bassa
  // qualità e poi "ricaricata" a scatti quando il browser la decodifica,
  // le decodifichiamo forzatamente in background prima che appaiano.
  let decoded = $state<Record<string, boolean>>({});

  function preloadImages() {
    for (const cat of categories) {
      if (decoded[cat.image]) continue;
      const img = new Image();
      img.src = cat.image;
      const done = () => {
        decoded[cat.image] = true;
      };
      // `img.decode()` obbliga il browser a processare la rasterizzazione off-thread
      (img.decode ? img.decode() : Promise.reject()).then(done).catch(done);
    }
  }

  const N = () => categories.length;

  // Funzione modulo sicura per array: a differenza del `%` standard di JS,
  // gestisce correttamente i numeri negativi (es. mod(-1, 6) = 5)
  function mod(n: number, m: number) {
    return ((n % m) + m) % m;
  }

  // currentIndex mappa la posizione infinita (targetPos) all'indice reale dell'array (0-5)
  let currentIndex = $derived(mod(targetPos, N()));

  // L'angolo di rotazione assoluto della scena 3D. Essendo 6 elementi, ogni step = 60 gradi
  let ringRotation = $derived(targetPos * 60);

  // ═══════════════════════════════════════════════════════════
  // 3. EVENTI E NAVIGAZIONE (DRAG, TOUCH, WHEEL)
  // ═══════════════════════════════════════════════════════════

  function navigate(dir: number) {
    targetPos += dir;
  }

  function onArrowClick(dir: number, e: MouseEvent) {
    e.stopPropagation();
    navigate(dir);
  }

  // ── Drag "Magnetico" del Mouse ──
  // Utilizziamo Pointer Events per tracciare il trascinamento col cursore.
  let isDragging = false;
  let dragStartX = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    // Catturiamo il cursore in modo da non perdere l'evento se usciamo dall'elemento
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    // Lasciato volutamente vuoto: il carosello non segue pixel-per-pixel il mouse.
    // L'effetto finale è una rotazione "a scatto magnetico" solo al rilascio (onPointerUp).
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;

    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 50) {
      // Se lo spostamento supera la soglia di 50px, scatta la card successiva/precedente
      navigate(diff > 0 ? 1 : -1);
    } else if (Math.abs(diff) < 10) {
      // Se lo spostamento è minimo (<10px), consideralo un click intenzionale e apri la pagina
      handleTitleClick();
    }
  }

  // ── Gestione Touch (Mobile) ──
  let touchStartY = 0;

  function onTouchStart(e: TouchEvent) {
    // Salviamo la posizione Y al momento del tocco
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    // Calcoliamo la direzione di trascinamento verticale (Swipes su/giù)
    const dy = touchStartY - e.changedTouches[0].clientY;
    // Se lo swipe è maggiore di 40px, eseguiamo la rotazione
    if (Math.abs(dy) > 40) navigate(dy > 0 ? 1 : -1);
  }

  // ── Gestione Rotellina (Wheel) ──
  let wheelAccum = 0;
  let wheelLocked = false;
  let wheelStepTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  const WHEEL_STEP = 30; // Sensibilità: quanto scroll serve prima di far scattare la rotazione
  const WHEEL_LOCK_MS = 1000; // Tempo morto (cooldown) tra un salto e l'altro

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (wheelLocked) return; // Impedisce rotazioni multiple in rapida successione

    // Accumula il movimento dello scroll
    wheelAccum += e.deltaX;

    // Se non muovo la rotella per 140ms, azzero l'accumulatore
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelAccum = 0;
    }, 140);

    // Se supero la soglia di step, scatta la navigazione
    if (Math.abs(wheelAccum) >= WHEEL_STEP) {
      navigate(wheelAccum > 0 ? 1 : -1);
      wheelAccum = 0;
      wheelLocked = true;

      // Imposta il blocco per impedire altre rotazioni per il tempo stabilito (WHEEL_LOCK_MS)
      clearTimeout(wheelStepTimer);
      wheelStepTimer = setTimeout(() => {
        wheelLocked = false;
        wheelAccum = 0;
      }, WHEEL_LOCK_MS);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. ROUTING E GENERAZIONE SLUG
  // ═══════════════════════════════════════════════════════════

  function slugifyLabel(label: string) {
    return label
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function categorySlug(label: string) {
    // Sovrascrittura manuale per generare gli URL esatti richiesti
    switch (slugifyLabel(label)) {
      case "relazioni-e-comunicazione":
        return "relazioni";
      case "cerimonie-e-revenue":
        return "cerimonie";
      case "sport-e-discipline":
        return "sport";
      case "area-organizzativa-e-servizi-generali":
        return "organizzativa";
      case "logistica-e-territorio":
        return "logistica";
      case "gestione-operativa-e-fan-experience":
        return "gestione";
      default:
        return slugifyLabel(label);
    }
  }

  async function handleTitleClick() {
    const label = categories?.[currentIndex]?.label ?? "";
    const slug = categorySlug(label);
    if (slug) await goto(`/category/${slug}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FORMATTAZIONE TITOLI E SILLABAZIONE
  // ═══════════════════════════════════════════════════════════

  let currentLabel = $derived(categories[currentIndex]?.label ?? "");

  // Suddivide il titolo in due righe (fill e outline). Se c'è una "E" in mezzo,
  // spezza in corrispondenza. Altrimenti calcola metà delle parole.
  let titleLines = $derived(
    (() => {
      const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
      if (match)
        return [match[1].trim(), `E ${match[2].trim()}`].filter(Boolean);
      const words = currentLabel.split(/\s+/).filter(Boolean);
      if (words.length <= 2) return [currentLabel];
      const splitAt = Math.max(1, Math.ceil(words.length / 2));
      return [
        words.slice(0, splitAt).join(" "),
        words.slice(splitAt).join(" "),
      ].filter(Boolean);
    })(),
  );

  // Regole manuali per spezzare parole molto lunghe su mobile,
  // per evitare che sforino dai margini.
  const HARD_BREAK: Record<string, string> = {
    COMUNICAZIONE: "COMUNICA-\nZIONE",
  };
  const SHY = "­"; // Soft hyphen (trattino invisibile, appare solo se va a capo)
  const SOFT_HYPHENATE: Record<string, string> = {
    DISCIPLINE: "DISCI" + SHY + "PLINE",
    TERRITORIO: "TERRI" + SHY + "TORIO",
  };

  function processFill(text: string) {
    return text.replace(
      /[\p{L}]+/gu,
      (w) => SOFT_HYPHENATE[w.toUpperCase()] ?? w,
    );
  }
  function processOutline(text: string) {
    return text.replace(/[\p{L}]+/gu, (w) => {
      const u = w.toUpperCase();
      return HARD_BREAK[u] ?? SOFT_HYPHENATE[u] ?? w;
    });
  }

  // Processo di formattazione extra per il Mobile
  let mobileTitleLines = $derived.by(() => {
    const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (!match) return titleLines.map(processFill).filter(Boolean);
    const beforeE = match[1].trim();
    const afterE = match[2].trim();
    const isSingleLongWord = !afterE.includes(" ") && afterE.length > 12;
    return isSingleLongWord
      ? [processFill(`${beforeE} E`), processOutline(afterE)]
      : [processFill(beforeE), processOutline(`E ${afterE}`)];
  });

  let currentCat = $derived(categories[currentIndex]);
  let mobileFillLh = $derived(currentCat?.mobileFillLh ?? 36);
  let mobileOutlineLh = $derived(currentCat?.mobileOutlineLh ?? 36);

  // ═══════════════════════════════════════════════════════════
  // 6. ANIMAZIONI GSAP (TITOLI) E CARICAMENTO FONT
  // ═══════════════════════════════════════════════════════════

  let desktopTitleEl = $state<HTMLElement | null>(null);
  let mobileTitleEl = $state<HTMLElement | null>(null);

  const DISPLAY_FONT = '800 1em "forma-djr-display"';

  function playTitleReveal(lines: NodeListOf<HTMLElement>) {
    // Applica un'animazione 'stagger' (a cascata) in cui ogni elemento
    // sale dal basso (yPercent: 120 -> 0)
    gsap.fromTo(
      lines,
      { yPercent: 120 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: "power4.out",
        force3D: false,
        overwrite: true,
        stagger: { each: 0.08, from: "start" },
      },
    );
  }

  $effect(() => {
    // Si riattiva quando currentIndex cambia (cambio card)
    const _ = currentIndex;
    const el = isMobile ? mobileTitleEl : desktopTitleEl;
    if (!el) return;
    const lines = el.querySelectorAll<HTMLElement>(".title-anim");
    if (!lines.length) return;

    // Controllo sicurezza font: per evitare che il testo faccia uno scatto a metà animazione
    // (quando il font web viene scaricato dopo il font di sistema), verifichiamo
    // prima se il font 'forma-djr-display' è già nella cache del browser.
    if (
      typeof document === "undefined" ||
      !document.fonts ||
      document.fonts.check(DISPLAY_FONT)
    ) {
      playTitleReveal(lines);
      return;
    }

    gsap.set(lines, { yPercent: 120 }); // tieni nascosto il titolo finché il font non è pronto
    let cancelled = false;
    // Aspetta il load completo del font, poi lancia l'animazione GSAP
    document.fonts
      .load(DISPLAY_FONT)
      .catch(() => {})
      .then(() => {
        if (!cancelled) playTitleReveal(lines);
      });
    return () => {
      cancelled = true;
    };
  });

  // ═══════════════════════════════════════════════════════════
  // 7. CALCOLI RESPONSIVE DESKTOP (FIT)
  // ═══════════════════════════════════════════════════════════

  function fitCarouselTitle() {
    const el = desktopTitleEl;
    if (!el || typeof window === "undefined") return;

    // Fino a 1024px si usa il carosello mobile (il titolo desktop non è nemmeno
    // in pagina), quindi disattiviamo il ridimensionamento matematico.
    if (window.innerWidth <= 1024) {
      el.style.setProperty("--title-fit", "1");
      return;
    }

    el.style.setProperty("--title-fit", "1");
    const lines = Array.from(
      el.querySelectorAll<HTMLElement>(".title-fill, .title-outline"),
    );
    let scale = 1;

    // Calcoliamo la larghezza naturale del testo e se eccede la larghezza
    // dello schermo, applichiamo un fattore di scala inferiore a 1 per restringerlo
    // e farlo rientrare (es. per il lunghissimo titolo "GESTIONE OPERATIVA")
    for (const line of lines) {
      const avail = Math.max(0, line.clientWidth - 24);
      const natural = line.scrollWidth;
      if (avail > 0 && natural > avail)
        scale = Math.min(scale, avail / natural);
    }
    // Setto la variabile CSS personalizzata che restringerà il font-size
    el.style.setProperty("--title-fit", scale < 1 ? String(scale * 0.99) : "1");
  }

  $effect(() => {
    const _ = currentIndex;
    if (typeof window === "undefined") return;

    let raf = 0;
    // Usa RequestAnimationFrame per debouncing ottimale su Resize
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitCarouselTitle);
    };

    let cancelled = false;
    schedule();

    // Rivaluta le dimensioni se il font personalizzato finisce di caricare
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts
        .load(DISPLAY_FONT)
        .catch(() => {})
        .then(() => {
          if (!cancelled) schedule();
        });
    }
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", schedule);
    };
  });

  // ═══════════════════════════════════════════════════════════
  // 8. LIFECYCLE HOOKS (ONMOUNT, BEFORENAVIGATE)
  // ═══════════════════════════════════════════════════════════

  beforeNavigate(() => {
    // Puliamo gli stili inline che abbiamo imposto al body per bloccare lo scroll
    // (altrimenti le altre pagine si ritroverebbero la pagina bloccata!)
    document.body.style.overflow = "";
    document.body.style.paddingTop = "";

    // Salviamo la posizione in session per ricordarla quando si clicca "Indietro"
    sessionStorage.setItem("category-pos", String(targetPos));
  });

  onMount(() => {
    preloadImages();

    // Ripristiniamo la posizione salvata se l'utente è tornato su questa pagina
    const saved = sessionStorage.getItem("category-pos");
    if (saved !== null) {
      targetPos = Number(saved);
      sessionStorage.removeItem("category-pos");
    }

    // Un timeout microscopico per sbloccare la transizione (isReady)
    // Permette alle card di porsi nella posizione di partenza senza animarsi dal centro.
    setTimeout(() => {
      isReady = true;
    }, 50);

    const checkMobile = () => {
      // Tablet inclusi: fino a 1024px si usa il carosello mobile a tutto schermo,
      // il 3D desktop resta solo sopra i 1024px.
      isMobile = window.innerWidth <= 1024;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // ── Zoom locale della pagina ──────────────────────────────────────
    // app.html rimpicciolisce tutto con `zoom` sopra i 700px, il che sui
    // tablet fa diventare minuscolo il titolo del carosello. Qui teniamo
    // zoom = 1 fino a 1024px (dove mostriamo il layout mobile a tutto schermo),
    // così il titolo resta grande e coerente. Sopra i 1024px torna il
    // comportamento globale. Lo scheduling via rAF fa vincere questo valore
    // su quello di app.html (che gira anch'esso in rAF, ma registrato prima).
    const TABLET_MAX = 1024;
    const applyZoom = () => {
      const w = window.innerWidth;
      const v = w <= TABLET_MAX ? 1 : w / 1728;
      document.documentElement.style.zoom = String(v);
      document.documentElement.style.setProperty("--page-zoom", String(v));
    };
    let zoomRaf = 0;
    const scheduleZoom = () => {
      if (zoomRaf) return;
      zoomRaf = requestAnimationFrame(() => {
        zoomRaf = 0;
        applyZoom();
      });
    };
    applyZoom();
    window.addEventListener("resize", scheduleZoom, { passive: true });

    // Blocchiamo lo scroll globale per tutto il tempo in cui stiamo esplorando il carosello
    const prev = {
      pt: document.body.style.paddingTop,
      ov: document.body.style.overflow,
    };
    document.body.style.paddingTop = "0";
    document.body.style.overflow = "hidden";

    // Disabilitiamo l'ascolto della rotella sul mobile, si fa a mano
    if (!isMobile) {
      window.addEventListener("wheel", onWheel, { passive: false });
    }

    // Funzione di cleanup allo smontaggio del componente
    return () => {
      document.body.style.paddingTop = prev.pt;
      document.body.style.overflow = prev.ov;
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("resize", scheduleZoom);
      cancelAnimationFrame(zoomRaf);
      window.removeEventListener("wheel", onWheel);
      clearTimeout(wheelStepTimer);
      clearTimeout(wheelIdleTimer);
      // Ripristina lo zoom globale (soglia 700 di app.html) per la pagina dopo.
      const w = window.innerWidth;
      const v = w <= 700 ? 1 : w / 1728;
      document.documentElement.style.zoom = String(v);
      document.documentElement.style.setProperty("--page-zoom", String(v));
    };
  });
</script>

{#if isMobile}
  <section
    class="mobile-carousel"
    id="main-content"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
    aria-label="Category carousel"
  >
    {#key currentIndex}
      <div
        class="mobile-bg"
        style="background-image: {decoded[categories[currentIndex]?.image]
          ? `url('${categories[currentIndex]?.image}')`
          : 'none'}"
        in:fade={{ duration: 500, delay: 80 }}
        out:fade={{ duration: 400 }}
      ></div>
    {/key}

    <div class="mobile-blur mobile-blur--top" aria-hidden="true"></div>
    <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

    <div
      class="mobile-title"
      bind:this={mobileTitleEl}
      aria-live="polite"
      lang="it"
    >
      {#each mobileTitleLines as line, i}
        <span class="title-mask">
          {#if i === 0}
            <span class="title-fill title-anim">{line}</span>
          {:else}
            <span class="title-outline title-anim">{line}</span>
          {/if}
        </span>
      {/each}
    </div>

    <a class="scopri-btn" href="/category/{categorySlug(currentLabel)}"
      >SCOPRI DI PIÙ</a
    >

    <div class="mobile-nav-circles">
      <ArrowButton direction="up" onclick={() => navigate(-1)} />
      <ArrowButton direction="down" onclick={() => navigate(1)} />
    </div>
  </section>
{:else}
  <section
    class="carousel"
    id="main-content"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointerleave={onPointerUp}
    aria-label="Category carousel"
  >
    <div class="stage">
      <div class="container-3d">
        <div
          class="ring"
          class:ready={isReady}
          style="transform: translateZ(var(--camera-z)) rotateY({ringRotation}deg);"
        >
          {#each categories as cat, i}
            {@const isActive = currentIndex === i}
            <div
              class="card-3d"
              class:active={isActive}
              style="transform: rotateY({i *
                -60}deg) translateZ(var(--card-radius));"
              role="button"
              tabindex={isActive ? 0 : -1}
              aria-current={isActive ? "true" : undefined}
              onclick={() => {
                if (isActive) handleTitleClick();
              }}
              onkeydown={(e) => {
                if (e.key === "Enter" && isActive) handleTitleClick();
              }}
            >
              <div
                class="card-image"
                class:loaded={decoded[cat.image]}
                style="background-image: url('{cat.image}');"
              ></div>
              <div class="card-overlay"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="progressive-blur-overlay" aria-hidden="true"></div>

    <div
      class="arrow-left"
      role="presentation"
      onpointerdown={(e) => e.stopPropagation()}
    >
      <ArrowButton direction="left" onclick={(e) => onArrowClick(-1, e)} />
    </div>

    <div
      class="arrow-right"
      role="presentation"
      onpointerdown={(e) => e.stopPropagation()}
    >
      <ArrowButton direction="right" onclick={(e) => onArrowClick(1, e)} />
    </div>

    <div class="curve-frame" aria-hidden="true">
      <svg
        class="curve curve-top"
        viewBox="0 0 1000 260"
        preserveAspectRatio="none"
      >
        <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
      </svg>
      <svg
        class="curve curve-bottom"
        viewBox="0 0 1000 260"
        preserveAspectRatio="none"
      >
        <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
      </svg>
    </div>

    <div class="bottom-bar">
      <div
        class="title"
        bind:this={desktopTitleEl}
        aria-live="polite"
        role="button"
        tabindex="0"
        class:category-sport={categorySlug(currentLabel) === "sport"}
        onclick={handleTitleClick}
        onkeydown={(e) => {
          if (e.key === "Enter") handleTitleClick();
        }}
      >
        {#each titleLines as line, index}
          <span class="title-mask">
            {#if index === 0}
              <span class="title-fill title-anim">{line}</span>
            {:else}
              <span class="title-outline title-anim">{line}</span>
            {/if}
          </span>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  /* ================================================================
   * STILI GLOBALI
   * ================================================================ */
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  /* ═══════════════════════════════════════════════════════════
     STILI DESKTOP (CSS 3D CAROUSEL)
     ═══════════════════════════════════════════════════════════ */
  .stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .container-3d {
    perspective: var(--camera-z);

    /* Scena costruita a --ss× (supersampling) e riportata alla dimensione 
       visiva con scale(1/ss). Questo trucco fa sì che la rasterizzazione
       avvenga al doppio (o più) della risoluzione originaria, bypassando i limiti di rendering GPU e mantenendo le card nitidissime. */
    width: calc(var(--card-width) * var(--ss));
    transform: scale(calc(1 / var(--ss)));
    transform-origin: center center;

    aspect-ratio: 1 / 1;
  }

  .ring {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d; /* Imprescindibile per mantenere il volume in 3D */
    transition: none;
  }

  .ring.ready {
    /* La transizione si attiva solo DOPO il mount della pagina,
       curva custom per frenata prolungata "friction-like" */
    transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);

    /* NOTA IMPORTANTE SULLE PRESTAZIONI GPU:
       Assenza di 'will-change: transform'. Se lo mettessimo, il browser
       salverebbe una texture in cache bloccandola a bassa risoluzione, rendendo le card visibilmente "pixelate" in rotazione. Senza,
       le rasterizza sempre calcolandone i contorni nitidi. */
  }

  .card-3d {
    position: absolute;
    inset: 0;
    border-radius: 4px;
    overflow: hidden;

    /* Nessun filtro CSS qui per non incrinare la resa GPU (no blur/grayscale).
       La card laterale non selezionata viene scurita da div.card-overlay */
    transition:
      transform 0.85s ease,
      box-shadow 0.85s ease;

    pointer-events: none;
    cursor: pointer;
  }

  .card-image {
    width: 100%;
    height: 100%;
    background-size: cover;

    /* Nascosto (opacity 0) finché il JS (preloadImages) non decreta
       che la decode() asincrona in memoria è completata, in questo modo 
       la prima transizione fadeIn è a piena qualità senza l'effetto sgranato "a blocchi". */
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .card-image.loaded {
    opacity: 1;
  }

  .card-overlay {
    position: absolute;
    inset: 0;
  }

  /* ─── STATO ATTIVO (Card Centrale) ─── */
  .card-3d.active {
    pointer-events: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  .card-3d.active .card-overlay {
    background: rgba(0, 0, 0, 0);
  }

  /* ─── MASCHERA E SFOCATURA LATERALE (LENTE OPACO) ─── */
  .progressive-blur-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;

    backdrop-filter: blur(15px) saturate(0.85);
    -webkit-backdrop-filter: blur(15px) saturate(0.85);

    /* Applica una maschera lineare orizzontale in cui solo i bordi sono 100% 
       sfocati mentre il centro (che coincide con la card .active) 
       si dissolve dolcemente in trasparenza totale. */
    mask-image: linear-gradient(
      to right,
      #000 0%,
      #000 calc(50% - var(--card-width) * 1.6),
      rgba(0, 0, 0, 0.8) calc(50% - var(--card-width) * 1.3),
      rgba(0, 0, 0, 0.3) calc(50% - var(--card-width) * 1.05),
      transparent calc(50% - var(--card-width) * 0.8),
      transparent calc(50% + var(--card-width) * 0.8),
      rgba(0, 0, 0, 0.3) calc(50% + var(--card-width) * 1.05),
      rgba(0, 0, 0, 0.8) calc(50% + var(--card-width) * 1.3),
      #000 calc(50% + var(--card-width) * 1.6),
      #000 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      #000 0%,
      #000 calc(50% - var(--card-width) * 1.6),
      rgba(0, 0, 0, 0.8) calc(50% - var(--card-width) * 1.3),
      rgba(0, 0, 0, 0.3) calc(50% - var(--card-width) * 1.05),
      transparent calc(50% - var(--card-width) * 0.8),
      transparent calc(50% + var(--card-width) * 0.8),
      rgba(0, 0, 0, 0.3) calc(50% + var(--card-width) * 1.05),
      rgba(0, 0, 0, 0.8) calc(50% + var(--card-width) * 1.3),
      #000 calc(50% + var(--card-width) * 1.6),
      #000 100%
    );
  }

  /*------------------*/

  .carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary);
    overflow: hidden;
    cursor: grab;
    user-select: none;
    touch-action: none; /* Previene scroll nativo accidentale del browser durante i tap&drag */

    /* ── MATEMATICA RESPONSIVA GLOBALE ── */
    /* La grandezza base su cui tutto poggia. Varia dinamicamente con tetto massimo */
    --card-width: clamp(240px, 26vw, 420px);

    /* --ss = Supersampling. Renderizzare al 2x per sfuggire al clipping gpu-rasterizing */
    --ss: 2;

    /* Il raggio 3D (offset traslazione Z rispetto al centro della pista CSS) */
    --card-radius: calc(var(--card-width) * var(--ss) * -0.86);

    /* Telecamera arretrata per avere profondità di campo estesa verso l'anello */
    --camera-z: calc(var(--card-width) * var(--ss) * 2.8);
  }

  .carousel:active {
    cursor: grabbing;
  }

  /* Overlay globale che dona una leggerissima vignettatura all'intero stage */
  .carousel::before {
    content: "";

    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 5%,
      rgba(0, 0, 0, 0) 18%,
      rgba(0, 0, 0, 0.18) 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  .arrow-left {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: var(--spacing-5);
    z-index: 12;
  }
  .arrow-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: var(--spacing-5);
    z-index: 12;
  }

  /* ── BANDE CURVE ── */
  .curve-frame {
    position: absolute;
    inset: 0;
    pointer-events: none; /* Le curve sono elementi grafici intoccabili che lasciano passare i click */
    z-index: 3;
  }

  .curve {
    position: absolute;
    left: 0;
    width: 100%;
    fill: var(--color-background-primary);
  }

  .curve-top {
    top: 0;
    height: clamp(120px, 30vh, 260px);
  }

  .curve-bottom {
    bottom: 0;
    height: clamp(110px, 28vh, 240px);
  }

  /* ── BOTTOM UI E TITOLI ───────────────────────────────────────── */
  .bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-4-2) 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none; /* Il contenitore non assorbe click */
  }

  .title {
    font-family: "Forma DJR Display", sans-serif;

    /* Il font base usa un range calcolato su pagina zoom. Poi * var(--title-fit) 
       si assicura che un JS (fitCarouselTitle) possa rimpicciolirlo se la stringa
       fa sbordare la larghezza (ora solo per desktop con width < testolungo) */
    font-size: calc(
      clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px) *
        var(--title-fit, 1)
    );
    font-weight: 800;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1; /* Il blocco testuale è stretto perfettamente senza margini vuoti sopra/sotto */
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: auto; /* Riattiva i click sul testo vero e proprio */
    cursor: pointer;
    overflow: visible;
  }

  /* Le maschere ritagliano la riga inferiore/superiore così che durante
     l'animazione 'yPercent' il testo sembri sparire nel nulla invece che sormontare. */
  .title-mask {
    display: block;
    overflow: hidden;
  }

  .title-fill {
    color: var(--color-content-accent);
    display: block;
    white-space: nowrap;
    margin-left: var(--spacing-11);

    /* Margine negativo che spinge la parola 'outline' un po' sopra per dare
       compattezza al blocco testuale (risolto da Figma) */
    margin-bottom: -8px;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    display: block;
    white-space: nowrap;
    margin-left: clamp(
      var(--spacing-11),
      calc(var(--spacing-17) / max(var(--page-zoom, 1), 0.65)),
      580px
    );
  }

  /* Categoria speciale: la E di "SPORT E" costringe un indent diverso per estetica. */
  .title.category-sport .title-fill {
    margin-left: clamp(var(--spacing-4), 5vw, var(--spacing-11));
  }
  .title.category-sport .title-outline {
    margin-left: clamp(var(--spacing-8), 24.5vw, 340px);
  }

  /* ── ADATTAMENTO TABLET/SCHERMI STRETTI DESKTOP ───────── */
  @media (max-width: 700px) {
    /* Sotto i 700px il font base (~116px) è troppo grande e spezzava le parole
       a metà. Qui lo rendo fluido (11vw) così scala con la larghezza e le righe
       ci stanno; overflow-wrap fa andare a capo le parole lunghe solo se serve,
       senza più tagliarle a metà. */
    .title {
      font-size: clamp(32px, 11vw, 80px);
    }
    .title-fill,
    .title-outline {
      white-space: normal;
      overflow-wrap: break-word;
    }
    .title-outline {
      margin-left: var(--spacing-11);
    }
    .title.category-sport .title-outline {
      margin-left: var(--spacing-8);
    }
    /* Mobile title lives inside .mobile-title, not .title — reset stagger */
    .mobile-title .title-fill,
    .mobile-title .title-outline {
      margin-left: 0;
    }
  }

  /* ── Arrow safe-area positioning ───────────────────────────────── */
  @media (min-width: 768px) {
    .arrow-left {
      left: var(--spacing-8);
    }
    .arrow-right {
      right: var(--spacing-8);
    }
  }
  @media (min-width: 1024px) {
    .arrow-left {
      left: var(--spacing-11);
    }
    .arrow-right {
      right: var(--spacing-11);
    }
  }

  /* ── ACCESSIBILITA' (Utenti sensibili alle animazioni rapide) ────── */
  @media (prefers-reduced-motion: reduce) {
    .title-fill,
    .title-outline {
      transition: none;
    }
  }

  /* ================================================================
   * MOBILE CAROUSEL  (≤ 599px)
   * ================================================================ */

  .mobile-carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary);
    overflow: hidden;
  }

  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* ── Figma "BLUR EFFECT" MOBILE ──────
     Due rettangoli gradienti oscuranti agli estremi. La maschera lineare 
     assicura che il passaggio verso il centro sia invisibile ed esente da 
     artefatti scalettati. */
  .mobile-blur {
    position: absolute;
    left: 0;
    right: 0;
    height: 44%;
    pointer-events: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mobile-blur--top {
    top: 0;
    background: linear-gradient(
      180deg,
      rgba(14, 14, 14, 0.35) 0%,
      rgba(14, 14, 14, 0) 100%
    );
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
    mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
  }

  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(
      0deg,
      rgba(14, 14, 14, 1) 0%,
      rgba(14, 14, 14, 1) 28%,
      rgba(14, 14, 14, 0.7) 50%,
      rgba(14, 14, 14, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      0deg,
      #000 0%,
      #000 32%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
  }

  /* ── SPAZIATURA E GEOMETRIA TITOLO MOBILE ────
     Il padding e il margin incrociato creano un "tunnel" di spazio per far scivolare
     l'outline che sennò verrebbe decapitato dalla ghigliottina di `overflow:hidden`. */
  .title-mask {
    display: block;
    overflow: hidden;
    /* Crea lo spazio vitale per l'outline inferiore e compensa lo stacco */
    padding-bottom: 8px;
    margin-bottom: -8px;
  }

  .mobile-title {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(var(--unit-36) + var(--spacing-9));
    padding: var(--spacing-6) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: none;
    z-index: 3;
  }

  .mobile-title .title-fill {
    display: block;
    /* Obbligatorio per rispettare il line-height su elementi span su iOS safari */
    font-family: var(--font-display);
    /* Font fluido: scala con la larghezza (11vw) e resta tra 20 e 46px, così
       tiene su qualsiasi schermo, anche molto stretto, senza sbordare. */
    font-size: clamp(28px, 7vw, 64px);
    font-style: normal;
    font-weight: 800;
    line-height: 0.85; /* senza unità: segue il font-size a ogni dimensione */
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: break-word; /* se una parola è più lunga della riga, va a capo invece di sbordare */
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  .mobile-title .title-outline {
    display: block;
    /* Obbligatorio per rispettare il line-height su elementi span su iOS safari */
    font-family: var(--font-display);
    font-size: clamp(28px, 7vw, 64px);
    font-style: normal;
    font-weight: 800;
    line-height: 0.85;
    letter-spacing: 0;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-mobile) var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: pre-line;
    overflow-wrap: break-word;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  /* ── BOTTONI MOBILE ─────── */
  .scopri-btn {
    position: absolute;
    left: var(--spacing-5);
    bottom: var(--unit-36);
    width: 238px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4) 0;
    border: 2px solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill, 999px);
    background: var(--color-background-primary);
    color: var(--color-link-default);
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    z-index: 4;
    transition:
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .scopri-btn:hover,
  .scopri-btn:focus-visible {
    background: rgba(189, 255, 93, 0.08);
  }

  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5);
    bottom: var(--unit-36);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    z-index: 4;
  }
</style>
