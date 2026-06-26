<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onNavigate, afterNavigate } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import LoadingIntro from '$lib/components/LoadingIntro.svelte';
	import { imagesRaw } from '$lib/data/gallery';
	import { navbarInverted } from '$lib/stores/navbar';

	// 1. IMPORTAZIONE STILI GLOBALI E TOKEN
	import '$lib/styles/reset.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/base.css';
	import '$lib/styles/utilities.css';

	let { children } = $props();

	const isVolunteerPage = $derived(page.url.pathname.startsWith('/volunteer'));

	$effect(() => {
		if (!browser) return;
		document.body.style.setProperty(
			'--page-top-padding',
			isVolunteerPage ? '0px' : 'var(--navbar-height)'
		);
	});

	$effect(() => {
		if (!browser) return;
		function onResize() {
			const z = window.innerWidth / 1728;
			document.documentElement.style.zoom = String(z);
			document.documentElement.style.setProperty('--page-zoom', String(z));
		}
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (!browser) return;
		document.body.style.backgroundColor = '';
		document.documentElement.style.backgroundColor = '';
	});

	// 2. LOADING INTRO
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

	// 3. TRANSIZIONI E PULIZIA NAVIGAZIONE
	afterNavigate(() => {
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
		document.body.style.paddingTop = '';
	});

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		// Returning to the homepage must reveal the title with ONLY its own
		// entrance bloom — the same one shown after the loader on the first
		// visit. Skipping the page-level view transition here prevents a second,
		// layered blur-in from being re-triggered over the title on back-navigation.
		if (navigation.to?.url.pathname === '/') return;

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

<a href="#main-content" class="skip-link">Vai al contenuto</a>

{#if !isVolunteerPage}
	<!-- Navbar stays fixed on every page it appears on; never hide-on-scroll. -->
	<Navbar inverted={$navbarInverted} pinned />
{/if}

{#if showIntro && introSrc}
	<LoadingIntro src={introSrc} on:complete={() => { 
		if (page.url.searchParams.get('intro') !== '1') sessionStorage.setItem('introSeen','1'); 
		showIntro = false;
	}} />
{/if}

{@render children()}

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--page-top-padding, var(--navbar-height));
	}

	/* View Transitions API (Mantenute le tue animazioni cinematiche) */
	@keyframes vt-out {
		to {
			opacity: 0;
			filter: blur(10px);
			transform: scale(1.025) translateY(-10px);
		}
	}

	@keyframes vt-in {
		from {
			opacity: 0;
			filter: blur(22px);
			transform: scale(0.975) translateY(14px);
		}
	}

	@keyframes gallery-bloom {
		0%   { opacity: 0; filter: blur(40px); transform: scale(0.96); }
		100% { opacity: 1; filter: blur(0px);  transform: scale(1); }
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(::view-transition-old(root)) {
			animation: 200ms cubic-bezier(0.55, 0, 1, 0.45) both vt-out;
		}
		:global(::view-transition-new(root)) {
			animation: 500ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both vt-in;
		}

		:global(html[data-gallery-entry="1"]::view-transition-old(root)) {
			animation: 180ms cubic-bezier(0.55, 0, 1, 0.45) both vt-out;
		}
		:global(html[data-gallery-entry="1"]::view-transition-new(root)) {
			animation: 960ms cubic-bezier(0, 0, 0.2, 1) 80ms both gallery-bloom;
		}
	}
</style>