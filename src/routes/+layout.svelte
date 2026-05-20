<script lang="ts">
	import { onMount } from 'svelte';
	import { imgStatusDefault as favicon } from '$lib/design/assets';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(body) {
		cursor: auto;
	}
</style>
