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
	<Navbar transparent={isAboutPage} />
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
