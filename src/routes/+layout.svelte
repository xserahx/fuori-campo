<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import LoadingIntro from '$lib/components/LoadingIntro.svelte';
	import { imagesRaw } from '$lib/data/gallery';

	let { children } = $props();

	const isAboutPage = $derived(page.url.pathname === '/about');
	const isVolunteerPage = $derived(page.url.pathname.startsWith('/volunteer'));
	const isGalleryPage = $derived(page.url.pathname === '/gallery');

	$effect(() => {
		if (!browser) return;
		document.body.style.setProperty(
			'--page-top-padding',
			isVolunteerPage ? '0px' : 'var(--navbar-height)'
		);
	});

	$effect(() => {
		if (!browser) return;
		const accentBg = '#bdff5d';
		document.body.style.backgroundColor = isAboutPage ? accentBg : '';
		document.documentElement.style.backgroundColor = isAboutPage ? accentBg : '';
	});

	/* Keep html { zoom } in sync with the viewport on mount and resize.
	   Reset to 1 first so innerWidth always reports the physical pixel width,
	   then scale uniformly: every element maintains its Figma-proportional size
	   while the layout fills the full viewport on any resolution. */
	$effect(() => {
		if (!browser) return;
		const update = () => {
			document.documentElement.style.zoom = '1';
			document.documentElement.style.zoom = String(window.innerWidth / 1728);
		};
		update();
		window.addEventListener('resize', update, { passive: true });
		return () => window.removeEventListener('resize', update);
	});


	// Loading intro: show once per session with a clear volunteer portrait for preview
	let showIntro = $state(false);
	let introSrc = $state<string | null>(null);

	$effect(() => {
		if (!browser || introSrc || showIntro) return;

		const forceIntroPreview = page.url.searchParams.get('intro') === '1';
		const seen = sessionStorage.getItem('introSeen');
		if (!seen || forceIntroPreview) {
			const preview = imagesRaw.find((image) => image.name === 'Rudy Bre') ?? imagesRaw.find((image) => !!image.name);
			if (preview?.src) {
				introSrc = preview.src;
				showIntro = true;
			}
		}
	});

	// Cinematic crossfade between every page navigation.
	// Graceful degradation: if the browser lacks the API, navigation
	// happens instantly without any visual glitch.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="stylesheet" href="https://use.typekit.net/rja4qrb.css" />
</svelte:head>

{#if !isVolunteerPage}
	<Navbar inverted={isAboutPage} pinned={isGalleryPage} />
{/if}

{#if showIntro && introSrc}
	<LoadingIntro src={introSrc} on:complete={() => { if (page.url.searchParams.get('intro') !== '1') sessionStorage.setItem('introSeen','1'); showIntro = false; }} />
{/if}

{@render children()}

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--page-top-padding, var(--navbar-height));
	}

	/* ── Page transitions (View Transitions API) ─────────────────
	   @keyframes are always global in Svelte; the pseudo-element
	   selectors need :global() so Svelte doesn't scope them away. */

	/* Exit: quick upward drift with blur-out — cinematic "film cut" feel */
	@keyframes vt-out {
		to {
			opacity: 0;
			filter: blur(10px) saturate(0.6);
			transform: scale(1.025) translateY(-10px);
		}
	}

	/* Enter: bloom in from below with deep blur dissolving to sharp */
	@keyframes vt-in {
		from {
			opacity: 0;
			filter: blur(22px) saturate(0.5);
			transform: scale(0.975) translateY(14px);
		}
	}

	/* Gallery-specific bloom (existing, now richer) */
	@keyframes gallery-bloom {
		0%   { opacity: 0; filter: blur(40px) saturate(0); transform: scale(0.96); }
		100% { opacity: 1; filter: blur(0px)  saturate(1); transform: scale(1);    }
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(::view-transition-old(root)) {
			animation: 200ms cubic-bezier(0.55, 0, 1, 0.45) both vt-out;
		}
		:global(::view-transition-new(root)) {
			animation: 500ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both vt-in;
		}

		/* Gallery entry — bloom from darkness, unchanged timing */
		:global(html[data-gallery-entry="1"]::view-transition-old(root)) {
			animation: 180ms cubic-bezier(0.55, 0, 1, 0.45) both vt-out;
		}
		:global(html[data-gallery-entry="1"]::view-transition-new(root)) {
			animation: 960ms cubic-bezier(0, 0, 0.2, 1) 80ms both gallery-bloom;
		}
	}
</style>
