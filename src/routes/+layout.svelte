<script lang="ts">
	import { onMount } from 'svelte';
	import { imgStatusDefault as favicon } from '$lib/design/assets';

	let { children } = $props();

	let cursorX = $state(-100);
	let cursorY = $state(-100);
	let cursorVisible = $state(false);

	onMount(() => {
		const handlePointerMove = (event: PointerEvent) => {
			if (event.pointerType === 'touch') {
				cursorVisible = false;
				return;
			}

			cursorX = event.clientX;
			cursorY = event.clientY;
			cursorVisible = true;
		};

		const handlePointerLeave = () => {
			cursorVisible = false;
		};

		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		window.addEventListener('pointerleave', handlePointerLeave);
		window.addEventListener('blur', handlePointerLeave);

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerleave', handlePointerLeave);
			window.removeEventListener('blur', handlePointerLeave);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="site-cursor"
	class:visible={cursorVisible}
	style={`left: ${cursorX}px; top: ${cursorY}px;`}
	aria-hidden="true"
></div>

{@render children()}

<style>
	:global(body) {
		cursor: none;
	}

	.site-cursor {
		position: fixed;
		width: 10px;
		height: 10px;
		margin-left: -5px;
		margin-top: -5px;
		border-radius: 999px;
		background: #bdff5d;
		box-shadow: 0 0 10px rgba(189, 255, 93, 0.45);
		filter: blur(0.6px);
		opacity: 0;
		pointer-events: none;
		z-index: 9999;
		transition: opacity 120ms ease;
	}

	.site-cursor.visible {
		opacity: 0.95;
	}

	@media (pointer: coarse) {
		:global(body) {
			cursor: auto;
		}

		.site-cursor {
			display: none;
		}
	}
</style>
