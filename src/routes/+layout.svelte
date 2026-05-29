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

	$effect(() => {
		if (!browser) return;
		document.body.style.setProperty(
			'--page-top-padding',
			isVolunteerPage ? '0px' : 'var(--navbar-height)'
		);
	});


	// Loading intro: show once per session with a random volunteer face
	let showIntro = $state(false);
	let introSrc = $state<string | null>(null);

	if (browser) {
		const seen = sessionStorage.getItem('introSeen');
		if (!seen) {
			const pool = imagesRaw.filter(i => !!i.name).map(i => i.src);
			if (pool.length) {
				introSrc = pool[Math.floor(Math.random() * pool.length)];
				showIntro = true;
			}
		}
	}

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
</svelte:head>

{#if !isVolunteerPage}
	<Navbar transparent={isAboutPage} />
{/if}

{#if showIntro && introSrc}
	<LoadingIntro src={introSrc} on:complete={() => { sessionStorage.setItem('introSeen','1'); showIntro = false; }} tilesX={8} tilesY={6} />
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
	@keyframes vt-out { to   { opacity: 0; } }
	@keyframes vt-in  { from { opacity: 0; } }

	@media (prefers-reduced-motion: no-preference) {
		:global(::view-transition-old(root)) {
			animation: 280ms ease-out both vt-out;
		}
		:global(::view-transition-new(root)) {
			animation: 360ms ease-out both vt-in;
		}
	}
</style>
