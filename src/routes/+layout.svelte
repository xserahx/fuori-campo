<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</svelte:head>

<Navbar />

{@render children()}

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--navbar-height);
	}
</style>
