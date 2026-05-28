<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';

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
