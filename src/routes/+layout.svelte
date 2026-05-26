<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();

	const isAboutPage = $derived(page.url.pathname === '/about');
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</svelte:head>

<Navbar transparent={isAboutPage} />

{@render children()}

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--navbar-height);
	}
</style>
