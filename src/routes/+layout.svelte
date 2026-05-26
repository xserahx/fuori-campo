<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
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
</style>
